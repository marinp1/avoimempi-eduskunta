import type { Database } from "bun:sqlite";
import type {
  CheckResolution,
  ResolutionStatus,
  SanityRunResponse,
} from "./types";
import { VIOLATION_CLIENT_LIMIT } from "./utils";

export class ResolutionStore {
  constructor(private db: Database) {}

  getAllResolutions(): Map<string, CheckResolution> {
    const rows = this.db
      .query<
        {
          check_id: string;
          status: string;
          summary: string;
          updated_at: string;
        },
        []
      >(`SELECT check_id, status, summary, updated_at FROM CheckResolution`)
      .all();

    const map = new Map<string, CheckResolution>();
    for (const row of rows) {
      map.set(row.check_id, {
        status: row.status as ResolutionStatus,
        summary: row.summary,
        updatedAt: row.updated_at,
      });
    }
    return map;
  }

  upsertResolution(
    checkId: string,
    status: ResolutionStatus,
    summary: string,
  ): void {
    this.db
      .query(
        `INSERT INTO CheckResolution (check_id, status, summary, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (check_id) DO UPDATE SET
           status     = excluded.status,
           summary    = excluded.summary,
           updated_at = excluded.updated_at`,
      )
      .run(checkId, status, summary, new Date().toISOString());
  }

  deleteResolution(checkId: string): void {
    this.db
      .query(`DELETE FROM CheckResolution WHERE check_id = ?`)
      .run(checkId);
  }

  getAllViolationComments(): Map<string, Map<string, string>> {
    const rows = this.db
      .query<{ check_id: string; violation_key: string; comment: string }, []>(
        `SELECT check_id, violation_key, comment FROM ViolationComment`,
      )
      .all();

    const map = new Map<string, Map<string, string>>();
    for (const row of rows) {
      if (!map.has(row.check_id)) map.set(row.check_id, new Map());
      map.get(row.check_id)!.set(row.violation_key, row.comment);
    }
    return map;
  }

  getLastRun(): SanityRunResponse | null {
    const row = this.db
      .query<{ result_json: string }, []>(
        `SELECT result_json FROM LastRunResult WHERE id = 1`,
      )
      .get();
    if (!row) return null;

    const stored = JSON.parse(row.result_json) as Omit<
      SanityRunResponse,
      "checks"
    > & {
      checks: Array<
        Omit<
          SanityRunResponse["checks"][number],
          "resolution" | "violationComments"
        >
      >;
    };

    // Merge with live annotations so edits made after the run are reflected.
    const allResolutions = this.getAllResolutions();
    const allComments = this.getAllViolationComments();

    return {
      ...stored,
      checks: stored.checks.map((check) => ({
        ...check,
        totalViolations: check.violations.length,
        violations: check.violations.slice(0, VIOLATION_CLIENT_LIMIT),
        resolution: allResolutions.get(check.id) ?? null,
        violationComments: Object.fromEntries(allComments.get(check.id) ?? []),
      })),
    };
  }

  setLastRun(result: SanityRunResponse): void {
    // Strip annotations before storing — they live in their own tables and
    // are merged back in getLastRun(), so they're always fresh on read.
    const stripped = {
      ...result,
      checks: result.checks.map(
        ({ resolution: _r, violationComments: _vc, ...rest }) => rest,
      ),
    };
    this.db
      .query(
        `INSERT INTO LastRunResult (id, result_json, ran_at)
         VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET result_json = excluded.result_json, ran_at = excluded.ran_at`,
      )
      .run(JSON.stringify(stripped), result.ranAt);
  }

  upsertViolationComment(
    checkId: string,
    violationKey: string,
    comment: string,
  ): void {
    if (!comment.trim()) {
      this.db
        .query(
          `DELETE FROM ViolationComment WHERE check_id = ? AND violation_key = ?`,
        )
        .run(checkId, violationKey);
    } else {
      this.db
        .query(
          `INSERT INTO ViolationComment (check_id, violation_key, comment)
           VALUES (?, ?, ?)
           ON CONFLICT (check_id, violation_key) DO UPDATE SET comment = excluded.comment`,
        )
        .run(checkId, violationKey, comment);
    }
  }
}
