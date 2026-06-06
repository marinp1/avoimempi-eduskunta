import fs from "node:fs";
import path from "node:path";
import { getDatabasePath, getTraceDatabasePath } from "#database";
import { getStorage } from "#storage";

const SQLITE_LATEST_MANIFEST_STORAGE_KEY =
  "artifacts/sqlite/latest/manifest.json";

type LaunchMode = "local" | "latest" | "storage-key";

type LaunchArtifactKeys = {
  dbArtifactKey: string;
  traceDbArtifactKey: string | null;
};

function parseLaunchMode(value: string | undefined): LaunchMode {
  const normalized = (value || "local").trim().toLowerCase();
  if (normalized === "latest" || normalized === "storage-key") {
    return normalized;
  }
  return "local";
}

function cleanupWalSidecars(databasePath: string): void {
  const candidates = [`${databasePath}-wal`, `${databasePath}-shm`];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      fs.rmSync(candidate, { force: true });
    }
  }
}

async function resolveSourceKeys(
  mode: LaunchMode,
): Promise<LaunchArtifactKeys | null> {
  if (mode === "local") return null;

  const storage = getStorage();

  if (mode === "storage-key") {
    const explicitDbKey = process.env.SERVER_DB_LAUNCH_STORAGE_KEY?.trim();
    if (!explicitDbKey) {
      throw new Error(
        "SERVER_DB_LAUNCH_STORAGE_KEY is required when SERVER_DB_LAUNCH_MODE=storage-key",
      );
    }
    const explicitTraceKey =
      process.env.SERVER_TRACE_DB_LAUNCH_STORAGE_KEY?.trim() || null;
    return {
      dbArtifactKey: explicitDbKey,
      traceDbArtifactKey: explicitTraceKey,
    };
  }

  const manifestRaw = await storage.get(SQLITE_LATEST_MANIFEST_STORAGE_KEY);
  if (!manifestRaw) {
    throw new Error(
      `Latest SQLite manifest not found in storage at '${SQLITE_LATEST_MANIFEST_STORAGE_KEY}'`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestRaw);
  } catch (error) {
    throw new Error(`Failed to parse latest SQLite manifest: ${String(error)}`);
  }

  const dbArtifactKey =
    parsed && typeof parsed === "object"
      ? (parsed as { dbArtifactKey?: unknown }).dbArtifactKey
      : null;
  const traceDbArtifactKey =
    parsed && typeof parsed === "object"
      ? (parsed as { traceDbArtifactKey?: unknown }).traceDbArtifactKey
      : null;

  if (typeof dbArtifactKey !== "string" || dbArtifactKey.trim() === "") {
    throw new Error(
      `Latest SQLite manifest missing non-empty 'dbArtifactKey' at '${SQLITE_LATEST_MANIFEST_STORAGE_KEY}'`,
    );
  }

  return {
    dbArtifactKey: dbArtifactKey.trim(),
    traceDbArtifactKey:
      typeof traceDbArtifactKey === "string" && traceDbArtifactKey.trim() !== ""
        ? traceDbArtifactKey.trim()
        : null,
  };
}

async function downloadArtifact(params: {
  getFile: (key: string, destinationPath: string) => Promise<void>;
  sourceKey: string;
  targetPath: string;
}): Promise<void> {
  const targetDir = path.dirname(params.targetPath);
  const tempPath = `${params.targetPath}.download`;

  fs.mkdirSync(targetDir, { recursive: true });

  try {
    await params.getFile(params.sourceKey, tempPath);
    fs.renameSync(tempPath, params.targetPath);
    cleanupWalSidecars(params.targetPath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
    throw error;
  }
}

export async function prepareDatabaseForServerStartup(): Promise<void> {
  const mode = parseLaunchMode(process.env.SERVER_DB_LAUNCH_MODE);
  if (mode === "local") {
    return;
  }

  const artifactKeys = await resolveSourceKeys(mode);
  if (!artifactKeys) return;

  const databasePath = getDatabasePath();
  const traceDatabasePath = getTraceDatabasePath();
  const storage = getStorage();

  if (typeof storage.getFile !== "function") {
    throw new Error(
      `Storage provider '${storage.name}' does not implement getFile(); required for SERVER_DB_LAUNCH_MODE=${mode}`,
    );
  }
  const getFile = storage.getFile.bind(storage);

  await downloadArtifact({
    getFile,
    sourceKey: artifactKeys.dbArtifactKey,
    targetPath: databasePath,
  });

  if (artifactKeys.traceDbArtifactKey) {
    await downloadArtifact({
      getFile,
      sourceKey: artifactKeys.traceDbArtifactKey,
      targetPath: traceDatabasePath,
    });
  }

  console.log(
    `🗄️  Boot database loaded from storage (${mode}) key='${artifactKeys.dbArtifactKey}' -> ${databasePath}`,
  );
  if (artifactKeys.traceDbArtifactKey) {
    console.log(
      `🧾 Trace database loaded from storage (${mode}) key='${artifactKeys.traceDbArtifactKey}' -> ${traceDatabasePath}`,
    );
  }
}
