#!/usr/bin/env bun

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStorageConfig } from "../packages/shared/storage/config";

const PAGE_FILE_PATTERN = /^page_(\d+)\.json$/i;
const STAGES = ["raw", "parsed"] as const;
type Stage = (typeof STAGES)[number];

type RawPagePayload = Record<string, unknown> & {
  source?: {
    tableName?: string;
    page?: number;
    scrapedAt?: string;
  };
};

interface ScriptOptions {
  apply: boolean;
  overwrite: boolean;
  stages: Stage[];
  tables: Set<string> | null;
  limit: number | null;
}

interface BackfillCounters {
  scanned: number;
  changed: number;
  unchanged: number;
  skippedExisting: number;
  invalidJson: number;
  unsupportedFile: number;
  usedBirthtime: number;
  usedMtimeFallback: number;
}

const IMPORT_METADATA_FIELDS = {
  sourceTable: "__sourceTable",
  sourcePage: "__sourcePage",
  scrapedAt: "__sourceScrapedAt",
  sourcePrimaryKeyName: "__sourcePrimaryKeyName",
  sourcePrimaryKeyValue: "__sourcePrimaryKeyValue",
} as const;

function parseStages(argv: string[]): Stage[] {
  const stageArg = argv.find((arg) => arg.startsWith("--stage="));
  if (!stageArg) {
    return ["raw"];
  }

  const rawValue = stageArg.slice("--stage=".length).trim().toLowerCase();
  if (rawValue === "all") {
    return [...STAGES];
  }

  const parsed = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is Stage =>
      (STAGES as readonly string[]).includes(value),
    );

  return parsed.length > 0 ? Array.from(new Set(parsed)) : ["raw"];
}

function parseOptions(argv: string[]): ScriptOptions {
  const apply = argv.includes("--apply");
  const overwrite = argv.includes("--overwrite");
  const stages = parseStages(argv);

  const tableArg = argv.find((arg) => arg.startsWith("--tables="));
  const tables = tableArg
    ? new Set(
        tableArg
          .slice("--tables=".length)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;

  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const parsedLimit = limitArg
    ? Number.parseInt(limitArg.slice("--limit=".length), 10)
    : null;
  const limit =
    parsedLimit !== null && Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : null;

  return { apply, overwrite, stages, tables, limit };
}

function getCreationDateFromStats(fileStats: Awaited<ReturnType<typeof stat>>): {
  createdAt: Date;
  source: "birthtime" | "mtime-fallback";
} {
  if (
    Number.isFinite(fileStats.birthtimeMs) &&
    fileStats.birthtimeMs > 0 &&
    fileStats.birthtime.getTime() > 0
  ) {
    return { createdAt: fileStats.birthtime, source: "birthtime" };
  }

  return { createdAt: fileStats.mtime, source: "mtime-fallback" };
}

function shouldSkipExistingSource(
  payload: RawPagePayload,
  overwrite: boolean,
): boolean {
  if (overwrite) return false;
  if (!payload.source || typeof payload.source !== "object") return false;

  return (
    typeof payload.source.tableName === "string" &&
    typeof payload.source.page === "number" &&
    typeof payload.source.scrapedAt === "string" &&
    payload.source.tableName.trim() !== "" &&
    payload.source.scrapedAt.trim() !== ""
  );
}

function isSourceMetadataComplete(payload: RawPagePayload): boolean {
  return (
    !!payload.source &&
    typeof payload.source.tableName === "string" &&
    payload.source.tableName.trim() !== "" &&
    typeof payload.source.page === "number" &&
    Number.isFinite(payload.source.page) &&
    typeof payload.source.scrapedAt === "string" &&
    payload.source.scrapedAt.trim() !== ""
  );
}

function isRowMetadataComplete(row: Record<string, unknown>): boolean {
  return (
    typeof row[IMPORT_METADATA_FIELDS.sourceTable] === "string" &&
    typeof row[IMPORT_METADATA_FIELDS.sourcePage] === "number" &&
    typeof row[IMPORT_METADATA_FIELDS.scrapedAt] === "string" &&
    typeof row[IMPORT_METADATA_FIELDS.sourcePrimaryKeyName] === "string" &&
    Object.hasOwn(row, IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue)
  );
}

function parsedFileAlreadyBackfilled(payload: RawPagePayload): boolean {
  if (!isSourceMetadataComplete(payload)) {
    return false;
  }

  if (!Array.isArray(payload.rowData)) {
    return false;
  }

  return payload.rowData.every(
    (row) => row && typeof row === "object" && isRowMetadataComplete(row),
  );
}

async function listTableDirectories(stageDir: string): Promise<string[]> {
  try {
    const entries = await readdir(stageDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function backfillRawPayload(
  payload: RawPagePayload,
  tableName: string,
  page: number,
  scrapedAt: string,
): { nextPayload: RawPagePayload; changed: boolean } {
  const nextPayload: RawPagePayload = {
    ...payload,
    source: {
      tableName,
      page,
      scrapedAt,
    },
  };

  return {
    nextPayload,
    changed: JSON.stringify(payload) !== JSON.stringify(nextPayload),
  };
}

function backfillParsedPayload(
  payload: RawPagePayload,
  tableName: string,
  page: number,
  scrapedAt: string,
  overwrite: boolean,
): { nextPayload: RawPagePayload; changed: boolean } {
  const pkName =
    typeof payload.pkName === "string" && payload.pkName.trim() !== ""
      ? payload.pkName
      : null;

  const source =
    !overwrite && isSourceMetadataComplete(payload)
      ? payload.source
      : { tableName, page, scrapedAt };

  const sourceTable =
    typeof source?.tableName === "string" && source.tableName.trim() !== ""
      ? source.tableName
      : tableName;
  const sourcePage =
    typeof source?.page === "number" && Number.isFinite(source.page)
      ? source.page
      : page;
  const sourceScrapedAt =
    typeof source?.scrapedAt === "string" && source.scrapedAt.trim() !== ""
      ? source.scrapedAt
      : scrapedAt;

  const rowData = Array.isArray(payload.rowData) ? payload.rowData : null;
  const nextRowData =
    rowData === null
      ? payload.rowData
      : rowData.map((row) => {
          if (!row || typeof row !== "object") {
            return row;
          }

          const rowObject = row as Record<string, unknown>;
          const currentPkValue = pkName ? rowObject[pkName] : null;
          const existingSourcePkValue = Object.hasOwn(
            rowObject,
            IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue,
          )
            ? rowObject[IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue]
            : null;

          if (!overwrite && isRowMetadataComplete(rowObject)) {
            return row;
          }

          return {
            ...rowObject,
            [IMPORT_METADATA_FIELDS.sourceTable]: sourceTable,
            [IMPORT_METADATA_FIELDS.sourcePage]: sourcePage,
            [IMPORT_METADATA_FIELDS.scrapedAt]: sourceScrapedAt,
            [IMPORT_METADATA_FIELDS.sourcePrimaryKeyName]: pkName,
            [IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue]:
              currentPkValue ?? existingSourcePkValue ?? null,
          };
        });

  const nextPayload: RawPagePayload = {
    ...payload,
    source: {
      tableName: sourceTable,
      page: sourcePage,
      scrapedAt: sourceScrapedAt,
    },
    rowData: nextRowData,
  };

  return {
    nextPayload,
    changed: JSON.stringify(payload) !== JSON.stringify(nextPayload),
  };
}

async function processTable(
  stageDir: string,
  stage: Stage,
  tableName: string,
  options: ScriptOptions,
  counters: BackfillCounters,
): Promise<void> {
  const tableDir = path.join(stageDir, tableName);
  const entries = await readdir(tableDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    if (options.limit !== null && counters.scanned >= options.limit) {
      return;
    }

    const match = fileName.match(PAGE_FILE_PATTERN);
    if (!match) {
      counters.unsupportedFile++;
      continue;
    }

    const page = Number.parseInt(match[1], 10);
    if (!Number.isFinite(page)) {
      counters.unsupportedFile++;
      continue;
    }

    const filePath = path.join(tableDir, fileName);
    const fileStats = await stat(filePath);
    const { createdAt, source } = getCreationDateFromStats(fileStats);
    if (source === "birthtime") counters.usedBirthtime++;
    else counters.usedMtimeFallback++;

    let payload: RawPagePayload;
    try {
      const raw = await readFile(filePath, "utf-8");
      payload = JSON.parse(raw) as RawPagePayload;
    } catch {
      counters.invalidJson++;
      counters.scanned++;
      continue;
    }

    if (
      stage === "raw" &&
      shouldSkipExistingSource(payload, options.overwrite)
    ) {
      counters.skippedExisting++;
      counters.scanned++;
      continue;
    }

    if (
      stage === "parsed" &&
      !options.overwrite &&
      parsedFileAlreadyBackfilled(payload)
    ) {
      counters.skippedExisting++;
      counters.scanned++;
      continue;
    }

    const { nextPayload, changed } =
      stage === "raw"
        ? backfillRawPayload(payload, tableName, page, createdAt.toISOString())
        : backfillParsedPayload(
            payload,
            tableName,
            page,
            createdAt.toISOString(),
            options.overwrite,
          );

    if (!changed) {
      counters.unchanged++;
      counters.scanned++;
      continue;
    }

    if (options.apply) {
      await writeFile(
        filePath,
        `${JSON.stringify(nextPayload, null, 2)}\n`,
        "utf-8",
      );
    }

    counters.changed++;
    counters.scanned++;

    if (counters.scanned % 1000 === 0) {
      const mode = options.apply ? "apply" : "dry-run";
      console.log(
        `[${mode}] ${stage} scanned ${counters.scanned} files (changed ${counters.changed})`,
      );
    }
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const storageConfig = getStorageConfig();

  if (storageConfig.provider !== "local" || !storageConfig.local) {
    throw new Error(
      "This script requires local storage provider because it reads filesystem creation timestamps.",
    );
  }

  const counters: BackfillCounters = {
    scanned: 0,
    changed: 0,
    unchanged: 0,
    skippedExisting: 0,
    invalidJson: 0,
    unsupportedFile: 0,
    usedBirthtime: 0,
    usedMtimeFallback: 0,
  };

  const mode = options.apply ? "APPLY" : "DRY-RUN";
  console.log(
    `${mode}: backfilling source metadata`,
  );
  console.log(`Stages: ${options.stages.join(", ")}`);
  if (options.limit !== null) {
    console.log(`Limit: ${options.limit} files`);
  }
  if (options.tables) {
    console.log(`Tables: ${Array.from(options.tables).join(", ")}`);
  }
  if (options.overwrite) {
    console.log("Overwrite mode: existing source metadata will be replaced.");
  }

  for (const stage of options.stages) {
    if (options.limit !== null && counters.scanned >= options.limit) {
      break;
    }

    const stageDir = path.join(storageConfig.local.baseDir, stage);
    const tables = await listTableDirectories(stageDir);
    const selectedTables = options.tables
      ? tables.filter((table) => options.tables?.has(table))
      : tables;

    if (selectedTables.length === 0) {
      console.log(`No matching ${stage} tables found.`);
      continue;
    }

    console.log(
      `Processing stage '${stage}' (${selectedTables.length} tables in ${stageDir})`,
    );

    for (const tableName of selectedTables) {
      if (options.limit !== null && counters.scanned >= options.limit) {
        break;
      }
      console.log(`  Table: ${tableName}`);
      await processTable(stageDir, stage, tableName, options, counters);
    }
  }

  console.log("\nSummary:");
  console.log(`  scanned: ${counters.scanned}`);
  console.log(`  changed: ${counters.changed}`);
  console.log(`  unchanged: ${counters.unchanged}`);
  console.log(`  skipped_existing_source: ${counters.skippedExisting}`);
  console.log(`  invalid_json: ${counters.invalidJson}`);
  console.log(`  unsupported_files: ${counters.unsupportedFile}`);
  console.log(`  timestamp_from_birthtime: ${counters.usedBirthtime}`);
  console.log(`  timestamp_from_mtime_fallback: ${counters.usedMtimeFallback}`);

  if (!options.apply && counters.changed > 0) {
    console.log(
      "\nDry-run complete. Re-run with --apply to write metadata to files.",
    );
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
