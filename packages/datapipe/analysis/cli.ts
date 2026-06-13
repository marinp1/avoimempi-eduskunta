import {
  getAnalysisDatabasePath,
  initAnalysisDb,
  getAnalysisStats,
} from "./db";
import { getDatabasePath } from "#database";
import { createLLM, resolveProvider, isValidProvider } from "../llm/factory";
import { analyzeExpertStatements } from "./analyze-expert-statements";

function parseArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function parseLimit(args: string[]): number | undefined {
  const val = parseArg(args, "--limit") ?? parseArg(args, "-l");
  if (val) {
    const num = Number.parseInt(val, 10);
    if (Number.isNaN(num) || num <= 0) return undefined;
    return num;
  }
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "status") {
    const dbPath = parseArg(args, "--analysis-db") ?? getAnalysisDatabasePath();
    let stats: {
      total: number;
      completed: number;
      pending: number;
      totalCredits: number;
    };

    try {
      const db = initAnalysisDb(dbPath);
      stats = getAnalysisStats(db);
      db.close();
    } catch {
      console.log("Analysis DB not found. No analysis has been run yet.");
      process.exit(0);
    }

    console.log("\n📊 Expert Statement Analysis Status");
    console.log("═══════════════════════════════════");
    console.log(`   Completed:    ${stats.completed.toLocaleString("fi")}`);
    console.log(`   Total credits: $${stats.totalCredits.toFixed(4)}`);
    console.log(`   DB path:      ${dbPath}`);
    console.log();
    return;
  }

  if (command === "expert-statements") {
    const providerName = parseArg(args, "--provider") ?? resolveProvider();
    if (!isValidProvider(providerName)) {
      console.error(`Unknown provider: ${providerName}`);
      process.exit(1);
    }

    const model = parseArg(args, "--model");
    const apiKey = parseArg(args, "--api-key");
    const baseUrl = parseArg(args, "--base-url");
    const sourceDbPath = parseArg(args, "--db-path") ?? getDatabasePath();
    const analysisDbPath =
      parseArg(args, "--analysis-db") ?? getAnalysisDatabasePath();
    const force = hasFlag(args, "--force");
    const limit = parseLimit(args);
    const delayArg = parseArg(args, "--delay");
    const delayMs = delayArg ? Number.parseInt(delayArg, 10) : 500;

    console.log("🔬 Expert Statement AI Analysis");
    console.log(`   Provider:   ${providerName}`);
    if (model) console.log(`   Model:      ${model}`);
    console.log(`   Source DB:  ${sourceDbPath}`);
    console.log(`   Analysis DB: ${analysisDbPath}`);
    console.log(`   Force:      ${force}`);
    if (limit) console.log(`   Limit:      ${limit}`);
    console.log(`   Delay:      ${delayMs}ms`);
    console.log();

    let provider;
    try {
      provider = createLLM(providerName, { model, apiKey, baseUrl });
    } catch (error: any) {
      console.error(`Failed to create LLM provider: ${error.message}`);
      process.exit(1);
    }

    const startTime = Date.now();

    const result = await analyzeExpertStatements(
      {
        provider,
        sourceDbPath,
        analysisDbPath,
        force,
        limit,
        delayMs,
      },
      (progress) => {
        if (progress.processed % 10 === 0 && progress.processed > 0) {
          process.stdout.write(
            `\r   Processed: ${progress.processed}/${progress.total} | ` +
              `Analyzed: ${progress.analyzed} | Skipped: ${progress.skipped} | ` +
              `Errors: ${progress.errors} | Credits: $${progress.totalCredits.toFixed(4)}`,
          );
        }
      },
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n");
    console.log("✅ Analysis complete");
    console.log(`   Processed: ${result.processed.toLocaleString("fi")}`);
    console.log(`   Analyzed:  ${result.analyzed.toLocaleString("fi")}`);
    console.log(`   Skipped:   ${result.skipped.toLocaleString("fi")}`);
    console.log(`   Errors:    ${result.errors.toLocaleString("fi")}`);
    console.log(`   Credits:   $${result.totalCredits.toFixed(4)}`);
    console.log(`   Time:      ${elapsed}s`);
    console.log(`   Output:    ${analysisDbPath}`);
    return;
  }

  console.log(`Usage: bun run analyze <command> [options]

Commands:
  expert-statements   Run AI analysis on expert statements
  status              Show analysis progress

Options for expert-statements:
  --provider <name>   LLM provider (openai, anthropic, ollama) [default: auto-detect]
  --model <name>      Model name (provider-specific)
  --api-key <key>     API key (uses env var by default)
  --base-url <url>    API base URL
  --db-path <path>    Source database path
  --analysis-db <path> Analysis output database path
  --force             Re-analyze already analyzed documents
  --limit <n>         Limit number of documents to process
  --delay <ms>        Delay between calls in ms [default: 500]`);
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
