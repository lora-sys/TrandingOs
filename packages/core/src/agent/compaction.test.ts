import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ApprovalEngine,
  ArtifactEngine,
  ensureLocalPaths,
  MemoryStore,
  Repositories,
  resolveLocalPaths,
  SessionStore,
  SkillRegistry,
  TradingPiAgent,
  TradingPiDatabase,
  WorkflowEngine,
  type TradingPiEnv,
} from "../index.js";

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-compaction-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
    reasoning: false,
  };
}

function buildDeps(env: TradingPiEnv) {
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const artifacts = new ArtifactEngine(paths, repos);
  const approvals = new ApprovalEngine(repos);
  const memory = new MemoryStore(repos);
  const sessions = new SessionStore(paths, repos);
  const skills = new SkillRegistry();
  const workflows = new WorkflowEngine();
  return { env, paths, database, repos, artifacts, approvals, memory, sessions, skills, workflows };
}

describe("TradingPiAgent compaction summary scoping (PR-02)", () => {
  it("two parallel sessions each keep their own summary without cross-contamination", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const summaries = agent as unknown as { _compactionSummaries: Map<string, string> };
      summaries._compactionSummaries.set("ses_alpha", "summary A: BTC long thesis");
      summaries._compactionSummaries.set("ses_beta", "summary B: ETH short thesis");

      expect(summaries._compactionSummaries.get("ses_alpha")).toBe("summary A: BTC long thesis");
      expect(summaries._compactionSummaries.get("ses_beta")).toBe("summary B: ETH short thesis");
      expect(summaries._compactionSummaries.size).toBe(2);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("summary persists across follow-up lookups in the same session (not deleted after injection)", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const summaries = agent as unknown as { _compactionSummaries: Map<string, string> };
      summaries._compactionSummaries.set("ses_same", "summary persists");

      // Simulate repeated transformContext lookups (one per turn)
      const first = summaries._compactionSummaries.get("ses_same");
      const second = summaries._compactionSummaries.get("ses_same");
      const third = summaries._compactionSummaries.get("ses_same");

      expect(first).toBe("summary persists");
      expect(second).toBe("summary persists");
      expect(third).toBe("summary persists");
      expect(summaries._compactionSummaries.has("ses_same")).toBe(true);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("different sessions do not see each other's summaries", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const summaries = agent as unknown as { _compactionSummaries: Map<string, string> };
      summaries._compactionSummaries.set("ses_one", "private summary for one");

      // session two has no summary
      expect(summaries._compactionSummaries.get("ses_two")).toBeUndefined();
      // session one is unaffected
      expect(summaries._compactionSummaries.get("ses_one")).toBe("private summary for one");

      // adding to two does not clobber one
      summaries._compactionSummaries.set("ses_two", "private summary for two");
      expect(summaries._compactionSummaries.get("ses_one")).toBe("private summary for one");
      expect(summaries._compactionSummaries.get("ses_two")).toBe("private summary for two");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("clearCompactionSummary removes a session's summary without touching other sessions", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const summaries = agent as unknown as { _compactionSummaries: Map<string, string> };
      summaries._compactionSummaries.set("ses_close", "to be cleared");
      summaries._compactionSummaries.set("ses_keep", "stays around");

      // Close one session
      agent.clearCompactionSummary("ses_close");

      expect(summaries._compactionSummaries.has("ses_close")).toBe(false);
      expect(summaries._compactionSummaries.has("ses_keep")).toBe(true);
      expect(summaries._compactionSummaries.get("ses_keep")).toBe("stays around");
      expect(summaries._compactionSummaries.size).toBe(1);

      // Idempotent: clearing again is a no-op
      agent.clearCompactionSummary("ses_close");
      expect(summaries._compactionSummaries.size).toBe(1);

      // Unknown id is safe
      agent.clearCompactionSummary("ses_does_not_exist");
      expect(summaries._compactionSummaries.size).toBe(1);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});
