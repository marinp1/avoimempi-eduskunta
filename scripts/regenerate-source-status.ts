import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type Stage = "raw" | "parsed";

interface SourceStageStatusSnapshot {
  tableName: string;
  stage: Stage;
  pageCount: number;
  lastPageRowCount: number;
  lastUpdated: string;
}

const SOURCE_STATUS_PATH = "metadata/source-status.json";
const PAGE_FILE_REGEX = /^page_(\d+)\.json$/i;

const args = process.argv.slice(2);
const stageArg = args.find((arg) => arg.startsWith("--stage="));
const stageList: Stage[] = (() => {
  if (!stageArg) {
    return ["raw"];
  }
  const [, rawValue] = stageArg.split("=");
  if (!rawValue) {
    return ["raw"];
  }
  if (rawValue === "all") {
    return ["raw", "parsed"];
  }
  const candidates = rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is Stage => value === "raw" || value === "parsed");
  return candidates.length > 0
    ? (Array.from(new Set(candidates)) as Stage[])
    : (["raw"] as Stage[]);
})();

async function findRepoRoot(): Promise<string> {
  const maxLevels = 10;
  let current = process.cwd();

  for (let i = 0; i < maxLevels; i++) {
    try {
      const pkgPath = path.join(current, "package.json");
      const pkgStat = await stat(pkgPath);
      if (pkgStat.isFile()) {
        return current;
      }
    } catch {
      // ignore
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return process.cwd();
}

async function loadExistingEntries(
  rootDir: string,
): Promise<Record<string, SourceStageStatusSnapshot>> {
  const metadataPath = path.join(rootDir, "data", SOURCE_STATUS_PATH);
  try {
    const raw = await readFile(metadataPath, "utf-8");
    const parsed = JSON.parse(raw) as { entries?: SourceStageStatusSnapshot[] };
    return (parsed.entries ?? []).reduce<
      Record<string, SourceStageStatusSnapshot>
    >((acc, entry) => {
      if (!entry || !entry.tableName || !entry.stage) return acc;
      const key = `${entry.stage}:${entry.tableName}`;
      acc[key] = entry;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function writeEntries(
  rootDir: string,
  entries: SourceStageStatusSnapshot[],
): Promise<void> {
  const metadataPath = path.join(rootDir, "data", SOURCE_STATUS_PATH);
  const metadataDir = path.dirname(metadataPath);
  await mkdir(metadataDir, { recursive: true });
  await writeFile(metadataPath, JSON.stringify({ entries }, null, 2), "utf-8");
}

async function scanStage(
  rootDir: string,
  stage: Stage,
): Promise<Map<string, SourceStageStatusSnapshot>> {
  const stageDir = path.join(rootDir, "data", stage);
  const result = new Map<string, SourceStageStatusSnapshot>();

  try {
    const tables = await readdir(stageDir, { withFileTypes: true });
    for (const tableEntry of tables) {
      if (!tableEntry.isDirectory()) continue;
      const tableName = tableEntry.name;
      const tableDir = path.join(stageDir, tableName);
      const pageFiles = await readdir(tableDir, { withFileTypes: true });

      let maxPage = 0;
      let lastPageFile: string | null = null;
      let lastPageStatTime: string | null = null;

      for (const fileEntry of pageFiles) {
        if (!fileEntry.isFile()) continue;
        const match = fileEntry.name.match(PAGE_FILE_REGEX);
        if (!match) continue;
        const pageNumber = parseInt(match[1], 10);
        if (!Number.isFinite(pageNumber)) continue;
        if (pageNumber >= maxPage) {
          const filePath = path.join(tableDir, fileEntry.name);
          try {
            const stats = await stat(filePath);
            lastPageStatTime = stats.mtime.toISOString();
          } catch {
            // ignore
          }
          maxPage = pageNumber;
          lastPageFile = fileEntry.name;
        }
      }

      if (maxPage === 0 || !lastPageFile) {
        continue;
      }

      const lastPagePath = path.join(tableDir, lastPageFile);
      let lastRowCount = 0;
      try {
        const raw = await readFile(lastPagePath, "utf-8");
        const parsed = JSON.parse(raw) as { rowCount?: number };
        lastRowCount = Number.isFinite(parsed.rowCount ?? NaN)
          ? (parsed.rowCount as number)
          : 0;
      } catch (error) {
        console.warn(`Failed to read ${lastPagePath}:`, error);
      }

      const snapshot: SourceStageStatusSnapshot = {
        tableName,
        stage,
        pageCount: maxPage,
        lastPageRowCount: lastRowCount,
        lastUpdated: lastPageStatTime ?? new Date().toISOString(),
      };

      result.set(`${stage}:${tableName}`, snapshot);
    }
  } catch (error: any) {
    console.warn(`Skipping stage ${stage}:`, error.message ?? error);
  }

  return result;
}

(async () => {
  const rootDir = await findRepoRoot();
  const existing = await loadExistingEntries(rootDir);
  const updates = new Map(Object.entries(existing));

  for (const stage of stageList) {
    const scanResult = await scanStage(rootDir, stage);
    for (const [key, snapshot] of scanResult.entries()) {
      updates.set(key, snapshot);
    }
  }

  const entries = Array.from(updates.values());
  await writeEntries(rootDir, entries);
  console.log(
    `Rebuilt source status with ${entries.length} entries (${stageList.join(", ")}).`,
  );
})();
