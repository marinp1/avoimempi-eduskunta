export const buildSearchQuery = (
  raw: string | null | undefined,
): string | null => {
  if (!raw) return null;
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  return tokens.join("%");
};

const sanitizeFtsToken = (token: string): string =>
  token.replaceAll('"', "").replaceAll("*", "").trim();

export const buildFtsSearchQuery = (
  raw: string | null | undefined,
): string | null => {
  if (!raw) return null;
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) => sanitizeFtsToken(token))
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `"${token}"*`).join(" AND ");
};

export const endDateExclusive = (
  endDate: string | null | undefined,
): string | null => {
  if (!endDate) return null;
  const parsed = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().substring(0, 10);
};

export const buildDocumentIdentifierVariants = (
  identifier: string,
): [string, string, string] => {
  const normalized = identifier.trim().replace(/\s+/g, " ");
  const withoutVp = normalized.replace(/\s+vp$/i, "");
  const withVp = withoutVp === "" ? normalized : `${withoutVp} vp`;
  return [normalized, withoutVp, withVp];
};

export const paginatedResult = <T>(
  items: T[],
  totalCount: number,
  page: number,
  limit: number,
) => ({
  items,
  totalCount,
  page,
  limit,
  totalPages: Math.ceil(totalCount / limit),
});
