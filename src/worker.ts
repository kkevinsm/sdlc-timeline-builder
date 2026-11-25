interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS: AssetsFetcher;
  SDLC_TIMELINE_STORAGE: KVNamespaceLike;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          ok: true,
          worker: "sdlc-timeline-builder",
          storage: "SDLC_TIMELINE_STORAGE",
        }),
        { headers: JSON_HEADERS }
      );
    }

    if (url.pathname === "/api/projects" && request.method === "GET") {
      const list = await env.SDLC_TIMELINE_STORAGE.list({ prefix: "proj:" });
      const items = await Promise.all(
        list.keys.map(async (k) => {
          const raw = await env.SDLC_TIMELINE_STORAGE.get(k.name);
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw) as { id?: string; name?: string; updatedAt?: string };
            return {
              id: parsed.id || k.name.replace(/^proj:/, ""),
              name: parsed.name || "Timeline Project",
              updatedAt: parsed.updatedAt || null,
            };
          } catch {
            return null;
          }
        })
      );
      return new Response(
        JSON.stringify({ projects: items.filter(Boolean) }),
        { headers: JSON_HEADERS }
      );
    }

    if (url.pathname === "/api/projects" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          id?: string;
          name?: string;
          data?: unknown;
        };
        const id =
          body.id?.replace(/[^a-zA-Z0-9_-]/g, "") ||
          `tl-${Date.now().toString(36)}`;
        const record = {
          id,
          name: body.name || "Timeline Project",
          updatedAt: new Date().toISOString(),
          data: body.data ?? body,
        };
        await env.SDLC_TIMELINE_STORAGE.put(
          `proj:${id}`,
          JSON.stringify(record)
        );
        return new Response(JSON.stringify({ ok: true, id, updatedAt: record.updatedAt }), {
          status: 201,
          headers: JSON_HEADERS,
        });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
    }

    if (url.pathname.startsWith("/api/projects/")) {
      const id = url.pathname.replace("/api/projects/", "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
      if (request.method === "GET") {
        const raw = await env.SDLC_TIMELINE_STORAGE.get(`proj:${id}`);
        if (!raw) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: JSON_HEADERS,
          });
        }
        return new Response(raw, { headers: JSON_HEADERS });
      }
      if (request.method === "DELETE") {
        await env.SDLC_TIMELINE_STORAGE.delete(`proj:${id}`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: JSON_HEADERS,
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
