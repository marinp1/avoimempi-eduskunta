import { Database } from "bun:sqlite";
import { getDatabasePath, getDocumentsDatabasePath } from "#database";
import { openDocumentsDb } from "./db.ts";

function printHelp() {
  console.log(`
Usage: bun run fetch-docs:errors [options]

Shows all documents that failed to fetch, joined with their metadata from the
main database (document type, title).

Options:
  --document-type <type>  Filter to a specific document type
  --error <value>         Filter to a specific error string (e.g. rate_limited, "Not found")
  --limit N               Cap the number of detail rows shown

Examples:
  bun run fetch-docs:errors
  bun run fetch-docs:errors --error rate_limited
  bun run fetch-docs:errors --document-type vastaus_kirjalliseen_kysymykseen
  bun run fetch-docs:errors --limit 50
`);
}

function parseArgs(args: string[]) {
  let documentType: string | null = null;
  let errorFilter: string | null = null;
  let limit: number | null = null;

  const readFlagValue = (
    rawArg: string,
    index: number,
  ): { value: string | null; consumedNext: boolean } => {
    const eqIndex = rawArg.indexOf("=");
    if (eqIndex !== -1) {
      return { value: rawArg.slice(eqIndex + 1), consumedNext: false };
    }
    return { value: args[index + 1] ?? null, consumedNext: true };
  };

  for (let i = 0; i < args.length; i++) {
    const rawArg = args[i];
    const flag = rawArg.split("=")[0];

    if (rawArg === "help" || rawArg === "--help" || rawArg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (flag === "--document-type") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      documentType = value;
      continue;
    }

    if (flag === "--error") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      errorFilter = value;
      continue;
    }

    if (flag === "--limit") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      const n = parseInt(value ?? "", 10);
      if (Number.isNaN(n) || n <= 0) {
        console.error("❌ --limit must be a positive integer");
        process.exit(1);
      }
      limit = n;
      continue;
    }

    if (rawArg.startsWith("-")) {
      console.error(`❌ Unknown flag: ${rawArg}`);
      printHelp();
      process.exit(1);
    }

    console.error(`❌ Unexpected argument: ${rawArg}`);
    printHelp();
    process.exit(1);
  }

  return { documentType, errorFilter, limit };
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  const { documentType, errorFilter, limit } = parseArgs(args);

  openDocumentsDb().close();

  const docsDbPath = getDocumentsDatabasePath();
  const mainDbPath = getDatabasePath();

  const db = new Database(docsDbPath, { readonly: true });
  db.run(`ATTACH DATABASE '${mainDbPath}' AS maindb`);

  const col = (s: string, w: number) => (s ?? "").padEnd(w).slice(0, w);
  const rpad = (s: string, w: number) => (s ?? "").padStart(w).slice(-w);

  // --- Summary by error ---

  const summaryRows = db
    .query<{ error: string; count: number }, []>(
      `SELECT d.error, COUNT(*) AS count
       FROM DocumentFile d
       WHERE d.error IS NOT NULL
       GROUP BY d.error
       ORDER BY count DESC`,
    )
    .all();

  if (summaryRows.length === 0) {
    console.log("✓ No errors found in the documents database.");
    db.close();
    return;
  }

  console.log(`${"Error".padEnd(30)} ${"count".padStart(7)}`);
  console.log("─".repeat(38));
  for (const row of summaryRows) {
    console.log(`${col(row.error, 30)} ${rpad(String(row.count), 7)}`);
  }
  console.log();

  // --- Detail rows ---

  const conditions: string[] = ["d.error IS NOT NULL"];
  conditions.push(
    `(v.edk_identifier IS NULL OR NOT (v.edk_identifier NOT LIKE '%-AK-%' AND v.title IS NOT NULL AND EXISTS (SELECT 1 FROM maindb.VaskiDocument v2 WHERE v2.document_type = v.document_type AND v2.title = v.title AND v2.edk_identifier LIKE '%-AK-%')))`,
  );
  if (documentType) {
    conditions.push(`v.document_type = '${documentType.replace(/'/g, "''")}'`);
  }
  if (errorFilter) {
    conditions.push(`d.error = '${errorFilter.replace(/'/g, "''")}'`);
  }
  const whereClause = conditions.join(" AND ");
  const limitClause = limit ? `LIMIT ${limit}` : "";

  const rows = db
    .query<
      {
        edk_identifier: string;
        document_type: string | null;
        title: string | null;
        error: string;
        http_status: number | null;
        fetched_at: string;
      },
      []
    >(
      `SELECT
         d.edk_identifier,
         v.document_type,
         v.title,
         d.error,
         d.http_status,
         d.fetched_at
       FROM DocumentFile d
       LEFT JOIN maindb.VaskiDocument v ON v.edk_identifier = d.edk_identifier
       WHERE ${whereClause}
       ORDER BY d.error, d.fetched_at DESC
       ${limitClause}`,
    )
    .all();

  if (rows.length === 0) {
    console.log("No matching error rows.");
    db.close();
    return;
  }

  const W_EDK = 22;
  const W_TYPE = 38;
  const W_TITLE = 36;
  const W_ERR = 14;
  const W_STATUS = 6;
  const W_DATE = 20;

  console.log(
    `${"EDK identifier".padEnd(W_EDK)} ${"document_type".padEnd(W_TYPE)} ${"title".padEnd(W_TITLE)} ${"error".padEnd(W_ERR)} ${"status".padStart(W_STATUS)} ${"fetched_at".padEnd(W_DATE)}`,
  );
  console.log(
    "─".repeat(W_EDK + W_TYPE + W_TITLE + W_ERR + W_STATUS + W_DATE + 5),
  );

  for (const row of rows) {
    const date = row.fetched_at.slice(0, 19).replace("T", " ");
    console.log(
      `${col(row.edk_identifier, W_EDK)} ${col(row.document_type ?? "", W_TYPE)} ${col(row.title ?? "", W_TITLE)} ${col(row.error, W_ERR)} ${rpad(String(row.http_status ?? ""), W_STATUS)} ${date}`,
    );
  }

  if (limit && rows.length === limit) {
    console.log(`\n(showing first ${limit} rows — use --limit to adjust)`);
  }

  db.close();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
