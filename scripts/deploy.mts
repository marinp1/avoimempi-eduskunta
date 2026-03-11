import fs from "node:fs";
import path from "node:path";
import { $, build } from "bun";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const target = args[0] ?? "all";
const skipReleaseCheck = flags.has("--no-release-check");

// SSH alias defined in your local ~/.ssh/config.
// Set in .env or .env.local at the repo root (loaded automatically by bun).
const HOST = process.env.DEPLOY_HOST_ALIAS ?? "hetzner";

// Deployment constants
const APP_DIR = "/opt/avoimempi-eduskunta";

function assertReleased() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(import.meta.dirname, "../package.json"), "utf-8"),
  );
  const expectedTag = `v${pkg.version}`;

  const exactTag = Bun.spawnSync(
    ["git", "describe", "--tags", "--exact-match", "HEAD"],
    {
      cwd: path.join(import.meta.dirname, ".."),
    },
  );

  if (skipReleaseCheck) {
    console.warn("Warning: skipping release check (--no-release-check).");
    return;
  }

  // Alpha pre-releases are committed but not tagged — just verify the release commit exists.
  if (pkg.version.includes("-")) {
    const log = Bun.spawnSync(
      ["git", "log", "-1", "--pretty=format:%s", "HEAD"],
      { cwd: path.join(import.meta.dirname, "..") },
    );
    const subject = log.stdout.toString().trim();
    if (subject !== `chore: release v${pkg.version}`) {
      console.error(
        `Error: HEAD is not a release commit for ${pkg.version}. Run \`bun run release alpha\` first.`,
      );
      process.exit(1);
    }
    console.log(`Deploying ${expectedTag} (pre-release, no tag)`);
    return;
  }

  if (!exactTag.success) {
    console.error(
      `Error: HEAD is not tagged. Run \`bun run release\` first to create tag ${expectedTag}.`,
    );
    process.exit(1);
  }

  const actualTag = exactTag.stdout.toString().trim();
  if (actualTag !== expectedTag) {
    console.error(
      `Error: HEAD is tagged as ${actualTag} but package.json says ${pkg.version}. Run \`bun run release\` to sync them.`,
    );
    process.exit(1);
  }

  console.log(`Deploying ${actualTag}`);
}

async function deployAppBuild() {
  const dist = path.join(import.meta.dirname, "../dist");
  const config = path.join(import.meta.dirname, "../packages/server/config");
  const appScriptsDir = path.join(import.meta.dirname, "app");
  const runAppScript = path.join(appScriptsDir, "run-app.sh");
  const installSystemdScript = path.join(
    appScriptsDir,
    "install-app-systemd-service.sh",
  );
  const releaseScript = path.join(appScriptsDir, "app-release.sh");
  const restartScript = path.join(appScriptsDir, "restart-app.sh");
  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const releaseDir = `${APP_DIR}/releases/${releaseId}`;

  for (const p of [
    runAppScript,
    installSystemdScript,
    releaseScript,
    restartScript,
  ]) {
    if (!fs.existsSync(p)) throw new Error(`App script missing: ${p}`);
  }

  await build({
    outdir: dist,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    loader: { ".sql": "text" },
    entrypoints: [
      path.join(import.meta.dirname, "../packages/server/index.ts"),
    ],
    target: "bun",
  });

  await $`ssh ${HOST} mkdir -p ${APP_DIR}/releases ${APP_DIR}/scripts/app ${APP_DIR}/shared ${releaseDir}/dist ${releaseDir}/config ${releaseDir}/scripts`;

  await $`scp -r ${dist}/. ${HOST}:${releaseDir}/dist`;
  await $`scp -r ${config}/. ${HOST}:${releaseDir}/config`;
  await $`scp ${runAppScript} ${HOST}:${releaseDir}/scripts/run-app.sh`;
  await $`scp ${installSystemdScript} ${HOST}:${APP_DIR}/scripts/app/install-app-systemd-service.sh`;
  await $`scp ${releaseScript} ${HOST}:${APP_DIR}/scripts/app/app-release.sh`;
  await $`scp ${restartScript} ${HOST}:${APP_DIR}/scripts/app/restart-app.sh`;

  await $`ssh ${HOST} chmod +x ${releaseDir}/scripts/run-app.sh ${APP_DIR}/scripts/app/install-app-systemd-service.sh ${APP_DIR}/scripts/app/app-release.sh ${APP_DIR}/scripts/app/restart-app.sh`;
  await $`ssh ${HOST} chmod -R a+rX ${releaseDir}`;

  await $`ssh ${HOST} ${APP_DIR}/scripts/app/install-app-systemd-service.sh`;
  await $`ssh ${HOST} ${APP_DIR}/scripts/app/app-release.sh activate ${releaseId}`;
  await $`ssh ${HOST} ${APP_DIR}/scripts/app/app-release.sh cleanup`;

  console.log(`Activated app release: ${releaseId}`);
}

async function buildPipelineDist() {
  const rootDir = path.join(import.meta.dirname, "..");
  const distRoot = path.join(rootDir, "dist/pipeline");

  await fs.promises.rm(distRoot, { recursive: true, force: true });
  await fs.promises.mkdir(distRoot, { recursive: true });

  await build({
    outdir: path.join(distRoot, "scraper"),
    entrypoints: [
      path.join(rootDir, "packages/datapipe/scraper/cli.ts"),
      path.join(rootDir, "packages/datapipe/scraper/fetch-counts-cli.ts"),
    ],
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
  const migrationsTarget = path.join(distRoot, "migrator/migrations");
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
  const pipelineScriptsDir = path.join(import.meta.dirname, "pipeline");
  const scripts = ["pipeline-jobs.sh", "install-pipeline-systemd-jobs.sh"];

  for (const script of scripts) {
    if (!fs.existsSync(path.join(pipelineScriptsDir, script))) {
      throw new Error(`Pipeline script missing: scripts/pipeline/${script}`);
    }
  }

  const provisionScript = path.join(import.meta.dirname, "provision-vm.sh");
  if (!fs.existsSync(provisionScript)) {
    throw new Error("Script missing: scripts/provision-vm.sh");
  }

  await $`ssh ${HOST} mkdir -p ${APP_DIR}/dist ${APP_DIR}/scripts/pipeline`;
  await $`ssh ${HOST} rm -rf ${APP_DIR}/dist/pipeline`;

  const distPipeline = path.join(rootDir, "dist/pipeline");
  await $`scp -r ${distPipeline} ${HOST}:${APP_DIR}/dist/pipeline`;

  await $`scp ${path.join(pipelineScriptsDir, "pipeline-jobs.sh")} ${HOST}:${APP_DIR}/scripts/pipeline/pipeline-jobs.sh`;
  await $`scp ${path.join(pipelineScriptsDir, "install-pipeline-systemd-jobs.sh")} ${HOST}:${APP_DIR}/scripts/pipeline/install-pipeline-systemd-jobs.sh`;
  await $`scp ${provisionScript} ${HOST}:${APP_DIR}/scripts/provision-vm.sh`;

  await $`ssh ${HOST} chmod +x ${APP_DIR}/scripts/pipeline/pipeline-jobs.sh ${APP_DIR}/scripts/pipeline/install-pipeline-systemd-jobs.sh ${APP_DIR}/scripts/provision-vm.sh`;
  await $`ssh ${HOST} chmod -R a+rX ${APP_DIR}/dist ${APP_DIR}/scripts`;
}

async function uploadDatabase() {
  const db = path.join(import.meta.dirname, "../avoimempi-eduskunta.db");
  if (!fs.existsSync(db)) throw new Error("db file not found");

  const APP_DATA_DIR = "/var/lib/avoimempi-eduskunta-app";
  const releaseId = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = `${APP_DATA_DIR}/releases/avoimempi-eduskunta-${releaseId}.db`;

  await $`ssh ${HOST} mkdir -p ${APP_DATA_DIR}/releases`;
  await $`scp ${db} ${HOST}:${dest}`;
  await $`ssh ${HOST} chmod 644 ${dest}`;
  await $`ssh ${HOST} ln -sfn ${dest} ${APP_DATA_DIR}/current.db`;
  await $`ssh ${HOST} systemctl restart avoimempi-eduskunta-app`;

  console.log(`Uploaded and activated DB release: ${releaseId}`);
}

async function uploadData() {
  const [rawDb, parsedDb] = [
    path.join(import.meta.dirname, "../data/raw.db"),
    path.join(import.meta.dirname, "../data/parsed.db"),
  ];
  if (!fs.existsSync(rawDb)) throw new Error("rawDb file not found");
  if (!fs.existsSync(parsedDb)) throw new Error("parsedDb file not found");

  const PIPELINE_DATA_DIR = "/var/lib/avoimempi-eduskunta-pipeline/data";
  await $`ssh ${HOST} mkdir -p ${PIPELINE_DATA_DIR}`;
  await $`scp ${rawDb} ${HOST}:${PIPELINE_DATA_DIR}/raw.db`;
  await $`scp ${parsedDb} ${HOST}:${PIPELINE_DATA_DIR}/parsed.db`;
}

function printHelp() {
  console.log(`Usage: bun scripts/deploy.mts <target>

Targets:
  all       Deploy app + pipeline (default)
  app       Build server and activate a new release
  pipeline  Build pipeline CLIs and upload scripts
  database  Upload local avoimempi-eduskunta.db to the VM
  data      Upload raw.db and parsed.db to the VM

SSH alias (set in .env or .env.local at repo root, loaded automatically by bun):
  DEPLOY_HOST_ALIAS   SSH alias for the VM (default: hetzner)

First-time VM setup (SSH in once after first deploy):
  ssh hetzner "${APP_DIR}/scripts/provision-vm.sh"
`);
}

switch (target) {
  case "all":
    assertReleased();
    await deployAppBuild();
    await deployPipelineBuild();
    break;
  case "app":
    assertReleased();
    await deployAppBuild();
    break;
  case "pipeline":
    assertReleased();
    await deployPipelineBuild();
    break;
  case "data":
    await uploadData();
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
