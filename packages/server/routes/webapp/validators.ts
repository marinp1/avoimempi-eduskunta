/** Returns the id if it is a non-empty string of digits, else null. */
export function validateNumericId(
  id: string | undefined | null,
): string | null {
  return id && /^\d+$/.test(id) ? id : null;
}
