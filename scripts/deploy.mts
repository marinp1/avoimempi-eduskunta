import fs from "node:fs";
import path from "node:path";
import { $, build } from "bun";

const [, , rawTarget] = process.argv;
const target = rawTarget ?? "all";

const APP_INSTANCE_ALIAS =
  process.env.DEPLOY_APP_HOST_ALIAS ??
  process.env.DEPLOY_HOST_ALIAS ??
  "scaleway-app";
const PIPELINE_INSTANCE_ALIAS =
  process.env.DEPLOY_PIPELINE_HOST_ALIAS ??
  process.env.DEPLOY_HOST_ALIAS ??
  "scaleway-pipeline";
const APP_FOLDER = process.env.DEPLOY_APP_DIR ?? "/root/avoimempi-eduskunta";
const PIPELINE_FOLDER =
  process.env.DEPLOY_PIPELINE_DIR ?? "/root/avoimempi-eduskunta";
const MIGRATOR_FUNCTION_FOLDER = `${PIPELINE_FOLDER}/functions/migrator`;
const APP_SERVICE_NAME =
  process.env.DEPLOY_APP_SERVICE_NAME ?? "avoimempi-eduskunta-app";
const PIPELINE_SERVICE_PREFIX =
  process.env.DEPLOY_PIPELINE_SERVICE_PREFIX ??
  "avoimempi-eduskunta-pipeline";
const DEPLOY_PIPELINE_INSTALL_SYSTEMD =
  (process.env.DEPLOY_PIPELINE_INSTALL_SYSTEMD ?? "true").toLowerCase() !==
  "false";

function resolveMigratorFunctionEnv(): Record<string, string> {
  const storageProvider = process.env.STORAGE_PROVIDER ?? "local";
  const storageLocalDir =
    process.env.STORAGE_LOCAL_DIR ?? "/mnt/pipeline-raw-parsed/data";
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

  if (rowStoreProvider) env.ROW_STORE_PROVIDER = rowStoreProvider;
  if (rowStoreDatabaseUrl !== "")
    env.ROW_STORE_DATABASE_URL = rowStoreDatabaseUrl;

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

async function ensureRemoteFolder(hostAlias: string, remoteDir: string) {
  await $`ssh ${hostAlias} mkdir -p ${remoteDir}`;
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

  console.log("Upload migrator function build");
  await $`ssh ${PIPELINE_INSTANCE_ALIAS} mkdir -p ${MIGRATOR_FUNCTION_FOLDER}`;
  await $`scp -r ${outdir}/. ${PIPELINE_INSTANCE_ALIAS}:${MIGRATOR_FUNCTION_FOLDER}`;
}

async function deployAppBuild() {
  const dist = path.join(import.meta.dirname, "../dist");
  const config = path.join(import.meta.dirname, "../packages/server/config");
  const startScript = path.join(import.meta.dirname, "start.sh");
  const runAppScript = path.join(import.meta.dirname, "run-app.sh");
  const installSystemdScript = path.join(
    import.meta.dirname,
    "install-app-systemd-service.sh",
  );
  const releaseScript = path.join(import.meta.dirname, "app-release.sh");
  const nodeEnv = process.env.NODE_ENV ?? "production";
  const defaultPort = nodeEnv === "development" ? "3000" : "80";
  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const releaseDir = `${APP_FOLDER}/releases/${releaseId}`;

  if (
    !fs.existsSync(startScript) ||
    !fs.existsSync(runAppScript) ||
    !fs.existsSync(installSystemdScript) ||
    !fs.existsSync(releaseScript)
  ) {
    throw new Error("One or more app deploy scripts are missing");
  }

  await build({
    outdir: dist,
    loader: {
      ".sql": "text",
    },
    entrypoints: [
      path.join(import.meta.dirname, "../packages/server/index.ts"),
    ],
    target: "bun",
  });

  console.log(
    `Build mode: ${nodeEnv}, default port: ${process.env.PORT ?? defaultPort}`,
  );
  await $`ssh ${APP_INSTANCE_ALIAS} mkdir -p ${APP_FOLDER}/releases ${APP_FOLDER}/scripts ${APP_FOLDER}/shared ${releaseDir}/dist ${releaseDir}/config ${releaseDir}/scripts`;

  await $`scp -r ${dist}/. ${APP_INSTANCE_ALIAS}:${releaseDir}/dist`;
  await $`scp -r ${config}/. ${APP_INSTANCE_ALIAS}:${releaseDir}/config`;
  await $`scp ${startScript} ${APP_INSTANCE_ALIAS}:${releaseDir}/scripts/start.sh`;
  await $`scp ${runAppScript} ${APP_INSTANCE_ALIAS}:${releaseDir}/scripts/run-app.sh`;
  await $`scp ${installSystemdScript} ${APP_INSTANCE_ALIAS}:${APP_FOLDER}/scripts/install-app-systemd-service.sh`;
  await $`scp ${releaseScript} ${APP_INSTANCE_ALIAS}:${APP_FOLDER}/scripts/app-release.sh`;

  await $`ssh ${APP_INSTANCE_ALIAS} chmod +x ${releaseDir}/scripts/start.sh ${releaseDir}/scripts/run-app.sh ${APP_FOLDER}/scripts/install-app-systemd-service.sh ${APP_FOLDER}/scripts/app-release.sh`;

  await $`ssh ${APP_INSTANCE_ALIAS} APP_DIR=${APP_FOLDER} SERVICE_NAME=${APP_SERVICE_NAME} ${APP_FOLDER}/scripts/install-app-systemd-service.sh`;
  await $`ssh ${APP_INSTANCE_ALIAS} APP_DIR=${APP_FOLDER} SERVICE_NAME=${APP_SERVICE_NAME} ${APP_FOLDER}/scripts/app-release.sh activate ${releaseId}`;
  await $`ssh ${APP_INSTANCE_ALIAS} APP_DIR=${APP_FOLDER} ${APP_FOLDER}/scripts/app-release.sh cleanup`;

  console.log(`Activated app release: ${releaseId}`);
}

async function buildPipelineDist() {
  const rootDir = path.join(import.meta.dirname, "..");
  const distRoot = path.join(rootDir, "dist/pipeline");

  await fs.promises.rm(distRoot, { recursive: true, force: true });
  await fs.promises.mkdir(distRoot, { recursive: true });

  await build({
    outdir: path.join(distRoot, "scraper"),
    entrypoints: [path.join(rootDir, "packages/datapipe/scraper/cli.ts")],
    target: "bun",
  });

  await build({
    outdir: path.join(distRoot, "parser"),
    entrypoints: [path.join(rootDir, "packages/datapipe/parser/cli.ts")],
    target: "bun",
  });

  await build({
    outdir: path.join(distRoot, "migrator"),
    loader: {
      ".sql": "text",
    },
    entrypoints: [path.join(rootDir, "packages/datapipe/migrator/cli.ts")],
    target: "bun",
  });

  const parserFnDir = path.join(rootDir, "packages/datapipe/parser/fn");
  const parserFnFiles = fs
    .readdirSync(parserFnDir)
    .filter((name) => name.endsWith(".ts"));
  for (const fileName of parserFnFiles) {
    await build({
      outdir: path.join(distRoot, "parser/fn"),
      entrypoints: [path.join(parserFnDir, fileName)],
      target: "bun",
    });
  }

  const submigratorDir = path.join(
    rootDir,
    "packages/datapipe/migrator/VaskiData/submigrators",
  );
  const submigratorFiles = fs
    .readdirSync(submigratorDir)
    .filter((name) => name.endsWith(".ts"));
  for (const fileName of submigratorFiles) {
    await build({
      outdir: path.join(distRoot, "migrator/submigrators"),
      entrypoints: [path.join(submigratorDir, fileName)],
      target: "bun",
    });
  }

  const migrationsSource = path.join(
    rootDir,
    "packages/datapipe/migrator/migrations",
  );
  const migrationsTarget = path.join(distRoot, "datapipe/migrator/migrations");
  await fs.promises.mkdir(migrationsTarget, { recursive: true });
  for (const fileName of fs.readdirSync(migrationsSource)) {
    if (!fileName.endsWith(".sql")) continue;
    await fs.promises.copyFile(
      path.join(migrationsSource, fileName),
      path.join(migrationsTarget, fileName),
    );
  }
}

async function deployPipelineBuild() {
  await buildPipelineDist();
  await ensureRemoteFolder(PIPELINE_INSTANCE_ALIAS, PIPELINE_FOLDER);

  const rootDir = path.join(import.meta.dirname, "..");
  const pathsToUpload = [
    "dist/pipeline",
    "scripts/pipeline-jobs.sh",
    "scripts/pipeline-scraper-app.sh",
    "scripts/pipeline-parser-app.sh",
    "scripts/pipeline-migrator-app.sh",
    "scripts/install-pipeline-jobs.sh",
    "scripts/install-pipeline-systemd-jobs.sh",
    "scripts/bootstrap-pipeline-storage.sh",
  ];

  for (const relativePath of pathsToUpload) {
    const localPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Required pipeline deploy path missing: ${relativePath}`);
    }
    const remotePath = `${PIPELINE_FOLDER}/${relativePath}`;
    const remoteParent = path.posix.dirname(remotePath);
    await $`ssh ${PIPELINE_INSTANCE_ALIAS} mkdir -p ${remoteParent}`;
    await $`scp -r ${localPath} ${PIPELINE_INSTANCE_ALIAS}:${remotePath}`;
  }

  await $`ssh ${PIPELINE_INSTANCE_ALIAS} chmod +x ${PIPELINE_FOLDER}/scripts/pipeline-jobs.sh ${PIPELINE_FOLDER}/scripts/pipeline-scraper-app.sh ${PIPELINE_FOLDER}/scripts/pipeline-parser-app.sh ${PIPELINE_FOLDER}/scripts/pipeline-migrator-app.sh ${PIPELINE_FOLDER}/scripts/install-pipeline-jobs.sh ${PIPELINE_FOLDER}/scripts/install-pipeline-systemd-jobs.sh ${PIPELINE_FOLDER}/scripts/bootstrap-pipeline-storage.sh`;

  if (DEPLOY_PIPELINE_INSTALL_SYSTEMD) {
    await $`ssh ${PIPELINE_INSTANCE_ALIAS} APP_DIR=${PIPELINE_FOLDER} SERVICE_PREFIX=${PIPELINE_SERVICE_PREFIX} ${PIPELINE_FOLDER}/scripts/install-pipeline-systemd-jobs.sh install`;
  }
}

async function uploadDatabase() {
  const db = path.join(import.meta.dirname, "../avoimempi-eduskunta.db");
  if (!fs.existsSync(db)) throw new Error("db file not found");
  await $`scp ${db} ${APP_INSTANCE_ALIAS}:${APP_FOLDER}`;
}

function printHelp() {
  console.log(`Usage: bun scripts/deploy.mts <target>

Targets:
  all               Deploy app build + pipeline build + migrator-function
  app               Deploy app runtime build (dist + server config + start.sh)
  pipeline          Deploy pipeline runtime build + scripts
  migrator-function Deploy migrator function bundle
  database          Upload local avoimempi-eduskunta.db

Environment:
  DEPLOY_APP_HOST_ALIAS      SSH alias for app VM (default: scaleway-app)
  DEPLOY_PIPELINE_HOST_ALIAS SSH alias for pipeline VM (default: scaleway-pipeline)
  DEPLOY_HOST_ALIAS          Optional fallback alias used for both if specific aliases are unset
  DEPLOY_APP_DIR             Remote app folder (default: /root/avoimempi-eduskunta)
  DEPLOY_PIPELINE_DIR        Remote pipeline folder (default: /root/avoimempi-eduskunta)
  DEPLOY_APP_SERVICE_NAME    systemd service name (default: avoimempi-eduskunta-app)
  DEPLOY_PIPELINE_SERVICE_PREFIX  pipeline systemd prefix (default: avoimempi-eduskunta-pipeline)
  DEPLOY_PIPELINE_INSTALL_SYSTEMD install/refresh pipeline systemd timers on deploy (default: true)
  NODE_ENV                   Build mode for app target (default: production)
`);
}

switch (target) {
  case "all":
    await deployAppBuild();
    await deployPipelineBuild();
    await uploadMigratorFunctionEntrypoint();
    break;
  case "app":
    await deployAppBuild();
    break;
  case "pipeline":
    await deployPipelineBuild();
    break;
  case "migrator-function":
    await uploadMigratorFunctionEntrypoint();
    break;
  case "database":
    await uploadDatabase();
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    process.exit(0);
    break;
  default:
    throw new Error(
      `Unknown deploy target ${target}, use: all|app|pipeline|migrator-function|database`,
    );
}

console.log("Done!");
