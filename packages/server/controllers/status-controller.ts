// Status controller for public-facing data quality dashboard

import { DatabaseConnection } from "../database/db";
import {
  SanityCheckService,
  type SanityCheckResult,
} from "../services/sanity-checks";

export interface TableStatus {
  tableName: string;
  rowCount: number;
  hasData: boolean;
}

export interface DataOverview {
  tables: TableStatus[];
  totalTables: number;
  tablesWithData: number;
  lastUpdated: string;
}

export class StatusController {
  private sanityCheckService: SanityCheckService;
  private cachedOverview: DataOverview | null = null;
  private cachedSanityChecks: SanityCheckResult | null = null;

  constructor(private db: DatabaseConnection) {
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  private get database() {
    // Access the internal database connection
    return (this.db as any)["db"] as import("bun:sqlite").Database;
  }

  /** Clear cached results. Call after database rebuild. */
  invalidateCache(): void {
    this.cachedOverview = null;
    this.cachedSanityChecks = null;
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  async getSanityChecks(): Promise<SanityCheckResult> {
    if (!this.cachedSanityChecks) {
      this.cachedSanityChecks =
        await this.sanityCheckService.runAllChecks();
    }
    return this.cachedSanityChecks;
  }

  async getOverview(): Promise<DataOverview> {
    if (this.cachedOverview) {
      return this.cachedOverview;
    }

    // Get row counts for all major tables
    const tables = [
      "Representative",
      "Term",
      "Session",
      "Agenda",
      "Section",
      "Voting",
      "Vote",
      "Speech",
      "VotingDocumentLink",
      "SectionDocumentLink",
      "SessionNotice",
      "VotingDistribution",
      "SaliDBDocumentReference",
      "ParliamentaryGroup",
      "ParliamentaryGroupMembership",
      "Committee",
      "CommitteeMembership",
      "GovernmentMembership",
      "TrustPosition",
      "District",
      "RepresentativeDistrict",
      "VaskiDocument",
      "DocumentSubject",
      "DocumentRelationship",
    ];

    const tableStatuses: TableStatus[] = [];

    for (const tableName of tables) {
      try {
        const stmt = this.database.prepare<{ count: number }, []>(
          `SELECT COUNT(*) as count FROM ${tableName}`,
        );
        const row = stmt.get();
        stmt.finalize();
        const rowCount = row?.count ?? 0;

        tableStatuses.push({
          tableName,
          rowCount,
          hasData: rowCount > 0,
        });
      } catch (error) {
        console.error(`Error querying table ${tableName}:`, error);
        tableStatuses.push({
          tableName,
          rowCount: 0,
          hasData: false,
        });
      }
    }

    const tablesWithData = tableStatuses.filter((t) => t.hasData).length;

    this.cachedOverview = {
      tables: tableStatuses,
      totalTables: tables.length,
      tablesWithData,
      lastUpdated: new Date().toISOString(),
    };

    return this.cachedOverview;
  }

  async getTableDetails(tableName: string) {
    // Validate table name to prevent SQL injection
    const allowedTables = [
      "Representative",
      "Term",
      "Session",
      "Agenda",
      "Section",
      "Voting",
      "Vote",
      "Speech",
      "VotingDocumentLink",
      "SectionDocumentLink",
      "SessionNotice",
      "VotingDistribution",
      "SaliDBDocumentReference",
      "ParliamentaryGroup",
      "ParliamentaryGroupMembership",
      "Committee",
      "CommitteeMembership",
      "GovernmentMembership",
      "TrustPosition",
      "District",
      "RepresentativeDistrict",
      "VaskiDocument",
      "DocumentSubject",
      "DocumentRelationship",
    ];

    if (!allowedTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const countStmt = this.database.prepare<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );
    const countRow = countStmt.get();
    countStmt.finalize();
    const rowCount = countRow?.count ?? 0;

    // Get column info
    const columnsStmt = this.database.prepare<
      {
        name: string;
        type: string;
        notnull: number;
      },
      []
    >(`PRAGMA table_info(${tableName})`);
    const columns = columnsStmt.all();
    columnsStmt.finalize();

    return {
      tableName,
      rowCount,
      columns,
    };
  }
}
