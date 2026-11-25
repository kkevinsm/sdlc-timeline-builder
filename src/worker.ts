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

export interface Env {
  ASSETS: AssetsFetcher;
  DB: D1DatabaseLike;
  SDLC_TIMELINE_STORAGE: KVNamespaceLike;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

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

/**
 * Hardware-accelerated Web Crypto PBKDF2-SHA256 password hashing (<1ms CPU on Workers).
 */
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

  const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return betterAuth({
    database: {
      db,
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET || "dev-fallback-secret-change-in-prod-32chars",
    baseURL: env.BETTER_AUTH_URL || origin,
    trustedOrigins: [
      "https://tlb.web.id",
      "https://www.tlb.web.id",
      "https://sdlc-timeline-builder.wakelabs.workers.dev",
      "http://localhost:3000",
      "http://localhost:8787",
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
              clientId: env.GOOGLE_CLIENT_ID!,
              clientSecret: env.GOOGLE_CLIENT_SECRET!,
            },
          },
        }
      : {}),
  });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          ok: true,
          worker: "sdlc-timeline-builder",
          storage: "sdlc-timeline-db",
          auth: "better-auth",
          googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        }),
        { headers: JSON_HEADERS }
      );
    }

    if (url.pathname.startsWith("/api/auth")) {
      const auth = createAuth(env, url.origin);
      return auth.handler(request);
    }

    if (url.pathname.startsWith("/api/projects")) {
      const auth = createAuth(env, url.origin);
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: JSON_HEADERS,
        });
      }
      const userId = session.user.id;

      // List user's projects
      if (url.pathname === "/api/projects" && request.method === "GET") {
        const res = await env.DB.prepare(
          "SELECT id, name, createdAt, updatedAt FROM projects WHERE userId = ? ORDER BY updatedAt DESC"
        )
          .bind(userId)
          .all<{ id: string; name: string; createdAt: string; updatedAt: string }>();

        return new Response(JSON.stringify({ projects: res.results || [] }), {
          headers: JSON_HEADERS,
        });
      }

      // Create / Upsert user's project
      if (url.pathname === "/api/projects" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            id?: string;
            name?: string;
            data?: unknown;
          };
          const id =
            (body.id && body.id.replace(/[^a-zA-Z0-9_-]/g, "")) ||
            `tl-${crypto.randomUUID().slice(0, 12)}`;
          const name = String(body.name || "Timeline Project").slice(0, 140);
          const now = new Date().toISOString();
          const dataJson = JSON.stringify(body.data ?? body);

          const existing = await env.DB.prepare(
            "SELECT userId FROM projects WHERE id = ?"
          )
            .bind(id)
            .first<{ userId: string }>();

          if (existing && existing.userId !== userId) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: JSON_HEADERS,
            });
          }

          if (existing) {
            await env.DB.prepare(
              "UPDATE projects SET name = ?, data = ?, updatedAt = ? WHERE id = ? AND userId = ?"
            )
              .bind(name, dataJson, now, id, userId)
              .run();
          } else {
            await env.DB.prepare(
              "INSERT INTO projects (id, userId, name, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
            )
              .bind(id, userId, name, dataJson, now, now)
              .run();
          }

          return new Response(
            JSON.stringify({ ok: true, id, name, updatedAt: now }),
            { status: 200, headers: JSON_HEADERS }
          );
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid project payload" }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
      }

      // Single project GET / DELETE
      const id = url.pathname
        .replace("/api/projects/", "")
        .replace(/[^a-zA-Z0-9_-]/g, "");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }

      if (request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT id, name, data, createdAt, updatedAt FROM projects WHERE id = ? AND userId = ?"
        )
          .bind(id, userId)
          .first<{
            id: string;
            name: string;
            data: string;
            createdAt: string;
            updatedAt: string;
          }>();

        if (!row) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: JSON_HEADERS,
          });
        }
        return new Response(
          JSON.stringify({
            id: row.id,
            name: row.name,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            data: JSON.parse(row.data),
          }),
          { headers: JSON_HEADERS }
        );
      }

      if (request.method === "DELETE") {
        await env.DB.prepare(
          "DELETE FROM projects WHERE id = ? AND userId = ?"
        )
          .bind(id, userId)
          .run();
        return new Response(JSON.stringify({ ok: true }), {
          headers: JSON_HEADERS,
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
