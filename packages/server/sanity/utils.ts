export const VIOLATION_CLIENT_LIMIT = 200;

export function computeViolationKey(row: Record<string, unknown>): string {
  const sorted = Object.entries(row).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sorted);
}
