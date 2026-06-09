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
  SessionStore,
  SkillRegistry,
  TradingPiDatabase,
  WorkflowEngine,
  type TradingPiEnv,
} from "./index.js";

function testRuntime() {
  const dir = mkdtempSync(resolve(tmpdir(), "trading-pi-test-"));
  const env: TradingPiEnv = {
    openaiModel: "test-model",
    dataDir: dir,
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
  };
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const artifacts = new ArtifactEngine(paths, repos);
  const approvals = new ApprovalEngine(repos);
  const memory = new MemoryStore(repos);
  const sessions = new SessionStore(paths, repos);
  const skills = new SkillRegistry();
  registerDefaultSkills(skills);
  const workflows = new WorkflowEngine();
  registerDefaultWorkflows(workflows, skills);
  return { dir, env, paths, database, repos, artifacts, approvals, memory, sessions, skills, workflows };
}

describe("Trading Pi local core", () => {
  it("bootstraps SQLite and memory", () => {
    const rt = testRuntime();
    try {
      rt.memory.upsert("user", "risk", "Prefer 1% risk per idea.");
      expect(rt.memory.contextBlock("user")).toContain("Prefer 1% risk");
      expect(rt.repos.list("memory_records")).toHaveLength(1);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("registers required skills and workflows", () => {
    const rt = testRuntime();
    try {
      expect(rt.skills.list().map((skill) => skill.id)).toEqual(
        expect.arrayContaining(["market.coingecko.quote", "market.ccxt.ticker", "market.ccxt.ohlcv", "ai.respond"]),
      );
      expect(rt.workflows.list().map((workflow) => workflow.id)).toEqual(
        expect.arrayContaining(["chat.respond", "market.snapshot", "trade.plan"]),
      );
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("runs the risk sizing skill through workflow infrastructure", async () => {
    const rt = testRuntime();
    try {
      rt.skills.syncToDb({ ...rt, sessionId: "test" });
      const skill = rt.skills.get("risk.positionSizing");
      const output = await skill.execute({ budgetUsd: 1000, entry: 100, stop: 95 }, { ...rt, sessionId: "test" });
      expect(output).toMatchObject({ riskPct: 1, riskUsd: 10, stopDistance: 5, quantity: 2 });
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("persists JSONL session entries and SQLite session metadata", () => {
    const rt = testRuntime();
    try {
      const session = rt.sessions.createSession("test session");
      rt.sessions.append(session.id, "message", { content: "hello" });
      expect(rt.repos.list("sessions")).toHaveLength(1);
      expect(rt.sessions.read(session.id)).toHaveLength(1);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("runs workflow engine and persists workflow/artifact rows", async () => {
    const rt = testRuntime();
    try {
      rt.workflows.register({
        id: "test.local-artifact",
        name: "Test Local Artifact",
        description: "Create a local artifact without external network.",
        riskLevel: "low",
        execute: async (_input, context) => {
          return context.artifacts.create({
            type: "test",
            title: "Local Test Artifact",
            summary: "Local workflow artifact",
            markdown: "# Local Test Artifact",
            sessionId: context.sessionId,
            workflowRunId: context.workflowRunId,
          });
        },
      });
      const result = await rt.workflows.run(
        "test.local-artifact",
        {},
        { ...rt, sessionId: "test-session" },
      );
      expect(result.runId).toMatch(/^wfr_/);
      expect(rt.repos.list("artifacts").length).toBeGreaterThanOrEqual(1);
      expect(rt.repos.list("timeline_events").length).toBeGreaterThanOrEqual(1);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });
});
