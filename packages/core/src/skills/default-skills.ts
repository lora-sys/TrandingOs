import { complete } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { createTradingPiModel } from "../ai/model.js";
import { fetchCcxtOhlcv, fetchCcxtTicker } from "../market/ccxt.js";
import { fetchCoinGeckoQuote } from "../market/coingecko.js";
import type { SkillRegistry } from "./registry.js";

export function registerDefaultSkills(registry: SkillRegistry) {
  registry.register({
    id: "ai.respond",
    name: "AI Response",
    description: "Call the configured OpenAI-compatible model for Trading Pi reasoning.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      prompt: Type.String(),
      systemPrompt: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      if (!context.env.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");
      const response = await complete(
        createTradingPiModel(context.env),
        {
          systemPrompt: input.systemPrompt ?? "You are Trading Pi, a local-first personal trading OS.",
          messages: [{ role: "user", content: input.prompt, timestamp: Date.now() }],
        },
        { apiKey: context.env.openaiApiKey },
      );
      return {
        text: response.content.filter((block) => block.type === "text").map((block) => block.text).join(""),
        usage: response.usage,
        stopReason: response.stopReason,
      };
    },
  });

  registry.register({
    id: "market.coingecko.quote",
    name: "CoinGecko Quote",
    description: "Fetch a public no-key USD quote from CoinGecko.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ symbol: Type.String() }),
    execute: async (input) => fetchCoinGeckoQuote(input.symbol),
  });

  registry.register({
    id: "market.ccxt.ticker",
    name: "CCXT Ticker",
    description: "Fetch an exchange ticker through CCXT.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => fetchCcxtTicker(input.exchange ?? context.env.defaultExchange, input.symbol),
  });

  registry.register({
    id: "market.ccxt.ohlcv",
    name: "CCXT OHLCV",
    description: "Fetch exchange OHLCV candles through CCXT.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
      timeframe: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) =>
      fetchCcxtOhlcv(input.exchange ?? context.env.defaultExchange, input.symbol, input.timeframe ?? "1h", input.limit ?? 24),
  });

  registry.register({
    id: "risk.positionSizing",
    name: "Position Sizing",
    description: "Calculate simple position size from budget and stop distance.",
    riskLevel: "medium",
    permission: "read",
    parameters: Type.Object({
      budgetUsd: Type.Number(),
      riskPct: Type.Optional(Type.Number()),
      entry: Type.Number(),
      stop: Type.Number(),
    }),
    execute: async (input) => {
      const riskPct = input.riskPct ?? 1;
      const riskUsd = input.budgetUsd * (riskPct / 100);
      const stopDistance = Math.abs(input.entry - input.stop);
      const quantity = stopDistance === 0 ? 0 : riskUsd / stopDistance;
      return { riskPct, riskUsd, stopDistance, quantity, notionalUsd: quantity * input.entry };
    },
  });

  registry.register({
    id: "artifact.create",
    name: "Create Artifact",
    description: "Create a local markdown artifact and persist artifact metadata.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      type: Type.String(),
      title: Type.String(),
      summary: Type.String(),
      markdown: Type.String(),
    }),
    execute: async (input, context) =>
      context.artifacts.create({
        ...input,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
        payload: input,
      }),
  });

  registry.register({
    id: "approval.request",
    name: "Request Approval",
    description: "Create a runtime approval gate for dangerous actions.",
    riskLevel: "high",
    permission: "dangerous",
    parameters: Type.Object({
      action: Type.String(),
      riskLevel: Type.String(),
      reason: Type.String(),
      payload: Type.Any(),
    }),
    execute: async (input, context) => ({
      approvalId: context.approvals.request({
        action: input.action,
        riskLevel: input.riskLevel,
        reason: input.reason,
        payload: input.payload,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
      }),
      blocked: true,
    }),
  });
}

