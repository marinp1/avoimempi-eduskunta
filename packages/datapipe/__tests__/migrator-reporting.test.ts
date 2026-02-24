import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildConsolidatedMigrationReport } from "../migrator/reporting";

const writeJson = (filePath: string, payload: unknown) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
};

describe("buildConsolidatedMigrationReport", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  test("groups events under entities and categories", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "migrator-report-"));
    tempDirs.push(rootDir);

    const reportDir = join(rootDir, "reports");
    const overwriteDir = join(rootDir, "overwrites");
    const knownIssueDir = join(rootDir, "known-issues");

    writeJson(join(reportDir, "warning.json"), {
      reason: "parsed_with_warnings",
      details: "Parsed with warnings",
      id: "100",
      source: {
        vaskiPath: "vaski-data/hallituksen_esitys/page_1.json",
      },
      issue_count: 1,
      issues: [{ level: "warning", code: "x" }],
    });

    writeJson(join(reportDir, "skip.json"), {
      reason: "metadata_only_skipped",
      details: "No body content",
      id: "101",
      source: {
        vaskiPath: "vaski-data/hallituksen_esitys/page_2.json",
      },
    });

    writeJson(join(reportDir, "error.json"), {
      reason: "parse_error_row_skipped",
      details: "Could not parse",
      id: "102",
      source: {
        vaskiPath: "vaski-data/lakialoite/page_1.json",
      },
    });

    writeJson(join(overwriteDir, "overwrite.json"), {
      table: "Section",
      details: "Merged old and new row",
    });

    writeJson(join(knownIssueDir, "known.json"), {
      reason: "missing_edk_identifier",
      details: "Skipped row",
      source: {
        vaskiPath: "vaski-data/nimenhuutoraportti/page_1.json",
      },
    });

    const report = buildConsolidatedMigrationReport({
      runId: "test-run",
      status: "success",
      startedAt: "2026-02-18T10:00:00.000Z",
      finishedAt: "2026-02-18T10:00:10.000Z",
      reportDir,
      overwriteDir,
      knownIssueDir,
      rootDir,
    });

    expect(report.totals.total).toBe(5);
    expect(report.totals.entities).toBe(4);
    expect(report.totals.warnings).toBe(1);
    expect(report.totals.skipped).toBe(2);
    expect(report.totals.overrides).toBe(1);
    expect(report.totals.knownIssues).toBe(1);

    expect(report.entities.hallituksen_esitys.counts.total).toBe(2);
    expect(report.entities.hallituksen_esitys.counts.warnings).toBe(1);
    expect(report.entities.hallituksen_esitys.counts.skipped).toBe(1);

    expect(report.entities.lakialoite.counts.skipped).toBe(1);
    expect(report.entities.Section.counts.overrides).toBe(1);
    expect(report.entities.nimenhuutoraportti.counts.knownIssues).toBe(1);
  });

  test("returns empty entities when no files exist", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "migrator-report-empty-"));
    tempDirs.push(rootDir);

    const report = buildConsolidatedMigrationReport({
      runId: "empty-run",
      status: "failed",
      startedAt: "2026-02-18T11:00:00.000Z",
      finishedAt: "2026-02-18T11:00:01.000Z",
      reportDir: join(rootDir, "reports"),
      overwriteDir: join(rootDir, "overwrites"),
      knownIssueDir: join(rootDir, "known-issues"),
      rootDir,
      error: "boom",
    });

    expect(report.run.error).toBe("boom");
    expect(report.totals.total).toBe(0);
    expect(report.totals.entities).toBe(0);
    expect(report.entities).toEqual({});
  });
});
