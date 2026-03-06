#!/usr/bin/env bun
import { ActivePipelineTableNames } from "#constants";
import { getRawRowStore } from "#storage/row-store/factory";
import type { ColumnSchema, StoredRevision, StoredRow } from "#storage/row-store/types";

// ---------------------------------------------------------------------------
// XML / text diffing
// ---------------------------------------------------------------------------

type DiffLine = { op: "keep" | "add" | "remove"; text: string };

function tokenizeXml(xml: string): string[] {
  return xml.replace(/></g, ">\n<").split("\n").filter(Boolean);
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  // LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Trace back
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ op: "keep", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ op: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ op: "remove", text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

function renderHunks(
  diff: DiffLine[],
  context = 2,
  maxLineLen = 120,
): string[] {
  const n = diff.length;

  // Collect indices that should be shown (changed lines + context window)
  const show = new Set<number>();
  for (let idx = 0; idx < n; idx++) {
    if (diff[idx].op !== "keep") {
      for (
        let c = Math.max(0, idx - context);
        c <= Math.min(n - 1, idx + context);
        c++
      ) {
        show.add(c);
      }
    }
  }

  if (show.size === 0) return ["    (no textual changes detected)"];

  const output: string[] = [];
  let prevShown = -1;

  for (let idx = 0; idx < n; idx++) {
    if (!show.has(idx)) continue;

    if (prevShown !== -1 && idx > prevShown + 1) {
      output.push(`    ... (${idx - prevShown - 1} unchanged)`);
    }

    const { op, text } = diff[idx];
    const prefix = op === "add" ? "    + " : op === "remove" ? "    - " : "      ";
    const line = text.length > maxLineLen ? `${text.slice(0, maxLineLen)}…` : text;
    output.push(`${prefix}${line}`);
    prevShown = idx;
  }

  return output;
}

function xmlDiffLines(oldVal: string, newVal: string): string[] {
  const oldTokens = tokenizeXml(oldVal);
  const newTokens = tokenizeXml(newVal);
  const diff = computeDiff(oldTokens, newTokens);
  return renderHunks(diff);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtTs(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "(null)";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length > 120) return `(${Buffer.byteLength(s, "utf8")} bytes)`;
  return s;
}

function fmtValueShort(v: unknown): string {
  if (v === null || v === undefined) return "(null)";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length > 60) return `(${Buffer.byteLength(s, "utf8")} bytes)`;
  return `"${s}"`;
}

function isLargeString(v: unknown): v is string {
  return typeof v === "string" && v.length > 120;
}

function parseRowData(data: string): unknown[] {
  try {
    return JSON.parse(data) as unknown[];
  } catch {
    return [];
  }
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function hr(char = "─", width = 72): string {
  return char.repeat(width);
}

// ---------------------------------------------------------------------------
// History command
// ---------------------------------------------------------------------------

async function cmdHistory(tableName: string, pk: number): Promise<void> {
  const store = getRawRowStore();

  const [current, revisions, schemas] = await Promise.all([
    store.get(tableName, pk),
    store.listRevisions(tableName, pk),
    store.listColumnSchemas(tableName),
  ]);

  if (!current) {
    console.error(`Row not found: ${tableName} #${pk}`);
    process.exit(1);
  }

  const schemaMap = new Map<string, ColumnSchema>();
  for (const s of schemas) schemaMap.set(s.hash, s);

  // All versions in chronological order: [rev0, rev1, ..., current]
  const versions: Array<StoredRow | StoredRevision> = [...revisions, current];
  const total = versions.length;

  console.log(
    `\n${tableName} — Row #${pk}  (${total} version${total === 1 ? "" : "s"})`,
  );
  console.log(`  First seen  : ${fmtTs(current.createdAt)}`);
  if (revisions.length > 0) {
    console.log(`  Last changed: ${fmtTs(current.updatedAt)}`);
  }
  console.log();

  for (let i = 0; i < versions.length; i++) {
    const v = versions[i];
    const isFirst = i === 0;
    const isCurrent = i === versions.length - 1;

    const label = isCurrent ? `Version ${i + 1} — current` : `Version ${i + 1}`;
    const ts = isFirst
      ? `inserted ${fmtTs(v.createdAt)}`
      : `updated ${fmtTs(v.updatedAt)}`;

    console.log(`${hr()} `);
    console.log(`  ${label}  (${ts})`);

    const schema = schemaMap.get(v.columnHash);
    const colNames = schema?.columnNames ?? [];
    const data = parseRowData(v.data);

    if (isFirst) {
      // Show full row
      const maxLen = Math.max(...colNames.map((c) => c.length), 8);
      for (let ci = 0; ci < Math.max(colNames.length, data.length); ci++) {
        const colName = colNames[ci] ?? `col[${ci}]`;
        const val = fmtValue(data[ci]);
        console.log(`    ${pad(colName, maxLen)} : ${val}`);
      }
    } else {
      // Show field-level diff from previous version
      const prev = versions[i - 1];
      const prevData = parseRowData(prev.data);
      const prevSchema = schemaMap.get(prev.columnHash);
      const prevColNames = prevSchema?.columnNames ?? colNames;

      const changed: Array<{ name: string; from: unknown; to: unknown }> = [];
      const maxLen = Math.max(prevColNames.length, data.length, colNames.length);
      for (let ci = 0; ci < maxLen; ci++) {
        const fromVal = prevData[ci];
        const toVal = data[ci];
        if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
          const name = colNames[ci] ?? prevColNames[ci] ?? `col[${ci}]`;
          changed.push({ name, from: fromVal, to: toVal });
        }
      }

      if (changed.length === 0) {
        console.log(
          "    (no field changes — hash differs from metadata only)",
        );
      } else {
        const nameLen = Math.max(...changed.map((c) => c.name.length));
        for (const { name, from, to } of changed) {
          if (isLargeString(from) && isLargeString(to)) {
            // Both are large strings — show a textual diff
            console.log(`    ${pad(name, nameLen)} :`);
            for (const line of xmlDiffLines(from, to)) {
              console.log(line);
            }
          } else {
            console.log(
              `    ${pad(name, nameLen)} : ${fmtValueShort(from)} → ${fmtValueShort(to)}`,
            );
          }
        }
      }
    }

    if (!isCurrent) {
      const next = versions[i + 1] as StoredRevision;
      console.log();
      console.log(`    → superseded on ${fmtTs(next.updatedAt)}`);
    }
    console.log();
  }

  store.close();
}

// ---------------------------------------------------------------------------
// Changes command
// ---------------------------------------------------------------------------

async function cmdChanges(
  tableNameArg: string | null,
  sinceMs: number | undefined,
): Promise<void> {
  const store = getRawRowStore();

  const tableNames =
    tableNameArg === null || tableNameArg === "all"
      ? ActivePipelineTableNames
      : [tableNameArg];

  let totalChanged = 0;

  for (const tableName of tableNames) {
    const changed = await store.listChangedRows(tableName, sinceMs);

    if (tableNames.length > 1) {
      if (changed.length === 0) continue;
      console.log(
        `\n${tableName} (${changed.length} row${changed.length === 1 ? "" : "s"} changed):`,
      );
    } else {
      const totalRows = await store.count(tableName);
      console.log(
        `\nChanged rows in ${tableName}  (${changed.length} of ${totalRows.toLocaleString()} total)`,
      );
      if (changed.length === 0) {
        console.log("  No rows have been updated in-place.");
        store.close();
        return;
      }
      console.log();
      console.log(
        `  ${"PK".padEnd(10)}  ${"Revisions".padEnd(10)}  ${"First Seen".padEnd(22)}  Last Changed`,
      );
      console.log(`  ${hr("-", 68)}`);
    }

    for (const row of changed) {
      const revLabel = `${row.revisionCount} rev${row.revisionCount === 1 ? "" : "s"}`;
      const createdShort = fmtTs(row.createdAt).slice(0, 19);
      const updatedShort = fmtTs(row.updatedAt).slice(0, 19);
      if (tableNames.length > 1) {
        console.log(
          `  pk=${row.pk}  ${revLabel}  ${createdShort} → ${updatedShort}`,
        );
      } else {
        console.log(
          `  ${String(row.pk).padEnd(10)}  ${revLabel.padEnd(10)}  ${createdShort.padEnd(22)}  ${updatedShort}`,
        );
      }
    }

    totalChanged += changed.length;
  }

  if (tableNames.length > 1) {
    console.log(
      `\nTotal: ${totalChanged} row${totalChanged === 1 ? "" : "s"} with changes across ${tableNames.length} tables.`,
    );
    if (sinceMs !== undefined) {
      console.log(
        `  (filtered to changes since ${new Date(sinceMs).toISOString()})`,
      );
    }
  }

  store.close();
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(`
Row History CLI — inspect source data changes recorded in the raw store

Usage:
  bun history-cli.ts history <TableName> <pk>
  bun history-cli.ts changes [TableName|all] [--since <ISO-date>]
  bun history-cli.ts help

Commands:
  history <TableName> <pk>
    Show all recorded versions of a single row, with field-level diffs
    between each version. For large string fields (e.g. XML blobs), a
    line-level diff is shown instead of raw byte counts.

  changes [TableName|all] [--since <ISO-date>]
    List all rows that have been updated in-place (i.e., have revisions).
    Omit TableName or use 'all' to scan every active pipeline table.
    --since filters to rows changed at or after the given ISO date.

Options:
  --since <ISO-date>   Only show rows changed at or after this timestamp.
                       Accepts any format parseable by Date (e.g. 2026-01-01).

Examples:
  bun history-cli.ts history MemberOfParliament 910050
  bun history-cli.ts changes MemberOfParliament
  bun history-cli.ts changes all
  bun history-cli.ts changes all --since 2026-01-01
  bun history-cli.ts changes SeatingOfParliament --since 2026-03-01T00:00:00Z
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === "history") {
    if (args.length < 3) {
      console.error("❌ Error: history requires <TableName> <pk>");
      printHelp();
      process.exit(1);
    }
    const tableName = args[1];
    const pk = parseInt(args[2], 10);
    if (Number.isNaN(pk) || pk < 0) {
      console.error("❌ Error: pk must be a non-negative integer");
      process.exit(1);
    }
    await cmdHistory(tableName, pk);
    return;
  }

  if (command === "changes") {
    let tableNameArg: string | null = null;
    let sinceMs: number | undefined;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--since" || arg.startsWith("--since=")) {
        const val = arg.startsWith("--since=") ? arg.slice(8) : args[++i];
        if (!val) {
          console.error("❌ Error: --since requires a date value");
          process.exit(1);
        }
        const ts = Date.parse(val);
        if (Number.isNaN(ts)) {
          console.error(`❌ Error: invalid date for --since: ${val}`);
          process.exit(1);
        }
        sinceMs = ts;
      } else if (!arg.startsWith("-")) {
        tableNameArg = arg;
      } else {
        console.error(`❌ Error: unknown flag: ${arg}`);
        printHelp();
        process.exit(1);
      }
    }

    await cmdChanges(tableNameArg, sinceMs);
    return;
  }

  console.error(`❌ Error: unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
