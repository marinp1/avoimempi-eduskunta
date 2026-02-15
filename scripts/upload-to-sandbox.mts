import fs from "node:fs";
import path from "node:path";
import { $, build } from "bun";

const [, , type] = process.argv;

const INSTANCE_ALIAS = "scalewaybox";
const APP_FOLDER = "/root/avoimempi-eduskunta";

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
    break;
  }
  case "database": {
    const db = path.join(import.meta.dirname, "../avoimempi-eduskunta.db");
    if (!fs.existsSync(db)) throw new Error("db file not found");
    console.log("Upload database to Scaleway");
    await $`scp ${db} ${INSTANCE_ALIAS}:${APP_FOLDER}`;
    break;
  }
  default:
    throw new Error(
      `Unknown deploy type ${type ?? "<none>"}, please use build or database.`,
    );
}

console.log("Done!");
