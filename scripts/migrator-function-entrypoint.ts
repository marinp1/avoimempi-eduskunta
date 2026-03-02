#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { spawn } from "bun";

type FunctionResponse = {
  statusCode: number;
  body: string;
};

function resolveMigratorCliPath(): string {
  const explicit = process.env.MIGRATOR_CLI_PATH?.trim();
  if (explicit) {
    const absolute = path.isAbsolute(explicit)
      ? explicit
      : path.resolve(process.cwd(), explicit);
    if (fs.existsSync(absolute)) return absolute;
    throw new Error(`MIGRATOR_CLI_PATH does not exist: ${absolute}`);
  }

  const pipelineBuildDir =
    process.env.PIPELINE_BUILD_DIR ?? "/root/avoimempi-eduskunta/dist/pipeline";
  const bundledCandidate = path.join(pipelineBuildDir, "migrator/cli.js");
  if (fs.existsSync(bundledCandidate)) return bundledCandidate;

  throw new Error(
    `Unable to locate migrator CLI bundle. Checked: ${bundledCandidate}`,
  );
}

function ensureMigratorEnv(): string[] {
  const issues: string[] = [];

  const provider = process.env.ROW_STORE_PROVIDER;
  const aliasedUrl = process.env.PIPELINE_ROW_STORE_DATABASE_URL;
  if (!process.env.ROW_STORE_DATABASE_URL && aliasedUrl) {
    process.env.ROW_STORE_DATABASE_URL = aliasedUrl;
  }

  // If a DB URL is present, default provider to postgres when omitted.
  if (!provider && process.env.ROW_STORE_DATABASE_URL) {
    process.env.ROW_STORE_PROVIDER = "postgres";
  }

  if (!process.env.STORAGE_PROVIDER) {
    process.env.STORAGE_PROVIDER = "local";
  }
  if (
    process.env.STORAGE_PROVIDER === "local" &&
    !process.env.STORAGE_LOCAL_DIR
  ) {
    process.env.STORAGE_LOCAL_DIR = "/mnt/pipeline-raw-parsed/data";
  }

  const effectiveProvider = process.env.ROW_STORE_PROVIDER;
  if (effectiveProvider === "postgres" && !process.env.ROW_STORE_DATABASE_URL) {
    issues.push(
      "ROW_STORE_DATABASE_URL is missing (or set PIPELINE_ROW_STORE_DATABASE_URL).",
    );
  }

  return issues;
}

async function runMigrator(): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const migratorCliPath = resolveMigratorCliPath();
  const child = spawn(["bun", "run", migratorCliPath, "start"], {
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  return { exitCode, stdout, stderr };
}

export async function handle(): Promise<FunctionResponse> {
  const envIssues = ensureMigratorEnv();
  if (envIssues.length > 0) {
    return {
      statusCode: 500,
      body: `Migrator env validation failed:\n- ${envIssues.join("\n- ")}`,
    };
  }

  const { exitCode, stdout, stderr } = await runMigrator();
  const combinedOutput = [stdout, stderr].filter(Boolean).join("\n").trim();

  if (exitCode === 0) {
    return {
      statusCode: 200,
      body: combinedOutput || "Migration completed.",
    };
  }

  return {
    statusCode: 500,
    body: combinedOutput || "Migration failed.",
  };
}

if (import.meta.main) {
  const result = await handle();
  const writer = result.statusCode >= 400 ? console.error : console.log;
  writer(result.body);
  process.exit(result.statusCode >= 400 ? 1 : 0);
}
