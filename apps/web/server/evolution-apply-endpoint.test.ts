/**
 * POST /api/evolution/suggestions/:id/apply — contract tests.
 *
 * Mirrors the production endpoint in apps/web/server/api.ts. Importing api.ts
 * auto-starts the HTTP server, so this test re-declares the handler against a
 * fresh in-memory database per test, pinning the contract without coupling to
 * the full server bootstrap.
 *
 * Run via: `npm test` from repo root.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  type LocalPaths,
  type TradingPiEnv,
} from "@trading-pi/core";

type ApplyResult = { status: number; body: unknown };

function createApplyHandler(deps: {
  repos: Repositories;
  memory: MemoryStore;
  workflows: WorkflowEngine;
  sessions: SessionStore;
  skills: SkillRegistry;
  artifacts: ArtifactEngine;
  approvals: ApprovalEngine;
  env: TradingPiEnv;
}) {
  return async (
    _res: unknown,
    suggestionId: string,
    body: { approvedByUser?: unknown; finalRuleText?: unknown; sessionId?: string },
  ): Promise<ApplyResult> => {
    const suggestion = deps.repos.getEvolutionSuggestion(suggestionId);
    if (!suggestion) {
      return { status: 404, body: { error: "Suggestion not found" } };
    }
    if (suggestion.status !== "proposed") {
      return {
        status: 409,
        body: { error: `Suggestion already ${suggestion.status}`, suggestionId, status: suggestion.status },
      };
    }
    const approvedByUser = body?.approvedByUser !== false;
    const finalRuleText =
      typeof body?.finalRuleText === "string" && body.finalRuleText.trim().length > 0
        ? body.finalRuleText.trim()
        : undefined;
    const session = deps.sessions.ensureSession(body?.sessionId);
    const result = await deps.workflows.run(
      "evolution.apply",
      { suggestionId, approvedByUser, finalRuleText },
      {
        env: deps.env,
        repos: deps.repos,
        artifacts: deps.artifacts,
        approvals: deps.approvals,
        memory: deps.memory,
        skills: deps.skills,
        sessionId: session.id,
      },
    );
    return { status: 200, body: { sessionId: session.id, ...(result as { output: Record<string, unknown> }).output } };
  };
}

function buildTestEnv(dir: string): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: dir,
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx", "bybit", "coinbase", "kraken"],
    tradingMode: "paper",
    thinkingLevel: "medium",
  };
}

describe("POST /api/evolution/suggestions/:id/apply", () => {
  let tmp: string;
  let paths: LocalPaths;
  let db: TradingPiDatabase;
  let repos: Repositories;
  let memory: MemoryStore;
  let sessions: SessionStore;
  let approvals: ApprovalEngine;
  let artifacts: ArtifactEngine;
  let skills: SkillRegistry;
  let workflows: WorkflowEngine;
  let env: TradingPiEnv;

  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), "evolution-apply-endpoint-"));
    paths = {
      root: tmp,
      sqlitePath: resolve(tmp, "test.sqlite"),
      sessionsDir: resolve(tmp, "sessions"),
      artifactsDir: resolve(tmp, "artifacts"),
      memoryDir: resolve(tmp, "memory"),
      logsDir: resolve(tmp, "logs"),
    } as LocalPaths;
    db = new TradingPiDatabase(paths.sqlitePath);
    db.migrate();
    env = buildTestEnv(tmp);
    paths = ensureLocalPaths(resolveLocalPaths(env));
    repos = new Repositories(db);
    memory = new MemoryStore(repos);
    sessions = new SessionStore(paths, repos);
    approvals = new ApprovalEngine(repos);
    artifacts = new ArtifactEngine(paths, repos);
    skills = new SkillRegistry();
    registerDefaultSkills(skills);
    workflows = new WorkflowEngine();
    registerDefaultWorkflows(workflows, skills);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("adopts a proposed suggestion and writes the rule to memory", async () => {
    const suggestion = repos.createEvolutionSuggestion({
      title: "Tighten stop after losses",
      description: "Cap risk per trade after a streak.",
      category: "risk",
      priority: "high",
      ruleText: "Move stop to breakeven after first profitable move.",
    });

    const handler = createApplyHandler({ repos, memory, workflows, sessions, skills, artifacts, approvals, env });
    const result = await handler(null, suggestion.id, { approvedByUser: true, finalRuleText: "Move stop to breakeven after first profitable move." });

    expect(result.status).toBe(200);
    const body = result.body as { ok: boolean; ruleId: string; suggestionId: string };
    expect(body.ok).toBe(true);
    expect(body.suggestionId).toBe(suggestion.id);
    expect(body.ruleId).toBe(`rule:${suggestion.id}`);

    const rules = memory.query({ domain: "user_rules", limit: 100 }) as Array<{ key: string; value: string }>;
    const adopted = rules.find((rule) => rule.key === `rule:${suggestion.id}`);
    expect(adopted).toBeDefined();
    expect(adopted?.value).toBe("Move stop to breakeven after first profitable move.");

    const updated = repos.getEvolutionSuggestion(suggestion.id);
    expect(updated?.status).toBe("adopted");
  });

  it("returns 409 when applying a non-proposed suggestion", async () => {
    const suggestion = repos.createEvolutionSuggestion({
      title: "Already adopted",
      description: "This one is already adopted.",
      category: "discipline",
      priority: "medium",
      ruleText: "Skip a reapply.",
    });
    repos.updateEvolutionSuggestionStatus(suggestion.id, "adopted");

    const handler = createApplyHandler({ repos, memory, workflows, sessions, skills, artifacts, approvals, env });
    const result = await handler(null, suggestion.id, { approvedByUser: true });

    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: expect.stringMatching(/already adopted/) as unknown as string, suggestionId: suggestion.id });
  });
});