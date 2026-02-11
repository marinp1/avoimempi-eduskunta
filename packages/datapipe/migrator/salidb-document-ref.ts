const DOC_TUNNUS_RE =
  /\b([A-Za-zÅÄÖ]{1,4})\s*([0-9]+(?:\s*,\s*[0-9]+)*)\s*\/\s*(\d{4})\s*(vp|VP)\b/g;

export function extractDocumentTunnusCandidates(
  text?: string | null,
): string[] {
  if (!text) return [];
  const normalized = text.replace(/\+/g, " ");
  const matches: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = DOC_TUNNUS_RE.exec(normalized)) !== null) {
    const type = m[1].toUpperCase();
    const numbers = m[2]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const year = m[3];
    for (const num of numbers) {
      matches.push(`${type} ${num}/${year} vp`);
    }
  }

  return Array.from(new Set(matches));
}
