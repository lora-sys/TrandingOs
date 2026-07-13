import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import {
  ApprovalEngine,
  ArtifactEngine,
  ensureLocalPaths,
  MemoryStore,
  registerDefaultSkills,
  registerDefaultWorkflows,
  Repositories,
  resolveLocalPaths,
  SkillRegistry,
  TradingPiDatabase,
  WorkflowEngine,
  type TradingPiEnv,
} from "../index.js";

function testRuntime() {
  const dir = mkdtempSync(resolve(tmpdir(), "trading-pi-paper-test-"));
  const env: TradingPiEnv = {
    openaiModel: "test-model",
    dataDir: dir,
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit", "coinbase", "kraken"],
    tradingMode: "paper",
    thinkingLevel: "medium",
  };
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const artifacts = new ArtifactEngine(paths, repos);
  const approvals = new ApprovalEngine(repos);
  const memory = new MemoryStore(repos);
  const skills = new SkillRegistry();
  registerDefaultSkills(skills);
  // Override price skills so the test does not hit network.
  skills.register({
    id: "market.coingecko.quote",
    name: "CoinGecko Quote (stub)",
    description: "Stubbed quote for tests.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ symbol: Type.String() }),
    execute: async (input) => {
      const symbol = String(input.symbol).toUpperCase();
      const price = symbol === "BTC" ? 50000 : symbol === "ETH" ? 3000 : symbol === "SOL" ? 150 : 100;
      return { source: "coingecko", symbol: input.symbol, priceUsd: price };
    },
  });
  skills.register({
    id: "market.polymarket.search",
    name: "Polymarket Search (stub)",
    description: "Stubbed Polymarket search for tests.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
    execute: async () => ({ markets: [] }),
  });
  const workflows = new WorkflowEngine();
  registerDefaultWorkflows(workflows, skills);
  return { dir, env, paths, database, repos, artifacts, approvals, memory, skills, workflows };
}

function seedDecision(repos: Repositories, workspaceId: string, overrides: { direction?: string; positionSize?: number; topic?: string } = {}) {
  return repos.createDecision({
    workspaceId,
    topic: overrides.topic ?? "BTC trend",
    direction: (overrides.direction as "YES" | "NO" | "LONG" | "SHORT" | "HOLD") ?? "LONG",
    positionSize: overrides.positionSize ?? 1,
    confidence: "A",
    riskLevel: "B",
    supportingReasons: ["momentum"],
    againstReasons: ["volatility"],
    thesis: "Trend continuation",
    invalidationCriteria: "Break below 50k",
  });
}

describe("paper.trade.lifecycle workflow", () => {
  it("execute creates a paper trade from a decision", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({
        id: "ws_execute",
        name: "Execute Test",
        topicType: "crypto",
        context: {},
      });
      const decision = seedDecision(rt.repos, workspace.id);
      const result = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 50000 },
        { ...rt },
      ) as { output: { action: string; trade: { id: string; status: string; entryPrice: number; asset: string }; priceSource: string } };
      expect(result.output.action).toBe("execute");
      expect(result.output.trade.status).toBe("open");
      expect(result.output.trade.entryPrice).toBe(50000);
      expect(result.output.trade.asset).toBe("BTC");
      expect(result.output.priceSource).toBe("manual");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("amend updates stop-loss and take-profit on an open trade", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({ id: "ws_amend", name: "Amend Test", topicType: "crypto", context: {} });
      const decision = seedDecision(rt.repos, workspace.id);
      const executed = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 100 },
        { ...rt },
      ) as { output: { trade: { id: string } } };
      const tradeId = executed.output.trade.id;
      const amended = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "amend", paperTradeId: tradeId, stopLoss: 90, takeProfit: 130 },
        { ...rt },
      ) as { output: { action: string; trade: { stopLoss?: number; takeProfit?: number; amendedAt?: string } } };
      expect(amended.output.action).toBe("amend");
      expect(amended.output.trade.stopLoss).toBe(90);
      expect(amended.output.trade.takeProfit).toBe(130);
      expect(amended.output.trade.amendedAt).toBeTruthy();
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("cancel closes an unfilled/open trade", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({ id: "ws_cancel", name: "Cancel Test", topicType: "crypto", context: {} });
      const decision = seedDecision(rt.repos, workspace.id);
      const executed = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 100 },
        { ...rt },
      ) as { output: { trade: { id: string } } };
      const cancelled = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "cancel", paperTradeId: executed.output.trade.id, reason: "thesis invalidated" },
        { ...rt },
      ) as { output: { action: string; trade: { status: string; settlementReason?: string } } };
      expect(cancelled.output.action).toBe("cancel");
      expect(cancelled.output.trade.status).toBe("cancelled");
      expect(cancelled.output.trade.settlementReason).toBe("thesis invalidated");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("partial_close reduces position size by percent and records realized PnL", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({ id: "ws_partial", name: "Partial Test", topicType: "crypto", context: {} });
      const decision = seedDecision(rt.repos, workspace.id, { direction: "LONG", positionSize: 10 });
      const executed = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 100 },
        { ...rt },
      ) as { output: { trade: { id: string } } };
      const partial = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "partial_close", paperTradeId: executed.output.trade.id, percentClose: 50, price: 110 },
        { ...rt },
      ) as { output: { action: string; trade: { positionSize: number; status: string; realizedPnl: number; pnl?: number; pnlPercent?: number }; priceSource: string } };
      expect(partial.output.action).toBe("partial_close");
      expect(partial.output.trade.positionSize).toBe(5);
      expect(partial.output.trade.status).toBe("open");
      expect(partial.output.trade.realizedPnl).toBeCloseTo(50, 5);
      expect(partial.output.trade.pnl).toBeCloseTo(50, 5);
      expect(partial.output.priceSource).toBe("manual");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("monitor returns trades annotated with current PnL", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({ id: "ws_monitor", name: "Monitor Test", topicType: "crypto", context: {} });
      const decision = seedDecision(rt.repos, workspace.id, { direction: "LONG", positionSize: 1 });
      await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 100 },
        { ...rt },
      );
      const monitor = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "monitor", workspaceId: workspace.id },
        { ...rt },
      ) as { output: { action: string; trades: Array<{ currentPnl?: number; currentPrice?: number; priceSource?: string }> } };
      expect(monitor.output.action).toBe("monitor");
      expect(monitor.output.trades.length).toBeGreaterThanOrEqual(1);
      const open = monitor.output.trades[0]!;
      expect(typeof open.currentPrice).toBe("number");
      // Stubbed BTC price is 50000, entry 100, LONG 1 unit → large positive unrealized PnL
      expect(open.currentPnl).toBeGreaterThan(0);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("close|settle finalizes the trade with realized PnL", async () => {
    const rt = testRuntime();
    try {
      const workspace = rt.repos.createWorkspace({ id: "ws_settle", name: "Settle Test", topicType: "crypto", context: {} });
      const decision = seedDecision(rt.repos, workspace.id, { direction: "LONG", positionSize: 2 });
      const executed = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "execute", decisionId: decision.id, entryPrice: 100 },
        { ...rt },
      ) as { output: { trade: { id: string } } };
      const settled = await rt.workflows.run(
        "paper.trade.lifecycle",
        { action: "settle", paperTradeId: executed.output.trade.id, exitPrice: 120, settlementReason: "take_profit" },
        { ...rt },
      ) as { output: { action: string; trade: { status: string; exitPrice?: number; pnl?: number }; priceSource: string } };
      expect(settled.output.action).toBe("settle");
      expect(settled.output.trade.status).toBe("closed");
      expect(settled.output.trade.exitPrice).toBe(120);
      expect(settled.output.trade.pnl).toBeCloseTo(40, 5);
      expect(settled.output.priceSource).toBe("manual");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });
});