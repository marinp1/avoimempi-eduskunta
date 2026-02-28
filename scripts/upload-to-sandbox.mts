import fs from "node:fs";
import path from "node:path";
import { $, build } from "bun";

const [, , type] = process.argv;

const INSTANCE_ALIAS = "scalewaybox";
const APP_FOLDER = "/root/avoimempi-eduskunta";
const MIGRATOR_FUNCTION_FOLDER = `${APP_FOLDER}/functions/migrator`;

function resolveMigratorFunctionEnv(): Record<string, string> {
  const storageProvider = process.env.STORAGE_PROVIDER ?? "local";
  const storageLocalDir =
    process.env.STORAGE_LOCAL_DIR ?? "/mnt/pipeline-data/data";
  const rowStoreProvider = process.env.ROW_STORE_PROVIDER ?? "";
  const rowStoreDatabaseUrl =
    process.env.ROW_STORE_DATABASE_URL ??
    process.env.PIPELINE_ROW_STORE_DATABASE_URL ??
    "";

  if (rowStoreProvider === "postgres" && rowStoreDatabaseUrl === "") {
    throw new Error(
      "Missing ROW_STORE_DATABASE_URL (or PIPELINE_ROW_STORE_DATABASE_URL) for migrator function with ROW_STORE_PROVIDER=postgres",
    );
  }

  const env: Record<string, string> = {
    NODE_ENV: process.env.NODE_ENV ?? "production",
    STORAGE_PROVIDER: storageProvider,
    STORAGE_LOCAL_DIR: storageLocalDir,
  };

  if (rowStoreProvider) {
    env.ROW_STORE_PROVIDER = rowStoreProvider;
  }

  if (rowStoreDatabaseUrl !== "") {
    env.ROW_STORE_DATABASE_URL = rowStoreDatabaseUrl;
  }

  const optionalEnvNames = [
    "MIGRATOR_PUBLISH_SNAPSHOT",
    "MIGRATOR_FOREIGN_KEY_CHECK",
    "MIGRATOR_FOREIGN_KEY_CHECK_SAMPLE_LIMIT",
    "MIGRATOR_VACUUM_AFTER_IMPORT",
    "MIGRATOR_SOURCE_REFERENCE_MODE",
  ];
  for (const name of optionalEnvNames) {
    const value = process.env[name];
    if (value) env[name] = value;
  }

  return env;
}

async function writeEnvFile(
  targetFilePath: string,
  values: Record<string, string>,
) {
  const lines = Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  await fs.promises.writeFile(targetFilePath, `${lines.join("\n")}\n`, "utf8");
}

async function uploadMigratorFunctionEntrypoint() {
  const outdir = path.join(import.meta.dirname, "../dist/functions/migrator");
  const entrypoint = path.join(
    import.meta.dirname,
    "migrator-function-entrypoint.ts",
  );

  if (!fs.existsSync(entrypoint)) {
    throw new Error("migrator function entrypoint script not found");
  }

  await fs.promises.rm(outdir, { recursive: true, force: true });

  await build({
    outdir,
    entrypoints: [entrypoint],
    target: "bun",
  });

  const envFilePath = path.join(outdir, ".env");
  await writeEnvFile(envFilePath, resolveMigratorFunctionEnv());

  console.log("Upload migrator function build to Scaleway");
  await $`ssh ${INSTANCE_ALIAS} mkdir -p ${MIGRATOR_FUNCTION_FOLDER}`;
  await $`scp -r ${outdir}/. ${INSTANCE_ALIAS}:${MIGRATOR_FUNCTION_FOLDER}`;
}

switch (type) {
  case "build": {
    const dist = path.join(import.meta.dirname, "../dist");
    const config = path.join(import.meta.dirname, "../packages/server/config");
    const startScript = path.join(import.meta.dirname, "start.sh");
    const nodeEnv = process.env.NODE_ENV ?? "production";
    const defaultPort = nodeEnv === "development" ? "3000" : "80";

    if (!fs.existsSync(startScript)) {
      throw new Error("start.sh script not found");
    }

    await build({
      outdir: dist,
      loader: {
        ".sql": "text",
      },
      entrypoints: [
        path.join(import.meta.dirname, "../packages/server/index.ts"),
      ],
      define: {
        "process.env.DB_PATH": "../avoimempi-eduskunta.db",
        "process.env.NODE_ENV": JSON.stringify(nodeEnv),
        "process.env.PORT": JSON.stringify(process.env.PORT ?? defaultPort),
      },
      target: "bun",
    });
    console.log(
      `Build mode: ${nodeEnv}, default port: ${process.env.PORT ?? defaultPort}`,
    );
    console.log(
      "Upload build to Scaleway",
      `scp -r "${dist}" ${INSTANCE_ALIAS}:${APP_FOLDER}`,
    );
    await $`scp -r ${dist} ${INSTANCE_ALIAS}:${APP_FOLDER}`;
    console.log("Upload config folder to Scaleway");
    await $`scp -r ${config} ${INSTANCE_ALIAS}:${APP_FOLDER}`;
    console.log("Upload start script to Scaleway");
    await $`scp ${startScript} ${INSTANCE_ALIAS}:${APP_FOLDER}/start.sh`;
    await $`ssh ${INSTANCE_ALIAS} chmod +x ${APP_FOLDER}/start.sh`;
    await uploadMigratorFunctionEntrypoint();
    break;
  }
  case "database": {
    const db = path.join(import.meta.dirname, "../avoimempi-eduskunta.db");
    if (!fs.existsSync(db)) throw new Error("db file not found");
    console.log("Upload database to Scaleway");
    await $`scp ${db} ${INSTANCE_ALIAS}:${APP_FOLDER}`;
    break;
  }
  case "migrator-function": {
    await uploadMigratorFunctionEntrypoint();
    break;
  }
  default:
    throw new Error(
      `Unknown deploy type ${type ?? "<none>"}, please use build, database or migrator-function.`,
    );
}

console.log("Done!");
