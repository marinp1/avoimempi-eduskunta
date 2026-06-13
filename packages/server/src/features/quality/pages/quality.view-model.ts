import type {
  CheckOutcome,
  CheckStatus,
  RunState,
  Severity,
} from "../quality.types";

export interface DisplayCheck {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  status: CheckStatus;
  totalViolations: number;
  /** Sample violation rows flattened to column/value display pairs. */
  sample: Array<Array<{ column: string; value: string }>>;
  error?: string;
  /** Investigated root-cause explanation shown when the check fails. */
  findingNotes?: string;
  durationLabel: string;
}

export interface QualityViewModel {
  phase: RunState["phase"];
  progress: { done: number; total: number };
  currentName: string | null;
  summary: { passed: number; failed: number; errored: number; total: number };
  groups: Array<{ category: string; checks: DisplayCheck[] }>;
  finishedAt: string | null;
  totalDurationLabel: string | null;
}

export function formatDuration(ms: number): string {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "–";
  return String(value);
}

function toDisplayCheck(outcome: CheckOutcome): DisplayCheck {
  return {
    id: outcome.id,
    name: outcome.name,
    description: outcome.description,
    severity: outcome.severity,
    status: outcome.status,
    totalViolations: outcome.totalViolations,
    sample: outcome.sample.map((row) =>
      Object.entries(row).map(([column, value]) => ({
        column,
        value: formatValue(value),
      })),
    ),
    error: outcome.error,
    findingNotes: outcome.findingNotes,
    durationLabel: formatDuration(outcome.durationMs),
  };
}

function groupByCategory(
  outcomes: CheckOutcome[],
): Array<{ category: string; checks: DisplayCheck[] }> {
  const groups: Array<{ category: string; checks: DisplayCheck[] }> = [];
  const byCategory = new Map<string, DisplayCheck[]>();
  for (const outcome of outcomes) {
    let checks = byCategory.get(outcome.category);
    if (!checks) {
      checks = [];
      byCategory.set(outcome.category, checks);
      groups.push({ category: outcome.category, checks });
    }
    checks.push(toDisplayCheck(outcome));
  }
  return groups;
}

export function buildQualityViewModel(state: RunState): QualityViewModel {
  if (state.phase === "idle") {
    return {
      phase: "idle",
      progress: { done: 0, total: 0 },
      currentName: null,
      summary: { passed: 0, failed: 0, errored: 0, total: 0 },
      groups: [],
      finishedAt: null,
      totalDurationLabel: null,
    };
  }

  const summary = {
    passed: state.completed.filter((c) => c.status === "pass").length,
    failed: state.completed.filter((c) => c.status === "fail").length,
    errored: state.completed.filter((c) => c.status === "error").length,
    total: state.total,
  };

  return {
    phase: state.phase,
    progress: { done: state.completed.length, total: state.total },
    currentName: state.phase === "running" ? state.current.name : null,
    summary,
    groups: groupByCategory(state.completed),
    finishedAt: state.phase === "complete" ? state.finishedAt : null,
    totalDurationLabel:
      state.phase === "complete" ? formatDuration(state.durationMs) : null,
  };
}
