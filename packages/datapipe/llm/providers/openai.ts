import type {
  AnalyzeResult,
  GenerateJSONResult,
  LLMProvider,
  LLMOptions,
} from "../types";
import { buildExpertStatementPrompt } from "../../analysis/prompts/expert-statement";

const OPENAI_DEFAULT_BASE = "https://api.openai.com/v1";

export function createOpenAIProvider(options: LLMOptions = {}): LLMProvider {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Set it via options or env var.",
    );
  }

  const model = options.model ?? "gpt-5.4-mini";
  const baseUrl =
    options.baseUrl ?? process.env.OPENAI_BASE_URL ?? OPENAI_DEFAULT_BASE;

  const contextLimits: Record<string, number> = {
    "gpt-5.5": 1000000,
    "gpt-5.4": 1000000,
    "gpt-5.4-mini": 400000,
    "gpt-5.4-nano": 400000,
    "gpt-4o-mini": 128000,
    "gpt-4o": 128000,
    o1: 200000,
    "o3-mini": 200000,
    "gpt-4.1-mini": 1000000,
    "gpt-4.1": 1000000,
  };

  const contextLimit = contextLimits[model] ?? 128000;

  async function openaiFetch(
    systemPrompt: string,
    userText: string,
    jsonSchema: object | null,
  ) {
    const body: Record<string, any> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: 0.2,
      max_output_tokens: 2048,
    };

    if (jsonSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "analysis",
          strict: true,
          schema: jsonSchema,
        },
      };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenAI API error ${response.status}: ${errorBody.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return data;
  }

  return {
    model,
    contextLimit,

    async analyze(_prompt: string, text: string): Promise<AnalyzeResult> {
      const data = await openaiFetch(buildExpertStatementPrompt(), text, {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description:
              "Comprehensive 3-5 paragraph summary in Finnish of the expert statement",
          },
          stance_value: {
            type: "string",
            enum: ["supports", "opposes", "proposes_modification", "neutral"],
            description:
              "The expert's overall stance on the bill or matter under discussion",
          },
          stance_description: {
            type: ["string", "null"],
            description:
              "Short description (1-2 sentences in Finnish) explaining the nuance or detail of the stance",
          },
          arguments: {
            type: "array",
            items: { type: "string" },
            description:
              "Key arguments presented by the expert (3-8 items, in Finnish)",
          },
          topics: {
            type: "array",
            items: { type: "string" },
            description:
              "Topics or themes discussed (3-8 items, in Finnish, lowercase)",
          },
        },
        required: [
          "summary",
          "stance_value",
          "stance_description",
          "arguments",
          "topics",
        ],
        additionalProperties: false,
      });

      const parsed = JSON.parse(data.choices[0].message.content) as {
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
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        creditsUsed: estimateOpenAICost(
          model,
          data.usage.prompt_tokens,
          data.usage.completion_tokens,
        ),
        model,
        chunkCount: 1,
      };
    },

    async generateJSON(
      systemPrompt: string,
      userText: string,
    ): Promise<GenerateJSONResult> {
      const data = await openaiFetch(systemPrompt, userText, null);
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(
          `OpenAI response did not contain valid JSON: ${data.choices[0].message.content.slice(0, 200)}`,
        );
      }

      return {
        json: JSON.parse(jsonMatch[0]),
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      };
    },
  };
}

function estimateOpenAICost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-5.5": { input: 5.0, output: 30.0 },
    "gpt-5.4": { input: 2.5, output: 15.0 },
    "gpt-5.4-mini": { input: 0.75, output: 4.5 },
    "gpt-5.4-nano": { input: 0.25, output: 1.5 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 2.5, output: 10.0 },
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
    "gpt-4.1": { input: 2.0, output: 8.0 },
    "gpt-4.1-nano": { input: 0.1, output: 0.4 },
    o1: { input: 15.0, output: 60.0 },
    "o3-mini": { input: 1.1, output: 4.4 },
  };

  const price = pricing[model] ?? { input: 0.75, output: 4.5 };
  return (
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output
  );
}
