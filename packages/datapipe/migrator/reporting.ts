import fs from "node:fs";
import path from "node:path";

export type ConsolidatedMigrationStatus = "success" | "failed" | "stopped";

type ReportCategory =
  | "info"
  | "skipped"
  | "warnings"
  | "errors"
  | "overrides"
  | "knownIssues";

export interface ConsolidatedMigrationEvent {
  category: ReportCategory;
  kind: "report" | "overwrite" | "known_issue";
  entity: string;
  reason: string | null;
  details: string | null;
  id: string | number | null;
  sourcePath: string | null;
  file: string;
}

export interface ConsolidatedMigrationEntityReport {
  counts: Record<ReportCategory, number> & { total: number };
  info: ConsolidatedMigrationEvent[];
  skipped: ConsolidatedMigrationEvent[];
  warnings: ConsolidatedMigrationEvent[];
  errors: ConsolidatedMigrationEvent[];
  overrides: ConsolidatedMigrationEvent[];
  knownIssues: ConsolidatedMigrationEvent[];
}

export interface ConsolidatedMigrationReport {
  run: {
    id: string;
    status: ConsolidatedMigrationStatus;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    error: string | null;
  };
  files: {
    reports: number;
    overwrites: number;
    knownIssues: number;
  };
  totals: Record<ReportCategory, number> & { total: number; entities: number };
  entities: Record<string, ConsolidatedMigrationEntityReport>;
}

export interface BuildConsolidatedMigrationReportOptions {
  runId: string;
  status: ConsolidatedMigrationStatus;
  startedAt: string;
  finishedAt: string;
  error?: string | null;
  reportDir: string;
  overwriteDir: string;
  knownIssueDir: string;
  rootDir: string;
}

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const parseDurationMs = (startedAt: string, finishedAt: string): number => {
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return end - start;
};

const listJsonFiles = (baseDir: string): string[] => {
  if (!fs.existsSync(baseDir)) return [];

  const files: string[] = [];
  const stack = [baseDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
};

const readJson = (filePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
};

const sourcePathCandidates = (payload: Record<string, unknown>): string[] => {
  const source = payload.source as Record<string, unknown> | null;
  const incoming = payload.incoming_row as Record<string, unknown> | null;
  const oldRow = payload.old_row as Record<string, unknown> | null;
  const newRow = payload.new_row as Record<string, unknown> | null;

  return [
    normalizeText(source?.vaskiPath),
    normalizeText(payload.source_path),
    normalizeText(incoming?.source_path),
    normalizeText(oldRow?.source_path),
    normalizeText(newRow?.source_path),
  ].filter(Boolean) as string[];
};

const extractEntityFromSourcePath = (sourcePath: string): string | null => {
  const normalized = sourcePath.replace(/\\/g, "/").toLowerCase();
  const match = normalized.match(/vaski-data\/([^/#?]+)/);
  return match ? match[1] : null;
};

const resolveEntity = (payload: Record<string, unknown>): string => {
  const table = normalizeText(payload.table);
  if (table) return table;

  for (const candidate of sourcePathCandidates(payload)) {
    const extracted = extractEntityFromSourcePath(candidate);
    if (extracted) return extracted;
  }

  return "unknown";
};

const classifyReportEvent = (payload: Record<string, unknown>): ReportCategory => {
  const reason = normalizeText(payload.reason)?.toLowerCase() || "";
  const issueCount =
    typeof payload.issue_count === "number" ? payload.issue_count : 0;
  const issues = Array.isArray(payload.issues)
    ? payload.issues
    : ([] as Array<Record<string, unknown>>);
  const hasErrorIssue = issues.some(
    (issue) => normalizeText(issue?.level)?.toLowerCase() === "error",
  );

  if (reason.includes("skipped")) return "skipped";
  if (reason.includes("warning")) return "warnings";
  if (reason.includes("error") || reason.includes("invalid") || hasErrorIssue) {
    return "errors";
  }
  if (issueCount > 0) return "warnings";
  return "info";
};

const newEntityReport = (): ConsolidatedMigrationEntityReport => ({
  counts: {
    total: 0,
    info: 0,
    skipped: 0,
    warnings: 0,
    errors: 0,
    overrides: 0,
    knownIssues: 0,
  },
  info: [],
  skipped: [],
  warnings: [],
  errors: [],
  overrides: [],
  knownIssues: [],
});

const pushEvent = (
  entities: Record<string, ConsolidatedMigrationEntityReport>,
  event: ConsolidatedMigrationEvent,
) => {
  if (!entities[event.entity]) {
    entities[event.entity] = newEntityReport();
  }

  const bucket = entities[event.entity];
  bucket.counts.total++;
  bucket.counts[event.category]++;
  bucket[event.category].push(event);
};

const toEvent = (
  kind: "report" | "overwrite" | "known_issue",
  category: ReportCategory,
  payload: Record<string, unknown>,
  filePath: string,
  rootDir: string,
): ConsolidatedMigrationEvent => {
  const sourcePath = sourcePathCandidates(payload)[0] || null;

  return {
    kind,
    category,
    entity: resolveEntity(payload),
    reason: normalizeText(payload.reason),
    details: normalizeText(payload.details),
    id: (payload.id as string | number | null | undefined) ?? null,
    sourcePath,
    file: path.relative(rootDir, filePath),
  };
};

export const buildConsolidatedMigrationReport = (
  options: BuildConsolidatedMigrationReportOptions,
): ConsolidatedMigrationReport => {
  const entities: Record<string, ConsolidatedMigrationEntityReport> = {};

  const reportFiles = listJsonFiles(options.reportDir);
  for (const filePath of reportFiles) {
    const payload = readJson(filePath);
    if (!payload) continue;

    const category = classifyReportEvent(payload);
    pushEvent(
      entities,
      toEvent("report", category, payload, filePath, options.rootDir),
    );
  }

  const overwriteFiles = listJsonFiles(options.overwriteDir);
  for (const filePath of overwriteFiles) {
    const payload = readJson(filePath);
    if (!payload) continue;

    pushEvent(
      entities,
      toEvent("overwrite", "overrides", payload, filePath, options.rootDir),
    );
  }

  const knownIssueFiles = listJsonFiles(options.knownIssueDir);
  for (const filePath of knownIssueFiles) {
    const payload = readJson(filePath);
    if (!payload) continue;

    pushEvent(
      entities,
      toEvent(
        "known_issue",
        "knownIssues",
        payload,
        filePath,
        options.rootDir,
      ),
    );
  }

  const totals = {
    total: 0,
    entities: Object.keys(entities).length,
    info: 0,
    skipped: 0,
    warnings: 0,
    errors: 0,
    overrides: 0,
    knownIssues: 0,
  };

  for (const entityReport of Object.values(entities)) {
    totals.total += entityReport.counts.total;
    totals.info += entityReport.counts.info;
    totals.skipped += entityReport.counts.skipped;
    totals.warnings += entityReport.counts.warnings;
    totals.errors += entityReport.counts.errors;
    totals.overrides += entityReport.counts.overrides;
    totals.knownIssues += entityReport.counts.knownIssues;
  }

  return {
    run: {
      id: options.runId,
      status: options.status,
      startedAt: options.startedAt,
      finishedAt: options.finishedAt,
      durationMs: parseDurationMs(options.startedAt, options.finishedAt),
      error: normalizeText(options.error) || null,
    },
    files: {
      reports: reportFiles.length,
      overwrites: overwriteFiles.length,
      knownIssues: knownIssueFiles.length,
    },
    totals,
    entities,
  };
};

export const writeConsolidatedMigrationReport = (
  report: ConsolidatedMigrationReport,
  outputPath: string,
) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
};
