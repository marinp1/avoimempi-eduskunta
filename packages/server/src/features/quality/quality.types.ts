import type { Database } from "bun:sqlite";

export type Severity = "error" | "warning" | "info";

export interface SanityCheckDefinition {
  id: string;
  category: string;
  severity: Severity;
  name: string;
  description: string;
  /** Returns violation rows — zero rows means the check passes. */
  query: (db: Database) => Record<string, unknown>[];
  /**
   * Finnish prose explaining the investigated root cause of known findings;
   * rendered on /laadunvalvonta when the check fails.
   */
  findingNotes?: string;
}

export type CheckStatus = "pass" | "fail" | "error";

export interface CheckOutcome {
  id: string;
  category: string;
  severity: Severity;
  name: string;
  description: string;
  status: CheckStatus;
  /** Full violation count — `sample` only holds the first SAMPLE_LIMIT rows. */
  totalViolations: number;
  sample: Record<string, unknown>[];
  /** Set when the query itself threw. */
  error?: string;
  findingNotes?: string;
  durationMs: number;
}

export type RunState =
  | { phase: "idle" }
  | {
      phase: "running";
      startedAt: string;
      total: number;
      completed: CheckOutcome[];
      current: { id: string; name: string };
    }
  | {
      phase: "complete";
      startedAt: string;
      finishedAt: string;
      total: number;
      completed: CheckOutcome[];
      durationMs: number;
    };
