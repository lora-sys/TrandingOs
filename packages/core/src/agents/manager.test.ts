import { describe, expect, it, vi } from "vitest";
import { SubAgentManager } from "./manager.js";
import type { SpawnParams, SubAgentManagerConfig } from "./types.js";
import type { WorkflowContext } from "../workflows/types.js";

// Helper: in-memory context for spawn tests.
function makeContext(): WorkflowContext {
  return {
    env: {} as WorkflowContext["env"],
    repos: {} as WorkflowContext["repos"],
    artifacts: {} as WorkflowContext["artifacts"],
    approvals: {} as WorkflowContext["approvals"],
    memory: {} as WorkflowContext["memory"],
    sessionId: "ctx-session",
    skills: {} as WorkflowContext["skills"],
  };
}

function makeRunWorkflow(impl?: (id: string, input: unknown, ctx: WorkflowContext) => Promise<{ runId: string; output: unknown }>) {
  return async (workflowId: string, input: unknown, ctx: WorkflowContext) => {
    if (impl) return impl(workflowId, input, ctx);
    // Default: return a synthetic result tied to the workflow id.
    return { runId: `wfr_${workflowId}`, output: { echo: workflowId, input } };
  };
}

describe("SubAgentManager (PR-14)", () => {
  it("spawn(foreground) blocks until the workflow completes and returns the completed toolResult", async () => {
    const manager = new SubAgentManager();
    const config: SubAgentManagerConfig = {
      runWorkflow: makeRunWorkflow(async (id) => ({ runId: `wfr_${id}`, output: { result: "ok" } })),
      createContext: () => makeContext(),
    };
    manager.configure(config);

    const result = await manager.spawn({ agent_type: "deep-research", prompt: "BTC" });
    expect(result.status).toBe("completed");
    expect(result.subagentType).toBe("deep-research");
    expect(result.agentId).toMatch(/^sag_/);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("spawn(background) returns immediately with background status and emits lifecycle events", async () => {
    const manager = new SubAgentManager();
    const events: string[] = [];
    const unsubscribe = manager.subscribe((e) => events.push(e.type));

    let resolveWorkflow: (value: { runId: string; output: unknown }) => void = () => undefined;
    const config: SubAgentManagerConfig = {
      runWorkflow: () => new Promise((resolve) => {
        resolveWorkflow = resolve;
      }),
      createContext: () => makeContext(),
    };
    manager.configure(config);

    const result = await manager.spawn({ agent_type: "alpha-radar", prompt: "scan", background: true });
    // Background returns immediately with status: background (does not await workflow)
    expect(result.status).toBe("background");
    expect(result.agentId).toMatch(/^sag_/);

    // Lifecycle events fired: created + started (at minimum before workflow resolves)
    expect(events).toContain("subagents:created");
    expect(events).toContain("subagents:started");

    // Allow the workflow to settle so we can check completed event afterwards
    resolveWorkflow!({ runId: "wfr_alpha", output: { done: true } });
    // Wait a tick for the background promise to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toContain("subagents:completed");
    unsubscribe();
  });

  it("stop() cancels a running session and emits subagents:cancelled", async () => {
    const manager = new SubAgentManager();
    const events: string[] = [];
    const unsubscribe = manager.subscribe((e) => events.push(e.type));

    let resolveWorkflow: (value: { runId: string; output: unknown }) => void = () => undefined;
    const config: SubAgentManagerConfig = {
      runWorkflow: () => new Promise((resolve) => {
        resolveWorkflow = resolve;
      }),
      createContext: () => makeContext(),
    };
    manager.configure(config);

    // Spawn background so it returns immediately
    const spawned = await manager.spawn({ agent_type: "alpha-radar", prompt: "scan", background: true });
    const agentId = spawned.agentId;

    // Now stop it
    const stopped = manager.stop(agentId, "user pressed cancel");
    expect(stopped).toBeDefined();
    expect(stopped?.status).toBe("cancelled");

    // Cancel event must have been emitted
    expect(events).toContain("subagents:cancelled");

    // Settle the still-pending workflow so background promise can resolve
    resolveWorkflow!({ runId: "wfr_alpha", output: {} });
    await new Promise((r) => setTimeout(r, 10));
    unsubscribe();
  });

  it("emits step events for each workflow step definition", async () => {
    const manager = new SubAgentManager();
    const events: Array<{ type: string; payload: { stepName?: string; stepNumber?: number } }> = [];
    const unsubscribe = manager.subscribe((e) => events.push({ type: e.type, payload: e.payload }));

    const config: SubAgentManagerConfig = {
      runWorkflow: async (id) => ({ runId: `wfr_${id}`, output: { marker: "steps" } }),
      createContext: () => makeContext(),
    };
    manager.configure(config);

    await manager.spawn({ agent_type: "deep-research", prompt: "ETH research" });

    const stepEvents = events.filter((e) => e.type === "subagents:step");
    // deep-research has 7 defined steps → 7 step events
    expect(stepEvents.length).toBe(7);
    expect(stepEvents[0]?.payload.stepName).toBe("Plan research");
    expect(stepEvents[0]?.payload.stepNumber).toBe(1);
    expect(stepEvents[6]?.payload.stepName).toBe("Synthesize report");
    expect(stepEvents[6]?.payload.stepNumber).toBe(7);
    unsubscribe();
  });

  it("throws when spawn is called with an unknown agent_type", async () => {
    const manager = new SubAgentManager();
    const config: SubAgentManagerConfig = {
      runWorkflow: makeRunWorkflow(),
      createContext: () => makeContext(),
    };
    manager.configure(config);

    await expect(
      manager.spawn({ agent_type: "not-a-real-agent", prompt: "test" } as SpawnParams),
    ).rejects.toThrow(/Unknown sub-agent type/);
  });
});