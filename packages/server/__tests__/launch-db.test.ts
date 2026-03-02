import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { getDatabasePath, getTraceDatabasePath } from "#database";
import { StorageFactory } from "#storage";
import { prepareDatabaseForServerStartup } from "../database/launch-db";

const envKeys = [
  "STORAGE_PROVIDER",
  "STORAGE_LOCAL_DIR",
  "DB_PATH",
  "TRACE_DB_PATH",
  "SERVER_DB_LAUNCH_MODE",
  "SERVER_DB_LAUNCH_STORAGE_KEY",
  "SERVER_TRACE_DB_LAUNCH_STORAGE_KEY",
] as const;

const envSnapshot = new Map<string, string | undefined>();

for (const key of envKeys) {
  envSnapshot.set(key, process.env[key]);
}

const createdPaths = new Set<string>();

const ensureFile = (filePath: string, contents: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
  createdPaths.add(filePath);
};

const removePath = (target: string) => {
  if (!fs.existsSync(target)) return;
  const stats = fs.statSync(target);
  if (stats.isDirectory()) {
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    fs.rmSync(target, { force: true });
  }
};

describe("prepareDatabaseForServerStartup", () => {
  afterEach(() => {
    StorageFactory.reset();
    for (const [key, value] of envSnapshot.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    const uniqueRoots = new Set<string>();
    for (const filePath of createdPaths) {
      uniqueRoots.add(path.dirname(filePath));
    }
    for (const root of uniqueRoots) {
      removePath(root);
    }
    createdPaths.clear();
  });

  test("uses latest manifest artifact key when launch mode is latest", async () => {
    const testRoot = path.join(process.cwd(), ".tmp-tests", "launch-db-latest");
    const storageDir = path.join(testRoot, "storage");
    const dbRelativePath =
      "../../../.tmp-tests/launch-db-latest/runtime/active.db";
    const traceDbRelativePath =
      "../../../.tmp-tests/launch-db-latest/runtime/active-trace.db";

    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_DIR = storageDir;
    process.env.DB_PATH = dbRelativePath;
    process.env.TRACE_DB_PATH = traceDbRelativePath;
    process.env.SERVER_DB_LAUNCH_MODE = "latest";

    const artifactKey = "artifacts/sqlite/latest/avoimempi-eduskunta.db";
    const traceArtifactKey =
      "artifacts/sqlite/latest/avoimempi-eduskunta-trace.db";
    const manifestPath = path.join(
      storageDir,
      "artifacts/sqlite/latest/manifest.json",
    );
    const sourceDbPath = path.join(storageDir, artifactKey);
    const sourceTraceDbPath = path.join(storageDir, traceArtifactKey);

    ensureFile(sourceDbPath, "from-latest-artifact");
    ensureFile(sourceTraceDbPath, "from-latest-trace-artifact");
    ensureFile(
      manifestPath,
      JSON.stringify(
        {
          dbArtifactKey: artifactKey,
          traceDbArtifactKey: traceArtifactKey,
        },
        null,
        2,
      ),
    );

    const targetDbPath = getDatabasePath();
    const targetTraceDbPath = getTraceDatabasePath();
    ensureFile(targetDbPath, "old-db");
    ensureFile(targetTraceDbPath, "old-trace-db");
    ensureFile(`${targetDbPath}-wal`, "wal");
    ensureFile(`${targetDbPath}-shm`, "shm");
    ensureFile(`${targetTraceDbPath}-wal`, "trace-wal");
    ensureFile(`${targetTraceDbPath}-shm`, "trace-shm");

    StorageFactory.reset();
    await prepareDatabaseForServerStartup();

    expect(fs.readFileSync(targetDbPath, "utf8")).toBe("from-latest-artifact");
    expect(fs.readFileSync(targetTraceDbPath, "utf8")).toBe(
      "from-latest-trace-artifact",
    );
    expect(fs.existsSync(`${targetDbPath}-wal`)).toBe(false);
    expect(fs.existsSync(`${targetDbPath}-shm`)).toBe(false);
    expect(fs.existsSync(`${targetTraceDbPath}-wal`)).toBe(false);
    expect(fs.existsSync(`${targetTraceDbPath}-shm`)).toBe(false);
  });

  test("uses explicit storage key when launch mode is storage-key", async () => {
    const testRoot = path.join(
      process.cwd(),
      ".tmp-tests",
      "launch-db-storage-key",
    );
    const storageDir = path.join(testRoot, "storage");
    const dbRelativePath =
      "../../../.tmp-tests/launch-db-storage-key/runtime/active.db";
    const traceDbRelativePath =
      "../../../.tmp-tests/launch-db-storage-key/runtime/active-trace.db";

    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_DIR = storageDir;
    process.env.DB_PATH = dbRelativePath;
    process.env.TRACE_DB_PATH = traceDbRelativePath;
    process.env.SERVER_DB_LAUNCH_MODE = "storage-key";
    process.env.SERVER_DB_LAUNCH_STORAGE_KEY =
      "artifacts/sqlite/snapshots/s1/avoimempi-eduskunta.db";
    process.env.SERVER_TRACE_DB_LAUNCH_STORAGE_KEY =
      "artifacts/sqlite/snapshots/s1/avoimempi-eduskunta-trace.db";

    const sourceDbPath = path.join(
      storageDir,
      process.env.SERVER_DB_LAUNCH_STORAGE_KEY,
    );
    const sourceTraceDbPath = path.join(
      storageDir,
      process.env.SERVER_TRACE_DB_LAUNCH_STORAGE_KEY,
    );
    ensureFile(sourceDbPath, "from-snapshot-artifact");
    ensureFile(sourceTraceDbPath, "from-snapshot-trace-artifact");

    const targetDbPath = getDatabasePath();
    const targetTraceDbPath = getTraceDatabasePath();
    ensureFile(targetDbPath, "old-db");
    ensureFile(targetTraceDbPath, "old-trace-db");

    StorageFactory.reset();
    await prepareDatabaseForServerStartup();

    expect(fs.readFileSync(targetDbPath, "utf8")).toBe(
      "from-snapshot-artifact",
    );
    expect(fs.readFileSync(targetTraceDbPath, "utf8")).toBe(
      "from-snapshot-trace-artifact",
    );
  });
});
