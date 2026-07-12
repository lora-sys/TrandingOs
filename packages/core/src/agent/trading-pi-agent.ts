import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Agent,
  type AgentEvent,
  type AgentMessage,
  DEFAULT_COMPACTION_SETTINGS,
  estimateContextTokens,
  generateSummary,
  shouldCompact,
} from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { createTradingPiModel } from "../ai/model.js";
import type { TradingPiEnv } from "../config/env.js";
import type { Repositories } from "../db/repositories.js";
import type { ApprovalEngine } from "../approvals/approval-engine.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { SessionStore } from "../sessions/session-store.js";
import type { SkillRegistry } from "../skills/registry.js";
import type { ArtifactEngine } from "../artifacts/artifact-engine.js";
import type { WorkflowEngine } from "../workflows/workflow-engine.js";

/** Runtime config overrides (from /api/config) */
export interface PromptOptions {
  /** Thinking level: off | minimal | low | medium | high | xhigh */
  thinkingLevel?: string;
  /** Model identifier override */
  modelId?: string;
  /** Enable/disable auto-compaction (default: true) */
  autoCompaction?: boolean;
}

const THINKING_TOKEN_BUDGETS: Record<string, number> = {
  off: 0,
  minimal: 1024,
  low: 4096,
  medium: 8192,
  high: 16384,
  xhigh: 32768,
};

export class TradingPiAgent {
  private _compactionSummary: string | undefined;
  private _systemPromptContent: string = "";
  private _systemPromptVersion: string = "fallback";
  private static readonly FALLBACK_SYSTEM_PROMPT = `You are Trading Pi Agent, the only core agent in a local-first personal trading OS.
Use available tools, workflows, and workflow-backed sub-agents for market, research, review, paper-trade, and approval work.
Trading Pi Agent remains the only user-facing main agent; sub-agents are execution/progress wrappers around known workflows, not independent autonomous agents.
Never place or prepare real orders without approval.
Make important results traceable and artifact-ready.
Do not claim a market source, tool, workflow, or integration is online unless it succeeded in the current run or appears in observed tool results.
If a source was not checked, say it is available as a capability, not online.
If a source failed or was blocked, surface that plainly.`;

  constructor(
    private readonly deps: {
      env: TradingPiEnv;
      repos: Repositories;
      sessions: SessionStore;
      memory: MemoryStore;
      skills: SkillRegistry;
      workflows: WorkflowEngine;
      artifacts: ArtifactEngine;
      approvals: ApprovalEngine;
    },
  ) {
    this.loadSystemPrompt();
  }

  private loadSystemPrompt() {
    const here = dirname(fileURLToPath(import.meta.url));
    const file = resolve(here, "system-prompt.md");
    if (!existsSync(file)) {
      console.warn(`[trading-pi-agent] system-prompt.md not found; using fallback`);
      this._systemPromptContent = TradingPiAgent.FALLBACK_SYSTEM_PROMPT;
      return;
    }
    const raw = readFileSync(file, "utf8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      const content = fmMatch[2] ?? "";
      const v = fmMatch[1]?.match(/version:\s*([^\s\n]+)/);
      if (v?.[1]) this._systemPromptVersion = v[1];
      this._systemPromptContent = content.trim();
    } else {
      this._systemPromptContent = raw.trim();
      this._systemPromptVersion = "0.1.0";
    }
  }

  async prompt(
    input: { message: string; sessionId?: string; parentSessionId?: string; name?: string },
    onStreamEvent?: (event: AgentEvent) => void,
    options?: PromptOptions,
  ) {
    const session = input.parentSessionId
      ? this.deps.sessions.createFork(input.parentSessionId)
      : this.deps.sessions.ensureSession(input.sessionId, input.name);
    const userEntry = this.deps.sessions.append(session.id, "message", { role: "user", content: input.message });
    const baseContext = {
      env: this.deps.env,
      repos: this.deps.repos,
      artifacts: this.deps.artifacts,
      approvals: this.deps.approvals,
      memory: this.deps.memory,
      skills: this.deps.skills,
      workflows: this.deps.workflows,
      sessionId: session.id,
    };
    const routed = await this.routeSlashCommand(input.message, session.id, baseContext);
    if (routed) {
      return routed;
    }
    const agentSystemPrompt = this._systemPromptContent;
    const agentTools = this.deps.skills.toPiTools(baseContext);
    // Resolve model: runtime override > env default
    const effectiveModelId = options?.modelId || this.deps.env.openaiModel;
    const effectiveEnv = effectiveModelId
      ? { ...this.deps.env, openaiModel: effectiveModelId }
      : this.deps.env;
    // Resolve thinking budget from level string
    const thinkingLevel = options?.thinkingLevel || this.deps.env.thinkingLevel;
    const thinkingTokens = THINKING_TOKEN_BUDGETS[thinkingLevel] ?? THINKING_TOKEN_BUDGETS.medium;
    const agent = new Agent({
      sessionId: session.id,
      toolExecution: "sequential",
      initialState: {
        systemPrompt: agentSystemPrompt,
        model: createTradingPiModel(effectiveEnv),
        tools: agentTools,
      },
      thinkingBudgets: {
        low: THINKING_TOKEN_BUDGETS.low,
        medium: thinkingTokens,
        high: THINKING_TOKEN_BUDGETS.high,
      },
      getApiKey: () => this.deps.env.openaiApiKey,
      transformContext: async (messages) => {
        const contextMessages: AgentMessage[] = [];
        if (this._compactionSummary) {
          contextMessages.push({
            role: "user",
            content: `--- Previous conversation summary ---\n${this._compactionSummary}`,
            timestamp: Date.now(),
          });
          this._compactionSummary = undefined;
        }
        contextMessages.push({
          role: "user",
          content: `Local memory snapshot:\n${this.deps.memory.contextBlock("user")}`,
          timestamp: Date.now(),
        });
        return [...contextMessages, ...messages];
      },
      prepareNextTurn: async () => {
        const memoryContext = this.deps.memory.contextBlock("user");
        return {
          context: {
            systemPrompt: agentSystemPrompt,
            messages: [
              {
                role: "user",
                content: `--- Context refresh ---\nSession: ${session.id}\nMemory:\n${memoryContext}`,
                timestamp: Date.now(),
              },
            ],
          },
          model: createTradingPiModel(effectiveEnv),
        };
      },
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
    agent.state.messages = sessionEntriesToAgentMessages(
      this.deps.sessions.read(session.id).filter((entry) => entry.id !== userEntry.id),
    );
    agent.subscribe((event: AgentEvent) => {
      this.handleEvent(session.id, event);
      onStreamEvent?.(event);
    });
    await agent.prompt(input.message);

    // Auto-compaction: check if context needs compaction and generate summary
    const autoCompaction = options?.autoCompaction !== false; // default: enabled
    const messageCount = agent.state.messages.length;
    if (autoCompaction && messageCount > 50) {
      try {
        const usage = estimateContextTokens(agent.state.messages);
        if (shouldCompact(usage.tokens, 128_000, DEFAULT_COMPACTION_SETTINGS)) {
          this.deps.repos.createTimeline({
            sessionId: session.id,
            type: "agent.compaction.check",
            title: `Auto-compaction triggered (${messageCount} messages, ~${usage.tokens} tokens)`,
            status: "running",
            payload: { messageCount, tokens: usage.tokens },
          });
          const summaryResult = await generateSummary(
            agent.state.messages,
            agent.state.model,
            DEFAULT_COMPACTION_SETTINGS.reserveTokens,
            this.deps.env.openaiApiKey ?? "",
          );
          if (summaryResult.ok) {
            this._compactionSummary = summaryResult.value;
            this.deps.repos.createTimeline({
              sessionId: session.id,
              type: "agent.compaction.complete",
              title: "Auto-compaction completed",
              status: "completed",
              payload: { summaryLength: summaryResult.value.length },
            });
          }
        }
      } catch {
        // Compaction is best-effort; do not fail the prompt
      }
    }

    const messages = agent.state.messages;
    this.deps.sessions.append(session.id, "agent_state", { messageCount: messages.length });
    const last = messages.at(-1);
    return {
      sessionId: session.id,
      messages,
      text: extractAssistantText(last),
    };
  }

  private async routeSlashCommand(
    message: string,
    sessionId: string,
    context: {
      env: TradingPiEnv;
      repos: Repositories;
      artifacts: ArtifactEngine;
      approvals: ApprovalEngine;
      memory: MemoryStore;
      skills: SkillRegistry;
      sessionId: string;
    },
  ) {
    const route = parseSlashCommand(message);
    if (!route) return undefined;
    this.deps.repos.createTimeline({
      sessionId,
      type: "agent.intent",
      title: `Trading Pi Agent routed ${route.workflowId}`,
      status: "completed",
      payload: { message, workflowId: route.workflowId, input: route.input },
    });
    const workflowResult = await this.deps.workflows.run(route.workflowId, route.input, context);
    const text = summarizeWorkflow(route.workflowId, workflowResult.output);
    const assistantMessage: AgentMessage = fauxAssistantMessage(text, { timestamp: Date.now() });
    this.deps.sessions.append(sessionId, "pi_message", assistantMessage);
    this.deps.sessions.append(sessionId, "workflow_result", {
      workflowId: route.workflowId,
      runId: workflowResult.runId,
      output: workflowResult.output,
    });
    return {
      sessionId,
      messages: [assistantMessage],
      text,
      workflowResult: { sessionId, ...workflowResult },
    };
  }

  private handleEvent(sessionId: string, event: AgentEvent) {
    this.deps.repos.createTimeline({
      sessionId,
      type: `pi.${event.type}`,
      title: `Pi Agent event: ${event.type}`,
      status: event.type.endsWith("end") ? "completed" : "running",
      payload: compactEvent(event),
    });
    if (event.type === "message_end" && event.message.role === "assistant") {
      this.deps.sessions.append(sessionId, "pi_message", event.message);
    }
  }
}

function sessionEntriesToAgentMessages(entries: Array<{ type: string; data?: unknown }>): AgentMessage[] {
  return entries
    .map((entry) => {
      const data = entry.data as any;
      if (!data || typeof data !== "object") return undefined;
      if (entry.type === "message" && typeof data.content === "string") {
        return { role: data.role ?? "user", content: data.content, timestamp: Date.now() } as AgentMessage;
      }
      if (entry.type === "pi_message") {
        if (data.role !== "assistant" || !Array.isArray(data.content) || data.content.length === 0) {
          return undefined;
        }
        return {
          ...data,
          role: "assistant",
          timestamp: data.timestamp ?? Date.now(),
        } as AgentMessage;
      }
      return undefined;
    })
    .filter((message): message is AgentMessage => Boolean(message));
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

function parseSlashCommand(message: string): { workflowId: string; input: unknown } | undefined {
  const trimmed = message.trim();
  const research = trimmed.match(/^\/research\s+(.+)$/i);
  if (research) return { workflowId: "research.asset", input: { symbol: research[1]?.trim() ?? "ETH" } };
  const plan = trimmed.match(/^\/plan\s+(\S+)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\S+))?/i);
  if (plan) {
    return {
      workflowId: "trade.plan",
      input: { symbol: plan[1] ?? "ETH/USDT", budgetUsd: Number(plan[2] ?? 100), direction: plan[3] ?? "spot" },
    };
  }
  if (/^\/review-day/i.test(trimmed)) return { workflowId: "review.daily", input: { period: "daily" } };
  const backtest = trimmed.match(/^\/backtest\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?/i);
  if (backtest) {
    return {
      workflowId: "strategy.backtest",
      input: { name: backtest[1] ?? "manual_strategy", symbol: backtest[2] ?? "ETH/USDT", timeframe: backtest[3] ?? "1h" },
    };
  }
  const browser = trimmed.match(/^\/browser\s+(search|open|extract|screenshot|pdf)(?:\s+(.+))?$/i);
  if (browser) {
    const actionName = browser[1]?.toLowerCase() ?? "open";
    const value = browser[2]?.trim() ?? "";
    return {
      workflowId: "browser.evidence",
      input: actionName === "search" ? { action: "browser.search", query: value } : { action: `browser.${actionName}`, url: value },
    };
  }
  const evolve = trimmed.match(/^\/evolve(?:\s+(.+))?$/i);
  if (evolve) return { workflowId: "evolution.propose", input: { focus: evolve[1]?.trim() || "daily review and strategy discipline" } };
  const bootstrap = trimmed.match(/^\/bootstrap-os$/i);
  if (bootstrap) return { workflowId: "os.bootstrap", input: {} };
  return undefined;
}

function summarizeWorkflow(workflowId: string, output: unknown) {
  const text = JSON.stringify(output);
  if (workflowId === "research.asset") return "Research workflow completed through Trading Pi Agent. A Research Report artifact was generated.";
  if (workflowId === "trade.plan") return "Trade plan workflow completed through Trading Pi Agent. Trade Plan and Risk Report artifacts were generated.";
  if (workflowId === "review.daily") return "Daily review workflow completed through Trading Pi Agent. A Review artifact was generated.";
  if (workflowId === "strategy.backtest") return "Strategy backtest workflow completed through Trading Pi Agent. A Backtest Report artifact was generated.";
  if (workflowId === "browser.evidence") return "Browser evidence workflow completed through Trading Pi Agent. Browser Artifact evidence was generated or marked unavailable.";
  if (workflowId === "evolution.propose") return "Evolution proposal workflow completed through Trading Pi Agent. A guarded proposal artifact and approval gate were created.";
  if (workflowId === "os.bootstrap") return "Trading Pi OS bootstrap completed. Workspace, MCP, Marketplace, and bootstrap artifact records were created.";
  if (text.includes("approvalId")) return "Workflow is waiting for explicit approval.";
  return "Workflow completed through Trading Pi Agent.";
}
