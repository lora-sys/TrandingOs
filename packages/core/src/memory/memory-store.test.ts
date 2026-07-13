import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "./memory-store.js";
import { ensureLocalPaths, Repositories, resolveLocalPaths, TradingPiDatabase, type TradingPiEnv } from "../index.js";

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-memory-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
  };
}

function buildStore() {
  const env = buildEnv();
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const memory = new MemoryStore(repos);
  return { env, database, repos, memory };
}

describe("MemoryStore (PR-14)", () => {
  it("contextBlock('user') returns formatted snapshot of saved entries", () => {
    const { env, database, memory } = buildStore();
    try {
      memory.upsert("user", "risk-tolerance", "1% per idea");
      memory.upsert("user", "favorite-symbols", "BTC, ETH");
      const block = memory.contextBlock("user");
      expect(block).toContain("risk-tolerance: 1% per idea");
      expect(block).toContain("favorite-symbols: BTC, ETH");
      // Snapshot should be multi-line formatted with bullet markers
      expect(block.split("\n").length).toBeGreaterThanOrEqual(2);
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("query filters results by domain", () => {
    const { env, database, memory } = buildStore();
    try {
      memory.write({ domain: "market", key: "btc-trend", value: "uptrend" });
      memory.write({ domain: "trade", key: "last-trade", value: "ETH long" });
      memory.write({ domain: "market", key: "eth-volatility", value: "elevated" });

      const marketOnly = memory.query({ domain: "market" }) as Array<{ domain: string; key: string }>;
      const tradeOnly = memory.query({ domain: "trade" }) as Array<{ domain: string; key: string }>;

      expect(marketOnly.length).toBe(2);
      expect(marketOnly.every((r) => r.domain === "market")).toBe(true);
      expect(tradeOnly.length).toBe(1);
      expect(tradeOnly[0]?.key).toBe("last-trade");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("write persists across reads (and uses the same scope/key for upsert)", () => {
    const { env, database, memory } = buildStore();
    try {
      memory.write({ domain: "user_rules", key: "max-position", value: "$500", workspaceId: "wrk_1" });
      // Read back via listAll (cross-domain) and via query for the same domain
      const all = memory.listAll();
      expect(all.some((r) => r.key === "max-position" && r.value === "$500")).toBe(true);
      const queryResult = memory.query({ domain: "user_rules", workspaceId: "wrk_1" }) as Array<{ key: string; value: string }>;
      expect(queryResult.length).toBe(1);
      expect(queryResult[0]?.value).toBe("$500");
      // Upsert: same domain+key updates value in place
      memory.write({ domain: "user_rules", key: "max-position", value: "$750", workspaceId: "wrk_1" });
      const after = memory.query({ domain: "user_rules", workspaceId: "wrk_1" }) as Array<{ key: string; value: string }>;
      expect(after.length).toBe(1);
      expect(after[0]?.value).toBe("$750");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});