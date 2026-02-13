import type { Database } from "bun:sqlite";
import type { VaskiEntry } from "../reader";

export default function createNimenhuutoraporttiSubMigrator(_db: Database) {
  return {
    async migrateRow(_row: VaskiEntry): Promise<void> {
      // Step 1 of migration split: registration and orchestration only.
      // Mapping logic will be implemented in the next phase.
    },
  };
}
