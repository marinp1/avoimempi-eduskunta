import { Database } from "bun:sqlite";
import { getDatabasePath, getDocumentsDatabasePath } from "#database";
import { getDocumentHandler } from "#storage";
import { openDocumentsDb } from "./db.ts";
import { fetchAndStoreDocument, sleep, RATE_LIMIT_MS } from "./fetcher.ts";

function printHelp() {
  console.log(`
Usage: bun run fetch-docs [<edk-id> | all | status] [options]

Modes:
  <edk-id>   Fetch a single document by EDK identifier (e.g. EDK-2026-AK-32226)
  all        Fetch all unfetched documents from VaskiDocument registry
  status     Show fetch progress broken down by document type

Options:
  --force          Re-fetch even if already stored or previously failed
  --retry-errors   Re-fetch only previously failed documents
  --limit N        Stop after fetching N documents (all mode only, default: 1000)
  --no-limit       Remove the default limit and fetch all pending documents
  --concurrency N  Number of parallel fetches (all mode only, default: 10)
  --document-type  Only fetch documents of this type (all mode only)
  --dry-run        Print what would be fetched without downloading

Examples:
  bun run fetch-docs status
  bun run fetch-docs EDK-2026-AK-32226
  bun run fetch-docs EDK-2026-AK-32226 --dry-run
  bun run fetch-docs all --limit 100
  bun run fetch-docs all --no-limit
  bun run fetch-docs all --concurrency 5
  bun run fetch-docs all --document-type vastaus_kirjalliseen_kysymykseen
  bun run fetch-docs all --retry-errors
`);
}

function parseArgs(args: string[]) {
  let mode = "";
  let force = false;
  let retryErrors = false;
  let dryRun = false;
  let limit: number | null = 1000;
  let concurrency = 5;
  let documentType: string | null = null;

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

    if (rawArg === "--force") {
      force = true;
      continue;
    }
    if (rawArg === "--retry-errors") {
      retryErrors = true;
      continue;
    }
    if (rawArg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (rawArg === "--no-limit") {
      limit = null;
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

    if (flag === "--concurrency") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      const n = parseInt(value ?? "", 10);
      if (Number.isNaN(n) || n <= 0) {
        console.error("❌ --concurrency must be a positive integer");
        process.exit(1);
      }
      concurrency = n;
      continue;
    }

    if (flag === "--document-type") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      documentType = value;
      continue;
    }

    if (rawArg.startsWith("-")) {
      console.error(`❌ Unknown flag: ${rawArg}`);
      printHelp();
      process.exit(1);
    }

    if (!mode) {
      mode = rawArg;
    } else {
      console.error(`❌ Unexpected argument: ${rawArg}`);
      printHelp();
      process.exit(1);
    }
  }

  return { mode, force, retryErrors, dryRun, limit, concurrency, documentType };
}

async function showStatus() {
  openDocumentsDb().close();

  const docsDbPath = getDocumentsDatabasePath();
  const mainDb = new Database(getDatabasePath(), { readonly: true });
  mainDb.run(`ATTACH DATABASE '${docsDbPath}' AS docsdb`);

  const rows = mainDb
    .query<
      { document_type: string; total: number; fetched: number; errors: number },
      []
    >(
      `SELECT
         v.document_type,
         COUNT(*) AS total,
         COUNT(CASE WHEN d.error IS NULL AND d.storage_key != '' AND d.edk_identifier IS NOT NULL THEN 1 END) AS fetched,
         COUNT(CASE WHEN d.error IS NOT NULL AND d.edk_identifier IS NOT NULL THEN 1 END) AS errors
       FROM VaskiDocument v
       LEFT JOIN docsdb.DocumentFile d ON d.edk_identifier = v.edk_identifier
       WHERE v.edk_identifier IS NOT NULL
       GROUP BY v.document_type
       ORDER BY total DESC`,
    )
    .all();

  let grandTotal = 0;
  let grandFetched = 0;
  let grandErrors = 0;

  const col = (s: string, w: number) => s.padEnd(w).slice(0, w);
  const num = (n: number, w: number) => String(n).padStart(w);
  const hdr = (s: string, w: number) => s.padStart(w);

  console.log(
    `${col("Document type", 42)} ${hdr("total", 7)} ${hdr("fetched", 7)} ${hdr("errors", 7)} ${hdr("pending", 7)}`,
  );
  console.log("─".repeat(70));

  for (const row of rows) {
    const pending = row.total - row.fetched - row.errors;
    grandTotal += row.total;
    grandFetched += row.fetched;
    grandErrors += row.errors;
    console.log(
      `${col(row.document_type, 42)} ${num(row.total, 7)} ${num(row.fetched, 7)} ${num(row.errors, 7)} ${num(pending, 7)}`,
    );
  }

  const grandPending = grandTotal - grandFetched - grandErrors;
  console.log("─".repeat(70));
  console.log(
    `${col("TOTAL", 42)} ${num(grandTotal, 7)} ${num(grandFetched, 7)} ${num(grandErrors, 7)} ${num(grandPending, 7)}`,
  );

  mainDb.close();
}

async function fetchSingle(
  edkIdentifier: string,
  options: { force: boolean; dryRun: boolean },
) {
  await getDocumentHandler().healthCheck();
  const docsDb = openDocumentsDb();

  const mainDb = new Database(getDatabasePath(), { readonly: true });
  let vaskiGuid: string | null = null;
  try {
    const vaskiRow = mainDb
      .query<{ vaski_guid: string | null }, [string]>(
        "SELECT vaski_guid FROM VaskiDocument WHERE edk_identifier = ? LIMIT 1",
      )
      .get(edkIdentifier);
    vaskiGuid = vaskiRow?.vaski_guid ?? null;
  } catch {
    // vaski_guid column not yet in DB (run migrate to add it)
  }
  mainDb.close();

  const result = await fetchAndStoreDocument(docsDb, edkIdentifier, vaskiGuid, {
    force: options.force,
    dryRun: options.dryRun,
  });

  docsDb.close();

  if (result.dryRun) {
    // fetcher already printed the detail line
  } else if (result.skipped) {
    console.log(`⏭  ${edkIdentifier} — already stored as ${result.filename}`);
  } else if (result.error) {
    console.log(
      `❌ ${edkIdentifier} — ${result.error} (HTTP ${result.httpStatus})`,
    );
    process.exit(1);
  } else {
    const kb = result.fileSizeBytes
      ? Math.round(result.fileSizeBytes / 1024)
      : "?";
    console.log(`✓  ${edkIdentifier} → ${result.filename} (${kb} KB)`);
  }
}

async function fetchAll(options: {
  force: boolean;
  retryErrors: boolean;
  dryRun: boolean;
  limit: number | null;
  concurrency: number;
  documentType: string | null;
}) {
  await getDocumentHandler().healthCheck();
  const docsDb = openDocumentsDb();
  const docsDbPath = getDocumentsDatabasePath();

  const mainDb = new Database(getDatabasePath(), { readonly: true });
  mainDb.run(`ATTACH DATABASE '${docsDbPath}' AS docsdb`);

  const typeFilter = options.documentType
    ? `AND v.document_type = '${options.documentType.replace(/'/g, "''")}'`
    : "";

  let whereClause = `v.edk_identifier IS NOT NULL`;
  if (!options.force) {
    if (options.retryErrors) {
      whereClause += ` AND (d.edk_identifier IS NULL OR d.error IS NOT NULL)`;
    } else {
      whereClause += ` AND (d.edk_identifier IS NULL OR d.http_status = 429)`;
    }
  }
  if (typeFilter) whereClause += ` ${typeFilter}`;

  const limitClause = options.limit ? `LIMIT ${options.limit}` : "";

  const progress = mainDb
    .query<{ total: number; fetched: number; errors: number }, []>(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN d.error IS NULL AND d.storage_key != '' AND d.edk_identifier IS NOT NULL THEN 1 END) AS fetched,
         COUNT(CASE WHEN d.error IS NOT NULL AND d.edk_identifier IS NOT NULL THEN 1 END) AS errors
       FROM VaskiDocument v
       LEFT JOIN docsdb.DocumentFile d ON d.edk_identifier = v.edk_identifier
       WHERE v.edk_identifier IS NOT NULL ${typeFilter}`,
    )
    .get()!;

  const pending = progress.total - progress.fetched - progress.errors;
  const scope = options.documentType ? ` [${options.documentType}]` : "";
  console.log(
    `Progress${scope}: ${progress.fetched}/${progress.total} fetched, ${progress.errors} errors, ${pending} pending`,
  );

  const hasGuidColumn =
    mainDb
      .query<{ cnt: number }, []>(
        `SELECT COUNT(*) AS cnt FROM pragma_table_info('VaskiDocument') WHERE name = 'vaski_guid'`,
      )
      .get()?.cnt ?? 0;

  const guidSelect = hasGuidColumn ? "v.vaski_guid" : "NULL AS vaski_guid";

  const rows = mainDb
    .query<
      {
        edk_identifier: string;
        vaski_guid: string | null;
        document_type: string;
      },
      []
    >(
      `SELECT v.edk_identifier, ${guidSelect}, v.document_type
       FROM VaskiDocument v
       LEFT JOIN docsdb.DocumentFile d ON d.edk_identifier = v.edk_identifier
       WHERE ${whereClause}
       ORDER BY CASE WHEN d.http_status = 429 THEN 0 ELSE 1 END, v.id ASC
       ${limitClause}`,
    )
    .all();

  mainDb.close();

  if (rows.length === 0) {
    console.log("✓ Nothing to fetch.");
    docsDb.close();
    return;
  }

  console.log(
    `Fetching ${rows.length} document(s) (concurrency: ${Math.min(options.concurrency, rows.length)})…`,
  );

  let nextIndex = 0;
  let completed = 0;
  let fetched = 0;
  let errors = 0;
  let skipped = 0;
  let aborted = false;

  const worker = async () => {
    let first = true;
    while (!aborted) {
      const i = nextIndex++;
      if (i >= rows.length) break;
      const row = rows[i];
      if (!first) await sleep(RATE_LIMIT_MS);
      first = false;

      const result = await fetchAndStoreDocument(
        docsDb,
        row.edk_identifier,
        row.vaski_guid,
        {
          force: options.force,
          dryRun: options.dryRun,
        },
      );
      completed++;

      if (result.rateLimited) {
        aborted = true;
        const remaining = rows.length - completed;
        console.log(
          `⏸  Rate limited after ${completed} document(s) — aborting run, ${remaining} remain pending`,
        );
        break;
      } else if (result.skipped) {
        skipped++;
      } else if (result.error) {
        errors++;
        console.log(
          `❌ [${completed}/${rows.length}] ${row.edk_identifier} — ${result.error}`,
        );
      } else {
        fetched++;
        const kb = result.fileSizeBytes
          ? Math.round(result.fileSizeBytes / 1024)
          : "?";
        console.log(
          `✓  [${completed}/${rows.length}] ${row.edk_identifier} (${kb} KB)`,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, rows.length) }, worker),
  );

  docsDb.close();

  console.log(`\nDone. fetched=${fetched} errors=${errors} skipped=${skipped}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    printHelp();
    process.exit(0);
  }

  const { mode, force, retryErrors, dryRun, limit, concurrency, documentType } =
    parseArgs(args);

  if (mode === "status") {
    await showStatus();
    return;
  }

  if (mode === "all") {
    await fetchAll({
      force,
      retryErrors,
      dryRun,
      limit,
      concurrency,
      documentType,
    });
    return;
  }

  if (mode) {
    await fetchSingle(mode, { force, dryRun });
    return;
  }

  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
