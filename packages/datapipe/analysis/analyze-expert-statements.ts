import { Database } from "bun:sqlite";
import type { LLMProvider } from "../llm/types";
import { PROMPT_VERSION } from "./prompts/expert-statement";
import { analyzeWithChunking } from "../llm/chunker";
import { initAnalysisDb, isAlreadyAnalyzed, upsertAnalysis } from "./db";

export interface AnalyzeOptions {
  provider: LLMProvider;
  sourceDbPath: string;
  analysisDbPath: string;
  force?: boolean;
  limit?: number;
  delayMs?: number;
}

export interface AnalyzeProgress {
  total: number;
  processed: number;
  analyzed: number;
  skipped: number;
  errors: number;
  totalCredits: number;
}

export async function analyzeExpertStatements(
  options: AnalyzeOptions,
  onProgress?: (progress: AnalyzeProgress) => void,
): Promise<AnalyzeProgress> {
  const { provider, sourceDbPath, analysisDbPath, force, limit, delayMs } =
    options;

  const sourceDb = new Database(sourceDbPath, { readonly: true });
  const analysisDb = initAnalysisDb(analysisDbPath);

  const rows = sourceDb
    .query<{ edk_identifier: string; body_text: string }, []>(
      `SELECT edk_identifier, body_text FROM ExpertStatement
       WHERE body_text IS NOT NULL AND LENGTH(body_text) > 0
       ORDER BY LENGTH(body_text) DESC`,
    )
    .all();

  sourceDb.close();

  const total = limit ? Math.min(limit, rows.length) : rows.length;
  let processed = 0;
  let analyzed = 0;
  let skipped = 0;
  let errors = 0;
  let totalCredits = 0;

  const progress: AnalyzeProgress = {
    total,
    processed: 0,
    analyzed: 0,
    skipped: 0,
    errors: 0,
    totalCredits: 0,
  };

  let i = 0;
  while (i < rows.length && (limit == null || processed < limit)) {
    const row = rows[i];
    i++;
    processed++;
    progress.processed = processed;

    onProgress?.(progress);

    if (
      !force &&
      isAlreadyAnalyzed(analysisDb, row.edk_identifier, PROMPT_VERSION)
    ) {
      skipped++;
      progress.skipped = skipped;
      continue;
    }

    try {
      const result = await analyzeWithChunking(
        provider,
        row.body_text,
        provider.contextLimit,
      );

      upsertAnalysis(analysisDb, {
        edk_identifier: row.edk_identifier,
        summary: result.analysis.summary,
        stance_value: result.analysis.stance.value,
        stance_description: result.analysis.stance.description,
        arguments: JSON.stringify(result.analysis.arguments),
        topics: JSON.stringify(result.analysis.topics),
        model: result.model,
        prompt_version: PROMPT_VERSION,
        chunk_count: result.chunkCount,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        credits_used: result.creditsUsed,
        analyzed_at: new Date().toISOString(),
      });

      analyzed++;
      totalCredits += result.creditsUsed;
      progress.analyzed = analyzed;
      progress.totalCredits = totalCredits;

      console.log(
        `✅ [${processed}/${total}] ${row.edk_identifier}: ${result.analysis.summary.length} chars summary ($${result.creditsUsed.toFixed(4)})`,
      );
    } catch (error) {
      errors++;
      progress.errors = errors;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ [${processed}/${total}] ${row.edk_identifier}: ${message.slice(0, 120)}`,
      );
    }

    if (delayMs && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  analysisDb.close();
  onProgress?.(progress);

  return progress;
}
