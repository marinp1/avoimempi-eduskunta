import fs from "node:fs";
import path from "node:path";

type MigrationLockInfo = {
  migrationOngoing: boolean;
  lockFilePath: string;
  startedAt: string | null;
};

export const getMigrationLockFilePath = (): string => {
  const explicit = process.env.MIGRATION_LOCK_FILE?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  return path.resolve(process.cwd(), "data", "migration.lock");
};

export const getMigrationLockInfo = (): MigrationLockInfo => {
  const lockFilePath = getMigrationLockFilePath();
  const migrationOngoing = fs.existsSync(lockFilePath);

  if (!migrationOngoing) {
    return {
      migrationOngoing: false,
      lockFilePath,
      startedAt: null,
    };
  }

  try {
    const raw = fs.readFileSync(lockFilePath, "utf8").trim();
    const parsed = JSON.parse(raw) as { startedAt?: unknown };
    const startedAt =
      typeof parsed.startedAt === "string" && parsed.startedAt.trim() !== ""
        ? parsed.startedAt
        : null;

    return {
      migrationOngoing: true,
      lockFilePath,
      startedAt,
    };
  } catch {
    return {
      migrationOngoing: true,
      lockFilePath,
      startedAt: null,
    };
  }
};

export const writeMigrationLock = (startedAt: string): string => {
  const lockFilePath = getMigrationLockFilePath();
  fs.mkdirSync(path.dirname(lockFilePath), { recursive: true });
  fs.writeFileSync(
    lockFilePath,
    JSON.stringify(
      {
        startedAt,
        pid: process.pid,
      },
      null,
      2,
    ),
    "utf8",
  );
  return lockFilePath;
};

export const clearMigrationLock = (): void => {
  const lockFilePath = getMigrationLockFilePath();
  fs.rmSync(lockFilePath, { force: true });
};
