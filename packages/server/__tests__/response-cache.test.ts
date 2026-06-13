import { describe, expect, test } from "bun:test";
import { createResponseCache } from "../src/cache/response-cache";

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe("createResponseCache", () => {
  describe("when generationKey is null", () => {
    test("wrapRoutes returns routes unchanged", () => {
      const cache = createResponseCache({ generationKey: null });
      let _calls = 0;
      const handler = async () => {
        _calls++;
        return Response.json({ ok: true });
      };
      const wrapped = cache.wrapRoutes({ "/api/test": { GET: handler } });
      // Verify the handler is the original (no wrapping)
      const routeHandler = (wrapped["/api/test"] as { GET: typeof handler })
        .GET;
      expect(routeHandler).toBe(handler);
    });

    test("passes static Response instances through unchanged", () => {
      const cache = createResponseCache({ generationKey: null });
      const staticResponse = new Response("OK");
      const wrapped = cache.wrapRoutes({ "/api/health": staticResponse });
      expect(wrapped["/api/health"]).toBe(staticResponse);
    });
  });

  describe("when generationKey is set", () => {
    test("cache miss calls through to handler", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return Response.json({ value: calls });
      };
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      const response = await routeHandler(makeRequest("/api/data"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ value: 1 });
      expect(calls).toBe(1);
    });

    test("cache hit does not call handler again", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return Response.json({ value: calls });
      };
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      await routeHandler(makeRequest("/api/data"));
      const secondResponse = await routeHandler(makeRequest("/api/data"));

      expect(calls).toBe(1);
      expect(await secondResponse.json()).toEqual({ value: 1 });
    });

    test("cached response includes Cache-Control header", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      const handler = async (_req: Request) => Response.json({ ok: true });
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      // First call (miss) — should also get Cache-Control
      const miss = await routeHandler(makeRequest("/api/data"));
      expect(miss.headers.get("Cache-Control")).toBe("public, max-age=300");

      // Second call (hit)
      const hit = await routeHandler(makeRequest("/api/data"));
      expect(hit.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    test("cache keys are scoped to path and query string", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (req: Request) => {
        calls++;
        const url = new URL(req.url);
        return Response.json({ q: url.searchParams.get("q") });
      };
      const wrapped = cache.wrapRoutes({ "/api/search": { GET: handler } });
      const routeHandler = (wrapped["/api/search"] as { GET: typeof handler })
        .GET;

      await routeHandler(makeRequest("/api/search?q=hallitus"));
      await routeHandler(makeRequest("/api/search?q=hallitus")); // hit
      await routeHandler(makeRequest("/api/search?q=oppositio")); // miss: different key

      expect(calls).toBe(2);
    });

    test("4xx responses are never cached", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return Response.json({ message: "Not found" }, { status: 404 });
      };
      const wrapped = cache.wrapRoutes({ "/api/item/:id": { GET: handler } });
      const routeHandler = (wrapped["/api/item/:id"] as { GET: typeof handler })
        .GET;

      const first = await routeHandler(makeRequest("/api/item/999"));
      expect(first.status).toBe(404);
      expect(first.headers.get("Cache-Control")).toBeNull();

      const second = await routeHandler(makeRequest("/api/item/999"));
      expect(second.status).toBe(404);
      expect(calls).toBe(2); // not cached
    });

    test("5xx responses are never cached", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return new Response("error", { status: 500 });
      };
      const wrapped = cache.wrapRoutes({ "/api/broken": { GET: handler } });
      const routeHandler = (wrapped["/api/broken"] as { GET: typeof handler })
        .GET;

      await routeHandler(makeRequest("/api/broken"));
      await routeHandler(makeRequest("/api/broken"));

      expect(calls).toBe(2); // not cached
    });

    test("TTL expiry causes cache miss", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
        ttlMs: 1, // 1ms — expires immediately
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return Response.json({ n: calls });
      };
      const wrapped = cache.wrapRoutes({ "/api/fast": { GET: handler } });
      const routeHandler = (wrapped["/api/fast"] as { GET: typeof handler })
        .GET;

      await routeHandler(makeRequest("/api/fast"));
      await Bun.sleep(5); // let TTL expire
      await routeHandler(makeRequest("/api/fast"));

      expect(calls).toBe(2); // second call was a miss
    });

    test("excluded paths bypass the cache", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        return Response.json({ ready: true });
      };
      const wrapped = cache.wrapRoutes(
        { "/api/ready": { GET: handler } },
        { exclude: new Set(["/api/ready"]) },
      );
      const routeHandler = (wrapped["/api/ready"] as { GET: typeof handler })
        .GET;

      await routeHandler(makeRequest("/api/ready"));
      await routeHandler(makeRequest("/api/ready"));

      expect(calls).toBe(2); // never cached
      // Also verify no Cache-Control added
      const resp = await routeHandler(makeRequest("/api/ready"));
      expect(resp.headers.get("Cache-Control")).toBeNull();
    });

    test("static Response instances pass through wrapRoutes unchanged", () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      const staticResponse = new Response("OK");
      const wrapped = cache.wrapRoutes({ "/api/health": staticResponse });
      expect(wrapped["/api/health"]).toBe(staticResponse);
    });

    test("maxEntries ceiling evicts the oldest entry to admit a new one", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
        maxEntries: 1,
      });
      let calls = 0;
      const handler = async (req: Request) => {
        calls++;
        return Response.json({ path: new URL(req.url).pathname });
      };
      const routes = {
        "/api/a": { GET: handler },
        "/api/b": { GET: handler },
      };
      const wrapped = cache.wrapRoutes(routes);

      // Fill the one allowed slot with /api/a
      await (wrapped["/api/a"] as { GET: typeof handler }).GET(
        makeRequest("/api/a"),
      );
      // /api/b evicts /api/a and takes the slot
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      // /api/b: 1 miss (inserted after evicting /api/a), then 1 hit
      expect(calls).toBe(2);

      // /api/a was evicted, so it misses again (and evicts /api/b)
      await (wrapped["/api/a"] as { GET: typeof handler }).GET(
        makeRequest("/api/a"),
      );
      expect(calls).toBe(3);
    });

    test("expired entries are evicted before enforcing maxEntries, allowing new insertions", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
        maxEntries: 1,
        ttlMs: 20, // short TTL
      });
      let calls = 0;
      const handler = async (req: Request) => {
        calls++;
        return Response.json({ path: new URL(req.url).pathname });
      };
      const wrapped = cache.wrapRoutes({
        "/api/a": { GET: handler },
        "/api/b": { GET: handler },
      });

      // Fill the one slot with /api/a
      await (wrapped["/api/a"] as { GET: typeof handler }).GET(
        makeRequest("/api/a"),
      );
      expect(calls).toBe(1);

      // Let the TTL expire
      await Bun.sleep(30);

      // /api/b should now be insertable because the expired /api/a entry was evicted
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      const secondB = await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      expect(secondB.status).toBe(200);

      // /api/b: 1 miss (inserted after eviction), 1 hit
      expect(calls).toBe(2);
    });

    test("size() counts live entries", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
        ttlMs: 50,
      });
      const handler = async (_req: Request) => Response.json({ ok: true });
      const wrapped = cache.wrapRoutes({
        "/api/x": { GET: handler },
        "/api/y": { GET: handler },
      });

      expect(cache.size()).toBe(0);

      await (wrapped["/api/x"] as { GET: typeof handler }).GET(
        makeRequest("/api/x"),
      );
      expect(cache.size()).toBe(1);

      await (wrapped["/api/y"] as { GET: typeof handler }).GET(
        makeRequest("/api/y"),
      );
      expect(cache.size()).toBe(2);

      await Bun.sleep(60); // let TTL expire
      expect(cache.size()).toBe(0);
    });

    test("serves gzip-compressed body when client accepts gzip", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      const handler = async (_req: Request) =>
        new Response("hello world", {
          headers: { "Content-Type": "text/plain" },
        });
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      const gzipReq = new Request("http://localhost/api/data", {
        headers: { "Accept-Encoding": "gzip" },
      });
      const response = await routeHandler(gzipReq);

      expect(response.headers.get("Content-Encoding")).toBe("gzip");
      expect(response.headers.get("Vary")).toContain("Accept-Encoding");
      expect(response.status).toBe(200);
      // The body is gzip-compressed; Bun doesn't transparently decode it in
      // test, but a real browser would.
      const buf = await response.arrayBuffer();
      const decompressed = Bun.gunzipSync(new Uint8Array(buf));
      expect(new TextDecoder().decode(decompressed)).toBe("hello world");
    });

    test("serves uncompressed body when client does not accept gzip", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      const handler = async (_req: Request) =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      const noGzipReq = new Request("http://localhost/api/data");
      const response = await routeHandler(noGzipReq);

      expect(response.headers.get("Content-Encoding")).toBeNull();
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    test("preserves Content-Type on cache hit", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      const handler = async (_req: Request) =>
        new Response("<html>ok</html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      const wrapped = cache.wrapRoutes({ "/page": { GET: handler } });
      const routeHandler = (wrapped["/page"] as { GET: typeof handler }).GET;

      await routeHandler(makeRequest("/page"));
      const hit = await routeHandler(makeRequest("/page"));

      expect(hit.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    });

    test("in-flight dedup: concurrent requests share one handler execution", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        await Bun.sleep(50);
        return Response.json({ n: calls });
      };
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      const [r1, r2] = await Promise.all([
        routeHandler(makeRequest("/api/data")),
        routeHandler(makeRequest("/api/data")),
      ]);

      expect(calls).toBe(1);
      expect(await r1.json()).toEqual({ n: 1 });
      expect(await r2.json()).toEqual({ n: 1 });
    });

    test("in-flight dedup: failed handler allows retry", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (_req: Request) => {
        calls++;
        if (calls === 1) throw new Error("boom");
        return Response.json({ n: calls });
      };
      const wrapped = cache.wrapRoutes({ "/api/data": { GET: handler } });
      const routeHandler = (wrapped["/api/data"] as { GET: typeof handler })
        .GET;

      try {
        await routeHandler(makeRequest("/api/data"));
      } catch {
        // expected
      }

      const response = await routeHandler(makeRequest("/api/data"));
      expect(calls).toBe(2);
      expect(await response.json()).toEqual({ n: 2 });
    });

    test("byte-size cap evicts oldest entries when exceeded", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
        maxBytes: 50, // very tight — gzip overhead alone is ~20 bytes per entry
        maxEntries: 100,
      });
      let calls = 0;
      const handler = async (req: Request) => {
        calls++;
        return new Response(new URL(req.url).pathname);
      };
      const wrapped = cache.wrapRoutes({
        "/api/a": { GET: handler },
        "/api/b": { GET: handler },
        "/api/c": { GET: handler },
      });

      await (wrapped["/api/a"] as { GET: typeof handler }).GET(
        makeRequest("/api/a"),
      );
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      await (wrapped["/api/c"] as { GET: typeof handler }).GET(
        makeRequest("/api/c"),
      );

      expect(calls).toBe(3);
      // With maxBytes=50, at most 2 entries can coexist (gzip ~20-25 bytes ea)
      expect(cache.size()).toBeLessThanOrEqual(2);
    });

    test("custom cacheKey does not collide on HX-Request variants", async () => {
      const cache = createResponseCache({
        generationKey: "2024-01-01T00:00:00.000Z",
      });
      let calls = 0;
      const handler = async (req: Request) => {
        calls++;
        return new Response(req.headers.get("HX-Request") ?? "none");
      };
      const keyFn = (req: Request, url: URL) =>
        `${url.pathname}|hx=${req.headers.get("HX-Request") ?? "0"}`;
      const wrapped = cache.wrapRoutes(
        { "/page": { GET: handler } },
        { cacheKey: keyFn },
      );
      const routeHandler = (wrapped["/page"] as { GET: typeof handler }).GET;

      await routeHandler(
        new Request("http://localhost/page", {
          headers: { "HX-Request": "true" },
        }),
      );
      await routeHandler(makeRequest("/page"));

      expect(calls).toBe(2); // different keys
    });
  });
});
