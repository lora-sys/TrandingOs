import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
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
  const dir = mkdtempSync(resolve(tmpdir(), "trading-pi-evolution-apply-test-"));
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
  const workflows = new WorkflowEngine();
  registerDefaultWorkflows(workflows, skills);
  return { dir, env, paths, database, repos, artifacts, approvals, memory, skills, workflows };
}

function seedSuggestion(repos: Repositories, overrides: { ruleText?: string; workspaceId?: string } = {}) {
  return repos.createEvolutionSuggestion({
    workspaceId: overrides.workspaceId ?? "ws_evo",
    title: "Reduce position after losses",
    description: "Cut size by half after a losing streak to preserve capital.",
    category: "risk",
    priority: "high",
    ruleText: overrides.ruleText ?? "After 3 consecutive losses, reduce position size by 50%.",
  });
}

function runApply(rt: ReturnType<typeof testRuntime>, input: { suggestionId: string; approvedByUser: boolean; finalRuleText?: string }) {
  return rt.workflows.run("evolution.apply", input, { ...rt }) as Promise<{
    runId: string;
    output: { ok: boolean; suggestionId: string; ruleId?: string; rejected?: boolean; suggestion?: { status: string } };
  }>;
}

describe("evolution.apply workflow", () => {
  it("writes the rule into user_rules memory and marks the suggestion adopted", async () => {
    const rt = testRuntime();
    try {
      const suggestion = seedSuggestion(rt.repos, { ruleText: "Default rule text from review." });
      const result = await runApply(rt, { suggestionId: suggestion.id, approvedByUser: true });

      expect(result.output.ok).toBe(true);
      expect(result.output.suggestionId).toBe(suggestion.id);
      expect(result.output.ruleId).toBe(`rule:${suggestion.id}`);
      expect(result.output.suggestion?.status).toBe("adopted");

      const stored = rt.repos.getEvolutionSuggestion(suggestion.id);
      expect(stored?.status).toBe("adopted");

      const rules = rt.memory.query({ domain: "user_rules", limit: 100 }) as Array<{ key: string; value: string; domain?: string }>;
      const adopted = rules.find((rule) => rule.key === `rule:${suggestion.id}`);
      expect(adopted).toBeDefined();
      expect(adopted?.value).toBe("Default rule text from review.");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("updates status only and skips the rule write when the user rejects", async () => {
    const rt = testRuntime();
    try {
      const suggestion = seedSuggestion(rt.repos, { ruleText: "Should not appear in memory." });
      const result = await runApply(rt, { suggestionId: suggestion.id, approvedByUser: false });

      expect(result.output.ok).toBe(true);
      expect(result.output.rejected).toBe(true);
      expect(result.output.ruleId).toBeUndefined();

      const stored = rt.repos.getEvolutionSuggestion(suggestion.id);
      expect(stored?.status).toBe("dismissed");

      const rules = rt.memory.query({ domain: "user_rules", limit: 100 }) as Array<{ key: string; value: string }>;
      expect(rules.find((rule) => rule.key === `rule:${suggestion.id}`)).toBeUndefined();
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("rejects an already-adopted suggestion with an error", async () => {
    const rt = testRuntime();
    try {
      const suggestion = seedSuggestion(rt.repos);
      await runApply(rt, { suggestionId: suggestion.id, approvedByUser: true });
      await expect(runApply(rt, { suggestionId: suggestion.id, approvedByUser: true })).rejects.toThrow(/already adopted/);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("uses finalRuleText override instead of the suggestion's ruleText", async () => {
    const rt = testRuntime();
    try {
      const suggestion = seedSuggestion(rt.repos, { ruleText: "Original rule suggestion text." });
      const override = "User-edited, tightened rule text.";
      const result = await runApply(rt, { suggestionId: suggestion.id, approvedByUser: true, finalRuleText: override });

      expect(result.output.ok).toBe(true);
      expect(result.output.ruleId).toBe(`rule:${suggestion.id}`);

      const rules = rt.memory.query({ domain: "user_rules", limit: 100 }) as Array<{ key: string; value: string }>;
      const adopted = rules.find((rule) => rule.key === `rule:${suggestion.id}`);
      expect(adopted?.value).toBe(override);
      expect(adopted?.value).not.toBe(suggestion.ruleText);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });
});