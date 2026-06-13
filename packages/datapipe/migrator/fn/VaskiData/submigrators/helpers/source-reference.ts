function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

const PARLIAMENT_IDENTIFIER_PATTERN =
  /\b([A-ZÄÖ][A-Za-zÄÖäö]{0,4} \d+\/\d{4} vp)\b/;

/**
 * Resolves the originating document identifier (e.g. "HE 2/2026 vp") from a
 * VireilletuloAsia / Vireilletulo node. The identifier location varies across
 * years: a dedicated EduskuntaTunnus field, an AsiakirjaViiteTunnus inside
 * KappaleKooste (object or array), or only embedded in prose text.
 */
export function extractSourceReference(
  vireilletulo: Record<string, any> | undefined | null,
): string | null {
  if (!vireilletulo || typeof vireilletulo !== "object") return null;

  const direct =
    normalizeText(vireilletulo.EduskuntaTunnus) ||
    normalizeText(vireilletulo.EduskuntaTunnusTeksti);
  if (direct) return direct;

  const prose: string[] = [];
  for (const item of normalizeArray<unknown>(vireilletulo.KappaleKooste)) {
    if (typeof item === "string") {
      prose.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    for (const candidate of normalizeArray<unknown>(
      record.AsiakirjaViiteTunnus,
    )) {
      const normalized = normalizeText(candidate);
      if (normalized) return normalized;
    }
    const text = normalizeText(record["#text"]);
    if (text) prose.push(text);
  }

  const match = prose.join(" ").match(PARLIAMENT_IDENTIFIER_PATTERN);
  return match ? match[1] : null;
}
