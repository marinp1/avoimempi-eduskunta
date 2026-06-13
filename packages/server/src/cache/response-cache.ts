type RouteHandler = (req: Request) => Promise<Response>;

type CacheEntry = {
  /** Gzip-compressed body (Buffer). */
  compressed: Uint8Array;
  /** Byte length of the compressed body. */
  compressedSize: number;
  /** Byte length of the uncompressed body (used for Content-Length when served raw). */
  rawSize: number;
  status: number;
  /** Original Content-Type header value (the only response header we preserve). */
  contentType: string | null;
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
   * Maximum number of entries in the cache. When the ceiling is reached,
   * expired entries are purged first; if still full, the oldest entry is
   * evicted (FIFO) to admit the new one. This prevents unbounded memory
   * growth from large query-string parameter spaces. Default: 2000.
   */
  maxEntries?: number;
  /**
   * Maximum total bytes of (compressed) bodies stored in the cache. When
   * exceeded, oldest entries are evicted until total size is under the cap.
   * Default: 100 MiB.
   */
  maxBytes?: number;
};

export type WrapRoutesOptions = {
  exclude?: Set<string>;
  /**
   * Override the default cache key (`pathname + search`). Use this when the
   * same URL can return different content depending on request headers — for
   * example, htmx page routes that return a fragment when `HX-Request: true`
   * and a full page otherwise. Without a custom key those two variants would
   * collide in the cache.
   */
  cacheKey?: (req: Request, url: URL) => string;
};

export type ResponseCache = {
  /**
   * Wraps all GET handlers in `routes` with caching. Static `Response`
   * instances and any paths listed in `exclude` are passed through unchanged.
   */
  wrapRoutes: <T extends Record<string, any>>(
    routes: T,
    opts?: WrapRoutesOptions,
  ) => T;
  /** Number of live (non-expired) entries currently held in the cache. */
  size: () => number;
};

const DEFAULT_MAX_ENTRIES = 2000;
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;

export function createResponseCache(
  options: ResponseCacheOptions,
): ResponseCache {
  const {
    generationKey,
    ttlMs = 5 * 60 * 1000,
    maxEntries = DEFAULT_MAX_ENTRIES,
    maxBytes = DEFAULT_MAX_BYTES,
  } = options;
  const disabled = generationKey === null;
  const store = new Map<string, CacheEntry>();
  let totalBytes = 0;
  /** In-flight request dedup: Map<key, Promise<void>>. Each promise resolves
   * when the entry has been stored in the cache (or on failure). */
  const pending = new Map<string, Promise<void>>();

  function evictEntry(key: string, entry: CacheEntry): void {
    totalBytes -= entry.compressedSize;
    store.delete(key);
  }

  function get(key: string): CacheEntry | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      evictEntry(key, entry);
      return null;
    }
    return entry;
  }

  function evictOldest(): void {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) return;
    const entry = store.get(oldestKey);
    if (entry) evictEntry(oldestKey, entry);
  }

  function set(key: string, entry: CacheEntry): void {
    while (
      store.size >= maxEntries ||
      totalBytes + entry.compressedSize > maxBytes
    ) {
      if (store.size === 0) break;
      const now = Date.now();
      let evicted = false;
      for (const [k, v] of store) {
        if (v.expiresAt <= now) {
          evictEntry(k, v);
          evicted = true;
        }
      }
      if (!evicted) evictOldest();
    }
    store.set(key, entry);
    totalBytes += entry.compressedSize;
  }

  function serveFromCache(
    entry: CacheEntry,
    req: Request,
    staleHeaders: Set<string>,
  ): Response {
    const acceptEncoding = req.headers.get("Accept-Encoding") ?? "";
    const acceptsGzip = acceptEncoding.includes("gzip");
    const headers = new Headers();
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Cache", "HIT");
    headers.set("Vary", "Accept-Encoding");

    if (entry.contentType) {
      headers.set("Content-Type", entry.contentType);
      staleHeaders.delete("content-type");
    }

    // Strip any headers that are stale (from the original response).
    for (const h of staleHeaders) headers.set(h, "");

    if (acceptsGzip) {
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", String(entry.compressedSize));
      return new Response(
        new Uint8Array(entry.compressed) as unknown as ArrayBuffer,
        { status: entry.status, headers },
      );
    }

    headers.set("Content-Length", String(entry.rawSize));
    const decompressed = Bun.gunzipSync(
      new Uint8Array(entry.compressed) as Uint8Array<ArrayBuffer>,
    );
    return new Response(
      new Uint8Array(decompressed) as unknown as ArrayBuffer,
      { status: entry.status, headers },
    );
  }

  function wrapHandler(
    handler: RouteHandler,
    keyFn: (req: Request, url: URL) => string,
  ): RouteHandler {
    return async (req: Request) => {
      const url = new URL(req.url);
      const key = keyFn(req, url);

      const hit = get(key);
      if (hit) {
        return serveFromCache(hit, req, new Set());
      }

      // In-flight dedup: wait for an already-running handler to finish
      // caching, then serve from cache independently.
      const inflight = pending.get(key);
      if (inflight) {
        await inflight;
        const cached = get(key);
        if (cached) return serveFromCache(cached, req, new Set());
        // Handler failed (non-2xx) — fall through to execute ourselves.
      }

      // We are the handler for this key. Execute once, cache on success,
      // or save the response for non-cacheable requests to avoid re-execution.
      let savedResponse: Response | null = null;

      const promise = (async () => {
        try {
          const response = await handler(req);
          if (response.ok) {
            const body = await response.text();
            const compressed = Bun.gzipSync(new TextEncoder().encode(body));
            const entry: CacheEntry = {
              compressed,
              compressedSize: compressed.byteLength,
              rawSize: Buffer.byteLength(body, "utf8"),
              status: response.status,
              contentType: response.headers.get("Content-Type"),
              expiresAt: Date.now() + ttlMs,
            };
            set(key, entry);
          } else {
            savedResponse = response;
          }
        } finally {
          pending.delete(key);
        }
      })();

      pending.set(key, promise);
      await promise;

      const cached = get(key);
      if (cached) {
        return serveFromCache(cached, req, new Set());
      }

      if (savedResponse) return savedResponse;
      return handler(req);
    };
  }

  function wrapRoutes<T extends Record<string, any>>(
    routes: T,
    opts?: WrapRoutesOptions,
  ): T {
    if (disabled) return routes;

    const keyFn =
      opts?.cacheKey ??
      ((_req: Request, url: URL) => url.pathname + url.search);

    return Object.fromEntries(
      Object.entries(routes).map(([path, value]) => {
        if (value instanceof Response) return [path, value];
        if (opts?.exclude?.has(path)) return [path, value];
        return [path, { GET: wrapHandler(value.GET, keyFn) }];
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
