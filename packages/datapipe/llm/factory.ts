import type { LLMProvider, LLMOptions, ProviderName } from "./types";
import { createOpenAIProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOllamaProvider } from "./providers/ollama";

const FACTORIES: Record<ProviderName, (options: LLMOptions) => LLMProvider> = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  ollama: createOllamaProvider,
};

export function createLLM(
  provider: ProviderName,
  options: LLMOptions = {},
): LLMProvider {
  const factory = FACTORIES[provider];
  if (!factory) {
    throw new Error(
      `Unknown LLM provider: "${provider}". Supported: ${Object.keys(FACTORIES).join(", ")}`,
    );
  }
  return factory(options);
}

export function resolveProvider(): ProviderName {
  const fromEnv = process.env.LLM_PROVIDER;
  if (fromEnv && ["openai", "anthropic", "ollama"].includes(fromEnv)) {
    return fromEnv as ProviderName;
  }

  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OLLAMA_BASE_URL) return "ollama";

  return "ollama";
}

export function isValidProvider(name: string): name is ProviderName {
  return Object.keys(FACTORIES).includes(name);
}
