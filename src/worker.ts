import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

type WorkerWebSocket = WebSocket & {
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
};

interface DurableObjectStateLike {
  acceptWebSocket(ws: WebSocket): void;
  getWebSockets(): WorkerWebSocket[];
}

declare const WebSocketPair: {
  new (): { 0: WorkerWebSocket; 1: WorkerWebSocket };
};

export interface Env {
  ASSETS: AssetsFetcher;
  DB: D1DatabaseLike;
  SDLC_TIMELINE_STORAGE: KVNamespaceLike;
  TIMELINE_ROOM: DurableObjectNamespaceLike;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

type MemberRole = "owner" | "editor" | "viewer";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2:${toHex(salt)}:${toHex(bits)}`;
}

async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const parts = hash.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = fromHex(parts[1]);
  const expected = parts[2];
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    key,
    256
  );
  const actual = toHex(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function createAuth(env: Env, origin: string) {
  const db = new Kysely({
    dialect: new D1Dialect({ database: env.DB as never }),
  });

  const googleId = env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const hasGoogle = Boolean(googleId && googleSecret);

  return betterAuth({
    database: {
      db,
      type: "sqlite",
    },
    secret:
      env.BETTER_AUTH_SECRET?.trim() ||
      "dev-fallback-secret-change-in-prod-32chars",
    baseURL: env.BETTER_AUTH_URL || origin,
    onAPIError: {
      errorURL: "/",
    },
    trustedOrigins: [
      "https://tlb.web.id",
      "https://www.tlb.web.id",
      "https://sdlc-timeline-builder.wakelabs.workers.dev",
      "http://localhost:3000",
      "http://localhost:8787",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8787",
      ...(env.BETTER_AUTH_URL?.startsWith("http://localhost") ||
      env.BETTER_AUTH_URL?.startsWith("http://127.0.0.1") ||
      origin.startsWith("http://tlb.web.id")
        ? ["http://tlb.web.id"]
        : []),
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    ...(hasGoogle
      ? {
          socialProviders: {
            google: {
              clientId: googleId!,
              clientSecret: googleSecret!,
            },
          },
        }
      : {}),
  });
}

async function getWorkspaceRole(
  db: D1DatabaseLike,
  workspaceId: string,
  userId: string
): Promise<MemberRole | null> {
  const row = await db
    .prepare(
      "SELECT role FROM workspace_members WHERE workspaceId = ? AND userId = ?"
    )
    .bind(workspaceId, userId)
    .first<{ role: MemberRole }>();
  return row?.role ?? null;
}

async function getProjectRowAndRole(
  db: D1DatabaseLike,
  projectId: string,
  userId: string
): Promise<{
  row: {
    id: string;
    userId: string;
    workspaceId: string | null;
    name: string;
    data: string;
    version: number;
    lastEditedBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  role: MemberRole;
} | null> {
  const row = await db
    .prepare(
      "SELECT id, userId, workspaceId, name, data, version, lastEditedBy, createdAt, updatedAt FROM projects WHERE id = ?"
    )
    .bind(projectId)
    .first<{
      id: string;
      userId: string;
      workspaceId: string | null;
      name: string;
      data: string;
      version: number;
      lastEditedBy: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  if (!row) return null;
  if (!row.workspaceId) {
    return row.userId === userId ? { row, role: "owner" } : null;
  }
  const role = await getWorkspaceRole(db, row.workspaceId, userId);
  if (!role) return null;
  return { row, role };
}

async function handleWorkspaceRoutes(
  request: Request,
  url: URL,
  env: Env,
  userId: string
): Promise<Response> {
  const now = new Date().toISOString();

  // List workspaces for current user
  if (url.pathname === "/api/workspaces" && request.method === "GET") {
    const res = await env.DB.prepare(
      `SELECT w.id, w.name, w.ownerId, w.createdAt, w.updatedAt, wm.role,
              (SELECT COUNT(*) FROM workspace_members m WHERE m.workspaceId = w.id) AS memberCount
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspaceId = w.id
       WHERE wm.userId = ?
       ORDER BY w.updatedAt DESC`
    )
      .bind(userId)
      .all();
    return jsonRes({ workspaces: res.results || [] });
  }

  // Create workspace
  if (url.pathname === "/api/workspaces" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { name?: string } | null;
    const name = String(body?.name || "").trim().slice(0, 80);
    if (!name) return jsonRes({ error: "Workspace name is required" }, 400);

    const id = `ws-${crypto.randomUUID().slice(0, 12)}`;
    await env.DB.prepare(
      "INSERT INTO workspaces (id, name, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, name, userId, now, now)
      .run();
    await env.DB.prepare(
      "INSERT INTO workspace_members (workspaceId, userId, role, joinedAt) VALUES (?, ?, 'owner', ?)"
    )
      .bind(id, userId, now)
      .run();

    return jsonRes({ ok: true, workspace: { id, name, ownerId: userId, role: "owner", memberCount: 1 } }, 201);
  }

  const subPath = url.pathname.replace("/api/workspaces/", "");
  const parts = subPath.split("/").filter(Boolean);
  const wsId = parts[0];
  if (!wsId) return jsonRes({ error: "Missing workspace id" }, 400);

  const myRole = await getWorkspaceRole(env.DB, wsId, userId);
  if (!myRole) return jsonRes({ error: "Workspace not found" }, 404);

  // GET /api/workspaces/:wsId -> details + members + invites
  if (parts.length === 1 && request.method === "GET") {
    const ws = await env.DB.prepare(
      "SELECT id, name, ownerId, createdAt, updatedAt FROM workspaces WHERE id = ?"
    )
      .bind(wsId)
      .first();
    const members = await env.DB.prepare(
      `SELECT wm.userId, wm.role, wm.joinedAt, u.name, u.email
       FROM workspace_members wm
       JOIN user u ON u.id = wm.userId
       WHERE wm.workspaceId = ?
       ORDER BY wm.joinedAt ASC`
    )
      .bind(wsId)
      .all();

    let invites: Record<string, unknown>[] = [];
    if (myRole === "owner") {
      const inv = await env.DB.prepare(
        "SELECT id, email, role, token, expiresAt, createdAt FROM workspace_invites WHERE workspaceId = ? ORDER BY createdAt DESC"
      )
        .bind(wsId)
        .all();
      invites = inv.results || [];
    }

    return jsonRes({
      workspace: ws,
      myRole,
      members: members.results || [],
      invites,
    });
  }

  // DELETE /api/workspaces/:wsId -> delete workspace (owner only)
  if (parts.length === 1 && request.method === "DELETE") {
    if (myRole !== "owner") return jsonRes({ error: "Forbidden" }, 403);
    await env.DB.prepare("DELETE FROM workspaces WHERE id = ?").bind(wsId).run();
    return jsonRes({ ok: true });
  }

  // POST /api/workspaces/:wsId/invites -> create invite (owner only)
  if (parts.length === 2 && parts[1] === "invites" && request.method === "POST") {
    if (myRole !== "owner") return jsonRes({ error: "Only owners can invite" }, 403);
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      role?: string;
    } | null;
    const role: "editor" | "viewer" = body?.role === "viewer" ? "viewer" : "editor";
    const email = body?.email ? String(body.email).trim().toLowerCase() : null;
    const id = `inv-${crypto.randomUUID().slice(0, 12)}`;
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();

    await env.DB.prepare(
      "INSERT INTO workspace_invites (id, workspaceId, email, role, token, invitedBy, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, wsId, email, role, token, userId, expiresAt, now)
      .run();

    return jsonRes({ ok: true, invite: { id, workspaceId: wsId, email, role, token, expiresAt } }, 201);
  }

  // DELETE /api/workspaces/:wsId/invites/:inviteId -> revoke invite (owner only)
  if (parts.length === 3 && parts[1] === "invites" && request.method === "DELETE") {
    if (myRole !== "owner") return jsonRes({ error: "Forbidden" }, 403);
    await env.DB.prepare(
      "DELETE FROM workspace_invites WHERE id = ? AND workspaceId = ?"
    )
      .bind(parts[2], wsId)
      .run();
    return jsonRes({ ok: true });
  }

  // PATCH/DELETE /api/workspaces/:wsId/members/:memberId
  if (parts.length === 3 && parts[1] === "members") {
    const memberId = parts[2];
    if (request.method === "PATCH") {
      if (myRole !== "owner") return jsonRes({ error: "Forbidden" }, 403);
      if (memberId === userId) {
        return jsonRes({ error: "Cannot change own owner role" }, 400);
      }
      const body = (await request.json().catch(() => null)) as { role?: string } | null;
      const newRole = body?.role === "viewer" ? "viewer" : "editor";
      await env.DB.prepare(
        "UPDATE workspace_members SET role = ? WHERE workspaceId = ? AND userId = ?"
      )
        .bind(newRole, wsId, memberId)
        .run();
      return jsonRes({ ok: true, role: newRole });
    }
    if (request.method === "DELETE") {
      const canRemove = myRole === "owner" ? memberId !== userId : memberId === userId;
      if (!canRemove) return jsonRes({ error: "Forbidden" }, 403);
      await env.DB.prepare(
        "DELETE FROM workspace_members WHERE workspaceId = ? AND userId = ?"
      )
        .bind(wsId, memberId)
        .run();
      return jsonRes({ ok: true });
    }
  }

  return jsonRes({ error: "Not found" }, 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonRes({
        ok: true,
        worker: "sdlc-timeline-builder",
        storage: "sdlc-timeline-db",
        auth: "better-auth",
        googleEnabled: Boolean(
          env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()
        ),
      });
    }

    if (url.pathname.startsWith("/api/auth")) {
      const auth = createAuth(env, url.origin);
      return auth.handler(request);
    }

    // Public invite preview (metadata only, no sensitive project data)
    if (url.pathname.startsWith("/api/invites/") && request.method === "GET") {
      const token = url.pathname.replace("/api/invites/", "").replace(/[^a-zA-Z0-9_-]/g, "");
      const inv = await env.DB.prepare(
        `SELECT i.id, i.workspaceId, i.role, i.email, i.expiresAt, w.name AS workspaceName
         FROM workspace_invites i
         JOIN workspaces w ON w.id = i.workspaceId
         WHERE i.token = ?`
      )
        .bind(token)
        .first<{
          id: string;
          workspaceId: string;
          role: string;
          email: string | null;
          expiresAt: string;
          workspaceName: string;
        }>();
      if (!inv) return jsonRes({ error: "Invite not found" }, 404);
      const expired = new Date(inv.expiresAt).getTime() < Date.now();
      return jsonRes({
        workspaceId: inv.workspaceId,
        workspaceName: inv.workspaceName,
        role: inv.role,
        restrictedEmail: Boolean(inv.email),
        expired,
      });
    }

    // All routes below require authenticated session
    if (
      url.pathname.startsWith("/api/workspaces") ||
      url.pathname.startsWith("/api/invites/") ||
      url.pathname.startsWith("/api/projects") ||
      url.pathname.startsWith("/api/rooms/")
    ) {
      const auth = createAuth(env, url.origin);
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user?.id) {
        return jsonRes({ error: "Unauthorized" }, 401);
      }
      const userId = session.user.id;
      const userLabel = session.user.name || session.user.email || userId;

      // WebSocket room upgrade for real-time collaboration
      if (url.pathname.startsWith("/api/rooms/") && url.pathname.endsWith("/ws")) {
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
          return jsonRes({ error: "Expected WebSocket upgrade" }, 426);
        }
        const projectId = url.pathname
          .replace("/api/rooms/", "")
          .replace("/ws", "")
          .replace(/[^a-zA-Z0-9_-]/g, "");
        if (!projectId) return jsonRes({ error: "Missing projectId" }, 400);

        const access = await getProjectRowAndRole(env.DB, projectId, userId);
        if (!access) return jsonRes({ error: "Not found" }, 404);

        const roomId = env.TIMELINE_ROOM.idFromName(projectId);
        const stub = env.TIMELINE_ROOM.get(roomId);
        const headers = new Headers(request.headers);
        headers.set("x-user-id", userId);
        headers.set("x-user-name", userLabel);
        headers.set("x-user-email", session.user.email || "");
        headers.set("x-user-role", access.role);
        return stub.fetch(new Request(request.url, { headers }));
      }

      // Accept workspace invite
      if (url.pathname.startsWith("/api/invites/") && url.pathname.endsWith("/accept") && request.method === "POST") {
        const token = url.pathname
          .replace("/api/invites/", "")
          .replace("/accept", "")
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const inv = await env.DB.prepare(
          `SELECT i.id, i.workspaceId, i.email, i.role, i.expiresAt, w.name AS workspaceName
           FROM workspace_invites i
           JOIN workspaces w ON w.id = i.workspaceId
           WHERE i.token = ?`
        )
          .bind(token)
          .first<{
            id: string;
            workspaceId: string;
            email: string | null;
            role: "editor" | "viewer";
            expiresAt: string;
            workspaceName: string;
          }>();

        if (!inv) return jsonRes({ error: "Invite not found" }, 404);
        if (new Date(inv.expiresAt).getTime() < Date.now()) {
          return jsonRes({ error: "Invite expired" }, 410);
        }
        if (
          inv.email &&
          session.user.email?.toLowerCase() !== inv.email.toLowerCase()
        ) {
          return jsonRes(
            { error: "This invite is restricted to another email address" },
            403
          );
        }

        const existingRole = await getWorkspaceRole(env.DB, inv.workspaceId, userId);
        if (!existingRole) {
          await env.DB.prepare(
            "INSERT INTO workspace_members (workspaceId, userId, role, joinedAt) VALUES (?, ?, ?, ?)"
          )
            .bind(inv.workspaceId, userId, inv.role, new Date().toISOString())
            .run();
        }
        if (inv.email) {
          await env.DB.prepare("DELETE FROM workspace_invites WHERE id = ?")
            .bind(inv.id)
            .run();
        }
        return jsonRes({
          ok: true,
          workspaceId: inv.workspaceId,
          workspaceName: inv.workspaceName,
          role: existingRole || inv.role,
        });
      }

      if (url.pathname.startsWith("/api/workspaces")) {
        return handleWorkspaceRoutes(request, url, env, userId);
      }

      // Projects API (personal + workspace-shared)
      if (url.pathname === "/api/projects" && request.method === "GET") {
        const res = await env.DB.prepare(
          `SELECT p.id, p.name, p.workspaceId, p.version, p.lastEditedBy, p.createdAt, p.updatedAt,
                  w.name AS workspaceName,
                  COALESCE(wm.role, 'owner') AS role
           FROM projects p
           LEFT JOIN workspaces w ON w.id = p.workspaceId
           LEFT JOIN workspace_members wm ON wm.workspaceId = p.workspaceId AND wm.userId = ?
           WHERE (p.workspaceId IS NULL AND p.userId = ?)
              OR (p.workspaceId IS NOT NULL AND wm.userId = ?)
           ORDER BY p.updatedAt DESC`
        )
          .bind(userId, userId, userId)
          .all();

        return jsonRes({ projects: res.results || [] });
      }

      if (url.pathname === "/api/projects" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            id?: string;
            name?: string;
            workspaceId?: string | null;
            expectedVersion?: number;
            data?: unknown;
          };
          const id =
            (body.id && body.id.replace(/[^a-zA-Z0-9_-]/g, "")) ||
            `tl-${crypto.randomUUID().slice(0, 12)}`;
          const name = String(body.name || "Timeline Project").slice(0, 140);
          const now = new Date().toISOString();
          const dataJson = JSON.stringify(body.data ?? body);

          const existing = await getProjectRowAndRole(env.DB, id, userId);
          if (existing) {
            if (existing.role === "viewer") {
              return jsonRes({ error: "Viewers cannot edit this project" }, 403);
            }
            if (
              typeof body.expectedVersion === "number" &&
              existing.row.version !== body.expectedVersion
            ) {
              return jsonRes(
                {
                  error: "Version conflict",
                  currentVersion: existing.row.version,
                  lastEditedBy: existing.row.lastEditedBy,
                  updatedAt: existing.row.updatedAt,
                },
                409
              );
            }
            const nextVersion = (existing.row.version || 1) + 1;
            const nextWsId =
              body.workspaceId !== undefined
                ? body.workspaceId || null
                : existing.row.workspaceId;

            if (nextWsId && nextWsId !== existing.row.workspaceId) {
              const targetRole = await getWorkspaceRole(env.DB, nextWsId, userId);
              if (!targetRole || targetRole === "viewer") {
                return jsonRes({ error: "Forbidden for target workspace" }, 403);
              }
            }

            await env.DB.prepare(
              "UPDATE projects SET name = ?, data = ?, workspaceId = ?, version = ?, lastEditedBy = ?, updatedAt = ? WHERE id = ?"
            )
              .bind(name, dataJson, nextWsId, nextVersion, userLabel, now, id)
              .run();

            return jsonRes({
              ok: true,
              id,
              name,
              workspaceId: nextWsId,
              version: nextVersion,
              lastEditedBy: userLabel,
              updatedAt: now,
            });
          }

          // New project creation
          const wsId = body.workspaceId ? String(body.workspaceId) : null;
          if (wsId) {
            const wsRole = await getWorkspaceRole(env.DB, wsId, userId);
            if (!wsRole || wsRole === "viewer") {
              return jsonRes(
                { error: "Forbidden: Editor or Owner role required" },
                403
              );
            }
          }

          await env.DB.prepare(
            "INSERT INTO projects (id, userId, workspaceId, name, data, version, lastEditedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)"
          )
            .bind(id, userId, wsId, name, dataJson, userLabel, now, now)
            .run();

          return jsonRes({
            ok: true,
            id,
            name,
            workspaceId: wsId,
            version: 1,
            lastEditedBy: userLabel,
            updatedAt: now,
          });
        } catch {
          return jsonRes({ error: "Invalid project payload" }, 400);
        }
      }

      const id = url.pathname
        .replace("/api/projects/", "")
        .replace(/[^a-zA-Z0-9_-]/g, "");
      if (!id) return jsonRes({ error: "Missing id" }, 400);

      const access = await getProjectRowAndRole(env.DB, id, userId);
      if (!access) return jsonRes({ error: "Not found" }, 404);

      if (request.method === "GET") {
        return jsonRes({
          id: access.row.id,
          name: access.row.name,
          workspaceId: access.row.workspaceId,
          role: access.role,
          version: access.row.version,
          lastEditedBy: access.row.lastEditedBy,
          createdAt: access.row.createdAt,
          updatedAt: access.row.updatedAt,
          data: JSON.parse(access.row.data),
        });
      }

      if (request.method === "DELETE") {
        if (access.role !== "owner") {
          return jsonRes({ error: "Only owners can delete this project" }, 403);
        }
        await env.DB.prepare("DELETE FROM projects WHERE id = ?")
          .bind(id)
          .run();
        return jsonRes({ ok: true });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

interface RoomMemberAttachment {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  color: string;
}

const PRESENCE_COLORS = [
  "#15803D",
  "#1D4ED8",
  "#7C3AED",
  "#B45309",
  "#BE123C",
  "#0F766E",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

export class TimelineRoom {
  constructor(
    private state: DurableObjectStateLike,
    private env: Env
  ) {}

  private getPresenceUsers(exclude?: WebSocket): Array<{
    userId: string;
    name: string;
    role: MemberRole;
    color: string;
  }> {
    const byUser = new Map<
      string,
      { userId: string; name: string; role: MemberRole; color: string }
    >();
    for (const sock of this.state.getWebSockets()) {
      if (sock === exclude) continue;
      const meta = sock.deserializeAttachment() as RoomMemberAttachment | null;
      if (meta && !byUser.has(meta.userId)) {
        byUser.set(meta.userId, {
          userId: meta.userId,
          name: meta.name,
          role: meta.role,
          color: meta.color,
        });
      }
    }
    return Array.from(byUser.values());
  }

  private broadcast(payload: unknown, exclude?: WebSocket) {
    const encoded = JSON.stringify(payload);
    for (const sock of this.state.getWebSockets()) {
      if (sock === exclude) continue;
      try {
        sock.send(encoded);
      } catch {
        // Ignore closed socket
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return jsonRes({ error: "Expected WebSocket upgrade" }, 426);
    }

    const userId = request.headers.get("x-user-id") || "";
    const name = request.headers.get("x-user-name") || "User";
    const email = request.headers.get("x-user-email") || "";
    const role = (request.headers.get("x-user-role") as MemberRole) || "viewer";

    if (!userId) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    const attachment: RoomMemberAttachment = {
      userId,
      name,
      email,
      role,
      color: colorForUser(userId),
    };
    server.serializeAttachment(attachment);

    this.broadcast({
      type: "presence",
      users: this.getPresenceUsers(),
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit);
  }

  async webSocketMessage(ws: WorkerWebSocket, message: string | ArrayBuffer) {
    const text =
      typeof message === "string"
        ? message
        : new TextDecoder().decode(message);

    let msg: {
      type?: string;
      ops?: unknown[];
      version?: number;
      updatedAt?: string;
      data?: unknown;
      pageId?: number | null;
      rowId?: string | null;
    } | null = null;

    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg?.type) return;

    if (msg.type === "ping") {
      try {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      } catch {
        // Ignore
      }
      return;
    }

    const meta = ws.deserializeAttachment() as RoomMemberAttachment | null;
    if (!meta) return;

    if (msg.type === "ops") {
      if (meta.role === "viewer") {
        try {
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Viewers cannot broadcast edits",
            })
          );
        } catch {
          // Ignore
        }
        return;
      }

      if (Array.isArray(msg.ops) && msg.ops.length > 0) {
        this.broadcast(
          {
            type: "remote_ops",
            senderId: meta.userId,
            senderName: meta.name,
            ops: msg.ops,
          },
          ws
        );
      }
      return;
    }

    if (msg.type === "state_update") {
      if (meta.role === "viewer") {
        try {
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Viewers cannot broadcast edits",
            })
          );
        } catch {
          // Ignore
        }
        return;
      }

      this.broadcast(
        {
          type: "remote_update",
          senderId: meta.userId,
          senderName: meta.name,
          version: msg.version ?? null,
          updatedAt: msg.updatedAt ?? new Date().toISOString(),
          data: msg.data,
        },
        ws
      );
      return;
    }

    if (msg.type === "cursor") {
      this.broadcast(
        {
          type: "cursor",
          userId: meta.userId,
          name: meta.name,
          color: meta.color,
          pageId: msg.pageId ?? null,
          rowId: msg.rowId ?? null,
        },
        ws
      );
    }
  }

  async webSocketClose(ws: WorkerWebSocket) {
    this.broadcast(
      {
        type: "presence",
        users: this.getPresenceUsers(ws),
      },
      ws
    );
  }

  async webSocketError(ws: WorkerWebSocket) {
    this.broadcast(
      {
        type: "presence",
        users: this.getPresenceUsers(ws),
      },
      ws
    );
  }
}

export default worker;
