export type Stance =
  | "supports"
  | "opposes"
  | "proposes_modification"
  | "neutral";

export interface StanceAnalysis {
  value: Stance;
  description: string | null;
}

export interface StructuredAnalysis {
  summary: string;
  stance: StanceAnalysis;
  arguments: string[];
  topics: string[];
}

export interface AnalyzeResult {
  analysis: StructuredAnalysis;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
  model: string;
  chunkCount: number;
}

export interface GenerateJSONResult {
  json: Record<string, any>;
  inputTokens: number;
  outputTokens: number;
}

export interface LLMProvider {
  readonly model: string;
  readonly contextLimit: number;

  analyze(prompt: string, text: string): Promise<AnalyzeResult>;
  generateJSON(
    systemPrompt: string,
    userText: string,
  ): Promise<GenerateJSONResult>;
}

export interface LLMOptions {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export type ProviderName = "openai" | "anthropic" | "ollama";
