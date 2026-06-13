import { extractPdfText, type ExtractOptions } from "./extractor";

const kind = parseKind();
const dryRun =
  process.argv.includes("--dry-run") || process.argv.includes("-n");
const limit = parseLimit();

async function main() {
  const options: ExtractOptions = {
    kind,
    dryRun,
    limit,
  };

  console.log("📄 PDF Text Extractor");
  console.log(`   Kind: ${kind}`);
  console.log(`   Dry run: ${dryRun}`);
  if (limit) console.log(`   Limit: ${limit}`);
  console.log("");

  const results = await extractPdfText(options);

  let extracted = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of results) {
    if (r.extracted && r.text_length) {
      extracted++;
      if (!dryRun) {
        console.log(
          `✅ ${r.edk_identifier}: ${r.text_length.toLocaleString("fi")} chars`,
        );
      } else {
        console.log(
          `⬜ ${r.edk_identifier}: would extract (${r.file_size_bytes?.toLocaleString("fi")} bytes)`,
        );
      }
    } else if (r.extracted) {
      skipped++;
      console.log(
        `⏭️  ${r.edk_identifier}: already extracted (${r.text_length?.toLocaleString("fi")} chars)`,
      );
    } else if (r.error) {
      errors++;
      console.log(`❌ ${r.edk_identifier}: ${r.error}`);
    }
  }

  console.log("");
  console.log(
    `Done. Extracted: ${extracted}, skipped: ${skipped}, errors: ${errors}`,
  );
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});

function parseKind(): ExtractOptions["kind"] {
  for (const arg of process.argv) {
    if (arg === "--kind" || arg === "-k") {
      const idx = process.argv.indexOf(arg);
      const val = process.argv[idx + 1];
      if (val === "expert" || val === "vastaus" || val === "all") return val;
    }
  }
  return "all";
}

function parseLimit(): number | undefined {
  for (const arg of process.argv) {
    if (arg === "--limit" || arg === "-l") {
      const idx = process.argv.indexOf(arg);
      const val = Number.parseInt(process.argv[idx + 1] ?? "", 10);
      if (!Number.isNaN(val) && val > 0) return val;
    }
  }
  return undefined;
}
