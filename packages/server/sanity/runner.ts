import type { Database } from "bun:sqlite";
import { sanityChecks } from "./checks";
import type { ResolutionStore } from "./resolution-store";
import type { SanityRunResponse, ViolationRow } from "./types";
import { computeViolationKey, VIOLATION_CLIENT_LIMIT } from "./utils";

export function runSanityChecks(
  db: Database,
  resolutionStore: ResolutionStore,
): SanityRunResponse {
  const allResolutions = resolutionStore.getAllResolutions();
  const allComments = resolutionStore.getAllViolationComments();
  const knownCheckIds = new Set(sanityChecks.map((c) => c.id));

  const checks = sanityChecks.map((check) => {
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

    return {
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
  });

  const orphanedResolutions = [...allResolutions.entries()]
    .filter(([checkId]) => !knownCheckIds.has(checkId))
    .map(([checkId, resolution]) => ({ checkId, resolution }));

  return {
    checks,
    orphanedResolutions,
    ranAt: new Date().toISOString(),
  };
}
