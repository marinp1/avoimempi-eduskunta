import fs from "node:fs";
import path from "node:path";
import { getDatabasePath } from "#database";
import { getStorage } from "#storage";

const SQLITE_LATEST_MANIFEST_STORAGE_KEY = "artifacts/sqlite/latest/manifest.json";

type LaunchMode = "local" | "latest" | "storage-key";

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

async function resolveSourceKey(mode: LaunchMode): Promise<string | null> {
  if (mode === "local") return null;

  const storage = getStorage();

  if (mode === "storage-key") {
    const explicitKey = process.env.SERVER_DB_LAUNCH_STORAGE_KEY?.trim();
    if (!explicitKey) {
      throw new Error(
        "SERVER_DB_LAUNCH_STORAGE_KEY is required when SERVER_DB_LAUNCH_MODE=storage-key",
      );
    }
    return explicitKey;
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

  if (typeof dbArtifactKey !== "string" || dbArtifactKey.trim() === "") {
    throw new Error(
      `Latest SQLite manifest missing non-empty 'dbArtifactKey' at '${SQLITE_LATEST_MANIFEST_STORAGE_KEY}'`,
    );
  }

  return dbArtifactKey.trim();
}

export async function prepareDatabaseForServerStartup(): Promise<void> {
  const mode = parseLaunchMode(process.env.SERVER_DB_LAUNCH_MODE);
  if (mode === "local") {
    return;
  }

  const sourceKey = await resolveSourceKey(mode);
  if (!sourceKey) return;

  const databasePath = getDatabasePath();
  const storage = getStorage();

  if (typeof storage.getFile !== "function") {
    throw new Error(
      `Storage provider '${storage.name}' does not implement getFile(); required for SERVER_DB_LAUNCH_MODE=${mode}`,
    );
  }

  const targetDir = path.dirname(databasePath);
  const tempPath = `${databasePath}.download`;
  fs.mkdirSync(targetDir, { recursive: true });

  try {
    await storage.getFile(sourceKey, tempPath);
    fs.renameSync(tempPath, databasePath);
    cleanupWalSidecars(databasePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
    throw error;
  }

  console.log(
    `🗄️  Boot database loaded from storage (${mode}) key='${sourceKey}' -> ${databasePath}`,
  );
}
