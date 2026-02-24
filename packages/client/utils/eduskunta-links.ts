export const EDUSKUNTA_BASE_URL = "https://www.eduskunta.fi";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const EDUSKUNTA_RELATIVE_PATH_PATTERN = /^(fi\/|valtiopaivaasiakirjat\/)/i;

export const toEduskuntaUrl = (href: string): string => {
  const normalized = href.trim();
  if (!normalized) return EDUSKUNTA_BASE_URL;
  if (HTTP_URL_PATTERN.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      return `${EDUSKUNTA_BASE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return EDUSKUNTA_BASE_URL;
    }
  }
  if (normalized.startsWith("/")) return `${EDUSKUNTA_BASE_URL}${normalized}`;
  return `${EDUSKUNTA_BASE_URL}/${normalized}`;
};

export const isEduskuntaOfficialUrl = (href?: string | null): boolean => {
  if (!href) return false;
  const normalized = href.trim();
  if (!normalized) return false;
  if (normalized.startsWith("/")) return true;
  if (EDUSKUNTA_RELATIVE_PATH_PATTERN.test(normalized)) return true;
  if (!HTTP_URL_PATTERN.test(normalized)) return false;
  try {
    const { hostname } = new URL(normalized);
    return hostname === "eduskunta.fi" || hostname === "www.eduskunta.fi";
  } catch {
    return false;
  }
};
