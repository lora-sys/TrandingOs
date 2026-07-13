import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApprovalEngine } from "./approval-engine.js";
import { ensureLocalPaths, Repositories, resolveLocalPaths, TradingPiDatabase, type TradingPiEnv } from "../index.js";

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-approvals-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
  };
}

function buildEngine() {
  const env = buildEnv();
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const engine = new ApprovalEngine(repos);
  return { env, database, repos, engine };
}

describe("ApprovalEngine (PR-14)", () => {
  it("requiresApproval returns true for high/critical riskLevel and for dangerous actions", () => {
    const { env, database, engine } = buildEngine();
    try {
      expect(engine.requiresApproval("real.order")).toBe(true);
      expect(engine.requiresApproval("strategy.patch.apply")).toBe(true);
      expect(engine.requiresApproval("mcp.enable")).toBe(true);
      expect(engine.requiresApproval("market.ccxt.ticker", "high")).toBe(true);
      expect(engine.requiresApproval("market.ccxt.ticker", "critical")).toBe(true);
      // Low-risk skill: should NOT require approval
      expect(engine.requiresApproval("market.ccxt.ticker", "low")).toBe(false);
      expect(engine.requiresApproval("market.ccxt.ticker", "medium")).toBe(false);
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("request writes an approval row with auto-generated id and pending status", () => {
    const { env, database, repos, engine } = buildEngine();
    try {
      const approvalId = engine.request({
        action: "real.order",
        riskLevel: "critical",
        reason: "Live trading requires explicit approval.",
        payload: { symbol: "BTC/USDT", side: "buy" },
        sessionId: "approval-req-session",
      });
      expect(approvalId).toMatch(/^app_/);
      const rows = repos.list("approvals") as Array<{ id: string; status: string; action: string; session_id: string }>;
      const row = rows.find((r) => r.id === approvalId);
      expect(row).toBeDefined();
      expect(row?.status).toBe("pending");
      expect(row?.action).toBe("real.order");
      expect(row?.session_id).toBe("approval-req-session");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("listPending (filtered via repos) returns only requested/pending approvals", () => {
    const { env, database, repos, engine } = buildEngine();
    try {
      const id1 = engine.request({
        action: "real.order",
        riskLevel: "critical",
        reason: "First",
        payload: { a: 1 },
        sessionId: "list-pending-session",
      });
      const id2 = engine.request({
        action: "skill.install",
        riskLevel: "high",
        reason: "Second",
        payload: { a: 2 },
        sessionId: "list-pending-session",
      });
      // Approve one, leave one pending
      engine.grant(id1);

      const all = repos.list("approvals") as Array<{ id: string; status: string }>;
      const pending = all.filter((r) => r.status === "pending");
      expect(pending.length).toBe(1);
      expect(pending[0]?.id).toBe(id2);
      expect(pending.find((r) => r.id === id1)).toBeUndefined();
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("respond (grant/deny) updates status to approved/denied respectively", () => {
    const { env, database, repos, engine } = buildEngine();
    try {
      const approvalId = engine.request({
        action: "api.key.update",
        riskLevel: "high",
        reason: "Needs human approval",
        payload: { provider: "openai" },
        sessionId: "respond-session",
      });

      engine.grant(approvalId);
      let row = (repos.list("approvals") as Array<{ id: string; status: string }>).find((r) => r.id === approvalId);
      expect(row?.status).toBe("approved");

      const second = engine.request({
        action: "sandbox.export",
        riskLevel: "high",
        reason: "Export needs review",
        payload: { path: "/tmp/x" },
        sessionId: "respond-session",
      });
      engine.deny(second);
      row = (repos.list("approvals") as Array<{ id: string; status: string }>).find((r) => r.id === second);
      expect(row?.status).toBe("denied");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});