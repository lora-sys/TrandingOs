import { complete, type Model } from "@earendil-works/pi-ai";
import type { TradingPiEnv } from "../config/env.js";

export function createTradingPiModel(env: TradingPiEnv): Model<"openai-completions"> {
  return {
    id: env.openaiModel,
    name: env.openaiModel,
    api: "openai-completions",
    provider: "trading-pi-openai-compatible",
    baseUrl: env.openaiBaseUrl ?? "https://api.openai.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8_192,
  };
}

export async function aiPing(env: TradingPiEnv) {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = createTradingPiModel(env);
  const response = await complete(
    model,
    {
      systemPrompt: "You are Trading Pi. Reply with a concise health check.",
      messages: [{ role: "user", content: "Return exactly: Trading Pi AI online.", timestamp: Date.now() }],
    },
    { apiKey: env.openaiApiKey },
  );
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return {
    model: env.openaiModel,
    baseUrl: env.openaiBaseUrl,
    text,
    usage: response.usage,
    stopReason: response.stopReason,
  };
}
