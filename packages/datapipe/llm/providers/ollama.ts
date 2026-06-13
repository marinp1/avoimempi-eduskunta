import type {
  AnalyzeResult,
  GenerateJSONResult,
  LLMProvider,
  LLMOptions,
} from "../types";
import { buildExpertStatementPrompt } from "../../analysis/prompts/expert-statement";

const OLLAMA_DEFAULT_BASE = "http://localhost:11434";

export function createOllamaProvider(options: LLMOptions = {}): LLMProvider {
  const model = options.model ?? "llama3.3";
  const baseUrl =
    options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? OLLAMA_DEFAULT_BASE;

  return {
    model,
    contextLimit: 128000,

    async analyze(_prompt: string, text: string): Promise<AnalyzeResult> {
      const data = await ollamaGenerate(
        baseUrl,
        model,
        buildExpertStatementPrompt(),
        `${text}\n\nReturn ONLY valid JSON. No other text.`,
      );

      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(
          `Ollama response did not contain valid JSON: ${data.response.slice(0, 200)}`,
        );
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
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
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
        creditsUsed: 0,
        model,
        chunkCount: 1,
      };
    },

    async generateJSON(
      systemPrompt: string,
      userText: string,
    ): Promise<GenerateJSONResult> {
      const data = await ollamaGenerate(
        baseUrl,
        model,
        systemPrompt,
        `${userText}\n\nReturn ONLY valid JSON. No other text.`,
      );

      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(
          `Ollama response did not contain valid JSON: ${data.response.slice(0, 200)}`,
        );
      }

      return {
        json: JSON.parse(jsonMatch[0]),
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      };
    },
  };
}

async function ollamaGenerate(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userText: string,
) {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      prompt: userText,
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Ollama API error ${response.status}: ${errorBody.slice(0, 500)}`,
    );
  }

  return (await response.json()) as {
    response: string;
    eval_count?: number;
    prompt_eval_count?: number;
  };
}
