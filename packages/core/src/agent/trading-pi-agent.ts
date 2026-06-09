import { Agent, type AgentEvent, type AgentMessage } from "@earendil-works/pi-agent-core";
import { createTradingPiModel } from "../ai/model.js";
import type { TradingPiEnv } from "../config/env.js";
import type { Repositories } from "../db/repositories.js";
import type { ApprovalEngine } from "../approvals/approval-engine.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { SessionStore } from "../sessions/session-store.js";
import type { SkillRegistry } from "../skills/registry.js";
import type { ArtifactEngine } from "../artifacts/artifact-engine.js";

export class TradingPiAgent {
  constructor(
    private readonly deps: {
      env: TradingPiEnv;
      repos: Repositories;
      sessions: SessionStore;
      memory: MemoryStore;
      skills: SkillRegistry;
      artifacts: ArtifactEngine;
      approvals: ApprovalEngine;
    },
  ) {}

  async prompt(input: { message: string; sessionId?: string }) {
    const session = this.deps.sessions.ensureSession(input.sessionId);
    this.deps.sessions.append(session.id, "message", { role: "user", content: input.message });
    const baseContext = {
      env: this.deps.env,
      repos: this.deps.repos,
      artifacts: this.deps.artifacts,
      approvals: this.deps.approvals,
      memory: this.deps.memory,
      sessionId: session.id,
    };
    const agent = new Agent({
      sessionId: session.id,
      toolExecution: "sequential",
      initialState: {
        systemPrompt: this.systemPrompt(),
        model: createTradingPiModel(this.deps.env),
        tools: this.deps.skills.toPiTools(baseContext),
      },
      getApiKey: () => this.deps.env.openaiApiKey,
      transformContext: async (messages) => [
        {
          role: "user",
          content: `Local memory snapshot:\n${this.deps.memory.contextBlock("user")}`,
          timestamp: Date.now(),
        },
        ...messages,
      ],
      beforeToolCall: async ({ toolCall, args }) => {
        const skill = this.deps.skills.get(toolCall.name);
        this.deps.repos.createTimeline({
          sessionId: session.id,
          type: "agent.tool.preflight",
          title: `Pi tool preflight: ${skill.name}`,
          status: "running",
          payload: args,
        });
        if (this.deps.approvals.requiresApproval(skill.id, skill.riskLevel)) {
          const approvalId = this.deps.approvals.request({
            action: skill.id,
            riskLevel: skill.riskLevel,
            reason: `${skill.name} requires explicit approval.`,
            payload: args,
            sessionId: session.id,
          });
          return { block: true, reason: `Approval required before running ${skill.id}: ${approvalId}` };
        }
        return undefined;
      },
      afterToolCall: async ({ toolCall, result, isError }) => {
        this.deps.repos.createTimeline({
          sessionId: session.id,
          type: "agent.tool.result",
          title: `Pi tool finished: ${toolCall.name}`,
          status: isError ? "failed" : "completed",
          payload: result.details,
        });
        return undefined;
      },
    });
    agent.subscribe((event) => this.handleEvent(session.id, event));
    await agent.prompt(input.message);
    const messages = agent.state.messages;
    this.deps.sessions.append(session.id, "agent_state", { messageCount: messages.length });
    const last = messages.at(-1);
    return {
      sessionId: session.id,
      messages,
      text: extractAssistantText(last),
    };
  }

  private systemPrompt() {
    return `You are Trading Pi Agent, the only core agent in a local-first personal trading OS.
Use available tools and workflows for market, risk, artifact, and approval work.
Never design or imply a multi-agent system.
Never place or prepare real orders without approval.
Make important results traceable and artifact-ready.
Do not claim a market source, tool, workflow, or integration is online unless it succeeded in the current run or appears in observed tool results.
If a source was not checked, say it is available as a capability, not online.
If a source failed or was blocked, surface that plainly.`;
  }

  private handleEvent(sessionId: string, event: AgentEvent) {
    this.deps.repos.createTimeline({
      sessionId,
      type: `pi.${event.type}`,
      title: `Pi Agent event: ${event.type}`,
      status: event.type.endsWith("end") ? "completed" : "running",
      payload: compactEvent(event),
    });
    if (event.type === "message_end") {
      this.deps.sessions.append(sessionId, "pi_message", event.message);
    }
  }
}

function extractAssistantText(message: AgentMessage | undefined) {
  if (!message || message.role !== "assistant") return "";
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function compactEvent(event: AgentEvent) {
  if (event.type === "message_update") return { type: event.type };
  return event;
}
