import { describe, it, expect } from "vitest";
import { loadEnv } from "./env.js";
import { createTradingPiModel } from "./model.js";

const baseEnv = {
  openaiModel: "LongCat-2.0",
  openaiBaseUrl: "https://api.longcat.chat/openai",
  dataDir: "/tmp",
  apiPort: 8787,
  webPort: 5173,
  defaultExchange: "binance",
  exchangeFallbacks: [],
  tradingMode: "paper" as const,
  thinkingLevel: "medium",
  reasoning: false,
};

describe("createTradingPiModel", () => {
  it("uses env.reasoning when true", () => {
    const env = { ...baseEnv, reasoning: true };
    const model = createTradingPiModel(env);
    expect(model.reasoning).toBe(true);
  });

  it("uses env.reasoning when false", () => {
    const env = { ...baseEnv, reasoning: false };
    const model = createTradingPiModel(env);
    expect(model.reasoning).toBe(false);
  });
});

describe("loadEnv reasoning", () => {
  it("parses OPENAI_REASONING=true", () => {
    const prev = process.env.OPENAI_REASONING;
    process.env.OPENAI_REASONING = "true";
    try {
      const env = loadEnv("/nonexistent");
      expect(env.reasoning).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.OPENAI_REASONING;
      else process.env.OPENAI_REASONING = prev;
    }
  });

  it("defaults reasoning to false", () => {
    const prev = process.env.OPENAI_REASONING;
    delete process.env.OPENAI_REASONING;
    try {
      const env = loadEnv("/nonexistent");
      expect(env.reasoning).toBe(false);
    } finally {
      if (prev !== undefined) process.env.OPENAI_REASONING = prev;
    }
  });
});