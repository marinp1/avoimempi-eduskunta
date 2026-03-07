import type { Database } from "bun:sqlite";

export type Severity = "error" | "warning" | "info";
export type ResolutionStatus = "unresolved" | "bug" | "data_source_issue";

export interface SanityCheckDefinition {
  id: string;
  category: string;
  severity: Severity;
  name: string;
  description: string;
  /** Returns violation rows — zero rows means the check passes. */
  query: (db: Database) => Record<string, unknown>[];
}

export interface CheckResolution {
  status: ResolutionStatus;
  summary: string;
  updatedAt: string;
}

export interface ViolationRow extends Record<string, unknown> {
  _key: string;
}

export interface SanityCheckResult {
  id: string;
  category: string;
  severity: Severity;
  name: string;
  description: string;
  /** True when violations is empty and no query error occurred. */
  passed: boolean;
  /** Capped at VIOLATION_CLIENT_LIMIT — use totalViolations for the full count. */
  violations: ViolationRow[];
  /** Full count of violations before the client cap was applied. */
  totalViolations: number;
  resolution: CheckResolution | null;
  /** Maps violationKey → comment text. */
  violationComments: Record<string, string>;
  /** Set when the query itself threw an error. */
  error?: string;
}

export interface SanityRunResponse {
  checks: SanityCheckResult[];
  /** Stored resolutions whose check ID no longer exists in checks.ts. */
  orphanedResolutions: Array<{ checkId: string; resolution: CheckResolution }>;
  ranAt: string;
}
