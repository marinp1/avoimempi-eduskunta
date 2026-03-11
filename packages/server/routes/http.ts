export const getSearchParams = (req: Request): URLSearchParams =>
  new URL(req.url).searchParams;

export const getOptionalQueryParam = (
  searchParams: URLSearchParams,
  key: string,
): string | undefined => searchParams.get(key) || undefined;

export const getIntegerQueryParam = (
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
): number => {
  const rawValue = searchParams.get(key);
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const getBoundedIntegerQueryParam = (
  searchParams: URLSearchParams,
  key: string,
  options: {
    fallback: number;
    min?: number;
    max?: number;
  },
): number => {
  const parsed = getIntegerQueryParam(searchParams, key, options.fallback);
  const withMin = Math.max(options.min ?? Number.MIN_SAFE_INTEGER, parsed);
  if (options.max === undefined) return withMin;
  return Math.min(withMin, options.max);
};

export const getOptionalIntegerQueryParam = (
  searchParams: URLSearchParams,
  key: string,
): number | undefined => {
  const rawValue = searchParams.get(key);
  if (!rawValue) return undefined;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getPageLimitQueryParams = (
  searchParams: URLSearchParams,
  options?: {
    pageFallback?: number;
    limitFallback?: number;
    minPage?: number;
    minLimit?: number;
    maxLimit?: number;
  },
): { page: number; limit: number } => {
  const page = Math.max(
    options?.minPage ?? 1,
    getIntegerQueryParam(searchParams, "page", options?.pageFallback ?? 1),
  );
  const limitWithMin = Math.max(
    options?.minLimit ?? 1,
    getIntegerQueryParam(searchParams, "limit", options?.limitFallback ?? 20),
  );
  const limit =
    options?.maxLimit !== undefined
      ? Math.min(limitWithMin, options.maxLimit)
      : limitWithMin;
  return { page, limit };
};

export const getLimitOffsetQueryParams = (
  searchParams: URLSearchParams,
  options?: {
    limitFallback?: number;
    offsetFallback?: number;
    minLimit?: number;
    minOffset?: number;
    maxLimit?: number;
  },
): { limit: number; offset: number } => {
  const limitWithMin = Math.max(
    options?.minLimit ?? 1,
    getIntegerQueryParam(searchParams, "limit", options?.limitFallback ?? 20),
  );
  const limit =
    options?.maxLimit !== undefined
      ? Math.min(limitWithMin, options.maxLimit)
      : limitWithMin;
  const offset = Math.max(
    options?.minOffset ?? 0,
    getIntegerQueryParam(searchParams, "offset", options?.offsetFallback ?? 0),
  );
  return { limit, offset };
};

type QueryParamKeyMap = Record<string, string>;

export const getMappedOptionalQueryParams = <TKeyMap extends QueryParamKeyMap>(
  searchParams: URLSearchParams,
  map: TKeyMap,
): { [K in keyof TKeyMap]: string | undefined } =>
  Object.fromEntries(
    Object.entries(map).map(([resultKey, queryKey]) => [
      resultKey,
      getOptionalQueryParam(searchParams, queryKey),
    ]),
  ) as { [K in keyof TKeyMap]: string | undefined };

export const getMappedPaginatedQueryParams = <TKeyMap extends QueryParamKeyMap>(
  searchParams: URLSearchParams,
  map: TKeyMap,
  options?: Parameters<typeof getPageLimitQueryParams>[1],
): { [K in keyof TKeyMap]: string | undefined } & {
  page: number;
  limit: number;
} => ({
  ...getMappedOptionalQueryParams(searchParams, map),
  ...getPageLimitQueryParams(searchParams, options),
});

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const validateDateRange = (
  searchParams: URLSearchParams,
): Response | null => {
  for (const key of ["startDate", "endDate"] as const) {
    const value = searchParams.get(key);
    if (value && !ISO_DATE_RE.test(value)) {
      return Response.json(
        { message: `Invalid ${key} format; expected YYYY-MM-DD` },
        { status: 400 },
      );
    }
  }
  return null;
};
