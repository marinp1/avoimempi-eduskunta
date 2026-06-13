import { Database } from "bun:sqlite";

export interface TraceRecord {
  sourceTable: string;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: string | null;
  scrapedAt: string | null;
  migratedAt: string;
}

export interface TraceSummary {
  sourceTable: string;
  importedRows: number;
  firstScrapedAt: string | null;
  lastScrapedAt: string | null;
}

interface TraceRow {
  source_table: string;
  source_page: number | null;
  source_pk_name: string | null;
  source_pk_value: string | null;
  scraped_at: string | null;
  migrated_at: string;
}

interface SummaryRow {
  source_table: string;
  imported_rows: number;
  first_scraped_at: string | null;
  last_scraped_at: string | null;
}

function mapRow(row: TraceRow): TraceRecord {
  return {
    sourceTable: row.source_table,
    sourcePage: row.source_page,
    sourcePkName: row.source_pk_name,
    sourcePkValue: row.source_pk_value,
    scrapedAt: row.scraped_at,
    migratedAt: row.migrated_at,
  };
}

const SELECT_FIELDS =
  "source_table, source_page, source_pk_name, source_pk_value, scraped_at, migrated_at";

export class TraceRepository {
  constructor(private readonly db: Database) {}

  getProvenance(
    table: string,
    pkName: string,
    pkValue: string,
  ): TraceRecord | null {
    const row = this.db
      .query<TraceRow, [string, string, string]>(
        `SELECT ${SELECT_FIELDS} FROM ImportSourceReference
         WHERE source_table = ? AND source_pk_name = ? AND source_pk_value = ?
         LIMIT 1`,
      )
      .get(table, pkName, pkValue);
    return row ? mapRow(row) : null;
  }

  getSummary(table: string): TraceSummary | null {
    const row = this.db
      .query<SummaryRow, [string]>(
        `SELECT source_table, imported_rows, first_scraped_at, last_scraped_at
         FROM ImportSourceReferenceSummary WHERE source_table = ?`,
      )
      .get(table);
    if (!row) return null;
    return {
      sourceTable: row.source_table,
      importedRows: row.imported_rows,
      firstScrapedAt: row.first_scraped_at,
      lastScrapedAt: row.last_scraped_at,
    };
  }
}
