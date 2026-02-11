import type { Database } from "bun:sqlite";

/**
 * Temporary cleanup state:
 * VaskiData import is intentionally disabled until the new schema and migrator
 * are implemented.
 */
export default (_db: Database) => {
  return async (_row: any) => {
    // no-op by design
  };
};

export function flushVotes() {
  // no-op by design
}
