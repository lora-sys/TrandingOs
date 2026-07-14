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
  TradingPiAgent,
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
    exchangeFallbacks: ["okx", "bybit", "coinbase", "kraken"],
    tradingMode: "paper",
    thinkingLevel: "medium",
    reasoning: false,
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
        expect.arrayContaining([
          "market.coingecko.quote",
          "market.ccxt.ticker",
          "market.ccxt.ohlcv",
          "market.snapshot",
          "research.asset",
          "research.report",
          "risk.tradePlan",
          "paper.order.create",
          "journal.entry.create",
          "review.daily",
          "search.query",
          "browser.search",
          "mcp.health",
          "workspace.create",
          "marketplace.catalog.seed",
          "strategy.create",
          "backtest.run",
          "artifact.preview",
          "artifact.read",
          "ai.respond",
        ]),
      );
      expect(rt.workflows.list().map((workflow) => workflow.id)).toEqual(
        expect.arrayContaining(["chat.respond", "market.snapshot", "research.asset", "trade.plan", "review.daily", "os.bootstrap", "strategy.backtest"]),
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

  it("persists local paper orders, trades, positions, and journal entries", async () => {
    const rt = testRuntime();
    try {
      const orderSkill = rt.skills.get("paper.order.create");
      const journalSkill = rt.skills.get("journal.entry.create");
      const order = await orderSkill.execute(
        { symbol: "ETH/USDT", side: "buy", quantity: 0.25, price: 100 },
        { ...rt, sessionId: "paper-session" },
      ) as { orderId: string; tradeId: string };
      expect(order.orderId).toMatch(/^ord_/);
      expect(order.tradeId).toMatch(/^trd_/);
      expect(rt.repos.portfolioSnapshot().positions).toHaveLength(1);
      const journal = await journalSkill.execute(
        { tradeId: order.tradeId, mood: "focused", disciplineScore: 90, rulesViolated: [], notes: "Followed plan." },
        { ...rt, sessionId: "paper-session" },
      ) as { journalId: string; artifact: { id: string } };
      expect(journal.journalId).toMatch(/^jnl_/);
      expect(journal.artifact.id).toMatch(/^art_/);
      expect(rt.repos.list("journal_entries")).toHaveLength(1);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("calculates review metrics from local paper data without network calls", async () => {
    const rt = testRuntime();
    try {
      rt.repos.createPaperOrder({ symbol: "BTC/USDT", side: "buy", quantity: 0.1, price: 100, sessionId: "review-session" });
      rt.repos.createJournalEntry({
        sessionId: "review-session",
        disciplineScore: 70,
        rulesViolated: ["late-entry"],
        notes: "Entered after plan trigger.",
      });
      const reviewSkill = rt.skills.get("review.daily");
      const review = await reviewSkill.execute({ period: "daily" }, { ...rt, sessionId: "review-session" }) as {
        metrics: { trades: number; journalEntries: number; ruleBreaks: number; disciplineScore: number };
      };
      expect(review.metrics).toMatchObject({ trades: 1, journalEntries: 1, ruleBreaks: 1, disciplineScore: 70 });
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("bootstraps OS foundation domains without external network calls", async () => {
    const rt = testRuntime();
    try {
      const result = await rt.workflows.run("os.bootstrap", {}, { ...rt, sessionId: "os-session" });
      expect(result.runId).toMatch(/^wfr_/);
      expect(rt.repos.list("workspaces").length).toBeGreaterThanOrEqual(3);
      expect(rt.repos.list("marketplace_items").length).toBeGreaterThanOrEqual(4);
      expect(rt.repos.list("mcp_servers").length).toBeGreaterThanOrEqual(1);
      expect(rt.repos.list("audit_records").length).toBeGreaterThanOrEqual(1);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("routes slash commands through TradingPiAgent into workflows", async () => {
    const rt = testRuntime();
    try {
      const agent = new TradingPiAgent({ ...rt });
      const result = await agent.prompt({ message: "/bootstrap-os", sessionId: "agent-route-session" }) as {
        sessionId: string;
        text: string;
        workflowResult?: { runId: string; output: unknown };
      };
      expect(result.sessionId).toMatch(/^ses_/);
      expect(result.workflowResult?.runId).toMatch(/^wfr_/);
      expect(result.text).toContain("Trading Pi OS bootstrap completed");
      expect(rt.repos.list("timeline_events").some((event) => String(event.type) === "agent.intent")).toBe(true);
      expect(rt.repos.list("artifacts").some((artifact) => String(artifact.type) === "os-bootstrap")).toBe(true);
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });

  it("stores artifact preview metadata and exposes preview content", async () => {
    const rt = testRuntime();
    try {
      const artifact = rt.artifacts.create({
        type: "research-report",
        title: "Preview Test",
        summary: "Preview summary",
        markdown: "# Preview Test\n\nMarkdown content.",
        sessionId: "preview-session",
      });
      const previewSkill = rt.skills.get("artifact.preview");
      const preview = await previewSkill.execute({ artifactId: artifact.id }, { ...rt, sessionId: "preview-session" }) as {
        content: string;
        previewReady: boolean;
        contentType: string;
      };
      expect(preview.content).toContain("Markdown content");
      expect(preview.previewReady).toBe(true);
      expect(preview.contentType).toBe("text/markdown");
    } finally {
      rt.database.close();
      rmSync(rt.dir, { recursive: true, force: true });
    }
  });
});
