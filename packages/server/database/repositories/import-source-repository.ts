import type { Database } from "bun:sqlite";
import importSourceTableSummary from "../queries/IMPORT_SOURCE_TABLE_SUMMARY.sql";

export class ImportSourceRepository {
  constructor(private readonly db: Database) {}

  private hasImportSourceReferenceTable(): boolean {
    const stmt = this.db.prepare<{ exists_flag: number }, { $name: string }>(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1",
    );
    const row = stmt.get({
      $name: "ImportSourceReference",
    });
    stmt.finalize();
    return !!row?.exists_flag;
  }

  public fetchImportSourceTableSummaries(params: { tableNames: string[] }) {
    const uniqueTableNames = Array.from(
      new Set(
        params.tableNames
          .map((tableName) => tableName.trim())
          .filter((tableName) => tableName.length > 0),
      ),
    );

    if (uniqueTableNames.length === 0) {
      return {
        tables: [],
      };
    }

    if (!this.hasImportSourceReferenceTable()) {
      return {
        tables: uniqueTableNames.map((tableName) => ({
          tableName,
          importedRows: 0,
          distinctPages: 0,
          firstScrapedAt: null,
          lastScrapedAt: null,
          firstMigratedAt: null,
          lastMigratedAt: null,
        })),
      };
    }

    const stmt = this.db.prepare<
      {
        imported_rows: number;
        distinct_pages: number;
        first_scraped_at: string | null;
        last_scraped_at: string | null;
        first_migrated_at: string | null;
        last_migrated_at: string | null;
      },
      {
        $tableName: string;
      }
    >(importSourceTableSummary);

    const tables = uniqueTableNames.map((tableName) => {
      const row = stmt.get({
        $tableName: tableName,
      });

      return {
        tableName,
        importedRows: row?.imported_rows ?? 0,
        distinctPages: row?.distinct_pages ?? 0,
        firstScrapedAt: row?.first_scraped_at ?? null,
        lastScrapedAt: row?.last_scraped_at ?? null,
        firstMigratedAt: row?.first_migrated_at ?? null,
        lastMigratedAt: row?.last_migrated_at ?? null,
      };
    });

    stmt.finalize();

    return {
      tables,
    };
  }
}
