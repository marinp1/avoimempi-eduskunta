import { Database } from "bun:sqlite";
import fs from "node:fs";
import importSourceTableSummaryAggregate from "../queries/IMPORT_SOURCE_TABLE_SUMMARY_AGGREGATE.sql";
import importSourceTableSummary from "../queries/IMPORT_SOURCE_TABLE_SUMMARY.sql";

type ImportSourceSummaryRow = {
  imported_rows: number;
  distinct_pages: number;
  first_scraped_at: string | null;
  last_scraped_at: string | null;
  first_migrated_at: string | null;
  last_migrated_at: string | null;
};

export class ImportSourceRepository {
  private readonly traceDatabasePath: string | null;
  private traceDb: Database | null;

  constructor(
    private readonly db: Database,
    options?: { traceDatabasePath?: string },
  ) {
    this.traceDatabasePath = options?.traceDatabasePath ?? null;
    this.traceDb = this.openTraceDatabase(this.traceDatabasePath);
  }

  private openTraceDatabase(
    traceDatabasePath: string | null | undefined,
  ): Database | null {
    if (!traceDatabasePath || !fs.existsSync(traceDatabasePath)) {
      return null;
    }

    try {
      const traceDb = new Database(traceDatabasePath, {
        create: false,
        readonly: true,
      });
      traceDb.exec("PRAGMA query_only = ON;");
      traceDb.exec("PRAGMA temp_store = MEMORY;");
      traceDb.exec("PRAGMA cache_size = -65536;");
      traceDb.exec("PRAGMA mmap_size = 30000000000;");
      return traceDb;
    } catch (error) {
      console.warn(
        `Failed to open trace database at '${traceDatabasePath}', falling back to main database: ${String(error)}`,
      );
      return null;
    }
  }

  private getCandidateDatabases(): Database[] {
    if (!this.traceDb && this.traceDatabasePath) {
      this.traceDb = this.openTraceDatabase(this.traceDatabasePath);
    }
    return this.traceDb ? [this.traceDb, this.db] : [this.db];
  }

  private hasImportSourceReferenceTable(database: Database): boolean {
    const stmt = database.prepare<{ exists_flag: number }, { $name: string }>(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1",
    );
    const row = stmt.get({
      $name: "ImportSourceReference",
    });
    stmt.finalize();
    return !!row?.exists_flag;
  }

  private hasImportSourceReferenceSummaryTable(database: Database): boolean {
    const stmt = database.prepare<{ exists_flag: number }, { $name: string }>(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1",
    );
    const row = stmt.get({
      $name: "ImportSourceReferenceSummary",
    });
    stmt.finalize();
    return !!row?.exists_flag;
  }

  private hasImportSourceReferenceSummaryData(database: Database): boolean {
    if (!this.hasImportSourceReferenceSummaryTable(database)) {
      return false;
    }

    const stmt = database.prepare<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM ImportSourceReferenceSummary",
    );
    const row = stmt.get();
    stmt.finalize();
    return (row?.count ?? 0) > 0;
  }

  private hasImportSourceReferenceData(database: Database): boolean {
    if (!this.hasImportSourceReferenceTable(database)) {
      return false;
    }

    const stmt = database.prepare<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM ImportSourceReference",
    );
    const row = stmt.get();
    stmt.finalize();
    return (row?.count ?? 0) > 0;
  }

  private fetchFromSummaryTable(database: Database, tableNames: string[]) {
    const summaryStmt = database.prepare<
      ImportSourceSummaryRow,
      {
        $tableName: string;
      }
    >(importSourceTableSummaryAggregate);

    const tables = tableNames.map((tableName) => {
      const row = summaryStmt.get({
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

    summaryStmt.finalize();
    return { tables };
  }

  private fetchFromReferenceTable(database: Database, tableNames: string[]) {
    const detailStmt = database.prepare<
      ImportSourceSummaryRow,
      {
        $tableName: string;
      }
    >(importSourceTableSummary);

    const tables = tableNames.map((tableName) => {
      const row = detailStmt.get({
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

    detailStmt.finalize();

    return {
      tables,
    };
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

    const emptyRows = uniqueTableNames.map((tableName) => ({
      tableName,
      importedRows: 0,
      distinctPages: 0,
      firstScrapedAt: null,
      lastScrapedAt: null,
      firstMigratedAt: null,
      lastMigratedAt: null,
    }));

    for (const database of this.getCandidateDatabases()) {
      if (this.hasImportSourceReferenceSummaryData(database)) {
        return this.fetchFromSummaryTable(database, uniqueTableNames);
      }
    }

    for (const database of this.getCandidateDatabases()) {
      if (this.hasImportSourceReferenceData(database)) {
        return this.fetchFromReferenceTable(database, uniqueTableNames);
      }
    }

    return {
      tables: emptyRows,
    };
  }
}
