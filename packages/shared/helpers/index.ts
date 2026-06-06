/** Finnish date formatting: ISO → d.m.yyyy */
export function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

/** Timestamp for "haettu X kello Y" labels */
export function fetchedAt(): string {
  return new Date().toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Check if a request is an htmx partial navigation */
export function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

/** Type-safe route param extraction for Bun's matched routes */
export function getRouteParam(req: Request, name: string): string | undefined {
  return (req as { params?: Record<string, string> }).params?.[name];
}
