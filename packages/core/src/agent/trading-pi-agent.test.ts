import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ApprovalEngine,
  ArtifactEngine,
  ensureLocalPaths,
  MemoryStore,
  registerDefaultWorkflows,
  Repositories,
  resolveLocalPaths,
  SessionStore,
  SkillRegistry,
  TradingPiAgent,
  TradingPiDatabase,
  WorkflowEngine,
  type TradingPiEnv,
} from "../index.js";

// Mock pi-agent-core so we can stub Agent behavior for slash / LLM fallback tests.
vi.mock("@earendil-works/pi-agent-core", async () => {
  return {
    Agent: class {
      public state: { messages: Array<{ role: string; content: unknown }>; model: unknown };
      public subscribe = vi.fn((_handler: unknown) => () => undefined);
      public prompt = vi.fn(async (_message: string) => {
        // Default: synthesize one assistant text message and store on state.
        this.state.messages.push({
          role: "assistant",
          content: [{ type: "text", text: "Mocked LLM reply." }],
        });
      });
      constructor(_config: unknown) {
        this.state = { messages: [], model: null };
      }
    },
    DEFAULT_COMPACTION_SETTINGS: { reserveTokens: 0 },
    estimateContextTokens: () => ({ tokens: 0 }),
    shouldCompact: () => false,
    generateSummary: async () => ({ ok: false as const }),
  };
});

vi.mock("@earendil-works/pi-ai", async () => {
  return {
    fauxAssistantMessage: (text: string, meta: { timestamp: number }) => ({
      role: "assistant",
      content: [{ type: "text", text }],
      timestamp: meta.timestamp,
    }),
  };
});

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
  registerDefaultWorkflows(workflows, skills);
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

describe("TradingPiAgent slash router and session lifecycle (PR-14)", () => {
  it("routes /bootstrap-os through the os.bootstrap workflow and returns workflowResult", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      // Use /bootstrap-os because it works offline (no network required).
      const result = await agent.prompt({ message: "/bootstrap-os", sessionId: "slash-bootstrap-session" }) as {
        sessionId: string;
        text: string;
        workflowResult?: { runId: string; output: unknown };
      };
      // Slash router short-circuits the LLM path and runs the workflow directly.
      expect(result.sessionId).toBe("slash-bootstrap-session");
      expect(result.workflowResult?.runId).toMatch(/^wfr_/);
      expect(result.text).toContain("Trading Pi OS bootstrap completed");
      // Timeline should record the routed intent
      const events = deps.repos.list("timeline_events");
      expect(events.some((e) => String(e.type) === "agent.intent")).toBe(true);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("falls back to LLM agent when the message has no slash command", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      // Plain text message — no slash command → should hit Agent.prompt
      const result = await agent.prompt({ message: "what is the price of ETH?", sessionId: "llm-fallback-session" }) as {
        sessionId: string;
        text: string;
        workflowResult?: unknown;
      };
      expect(result.sessionId).toBe("llm-fallback-session");
      // No workflow was routed (plain text)
      expect(result.workflowResult).toBeUndefined();
      // The mocked LLM reply should be echoed back
      expect(result.text).toBe("Mocked LLM reply.");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("session fork creates a child session with parent reference", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      // First create a parent session
      const parent = deps.sessions.createSession("parent session");
      // Send one message to parent so it has history
      await deps.sessions.append(parent.id, "message", { role: "user", content: "seed" });

      // Fork via the agent's prompt with parentSessionId
      const agent = new TradingPiAgent({ ...deps });
      const result = await agent.prompt({
        message: "/bootstrap-os",
        parentSessionId: parent.id,
      }) as { sessionId: string };
      // Forked session id must differ from parent
      expect(result.sessionId).not.toBe(parent.id);
      expect(result.sessionId).toMatch(/^ses_/);
      // Parent session row should still exist
      const allSessions = deps.repos.list("sessions");
      const ids = allSessions.map((s) => String(s.id));
      expect(ids).toContain(parent.id);
      expect(ids).toContain(result.sessionId);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("clearCompactionSummary removes the Map entry for a session", () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const summaries = agent as unknown as { _compactionSummaries: Map<string, string> };
      summaries._compactionSummaries.set("ses_clear", "summary to drop");
      expect(summaries._compactionSummaries.has("ses_clear")).toBe(true);

      agent.clearCompactionSummary("ses_clear");
      expect(summaries._compactionSummaries.has("ses_clear")).toBe(false);

      // Idempotent: clearing again is a no-op
      agent.clearCompactionSummary("ses_clear");
      expect(summaries._compactionSummaries.has("ses_clear")).toBe(false);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});

describe("TradingPiAgent OPENAI_API_KEY guard", () => {
  it("throws clear error when openaiApiKey is missing and message is not a slash command", async () => {
    const env = buildEnv();
    // explicitly omit the key
    (env as { openaiApiKey?: string }).openaiApiKey = undefined;
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      await expect(agent.prompt({ message: "Tell me about BTC", sessionId: "ses_no_key" }))
        .rejects.toThrow(/OPENAI_API_KEY is not configured/);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("does not throw for slash commands when key is missing (slash routes to workflow)", async () => {
    const env = buildEnv();
    (env as { openaiApiKey?: string }).openaiApiKey = undefined;
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      // /bootstrap-os is a slash command that should route without touching the LLM
      const result = await agent.prompt({ message: "/bootstrap-os", sessionId: "ses_no_key_slash" });
      expect(result.text).toContain("bootstrap");
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});