import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "./workflow-engine.js";
import { ensureLocalPaths, Repositories, resolveLocalPaths, TradingPiDatabase, type TradingPiEnv } from "../index.js";
import type { WorkflowContext } from "./types.js";

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-workflow-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit"],
    tradingMode: "paper",
    thinkingLevel: "medium",
  };
}

function buildContext(): {
  env: TradingPiEnv;
  database: TradingPiDatabase;
  repos: Repositories;
  context: WorkflowContext;
} {
  const env = buildEnv();
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const context = {
    env,
    repos,
    artifacts: {} as WorkflowContext["artifacts"],
    approvals: {} as WorkflowContext["approvals"],
    memory: {} as WorkflowContext["memory"],
    skills: {} as WorkflowContext["skills"],
    sessionId: "wf-session",
  } as unknown as WorkflowContext;
  return { env, database, repos, context };
}

describe("WorkflowEngine (PR-14)", () => {
  it("run with happy path returns output and writes 'completed' timeline entries", async () => {
    const engine = new WorkflowEngine();
    engine.register({
      id: "test.happy",
      name: "Happy Path",
      description: "Always succeeds.",
      riskLevel: "low",
      execute: async (input) => ({ doubled: (input as { n: number }).n * 2 }),
    });

    const { env, database, repos, context } = buildContext();
    try {
      const result = await engine.run("test.happy", { n: 21 }, context);
      expect(result.runId).toMatch(/^wfr_/);
      expect(result.output).toEqual({ doubled: 42 });

      const events = repos.list("timeline_events") as Array<{ type: string; status: string }>;
      const workflowEvents = events.filter((e) => e.type === "workflow");
      // Must include a "running" entry (started) and a "completed" entry
      expect(workflowEvents.some((e) => e.status === "running")).toBe(true);
      expect(workflowEvents.some((e) => e.status === "completed")).toBe(true);

      // Workflow run row must be marked completed
      const runs = database.db.prepare("SELECT * FROM workflow_runs WHERE id = ?").get(result.runId) as { status: string } | undefined;
      expect(runs?.status).toBe("completed");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("run with throwing step writes 'failed' timeline entry and re-throws", async () => {
    const engine = new WorkflowEngine();
    engine.register({
      id: "test.boom",
      name: "Boom Step",
      description: "Always throws.",
      riskLevel: "low",
      execute: async () => {
        throw new Error("deliberate failure");
      },
    });

    const { env, database, repos, context } = buildContext();
    try {
      await expect(engine.run("test.boom", {}, context)).rejects.toThrow("deliberate failure");

      const events = repos.list("timeline_events") as Array<{ type: string; status: string; title: string }>;
      const failedEvent = events.find((e) => e.type === "workflow" && e.status === "failed");
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.title).toContain("Workflow failed");

      // workflow_runs row should reflect failed status with the error message
      const run = database.db.prepare("SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 1").get("test.boom") as { status: string; error: string } | undefined;
      expect(run?.status).toBe("failed");
      expect(run?.error).toBe("deliberate failure");
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("a failed run does not write a 'completed' timeline entry or artifact (no partial artifacts)", async () => {
    const engine = new WorkflowEngine();
    engine.register({
      id: "test.partial",
      name: "Partial Workflow",
      description: "Throws before producing artifacts.",
      riskLevel: "medium",
      execute: async () => {
        throw new Error("aborted before output");
      },
    });

    const { env, database, repos, context } = buildContext();
    try {
      await expect(engine.run("test.partial", {}, context)).rejects.toThrow();

      const events = repos.list("timeline_events") as Array<{ type: string; status: string }>;
      // No "completed" entry should be written when the workflow throws
      const completedWorkflow = events.find(
        (e) => e.type === "workflow" && e.status === "completed",
      );
      expect(completedWorkflow).toBeUndefined();

      // No artifacts should have been created for this run
      const artifacts = repos.list("artifacts");
      expect(artifacts.length).toBe(0);
    } finally {
      database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});