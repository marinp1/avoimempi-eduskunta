import { type TableName, TableNames } from "#constants";
import { getStorage } from "#storage";

export interface TableCountRow {
  tableName: TableName;
  rowCount: number;
}

interface ExactCountResult {
  rowCount: number;
  requestCount: number;
}

interface TableRowsPageResponse {
  rowCount: number;
  hasMore: boolean;
}

export interface ExactTableCountOptions {
  pageSize?: number;
  maxRequests?: number;
  timeoutMs?: number;
  concurrency?: number;
  log?: boolean;
  tableName?: TableName;
  tableNames?: readonly TableName[];
  candidateRowCount?: number;
  candidateRowCounts?: Record<string, number>;
  skipOnError?: boolean;
  fallbackToCandidateOnError?: boolean;
}

export interface CachedTableCountOptions extends ExactTableCountOptions {
  cacheKey?: string;
  cacheTtlMs?: number;
  useStaleWhileRefreshing?: boolean;
}

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_CACHE_KEY = "metadata/api-table-counts.json";
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_SEARCH_PAGE = 1_000_000_000;
const KNOWN_TABLE_NAMES = new Set<string>(TableNames);

interface CacheStore {
  loaded: boolean;
  loadInFlight: Promise<void> | null;
  counts: Record<string, number>;
  updatedAtMs: Record<string, number>;
  inFlightByScope: Map<string, Promise<Record<string, number>>>;
  backgroundScopes: Set<string>;
}

interface PersistedCacheFile {
  entries?: Array<{
    tableName: TableName;
    rowCount: number;
    updatedAt: string;
  }>;
}

const cacheStoresByKey = new Map<string, CacheStore>();

function getCacheStore(cacheKey: string): CacheStore {
  const existing = cacheStoresByKey.get(cacheKey);
  if (existing) return existing;

  const created: CacheStore = {
    loaded: false,
    loadInFlight: null,
    counts: {},
    updatedAtMs: {},
    inFlightByScope: new Map(),
    backgroundScopes: new Set(),
  };
  cacheStoresByKey.set(cacheKey, created);
  return created;
}

function resolveTargetTableNames(
  options?: ExactTableCountOptions,
): TableName[] {
  const requestedNames: TableName[] = [];

  if (options?.tableName) {
    requestedNames.push(options.tableName);
  }

  if (options?.tableNames) {
    requestedNames.push(...options.tableNames);
  }

  if (requestedNames.length === 0) {
    return [...TableNames];
  }

  const uniqueOrderedNames: TableName[] = [];

  for (const tableName of requestedNames) {
    if (!KNOWN_TABLE_NAMES.has(tableName)) {
      throw new Error(`Unknown table name: ${tableName}`);
    }

    if (!uniqueOrderedNames.includes(tableName)) {
      uniqueOrderedNames.push(tableName);
    }
  }

  return uniqueOrderedNames;
}

function resolveCandidateRowCountFromOptions(
  tableName: string,
  options?: ExactTableCountOptions,
): number | null {
  const fromMap = options?.candidateRowCounts?.[tableName];
  if (typeof fromMap === "number" && Number.isFinite(fromMap) && fromMap >= 0) {
    return Math.trunc(fromMap);
  }

  const fromSingle = options?.candidateRowCount;
  const singleTableMatch =
    options?.tableName === tableName ||
    (options?.tableNames?.length === 1 && options.tableNames[0] === tableName);

  if (
    singleTableMatch &&
    typeof fromSingle === "number" &&
    Number.isFinite(fromSingle) &&
    fromSingle >= 0
  ) {
    return Math.trunc(fromSingle);
  }

  return null;
}

async function fetchRowsPage(params: {
  tableName: string;
  page: number;
  pageSize: number;
  timeoutMs: number;
}): Promise<TableRowsPageResponse> {
  const url = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${params.tableName}/rows`,
  );
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(params.timeoutMs),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${params.tableName} rows page ${params.page}: HTTP ${response.status}`,
    );
  }

  return (await response.json()) as TableRowsPageResponse;
}

/**
 * Resolve exact row count for one table through 0-based rows pagination.
 */
export async function getExactTableCountByRows(
  tableName: string,
  options?: ExactTableCountOptions,
): Promise<number> {
  const result = await getExactTableCountWithMetadataByRows(
    tableName,
    options,
    resolveCandidateRowCountFromOptions(tableName, options),
  );
  return result.rowCount;
}

async function getExactTableCountWithMetadataByRows(
  tableName: string,
  options?: ExactTableCountOptions,
  candidateRowCount?: number | null,
): Promise<ExactCountResult> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pageCache = new Map<number, TableRowsPageResponse>();
  let requestCount = 0;

  const getPage = async (page: number): Promise<TableRowsPageResponse> => {
    const cached = pageCache.get(page);
    if (cached) return cached;

    requestCount += 1;
    if (requestCount > maxRequests) {
      throw new Error(
        `Request limit exceeded for ${tableName}: ${requestCount} > ${maxRequests}`,
      );
    }

    const result = await fetchRowsPage({
      tableName,
      page,
      pageSize,
      timeoutMs,
    });
    pageCache.set(page, result);
    return result;
  };

  const firstPage = await getPage(0);
  if (firstPage.rowCount === 0) {
    return {
      rowCount: 0,
      requestCount,
    };
  }
  if (!firstPage.hasMore) {
    return {
      rowCount: firstPage.rowCount,
      requestCount,
    };
  }

  let lowPageWithMore = 0;
  let highCandidate = 1;
  const candidatePage =
    candidateRowCount !== null &&
    candidateRowCount !== undefined &&
    candidateRowCount > 0
      ? Math.min(
          Math.max(Math.floor((candidateRowCount - 1) / pageSize), 1),
          MAX_SEARCH_PAGE,
        )
      : null;

  if (candidatePage !== null) {
    const candidatePageData = await getPage(candidatePage);
    if (candidatePageData.hasMore) {
      lowPageWithMore = candidatePage;
      highCandidate = Math.max(candidatePage * 2, candidatePage + 1);
    } else {
      lowPageWithMore = 0;
      highCandidate = candidatePage;
    }
  }

  while (true) {
    if (highCandidate > MAX_SEARCH_PAGE) {
      throw new Error(`Search limit exceeded for table ${tableName}`);
    }

    const page = await getPage(highCandidate);
    if (!page.hasMore) break;

    lowPageWithMore = highCandidate;
    highCandidate *= 2;
  }

  while (lowPageWithMore + 1 < highCandidate) {
    const mid = Math.floor((lowPageWithMore + highCandidate) / 2);
    const page = await getPage(mid);

    if (page.hasMore) {
      lowPageWithMore = mid;
    } else {
      highCandidate = mid;
    }
  }

  const lastPage = await getPage(highCandidate);
  return {
    rowCount: highCandidate * pageSize + lastPage.rowCount,
    requestCount,
  };
}

/**
 * Return all table counts in /tables/counts-compatible shape.
 */
export async function getExactTableCountsByRows(
  options?: ExactTableCountOptions,
): Promise<TableCountRow[]> {
  const targetTables = resolveTargetTableNames(options);
  const counts: Array<TableCountRow | undefined> = new Array(
    targetTables.length,
  );
  const errors: string[] = [];
  const concurrency = Math.max(
    1,
    Math.min(options?.concurrency ?? DEFAULT_CONCURRENCY, targetTables.length),
  );
  const log = options?.log ?? false;
  const skipOnError = options?.skipOnError ?? false;
  const fallbackToCandidateOnError =
    options?.fallbackToCandidateOnError ?? false;
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= targetTables.length) {
        return;
      }

      const tableName = targetTables[index];
      const candidate = resolveCandidateRowCountFromOptions(tableName, options);

      try {
        const { rowCount, requestCount } =
          await getExactTableCountWithMetadataByRows(
            tableName,
            options,
            candidate,
          );
        if (log) {
          console.log(
            `[exact-counts] ${tableName}: ${requestCount} fetch call(s), ${rowCount.toLocaleString()} rows`,
          );
        }
        counts[index] = { tableName, rowCount };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (
          fallbackToCandidateOnError &&
          typeof candidate === "number" &&
          Number.isFinite(candidate) &&
          candidate >= 0
        ) {
          const fallbackCount = Math.trunc(candidate);
          if (log) {
            console.warn(
              `[exact-counts] ${tableName}: ${message}. Falling back to candidate=${fallbackCount.toLocaleString()}`,
            );
          }
          counts[index] = { tableName, rowCount: fallbackCount };
          continue;
        }

        if (skipOnError) {
          if (log) {
            console.warn(
              `[exact-counts] ${tableName}: ${message}. Skipping table.`,
            );
          }
          continue;
        }

        errors.push(`${tableName}: ${message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (errors.length > 0) {
    throw new Error(
      `Failed to resolve exact row counts for ${errors.length} table(s): ${errors.join("; ")}`,
    );
  }

  return counts.filter((row): row is TableCountRow => row !== undefined);
}

export async function getExactTableCountMapByRows(
  options?: ExactTableCountOptions,
): Promise<Record<string, number>> {
  const rows = await getExactTableCountsByRows(options);
  return Object.fromEntries(rows.map((row) => [row.tableName, row.rowCount]));
}

async function ensureCacheLoaded(
  cacheKey: string,
  cache: CacheStore,
): Promise<void> {
  if (cache.loaded) return;
  if (cache.loadInFlight) {
    await cache.loadInFlight;
    return;
  }

  cache.loadInFlight = (async () => {
    const storage = getStorage();
    const raw = await storage.get(cacheKey);
    if (!raw) {
      cache.loaded = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedCacheFile;
      if (!Array.isArray(parsed.entries)) {
        cache.loaded = true;
        return;
      }

      for (const entry of parsed.entries) {
        if (!entry || typeof entry !== "object") continue;
        if (
          typeof entry.tableName !== "string" ||
          typeof entry.rowCount !== "number" ||
          !Number.isFinite(entry.rowCount) ||
          typeof entry.updatedAt !== "string"
        ) {
          continue;
        }

        const updatedAtMs = Date.parse(entry.updatedAt);
        if (!Number.isFinite(updatedAtMs)) continue;

        cache.counts[entry.tableName] = Math.max(0, Math.trunc(entry.rowCount));
        cache.updatedAtMs[entry.tableName] = updatedAtMs;
      }
    } catch (error) {
      console.warn(`[exact-counts] failed to parse cache ${cacheKey}:`, error);
    } finally {
      cache.loaded = true;
    }
  })().finally(() => {
    cache.loadInFlight = null;
  });

  await cache.loadInFlight;
}

async function persistCache(
  cacheKey: string,
  cache: CacheStore,
): Promise<void> {
  const storage = getStorage();
  const entries = Object.keys(cache.counts)
    .sort()
    .map((tableName) => ({
      tableName,
      rowCount: cache.counts[tableName],
      updatedAt: new Date(
        cache.updatedAtMs[tableName] ?? Date.now(),
      ).toISOString(),
    }));

  await storage.put(cacheKey, JSON.stringify({ entries }, null, 2));
}

function isCacheFresh(
  cache: CacheStore,
  tableName: TableName,
  nowMs: number,
  cacheTtlMs: number,
): boolean {
  const updatedAtMs = cache.updatedAtMs[tableName];
  if (!Number.isFinite(updatedAtMs)) return false;
  return nowMs - updatedAtMs <= cacheTtlMs;
}

function updateCacheCount(
  cache: CacheStore,
  tableName: TableName,
  rowCount: number,
  nowMs: number,
) {
  cache.counts[tableName] = Math.max(0, Math.trunc(rowCount));
  cache.updatedAtMs[tableName] = nowMs;
}

async function fetchAndStoreCounts(params: {
  cacheKey: string;
  cache: CacheStore;
  tableNames: TableName[];
  options?: CachedTableCountOptions;
}): Promise<Record<string, number>> {
  const nowMs = Date.now();
  const fetched = await getExactTableCountMapByRows({
    ...params.options,
    tableNames: params.tableNames,
    skipOnError: true,
    fallbackToCandidateOnError: true,
    log: params.options?.log ?? false,
  });

  const result: Record<string, number> = {};

  for (const tableName of params.tableNames) {
    const fallbackCandidate = resolveCandidateRowCountFromOptions(
      tableName,
      params.options,
    );
    const rowCount = fetched[tableName] ?? fallbackCandidate ?? 0;
    updateCacheCount(params.cache, tableName, rowCount, nowMs);
    result[tableName] = rowCount;
  }

  await persistCache(params.cacheKey, params.cache);
  return result;
}

export async function getCachedTableCountMapByRows(
  options?: CachedTableCountOptions,
): Promise<Record<string, number>> {
  const tableNames = resolveTargetTableNames(options);
  const cacheKey = options?.cacheKey ?? DEFAULT_CACHE_KEY;
  const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const useStaleWhileRefreshing = options?.useStaleWhileRefreshing ?? true;
  const cache = getCacheStore(cacheKey);
  await ensureCacheLoaded(cacheKey, cache);

  const nowMs = Date.now();
  const cachedResult: Partial<Record<TableName, number>> = {};
  const missing: TableName[] = [];
  const stale: TableName[] = [];

  for (const tableName of tableNames) {
    const cached = cache.counts[tableName];
    if (!Number.isFinite(cached)) {
      missing.push(tableName);
      continue;
    }

    cachedResult[tableName] = cached;
    if (!isCacheFresh(cache, tableName, nowMs, cacheTtlMs)) {
      stale.push(tableName);
    }
  }

  const hasCachedForAll =
    Object.keys(cachedResult).length === tableNames.length;

  if (hasCachedForAll && stale.length > 0 && useStaleWhileRefreshing) {
    const staleScope = Array.from(new Set(stale)).sort().join("|");
    if (!cache.backgroundScopes.has(staleScope)) {
      cache.backgroundScopes.add(staleScope);
      void fetchAndStoreCounts({
        cacheKey,
        cache,
        tableNames: stale,
        options,
      })
        .catch((error) => {
          console.warn("[exact-counts] background refresh failed:", error);
        })
        .finally(() => {
          cache.backgroundScopes.delete(staleScope);
        });
    }
    return cachedResult;
  }

  if (hasCachedForAll && stale.length === 0) {
    return cachedResult;
  }

  const toFetch = Array.from(new Set([...missing, ...stale]));
  const scopeKey = toFetch.sort().join("|");
  const existingInFlight = cache.inFlightByScope.get(scopeKey);
  if (existingInFlight) {
    const fetched = await existingInFlight;
    return {
      ...cachedResult,
      ...fetched,
    };
  }

  const fetchPromise = fetchAndStoreCounts({
    cacheKey,
    cache,
    tableNames: toFetch,
    options,
  });
  cache.inFlightByScope.set(scopeKey, fetchPromise);

  try {
    const fetched = await fetchPromise;
    return {
      ...cachedResult,
      ...fetched,
    };
  } catch (error) {
    console.error("[exact-counts] failed to fetch table counts:", error);
    const fallback = { ...cachedResult };
    for (const tableName of toFetch) {
      const fallbackCandidate = resolveCandidateRowCountFromOptions(
        tableName,
        options,
      );
      fallback[tableName] = fallback[tableName] ?? fallbackCandidate ?? 0;
    }
    return fallback;
  } finally {
    cache.inFlightByScope.delete(scopeKey);
  }
}
