import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
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

// Track all Agent instances + their subscribers so we can prove no listener leak.
const createdAgents: Array<{
  instance: {
    subscribe: ReturnType<typeof vi.fn>;
    prompt: ReturnType<typeof vi.fn>;
    state: { messages: unknown[]; model: unknown };
  };
  subscribers: Array<() => void>;
}> = [];

vi.mock("@earendil-works/pi-agent-core", async () => {
  return {
    Agent: class {
      public state: { messages: unknown[]; model: unknown };
      public subscribe = vi.fn();
      public prompt = vi.fn();
      constructor(_config: unknown) {
        const entry = {
          instance: this as unknown as {
            subscribe: ReturnType<typeof vi.fn>;
            prompt: ReturnType<typeof vi.fn>;
            state: { messages: unknown[]; model: unknown };
          },
          subscribers: [] as Array<() => void>,
        };
        createdAgents.push(entry);
        this.state = { messages: [], model: null };
        this.subscribe = vi.fn((_handler: unknown) => {
          let called = false;
          const unsub = () => {
            if (called) return;
            called = true;
            const idx = entry.subscribers.indexOf(unsub);
            if (idx >= 0) entry.subscribers.splice(idx, 1);
          };
          entry.subscribers.push(unsub);
          return unsub;
        });
        this.prompt = vi.fn(async () => {
          // no-op: simulates a successful prompt
        });
      }
    },
    // Symbols used by TradingPiAgent that we don't exercise in these tests
    DEFAULT_COMPACTION_SETTINGS: { reserveTokens: 0 },
    estimateContextTokens: () => ({ tokens: 0 }),
    shouldCompact: () => false,
    generateSummary: async () => ({ ok: false as const }),
  };
});

function buildEnv(): TradingPiEnv {
  return {
    openaiModel: "test-model",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-lifecycle-test-")),
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

function liveSubscribers(): number {
  return createdAgents.reduce((acc, entry) => acc + entry.subscribers.length, 0);
}

describe("TradingPiAgent subscribe lifecycle", () => {
  it("unsubscribes after each prompt so listener count stays at 0 across 10 sequential prompts", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    const baseline = createdAgents.length;
    try {
      const agent = new TradingPiAgent({ ...deps });
      for (let i = 0; i < 10; i++) {
        await agent.prompt({ message: `hello ${i}`, sessionId: `seq-session-${i}` });
      }
      // Every prompt created exactly one Agent, and every subscriber was cleaned up.
      expect(createdAgents.length - baseline).toBe(10);
      expect(liveSubscribers()).toBe(0);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("calls unsubscribe even when agent.prompt throws", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const baseline = createdAgents.length;
      // Make the next agent.prompt() reject to simulate a runtime failure mid-prompt.
      const target = createdAgents[baseline];
      target.instance.prompt.mockImplementationOnce(async () => {
        throw new Error("simulated prompt failure");
      });

      await expect(
        agent.prompt({ message: "boom", sessionId: "throw-session" }),
      ).rejects.toThrow("simulated prompt failure");

      // The finally block must have removed the subscriber.
      expect(target.subscribers.length).toBe(0);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });

  it("each concurrent prompt gets its own independent unsubscribe", async () => {
    const env = buildEnv();
    const deps = buildDeps(env);
    try {
      const agent = new TradingPiAgent({ ...deps });
      const baseline = createdAgents.length;

      // Track the order in which subscribers are removed so we can prove
      // each prompt's unsubscribe runs exactly once, independently.
      const removeOrder: number[] = [];
      for (let i = baseline; i < baseline + 5; i++) {
        const entry = createdAgents[i];
        if (!entry) continue;
        const original = entry.subscribers;
        Object.defineProperty(entry, "subscribers", {
          configurable: true,
          get() {
            return original;
          },
        });
        // Wrap splice to record removal order relative to the Agent index.
        const spliceFn = original.splice.bind(original);
        original.splice = ((start: number, deleteCount?: number, ...rest: unknown[]) => {
          if (deleteCount && deleteCount > 0) removeOrder.push(i);
          return spliceFn(start, deleteCount, ...rest);
        }) as typeof original.splice;
      }

      const prompts = Array.from({ length: 5 }, (_, i) =>
        agent.prompt({ message: `concurrent ${i}`, sessionId: `concurrent-session-${i}` }),
      );
      await Promise.all(prompts);

      // No live subscribers remain after all prompts settle.
      expect(liveSubscribers()).toBe(0);
      // Each of the 5 concurrent prompts triggered exactly one unsubscribe.
      expect(removeOrder.length).toBe(5);
      expect(new Set(removeOrder).size).toBe(5);
    } finally {
      deps.database.close();
      rmSync(env.dataDir, { recursive: true, force: true });
    }
  });
});
