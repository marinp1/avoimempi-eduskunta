import fs from "node:fs";
import path from "node:path";
import { $, build } from "bun";

const [, , rawTarget] = process.argv;
const target = rawTarget ?? "all";

// SSH aliases defined in your local ~/.ssh/config.
// Set in .env or .env.local at the repo root (loaded automatically by bun).
const APP_HOST = process.env.DEPLOY_APP_HOST_ALIAS ?? "scaleway-app";
const PIPELINE_HOST =
  process.env.DEPLOY_PIPELINE_HOST_ALIAS ?? "scaleway-pipeline";

// Deployment constants — single target, no overrides needed.
const APP_DIR = "/root/avoimempi-eduskunta";
const PIPELINE_DIR = "/root/avoimempi-eduskunta";

async function deployAppBuild() {
  const dist = path.join(import.meta.dirname, "../dist");
  const config = path.join(import.meta.dirname, "../packages/server/config");
  const appVmDir = path.join(import.meta.dirname, "app-vm");
  const runAppScript = path.join(appVmDir, "run-app.sh");
  const installSystemdScript = path.join(appVmDir, "install-app-systemd-service.sh");
  const releaseScript = path.join(appVmDir, "app-release.sh");
  const provisionScript = path.join(appVmDir, "provision-app-vm.sh");
  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const releaseDir = `${APP_DIR}/releases/${releaseId}`;

  for (const p of [runAppScript, installSystemdScript, releaseScript, provisionScript]) {
    if (!fs.existsSync(p)) throw new Error(`App VM script missing: ${p}`);
  }

  await build({
    outdir: dist,
    loader: { ".sql": "text" },
    entrypoints: [
      path.join(import.meta.dirname, "../packages/server/index.ts"),
    ],
    target: "bun",
  });

  await $`ssh ${APP_HOST} mkdir -p ${APP_DIR}/releases ${APP_DIR}/scripts ${APP_DIR}/shared ${releaseDir}/dist ${releaseDir}/config ${releaseDir}/scripts`;

  await $`scp -r ${dist}/. ${APP_HOST}:${releaseDir}/dist`;
  await $`scp -r ${config}/. ${APP_HOST}:${releaseDir}/config`;
  await $`scp ${runAppScript} ${APP_HOST}:${releaseDir}/scripts/run-app.sh`;
  await $`scp ${installSystemdScript} ${APP_HOST}:${APP_DIR}/scripts/install-app-systemd-service.sh`;
  await $`scp ${releaseScript} ${APP_HOST}:${APP_DIR}/scripts/app-release.sh`;
  await $`scp ${provisionScript} ${APP_HOST}:${APP_DIR}/scripts/provision-app-vm.sh`;

  await $`ssh ${APP_HOST} chmod +x ${releaseDir}/scripts/run-app.sh ${APP_DIR}/scripts/install-app-systemd-service.sh ${APP_DIR}/scripts/app-release.sh ${APP_DIR}/scripts/provision-app-vm.sh`;

  await $`ssh ${APP_HOST} ${APP_DIR}/scripts/install-app-systemd-service.sh`;
  await $`ssh ${APP_HOST} ${APP_DIR}/scripts/app-release.sh activate ${releaseId}`;
  await $`ssh ${APP_HOST} ${APP_DIR}/scripts/app-release.sh cleanup`;

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
    loader: { ".sql": "text" },
    entrypoints: [path.join(rootDir, "packages/datapipe/migrator/cli.ts")],
    target: "bun",
  });

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

  const rootDir = path.join(import.meta.dirname, "..");
  const vmScriptsDir = path.join(import.meta.dirname, "pipeline-vm");
  const scripts = [
    "pipeline-jobs.sh",
    "install-pipeline-systemd-jobs.sh",
    "bootstrap-pipeline-storage.sh",
    "provision-pipeline-vm.sh",
  ];

  for (const script of scripts) {
    if (!fs.existsSync(path.join(vmScriptsDir, script))) {
      throw new Error(`Pipeline VM script missing: scripts/pipeline-vm/${script}`);
    }
  }

  await $`ssh ${PIPELINE_HOST} mkdir -p ${PIPELINE_DIR}/dist ${PIPELINE_DIR}/scripts`;

  const distPipeline = path.join(rootDir, "dist/pipeline");
  await $`scp -r ${distPipeline} ${PIPELINE_HOST}:${PIPELINE_DIR}/dist/pipeline`;

  for (const script of scripts) {
    await $`scp ${path.join(vmScriptsDir, script)} ${PIPELINE_HOST}:${PIPELINE_DIR}/scripts/${script}`;
  }

  const remoteScripts = scripts.map((s) => `${PIPELINE_DIR}/scripts/${s}`);
  await $`ssh ${PIPELINE_HOST} chmod +x ${remoteScripts}`;
}

async function uploadDatabase() {
  const db = path.join(import.meta.dirname, "../avoimempi-eduskunta.db");
  if (!fs.existsSync(db)) throw new Error("db file not found");
  await $`scp ${db} ${APP_HOST}:${APP_DIR}`;
}

function printHelp() {
  console.log(`Usage: bun scripts/deploy.mts <target>

Targets:
  all       Deploy app + pipeline (default)
  app       Build server and activate a new release on the app VM
  pipeline  Build pipeline CLIs and upload scripts to the pipeline VM
  database  Upload local avoimempi-eduskunta.db to the app VM

SSH aliases (set in .env or .env.local at repo root, loaded automatically by bun):
  DEPLOY_APP_HOST_ALIAS       SSH alias for app VM (default: scaleway-app)
  DEPLOY_PIPELINE_HOST_ALIAS  SSH alias for pipeline VM (default: scaleway-pipeline)

First-time VM setup (SSH in once after first deploy):
  App VM:      ./scripts/provision-app-vm.sh
  Pipeline VM: ./scripts/provision-pipeline-vm.sh
               edit shared/pipeline.env
               ./scripts/install-pipeline-systemd-jobs.sh install
`);
}

switch (target) {
  case "all":
    await deployAppBuild();
    await deployPipelineBuild();
    break;
  case "app":
    await deployAppBuild();
    break;
  case "pipeline":
    await deployPipelineBuild();
    break;
  case "database":
    await uploadDatabase();
    break;
  default:
    if (target === "help" || target === "--help" || target === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(
      `Unknown deploy target: ${target}. Use: all|app|pipeline|database`,
    );
}

console.log("Done!");
