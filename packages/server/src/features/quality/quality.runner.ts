import type { Database } from "bun:sqlite";
import type {
  CheckOutcome,
  RunState,
  SanityCheckDefinition,
} from "./quality.types";

export const SAMPLE_LIMIT = 5;

export function executeCheck(
  db: Database,
  check: SanityCheckDefinition,
  now: () => number = () => performance.now(),
): CheckOutcome {
  const startedAt = now();
  let error: string | undefined;
  let totalViolations = 0;
  let sample: Record<string, unknown>[] = [];
  try {
    const rows = check.query(db);
    totalViolations = rows.length;
    // Drop everything beyond the sample so huge violation sets can't pin memory.
    sample = rows.slice(0, SAMPLE_LIMIT);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return {
    id: check.id,
    category: check.category,
    severity: check.severity,
    name: check.name,
    description: check.description,
    status: error ? "error" : totalViolations > 0 ? "fail" : "pass",
    totalViolations,
    sample,
    error,
    findingNotes: check.findingNotes,
    durationMs: now() - startedAt,
  };
}

/**
 * Runs the sanity check suite sequentially against the (synchronous) SQLite
 * connection, yielding the event loop between checks so the server stays
 * responsive while the suite executes at startup.
 */
export class SanityRunner {
  private state: RunState = { phase: "idle" };
  private runPromise: Promise<void> | null = null;

  constructor(
    private readonly db: Database,
    private readonly checks: SanityCheckDefinition[],
    private readonly opts: { yieldFn?: () => Promise<void> } = {},
  ) {}

  getState(): RunState {
    return structuredClone(this.state);
  }

  start(): Promise<void> {
    this.runPromise ??= this.run();
    return this.runPromise;
  }

  private async run(): Promise<void> {
    const yieldFn = this.opts.yieldFn ?? (() => Bun.sleep(0));
    const startedAt = new Date().toISOString();
    const startedMs = performance.now();
    const completed: CheckOutcome[] = [];
    try {
      for (const check of this.checks) {
        this.state = {
          phase: "running",
          startedAt,
          total: this.checks.length,
          completed,
          current: { id: check.id, name: check.name },
        };
        await yieldFn();
        completed.push(executeCheck(this.db, check));
      }
    } finally {
      this.state = {
        phase: "complete",
        startedAt,
        finishedAt: new Date().toISOString(),
        total: this.checks.length,
        completed,
        durationMs: performance.now() - startedMs,
      };
    }
  }
}
