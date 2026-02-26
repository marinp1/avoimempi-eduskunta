import { getStorage } from "./factory";
import type { DataStage } from "./types";

const SOURCE_STATUS_KEY = "metadata/source-status.json";

type SourceStageStatusKey = string;

export interface SourceStageStatusSnapshot {
  tableName: string;
  stage: DataStage;
  pageCount: number;
  lastPageRowCount: number;
  totalRowCount: number;
  lastUpdated: string;
}

interface SourceStatusFile {
  entries: SourceStageStatusSnapshot[];
}

function buildSnapshotKey(
  tableName: string,
  stage: DataStage,
): SourceStageStatusKey {
  return `${stage}:${tableName}`;
}

async function readStatusMap(): Promise<
  Record<SourceStageStatusKey, SourceStageStatusSnapshot>
> {
  const storage = getStorage();
  const raw = await storage.get(SOURCE_STATUS_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as SourceStatusFile;
    if (!Array.isArray(parsed.entries)) {
      return {};
    }

    return parsed.entries.reduce<
      Record<SourceStageStatusKey, SourceStageStatusSnapshot>
    >((acc, entry) => {
      if (!entry || typeof entry !== "object") {
        return acc;
      }

      const { tableName, stage, pageCount, lastPageRowCount, lastUpdated } =
        entry;
      if (!tableName || (stage !== "raw" && stage !== "parsed")) {
        return acc;
      }

      const safePageCount =
        Number.isFinite(pageCount) && pageCount >= 0 ? pageCount : 0;
      const safeLastPageRowCount =
        Number.isFinite(lastPageRowCount) && lastPageRowCount >= 0
          ? lastPageRowCount
          : 0;
      const safeTotalRowCount =
        Number.isFinite(entry.totalRowCount) && entry.totalRowCount >= 0
          ? entry.totalRowCount
          : safePageCount > 0
            ? (safePageCount - 1) * 100 + safeLastPageRowCount
            : 0;

      acc[buildSnapshotKey(tableName, stage)] = {
        tableName,
        stage,
        pageCount: safePageCount,
        lastPageRowCount: safeLastPageRowCount,
        totalRowCount: safeTotalRowCount,
        lastUpdated:
          typeof lastUpdated === "string"
            ? lastUpdated
            : new Date().toISOString(),
      };

      return acc;
    }, {});
  } catch (error) {
    console.warn("Failed to parse source status file:", error);
    return {};
  }
}

async function writeStatusMap(
  map: Record<SourceStageStatusKey, SourceStageStatusSnapshot>,
): Promise<void> {
  const storage = getStorage();
  const entries = Object.values(map);
  await storage.put(SOURCE_STATUS_KEY, JSON.stringify({ entries }, null, 2));
}

export async function loadSourceStageStatusMap(): Promise<
  Record<SourceStageStatusKey, SourceStageStatusSnapshot>
> {
  return await readStatusMap();
}

export async function hasSourceStageStatus(): Promise<boolean> {
  const storage = getStorage();
  const raw = await storage.get(SOURCE_STATUS_KEY);
  return raw !== null;
}

export async function recordSourceStagePage(
  tableName: string,
  stage: DataStage,
  page: number,
  rowCount: number,
): Promise<void> {
  const map = await readStatusMap();
  const key = buildSnapshotKey(tableName, stage);
  const existing = map[key];
  const normalizedPage = Number.isFinite(page) && page >= 0 ? page : 0;
  const normalizedRowCount =
    Number.isFinite(rowCount) && rowCount >= 0 ? rowCount : 0;
  const nextPageCount = Math.max(existing?.pageCount ?? 0, normalizedPage);
  const shouldUpdateLastRowCount =
    !existing || normalizedPage >= (existing.pageCount ?? 0);
  const lastPageRowCount = shouldUpdateLastRowCount
    ? normalizedRowCount
    : (existing?.lastPageRowCount ?? 0);

  // Accumulate exact total row count:
  // - New page (beyond current max): add its rowCount
  // - Re-scraping the current last page: replace its contribution
  // - Earlier page re-scraped: leave total unchanged (no per-page history)
  const prevTotal = existing?.totalRowCount ?? 0;
  let totalRowCount: number;
  if (!existing || normalizedPage > existing.pageCount) {
    totalRowCount = prevTotal + normalizedRowCount;
  } else if (normalizedPage === existing.pageCount) {
    totalRowCount =
      prevTotal - (existing.lastPageRowCount ?? 0) + normalizedRowCount;
  } else {
    totalRowCount = prevTotal;
  }

  map[key] = {
    tableName,
    stage,
    pageCount: nextPageCount,
    lastPageRowCount,
    totalRowCount,
    lastUpdated: new Date().toISOString(),
  };

  await writeStatusMap(map);
}

export async function clearSourceStageStatus(): Promise<void> {
  const storage = getStorage();
  await storage.delete(SOURCE_STATUS_KEY);
}
