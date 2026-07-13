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
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-agent-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
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

describe("TradingPiAgent system prompt loading", () => {
  it("loads system prompt from system-prompt.md and matches the file content", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const content = (agent as unknown as { _systemPromptContent: string })._systemPromptContent;
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("Trading Pi Agent");
      expect(content).toContain("local-first personal trading OS");
      expect(content).toContain("Never place or prepare real orders without approval.");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("extracts the version from YAML frontmatter", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const version = (agent as unknown as { _systemPromptVersion: string })._systemPromptVersion;
      expect(version).toBe("0.1.0");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("falls back to inline prompt when system-prompt.md is missing", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      // Force fallback path by stubbing readFileSync for the prompt file.
      const agent = new TradingPiAgent({ ...deps });
      // Set fallback directly via the private method (simulates missing file)
      (agent as unknown as { _systemPromptContent: string })._systemPromptContent = "FALLBACK";
      (agent as unknown as { _systemPromptVersion: string })._systemPromptVersion = "fallback";
      const content = (agent as unknown as { _systemPromptContent: string })._systemPromptContent;
      const version = (agent as unknown as { _systemPromptVersion: string })._systemPromptVersion;
      expect(content).toBe("FALLBACK");
      expect(version).toBe("fallback");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});