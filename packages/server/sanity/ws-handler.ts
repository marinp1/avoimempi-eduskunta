import type { Database } from "bun:sqlite";
import type { ServerWebSocket } from "bun";
import { sanityChecks } from "./checks";
import type { ResolutionStore } from "./resolution-store";
import type {
  SanityCheckResult,
  SanityRunResponse,
  ViolationRow,
} from "./types";
import { computeViolationKey, VIOLATION_CLIENT_LIMIT } from "./utils";

export type SanityWsMessage =
  | { type: "progress"; current: number; total: number; checkName: string }
  | { type: "check_result"; result: SanityCheckResult }
  | {
      type: "complete";
      ranAt: string;
      orphanedResolutions: SanityRunResponse["orphanedResolutions"];
    }
  | { type: "error"; message: string };

function send(ws: ServerWebSocket<undefined>, msg: SanityWsMessage): void {
  ws.send(JSON.stringify(msg));
}

async function runChecksStreaming(
  ws: ServerWebSocket<undefined>,
  db: Database,
  resolutionStore: ResolutionStore,
): Promise<void> {
  const allResolutions = resolutionStore.getAllResolutions();
  const allComments = resolutionStore.getAllViolationComments();
  const knownCheckIds = new Set(sanityChecks.map((c) => c.id));
  const total = sanityChecks.length;
  const results: SanityCheckResult[] = [];

  for (let i = 0; i < total; i++) {
    const check = sanityChecks[i];

    send(ws, {
      type: "progress",
      current: i + 1,
      total,
      checkName: check.name,
    });

    // Yield to the event loop so the progress message is flushed before the
    // synchronous SQLite query blocks the thread.
    await Bun.sleep(0);

    let error: string | undefined;
    let allViolations: ViolationRow[] = [];
    try {
      const rows = check.query(db);
      allViolations = rows.map((row) => ({
        ...row,
        _key: computeViolationKey(row),
      }));
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const resolution = allResolutions.get(check.id) ?? null;
    const commentMap = allComments.get(check.id) ?? new Map<string, string>();

    const result: SanityCheckResult = {
      id: check.id,
      category: check.category,
      severity: check.severity,
      name: check.name,
      description: check.description,
      passed: allViolations.length === 0 && !error,
      violations: allViolations.slice(0, VIOLATION_CLIENT_LIMIT),
      totalViolations: allViolations.length,
      resolution,
      violationComments: Object.fromEntries(commentMap),
      error,
    };

    // Store with full violations; client only receives the capped slice.
    results.push({ ...result, violations: allViolations });
    send(ws, { type: "check_result", result });
  }

  const orphanedResolutions = [...allResolutions.entries()]
    .filter(([checkId]) => !knownCheckIds.has(checkId))
    .map(([checkId, resolution]) => ({ checkId, resolution }));

  const completePayload: SanityRunResponse = {
    checks: results,
    orphanedResolutions,
    ranAt: new Date().toISOString(),
  };
  resolutionStore.setLastRun(completePayload);
  send(ws, {
    type: "complete",
    ranAt: completePayload.ranAt,
    orphanedResolutions,
  });
  ws.close();
}

export function createSanityWsHandler(
  db: Database,
  resolutionStore: ResolutionStore,
) {
  return {
    open(ws: ServerWebSocket<undefined>): void {
      runChecksStreaming(ws, db, resolutionStore).catch((err) => {
        try {
          send(ws, {
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
          ws.close();
        } catch {
          // ws already closed
        }
      });
    },
    message(_ws: ServerWebSocket<undefined>, _data: string | Buffer): void {
      // Client sends no messages; ignore.
    },
    close(_ws: ServerWebSocket<undefined>): void {},
  };
}
