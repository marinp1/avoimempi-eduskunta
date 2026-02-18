import fs from "node:fs";
import path from "node:path";

type PipelinePrefix = "raw" | "parsed" | "metadata" | "artifacts";

const PIPELINE_PREFIXES: PipelinePrefix[] = [
  "raw",
  "parsed",
  "metadata",
  "artifacts",
];

interface Options {
  prefixes: PipelinePrefix[];
  includeDelete: boolean;
  dryRun: boolean;
}

interface AuthResolution {
  envPatch: Record<string, string>;
  source: string;
}

function printUsage(): void {
  console.log(`Sync local pipeline folders to S3-compatible bucket.

Usage:
  bun run scripts/sync-storage-to-s3.mts [options]

Options:
  --all            Sync raw, parsed, metadata, artifacts
  --prefixes=...   Comma separated prefixes (default: raw,parsed)
  --delete         Delete remote objects not present locally
  --dry-run        Show what would change without uploading
  --help           Show this help

Environment:
  STORAGE_S3_BUCKET              Required
  STORAGE_S3_REGION              Optional (default: nl-ams)
  STORAGE_S3_ENDPOINT            Required for Scaleway (e.g. https://s3.nl-ams.scw.cloud)
  STORAGE_S3_ACCESS_KEY_ID       Optional (explicit credentials)
  STORAGE_S3_SECRET_ACCESS_KEY   Optional (explicit credentials)
  SCW_PROFILE                    Optional (resolve creds from scaleway profile via scw CLI)
  STORAGE_LOCAL_DIR              Optional (default: ./data at repo root)
`);
}

function parsePrefixes(raw: string): PipelinePrefix[] {
  const requested = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error("No prefixes provided to --prefixes");
  }

  const deduped = Array.from(new Set(requested));
  for (const prefix of deduped) {
    if (!PIPELINE_PREFIXES.includes(prefix as PipelinePrefix)) {
      throw new Error(
        `Unsupported prefix '${prefix}'. Allowed: ${PIPELINE_PREFIXES.join(", ")}`,
      );
    }
  }

  return deduped as PipelinePrefix[];
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    prefixes: ["raw", "parsed"],
    includeDelete: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--all") {
      options.prefixes = [...PIPELINE_PREFIXES];
      continue;
    }
    if (arg === "--delete") {
      options.includeDelete = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg.startsWith("--prefixes=")) {
      const value = arg.slice("--prefixes=".length);
      options.prefixes = parsePrefixes(value);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function runCommand(
  command: string[],
  env: Record<string, string>,
): Promise<void> {
  const proc = Bun.spawn(command, {
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${command.join(" ")}`);
  }
}

async function runCommandCapture(
  command: string[],
  env: Record<string, string>,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(command, {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function commandExists(
  command: string,
  env: Record<string, string>,
): Promise<boolean> {
  const result = await runCommandCapture(["bash", "-lc", `command -v ${command}`], env);
  return result.code === 0;
}

async function readScwConfigValue(
  key: string,
  env: Record<string, string>,
): Promise<string | null> {
  const result = await runCommandCapture(["scw", "config", "get", key], env);
  if (result.code !== 0 || !result.stdout) {
    return null;
  }
  return result.stdout;
}

async function resolveAuth(env: Record<string, string>): Promise<AuthResolution> {
  const explicitAccessKey =
    process.env.STORAGE_S3_ACCESS_KEY_ID ||
    process.env.SCW_ACCESS_KEY;
  const explicitSecretKey =
    process.env.STORAGE_S3_SECRET_ACCESS_KEY ||
    process.env.SCW_SECRET_KEY;

  if (explicitAccessKey && explicitSecretKey) {
    return {
      envPatch: {
        AWS_ACCESS_KEY_ID: explicitAccessKey,
        AWS_SECRET_ACCESS_KEY: explicitSecretKey,
      },
      source: "explicit access key + secret",
    };
  }

  const scwProfile = process.env.SCW_PROFILE?.trim();
  if (scwProfile) {
    const hasScw = await commandExists("scw", env);
    if (!hasScw) {
      throw new Error(
        "SCW_PROFILE is set but 'scw' CLI is not installed. Set AWS_PROFILE or explicit credentials instead.",
      );
    }

    const scwEnv = { ...env, SCW_PROFILE: scwProfile };
    const accessKey =
      (await readScwConfigValue("access-key", scwEnv)) ||
      (await readScwConfigValue("access_key", scwEnv));
    const secretKey =
      (await readScwConfigValue("secret-key", scwEnv)) ||
      (await readScwConfigValue("secret_key", scwEnv));

    if (!accessKey || !secretKey) {
      throw new Error(
        `Failed to resolve credentials from SCW_PROFILE=${scwProfile}. Ensure profile has access-key and secret-key.`,
      );
    }

    return {
      envPatch: {
        AWS_ACCESS_KEY_ID: accessKey,
        AWS_SECRET_ACCESS_KEY: secretKey,
      },
      source: `SCW_PROFILE=${scwProfile} via scw config`,
    };
  }

  throw new Error(
    "Missing credentials. Set STORAGE_S3_* or SCW_ACCESS_KEY/SCW_SECRET_KEY, or use SCW_PROFILE with scw CLI.",
  );
}

async function ensureAwsCliAvailable(env: Record<string, string>): Promise<void> {
  try {
    await runCommand(["aws", "--version"], env);
  } catch (error) {
    throw new Error(
      "AWS CLI not found. Install awscli in the container to use sync-storage-to-s3.",
      { cause: error },
    );
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const localBaseDir = path.resolve(
    process.env.STORAGE_LOCAL_DIR || path.join(repoRoot, "data"),
  );

  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) {
    throw new Error("STORAGE_S3_BUCKET is required");
  }
  const endpoint = process.env.STORAGE_S3_ENDPOINT;
  if (!endpoint) {
    throw new Error("STORAGE_S3_ENDPOINT is required for Scaleway object storage");
  }
  const region = process.env.STORAGE_S3_REGION || "nl-ams";

  const baseEnv: Record<string, string> = {
    ...process.env,
    AWS_DEFAULT_REGION: region,
    AWS_EC2_METADATA_DISABLED: "true",
  } as Record<string, string>;

  const auth = await resolveAuth(baseEnv);
  const env: Record<string, string> = {
    ...baseEnv,
    ...auth.envPatch,
  };

  await ensureAwsCliAvailable(env);

  console.log(`Sync start: ${localBaseDir} -> s3://${bucket}`);
  console.log(`Prefixes: ${options.prefixes.join(", ")}`);
  console.log(`Auth: ${auth.source}`);
  if (options.includeDelete) {
    console.log("Mode: --delete enabled");
  }
  if (options.dryRun) {
    console.log("Mode: --dry-run enabled");
  }

  for (const prefix of options.prefixes) {
    const localDir = path.join(localBaseDir, prefix);
    if (!fs.existsSync(localDir)) {
      console.log(`Skip ${prefix}: local folder not found at ${localDir}`);
      continue;
    }

    const source = `${localDir.replace(/\/+$/, "")}/`;
    const target = `s3://${bucket}/${prefix}/`;
    const args = [
      "s3",
      "sync",
      source,
      target,
      "--endpoint-url",
      endpoint,
      "--region",
      region,
      "--no-progress",
      "--only-show-errors",
    ];

    if (options.includeDelete) {
      args.push("--delete");
    }
    if (options.dryRun) {
      args.push("--dryrun");
    }

    console.log(`\nSyncing ${prefix}/ ...`);
    await runCommand(["aws", ...args], env);
  }

  console.log("\nSync completed.");
}

await main();
