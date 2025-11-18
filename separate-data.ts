import path from "path";
import fs from "fs";
import vdata from "./vaski-all-parsed.json";

const outdir = (sdir: string) =>
  path.resolve(import.meta.dirname, "vaski-data", sdir);

let ind = 0;

for (const entry of vdata as any[]) {
  const subdir = Math.floor(ind / 1000)
    .toString()
    .padStart(4, "0");
  const od = outdir(subdir);
  if (!fs.existsSync(od)) fs.mkdirSync(od);
  fs.writeFileSync(
    path.resolve(od, `entry-${ind.toString().padStart(5, "0")}.json`),
    JSON.stringify(entry, null, 2),
  );
  if (ind % 100 === 0) {
    console.log("Written", ind, "entries");
  }
  ind++;
}
