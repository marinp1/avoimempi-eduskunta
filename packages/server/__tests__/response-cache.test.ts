import { describe, expect, test } from "bun:test";
import { createResponseCache } from "../cache/response-cache";

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

    test("non-2xx (404) responses are also cached", async () => {
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

      const second = await routeHandler(makeRequest("/api/item/999"));
      expect(second.status).toBe(404);
      expect(calls).toBe(1); // cached
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

    test("maxEntries ceiling skips insertion without error", async () => {
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

      // Fill the one allowed slot
      await (wrapped["/api/a"] as { GET: typeof handler }).GET(
        makeRequest("/api/a"),
      );
      // This should hit the ceiling and not be cached
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(
        makeRequest("/api/b"),
      );

      // /api/a: 1 miss (stored, fills the 1 slot)
      // /api/b: 2 misses (ceiling hit, never cached)
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
      await (wrapped["/api/a"] as { GET: typeof handler }).GET(makeRequest("/api/a"));
      expect(calls).toBe(1);

      // Let the TTL expire
      await Bun.sleep(30);

      // /api/b should now be insertable because the expired /api/a entry was evicted
      await (wrapped["/api/b"] as { GET: typeof handler }).GET(makeRequest("/api/b"));
      const secondB = await (wrapped["/api/b"] as { GET: typeof handler }).GET(makeRequest("/api/b"));
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
  });
});
