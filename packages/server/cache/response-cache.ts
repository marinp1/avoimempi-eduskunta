type RouteHandler = (req: Request) => Promise<Response>;

type CacheEntry = {
  body: string;
  status: number;
  headers: [string, string][];
  expiresAt: number;
};

export type ResponseCacheOptions = {
  /**
   * A string that identifies the current data generation (e.g. last migration
   * timestamp). When null, caching is disabled and all requests pass through.
   */
  generationKey: string | null;
  /** Time-to-live per entry in milliseconds. Default: 5 minutes. */
  ttlMs?: number;
  /**
   * Maximum number of entries in the cache. When the ceiling is reached, new
   * entries are not inserted (existing entries continue to be served). This
   * prevents unbounded memory growth from large query-string parameter spaces.
   * Default: 2000.
   */
  maxEntries?: number;
};

export type ResponseCache = {
  /**
   * Wraps all GET handlers in `routes` with caching. Static `Response`
   * instances and any paths listed in `exclude` are passed through unchanged.
   */
  wrapRoutes: <T extends Record<string, any>>(
    routes: T,
    opts?: { exclude?: Set<string> },
  ) => T;
  /** Number of live (non-expired) entries currently held in the cache. */
  size: () => number;
};

export function createResponseCache(
  options: ResponseCacheOptions,
): ResponseCache {
  const { generationKey, ttlMs = 5 * 60 * 1000, maxEntries = 2000 } = options;
  const disabled = generationKey === null;
  const store = new Map<string, CacheEntry>();

  function get(key: string): CacheEntry | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  function set(key: string, entry: CacheEntry): void {
    if (store.size >= maxEntries) return;
    store.set(key, entry);
  }

  function wrapHandler(handler: RouteHandler): RouteHandler {
    return async (req: Request) => {
      const url = new URL(req.url);
      const key = url.pathname + url.search;

      const hit = get(key);
      if (hit) {
        return new Response(hit.body, {
          status: hit.status,
          headers: [...hit.headers, ["Cache-Control", "public, max-age=300"]],
        });
      }

      const response = await handler(req);

      // Cache 2xx and 4xx; never cache 5xx (those indicate transient errors).
      if (response.status < 500) {
        const body = await response.text();
        set(key, {
          body,
          status: response.status,
          headers: [...response.headers.entries()],
          expiresAt: Date.now() + ttlMs,
        });
        return new Response(body, {
          status: response.status,
          headers: [
            ...response.headers.entries(),
            ["Cache-Control", "public, max-age=300"],
          ],
        });
      }

      return response;
    };
  }

  function wrapRoutes<T extends Record<string, any>>(
    routes: T,
    opts?: { exclude?: Set<string> },
  ): T {
    if (disabled) return routes;

    return Object.fromEntries(
      Object.entries(routes).map(([path, value]) => {
        if (value instanceof Response) return [path, value];
        if (opts?.exclude?.has(path)) return [path, value];
        return [path, { GET: wrapHandler(value.GET) }];
      }),
    ) as T;
  }

  return {
    wrapRoutes,
    size: () => {
      const now = Date.now();
      let live = 0;
      for (const entry of store.values()) {
        if (entry.expiresAt > now) live++;
      }
      return live;
    },
  };
}
