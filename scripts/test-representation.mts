import fs from "fs";
import path from "path";
import { SQL } from "bun";
import { deepEqual } from "node:assert";

const db = new SQL(
  new URL(
    `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${
      process.env.POSTGRES_HOST ?? "localhost"
    }:5432/${process.env.POSTGRES_DB}`
  )
);

/** Database connection. */
const sql = await db.connect();

const now = new Date();

let dateValue = new Date(2000, 0, 1);
dateValue.setMinutes(now.getTimezoneOffset() * -1);

const countList: [string, number][] = [];
let previousCount: number | undefined;

let cnt = 0;

console.time("test-representation");

while (dateValue.valueOf() < now.valueOf()) {
  const datestr = dateValue.toISOString().substring(0, 10);
  const result = await sql`
SELECT * FROM getParliamentComposition(${datestr})
  `;
  let changed = false;
  if (result?.count !== previousCount) {
    changed = true;
    previousCount = result?.count;
  }
  if (changed) countList.push([datestr, previousCount ?? 0]);
  if (cnt++ % 1000 === 0) console.log(datestr);
  dateValue.setDate(dateValue.getDate() + 1);
}

sql.close();

console.timeEnd("test-representation");
console.log("Done");

const expected = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "data.json"), {
    encoding: "utf8",
  })
);

deepEqual(Object.fromEntries(countList), expected);

/*
fs.writeFileSync(
  path.join(import.meta.dirname, "data.json"),
  JSON.stringify(Object.fromEntries(countList), null, 2),
  { encoding: "utf8" }
);
*/
