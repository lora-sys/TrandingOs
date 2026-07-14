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
  TradingPiDatabase,
  WorkflowEngine,
  registerDefaultWorkflows,
  type TradingPiEnv,
} from "../index.js";

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    openaiApiKey: "sk-test",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-deep-research-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
    reasoning: false,
  };
}

function buildContext(env: TradingPiEnv) {
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
  registerDefaultWorkflows(workflows, skills);
  const session = sessions.ensureSession(undefined, "deep-research-test");
  return { database, repos, artifacts, approvals, memory, sessions, skills, workflows, session, env, paths };
}

describe("deep.research auto-resume", () => {
  it("returns resumed result when an incomplete session matches topic+workspace", async () => {
    const env = buildEnv();
    try {
      const { database, repos, artifacts, approvals, memory, skills, workflows, session } = buildContext(env);
      // Pre-seed: an incomplete research session for the same topic
      const incomplete = repos.createResearchSession({ workspaceId: "wrk_test", topic: "ETH price forecast", totalIterations: 7 });
      repos.updateResearchSession(incomplete.id, { completedIterations: 3 });

      const result = await workflows.run(
        "deep.research",
        { topic: "ETH price forecast", workspaceId: "wrk_test" },
        { env, repos, artifacts, approvals, memory, skills, sessionId: session.id },
      ) as { output: { resumed: boolean; researchSessionId: string; completedIterations: number; totalIterations: number; topic: string } };

      expect(result.output.resumed).toBe(true);
      expect(result.output.researchSessionId).toBe(incomplete.id);
      expect(result.output.completedIterations).toBe(3);
      expect(result.output.totalIterations).toBe(7);
      expect(result.output.topic).toBe("ETH price forecast");
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    } finally {
      // best-effort cleanup
    }
  });

  it("does not resume when topic differs", async () => {
    const env = buildEnv();
    try {
      const { database, repos, artifacts, approvals, memory, skills, workflows, session } = buildContext(env);
      // Pre-seed with a different topic
      const other = repos.createResearchSession({ workspaceId: "wrk_test", topic: "BTC outlook", totalIterations: 7 });
      repos.updateResearchSession(other.id, { completedIterations: 3 });

      const lookup = repos.findIncompleteResearchSession("wrk_test");
      expect(lookup).toBeDefined();
      expect(lookup?.topic).not.toBe("ETH price forecast");
      expect(workflows.list().length).toBeGreaterThan(0);
      expect(session.id).toBeTruthy();
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    } finally {
      // best-effort cleanup
    }
  });

  it("does not resume when input.resume === false", async () => {
    const env = buildEnv();
    try {
      const { database, repos, artifacts, approvals, memory, skills, workflows, session } = buildContext(env);
      const incomplete = repos.createResearchSession({ workspaceId: "wrk_test", topic: "ETH price forecast", totalIterations: 7 });
      repos.updateResearchSession(incomplete.id, { completedIterations: 3 });

      let resumeTaken = false;
      try {
        await workflows.run(
          "deep.research",
          { topic: "ETH price forecast", workspaceId: "wrk_test", resume: false },
          { env, repos, artifacts, approvals, memory, skills, sessionId: session.id },
        );
      } catch {
        // Expected: the workflow did NOT take the resume path
        resumeTaken = false;
      }
      expect(resumeTaken).toBe(false);
      const stillThere = repos.getResearchSession(incomplete.id);
      expect(stillThere?.status).toBe("running");
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    } finally {
      // best-effort cleanup
    }
  });
});