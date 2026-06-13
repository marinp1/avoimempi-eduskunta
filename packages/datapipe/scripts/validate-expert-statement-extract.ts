import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { getDocumentsDatabasePath } from "#database";
import { getParsedRowStore } from "#storage/row-store/factory";
import {
  extractAuthorFromBodyText,
  extractAuthorFromTitle,
  extractOrgFromAuthorText,
} from "../migrator/fn/VaskiData/submigrators/expert-statement-extract.ts";

const EXPERT_DOC_TYPES = new Set([
  "asiantuntijalausunto",
  "asiantuntijalausunnon_liite",
  "asiantuntijasuunnitelma",
]);

// --- Load DocumentText lookup ---
const docTextMap = new Map<string, string>();
try {
  const docDb = new Database(getDocumentsDatabasePath(), { readonly: true });
  const rows = docDb
    .query<{ edk_identifier: string; body_text: string }, []>(
      "SELECT edk_identifier, body_text FROM DocumentText WHERE body_text IS NOT NULL",
    )
    .all();
  for (const r of rows) docTextMap.set(r.edk_identifier, r.body_text);
  docDb.close();
  console.log(`Loaded ${docTextMap.size} PDF texts from DocumentText`);
} catch (e) {
  console.warn(`Could not load DocumentText:`, e);
}

// --- Iterate parsed rows ---
interface FailedRow {
  edkId: string;
  title: string | null;
  bodyExcerpt: string | null;
  bodyAuthor: string | null;
}

const counts: Record<
  string,
  { total: number; titleMatch: number; bodyMatch: number; orgMatch: number }
> = {};

const matchSamples: {
  title: string;
  author: string;
  org: string | null;
  source: string;
}[] = [];
const failedRows: FailedRow[] = [];
const orgCounts: Record<string, number> = {};

const rowStore = getParsedRowStore();

for await (const storedRow of rowStore.list("VaskiData")) {
  const entry = JSON.parse(storedRow.data) as Record<string, any>;
  const docType = entry["#avoimempieduskunta"]?.documentType as
    | string
    | undefined;
  if (!docType || !EXPERT_DOC_TYPES.has(docType)) continue;

  const edkId = (entry.eduskuntaTunnus as string | null) ?? null;

  const meta =
    entry.contents?.Siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
    entry.contents?.Siirto?.SiirtoMetatieto ||
    {};
  const identOsa = (meta as Record<string, any>)?.IdentifiointiOsa || {};
  const title = (identOsa.Nimeke?.NimekeTeksti as string | null) ?? null;

  const bodyText = edkId ? (docTextMap.get(edkId) ?? null) : null;

  const titleAuthor = extractAuthorFromTitle(title);
  const bodyAuthor = titleAuthor ? null : extractAuthorFromBodyText(bodyText);
  const author = titleAuthor ?? bodyAuthor;
  const org = extractOrgFromAuthorText(author);

  if (!counts[docType])
    counts[docType] = { total: 0, titleMatch: 0, bodyMatch: 0, orgMatch: 0 };
  counts[docType].total++;
  if (titleAuthor) counts[docType].titleMatch++;
  else if (bodyAuthor) counts[docType].bodyMatch++;
  if (org) counts[docType].orgMatch++;

  if (author && matchSamples.length < 10) {
    matchSamples.push({
      title: title ?? "",
      author,
      org,
      source: titleAuthor ? "title" : "body",
    });
  }

  if (!author) {
    failedRows.push({
      edkId: edkId ?? "",
      title,
      bodyExcerpt: bodyText
        ? bodyText.slice(0, 300).replace(/\s+/g, " ")
        : null,
      bodyAuthor: null,
    });
  }

  if (org) {
    orgCounts[org] = (orgCounts[org] ?? 0) + 1;
  }
}

// --- Stats ---
const totalRows = Object.values(counts).reduce((s, c) => s + c.total, 0);
const totalTitle = Object.values(counts).reduce((s, c) => s + c.titleMatch, 0);
const totalBody = Object.values(counts).reduce((s, c) => s + c.bodyMatch, 0);
const totalOrg = Object.values(counts).reduce((s, c) => s + c.orgMatch, 0);
const totalFailed = failedRows.length;

const pct = (n: number, d: number) =>
  d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;

console.log("\nExpert statement extraction validation");
console.log("=".repeat(55));
console.log(`Total rows       : ${totalRows}`);
console.log(`Title matched    : ${totalTitle} (${pct(totalTitle, totalRows)})`);
console.log(`Body matched     : ${totalBody} (${pct(totalBody, totalRows)})`);
console.log(`Org extracted    : ${totalOrg} (${pct(totalOrg, totalRows)})`);
console.log(
  `Both failed      : ${totalFailed} (${pct(totalFailed, totalRows)})`,
);

console.log("\n--- By document type ---");
for (const [type, c] of Object.entries(counts)) {
  console.log(
    `  ${type.padEnd(35)} total=${c.total}  title=${c.titleMatch} (${pct(c.titleMatch, c.total)})  body=${c.bodyMatch} (${pct(c.bodyMatch, c.total)})  org=${c.orgMatch} (${pct(c.orgMatch, c.total)})`,
  );
}

console.log("\n--- Sample matches (first 10) ---");
for (const s of matchSamples) {
  console.log(`  [${s.source}] title : ${s.title}`);
  console.log(`         author: ${s.author}`);
  console.log(`         org   : ${s.org ?? "(none)"}`);
  console.log();
}

const topOrgs = Object.entries(orgCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log("--- Top 20 organizations ---");
for (const [org, count] of topOrgs) {
  console.log(`  ${count.toString().padStart(4)}  ${org}`);
}

// --- Write report ---
const reportDir = join(import.meta.dir, "..", "data", "reports");
mkdirSync(reportDir, { recursive: true });

// Titles file (for quick text search)
const titlesPath = join(reportDir, "expert-statement-nomatch-titles.txt");
const sortedTitles = [
  ...new Set(failedRows.map((r) => r.title ?? "").filter(Boolean)),
].sort();
await Bun.write(titlesPath, sortedTitles.join("\n") + "\n");

// Detailed report with PDF excerpts for rows that had body text available
const detailedPath = join(reportDir, "expert-statement-nomatch-detail.txt");
const withPdf = failedRows.filter((r) => r.bodyExcerpt !== null);
const lines: string[] = [
  `Failed rows: ${failedRows.length} total, ${withPdf.length} have PDF text`,
  "",
];
for (const r of withPdf.slice(0, 200)) {
  lines.push(`EDK: ${r.edkId}`);
  lines.push(`TTL: ${r.title ?? "(no title)"}`);
  lines.push(`PDF: ${r.bodyExcerpt}`);
  lines.push("");
}
await Bun.write(detailedPath, lines.join("\n"));

console.log(`\nReports written:`);
console.log(`  titles  → ${titlesPath}`);
console.log(
  `  details → ${detailedPath}  (${withPdf.length} rows with PDF excerpt)`,
);
