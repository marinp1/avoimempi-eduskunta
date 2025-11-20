import path from "path";
import fs from 'fs';
import { $, build } from "bun";

const [,,type] = process.argv;

const INSTANCE_ALIAS = "scalewaybox";
const APP_FOLDER = "/root/avoimempi-eduskunta";

switch (type) {
  case "build": {
    const dist = path.join(import.meta.dirname, '../dist');
    await build({
      outdir: dist,
      loader: {
        ".sql": "text",
      },
      entrypoints: [
        path.join(import.meta.dirname, '../packages/server/index.ts'),
      ],
      define: {
        "process.env.DB_PATH": "../avoimempi-eduskunta.db",
      },
      target: 'bun'
    })
    console.log("Upload build to Scaleway", `scp -r "${dist}" ${INSTANCE_ALIAS}:${APP_FOLDER}`)
    await $`scp -r ${dist} ${INSTANCE_ALIAS}:${APP_FOLDER}`;
    break;
  }
  case "database": {  
    const db = path.join(import.meta.dirname, '../avoimempi-eduskunta.db');
    if (!(fs.existsSync(db))) throw new Error("db file not found");
    console.log("Upload database to Scaleway")
    await $`scp ${db} ${INSTANCE_ALIAS}:${APP_FOLDER}`
    break;
  }
  default:
    throw new Error(`Unknown deploy type ${type ?? "<none>"}, please use build or database.`)
}


console.log("Done!");