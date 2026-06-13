import type { AnalyzeResult, LLMProvider } from "./types";

const CHUNK_SIZE_CHARS = 60_000;
const CHUNK_OVERLAP_CHARS = 2_000;

const MAP_PROMPT = `Olet analysoimassa Suomen eduskunnan asiantuntijalausuntoa. Tämä on osa lausunnon tekstistä.

Tehtäväsi: Poimi tästä tekstinpätkästä keskeisimmät asiasisällöt. Palauta tiivis lista suomeksi:
1. Mitä asioita käsitellään?
2. Mitä argumentteja tai suosituksia esitetään?
3. Mikä on kirjoittajan kanta käsiteltävään asiaan (puoltaa / vastustaa / ehdottaa muutoksia / neutraali)?

Palauta VAIN validi JSON:
{
  "key_points": ["avainkohta 1", "avainkohta 2", ...],
  "topics": ["aihe1", "aihe2", ...],
  "apparent_stance": "supports|opposes|proposes_modification|neutral"
}`;

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE_CHARS;
    if (end < text.length) {
      const breakPoint = text.lastIndexOf("\n", end);
      if (breakPoint > start + CHUNK_SIZE_CHARS * 0.5) {
        end = breakPoint;
      }
    }
    end = Math.min(end, text.length);
    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP_CHARS;
    if (start < 0) start = 0;
  }

  return chunks;
}

async function mapChunks(
  provider: LLMProvider,
  chunks: string[],
): Promise<Array<{ keyPoints: string[]; topics: string[]; stance: string }>> {
  const results: Array<{
    keyPoints: string[];
    topics: string[];
    stance: string;
  }> = [];

  for (const chunk of chunks) {
    try {
      const result = await provider.generateJSON(MAP_PROMPT, chunk);
      const parsed = result.json as {
        key_points: string[];
        topics: string[];
        apparent_stance: string;
      };
      results.push({
        keyPoints: parsed.key_points,
        topics: parsed.topics,
        stance: parsed.apparent_stance,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ⚠️  Map chunk failed: ${message.slice(0, 100)}`);
    }
  }

  return results;
}

async function reduceChunks(
  provider: LLMProvider,
  chunkResults: Array<{
    keyPoints: string[];
    topics: string[];
    stance: string;
  }>,
): Promise<AnalyzeResult> {
  const allKeyPoints = chunkResults.flatMap((c) => c.keyPoints);
  const allTopics = Array.from(new Set(chunkResults.flatMap((c) => c.topics)));
  const stances = chunkResults.map((c) => c.stance);

  const chunkSummary = allKeyPoints
    .map((kp, i) => `${i + 1}. ${kp}`)
    .join("\n");

  const combinedText = [
    "=== OSITTAINEN ANALYYSI (useampi tekstinpätkä yhdistetty) ===",
    `Alustavat kannat osissa: ${stances.join(", ")}`,
    `Alustavat aiheet: ${allTopics.join(", ")}`,
    "",
    "=== AVAINKOHDAT KAIKISTA OSISTA ===",
    chunkSummary,
  ].join("\n");

  return provider.analyze(
    `Olet analysoimassa Suomen eduskunnan asiantuntijalausuntoa.`,
    combinedText,
  );
}

export async function analyzeWithChunking(
  provider: LLMProvider,
  text: string,
  tokenLimit: number,
): Promise<AnalyzeResult> {
  const estimatedTokens = Math.ceil(text.length / 3);
  if (estimatedTokens <= tokenLimit * 0.8) {
    return provider.analyze(
      `Olet analysoimassa Suomen eduskunnan asiantuntijalausuntoa.`,
      text,
    );
  }

  const chunks = splitIntoChunks(text);
  console.log(
    `  📦 Chunked ${text.length.toLocaleString("fi")} chars into ${chunks.length} parts`,
  );

  const chunkResults = await mapChunks(provider, chunks);

  if (chunkResults.length === 0) {
    return provider.analyze(
      `Olet analysoimassa Suomen eduskunnan asiantuntijalausuntoa.`,
      text.slice(0, Math.floor(tokenLimit * 3 * 0.8)),
    );
  }

  const result = await reduceChunks(provider, chunkResults);

  return {
    ...result,
    chunkCount: chunks.length,
  };
}
