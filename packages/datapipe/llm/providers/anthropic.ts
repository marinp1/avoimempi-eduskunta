import type {
  AnalyzeResult,
  GenerateJSONResult,
  LLMProvider,
  LLMOptions,
} from "../types";
import { buildExpertStatementPrompt } from "../../analysis/prompts/expert-statement";

const ANTHROPIC_DEFAULT_BASE = "https://api.anthropic.com/v1";

export function createAnthropicProvider(options: LLMOptions = {}): LLMProvider {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Set it via options or env var.",
    );
  }

  const model = options.model ?? "claude-haiku-4-5-20251001";
  const baseUrl =
    options.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? ANTHROPIC_DEFAULT_BASE;

  const contextLimits: Record<string, number> = {
    "claude-fable-5": 1000000,
    "claude-mythos-5": 1000000,
    "claude-opus-4-8": 1000000,
    "claude-sonnet-4-6": 1000000,
    "claude-haiku-4-5-20251001": 200000,
    "claude-opus-4-7": 1000000,
    "claude-opus-4-6": 1000000,
    "claude-sonnet-4-5-20250929": 200000,
    "claude-opus-4-5-20251101": 200000,
    "claude-opus-4-1-20250805": 200000,
    "claude-sonnet-4-20250514": 200000,
    "claude-opus-4-20250514": 200000,
    "claude-3-5-haiku-20241022": 200000,
    "claude-3-5-sonnet-20241022": 200000,
    "claude-3-7-sonnet-20250219": 200000,
  };

  const contextLimit = contextLimits[model] ?? 200000;

  async function anthropicFetch(systemPrompt: string, userText: string) {
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userText }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Anthropic API error ${response.status}: ${errorBody.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    return data;
  }

  function extractJSON(text: string): Record<string, any> {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `Anthropic response did not contain valid JSON: ${text.slice(0, 200)}`,
      );
    }
    return JSON.parse(jsonMatch[0]);
  }

  return {
    model,
    contextLimit,

    async analyze(_prompt: string, text: string): Promise<AnalyzeResult> {
      const data = await anthropicFetch(
        buildExpertStatementPrompt(),
        `${text}\n\nReturn ONLY valid JSON matching the requested schema.`,
      );

      const textContent =
        data.content.find((c) => c.type === "text")?.text ?? "";
      const parsed = extractJSON(textContent) as {
        summary: string;
        stance_value: string;
        stance_description: string | null;
        arguments: string[];
        topics: string[];
      };

      return {
        analysis: {
          summary: parsed.summary,
          stance: {
            value: parsed.stance_value as any,
            description: parsed.stance_description || null,
          },
          arguments: parsed.arguments,
          topics: parsed.topics,
        },
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        creditsUsed: estimateAnthropicCost(
          model,
          data.usage.input_tokens,
          data.usage.output_tokens,
        ),
        model,
        chunkCount: 1,
      };
    },

    async generateJSON(
      systemPrompt: string,
      userText: string,
    ): Promise<GenerateJSONResult> {
      const data = await anthropicFetch(systemPrompt, userText);
      const textContent =
        data.content.find((c) => c.type === "text")?.text ?? "";

      return {
        json: extractJSON(textContent),
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      };
    },
  };
}

function estimateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-fable-5": { input: 10.0, output: 50.0 },
    "claude-mythos-5": { input: 10.0, output: 50.0 },
    "claude-opus-4-8": { input: 5.0, output: 25.0 },
    "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
    "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
    "claude-opus-4-7": { input: 5.0, output: 25.0 },
    "claude-opus-4-6": { input: 5.0, output: 25.0 },
    "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
    "claude-opus-4-5-20251101": { input: 5.0, output: 25.0 },
    "claude-opus-4-1-20250805": { input: 15.0, output: 75.0 },
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
    "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
    "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
    "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
  };

  const price = pricing[model] ?? { input: 1.0, output: 5.0 };
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}
