import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitCancelled, emitCompleted, emitCreated, emitFailed, emitStarted, emitStep } from "./protocol.js";
import type { AgentDefinition, SpawnParams, SubAgentEvent, SubAgentManagerConfig, SubAgentSession, SubAgentStatusView } from "./types.js";
import type { WorkflowContext } from "../workflows/types.js";

const FALLBACK_DEFINITIONS: AgentDefinition[] = [
  {
    name: "deep-research",
    displayName: "Deep Research",
    description: "Foreground research sub-agent that runs the built-in Deep Research workflow.",
    systemPrompt: "Run structured deep research with search, academic, community, market, analysis, and synthesis phases.",
    tools: ["search.query", "academic.semanticscholar", "academic.crossref", "academic.openalex", "community.reddit", "market.polymarket.search", "market.coingecko.quote"],
    backgroundCapable: false,
    defaultMode: "foreground",
    icon: "microscope",
    color: "cyan",
    workflowId: "deep.research",
    steps: ["Plan research", "Search web", "Search academic sources", "Read community context", "Fetch market data", "Analyze evidence", "Synthesize report"],
  },
  {
    name: "alpha-radar",
    displayName: "Alpha Radar",
    description: "Background scanner for prediction-market and crypto opportunities.",
    systemPrompt: "Scan market, news, Reddit, macro, and crypto-calendar signals for time-sensitive opportunities.",
    tools: ["market.polymarket.markets", "search.query", "community.reddit", "events.fred", "events.coinmarketcal", "market.coingecko.quote"],
    backgroundCapable: true,
    defaultMode: "background",
    icon: "radar",
    color: "blue",
    workflowId: "alpha.radar.scan",
    steps: ["Fetch markets", "Fetch news", "Fetch community context", "Fetch events", "Score signals"],
  },
  {
    name: "review",
    displayName: "Review",
    description: "Foreground review sub-agent that produces a workspace ReviewReport.",
    systemPrompt: "Review settled decisions, journal notes, and user rules into a structured 7-section report.",
    tools: ["decisions", "journal", "user_rules"],
    backgroundCapable: false,
    defaultMode: "foreground",
    icon: "chart",
    color: "green",
    workflowId: "review.workspace",
    steps: ["Overview", "Trade analyses", "Error summary", "Suggestions", "Emotion analysis", "Rule compliance", "Historical comparison"],
  },
  {
    name: "evolution",
    displayName: "Evolution",
    description: "Background improvement sub-agent for review history and rule suggestions.",
    systemPrompt: "Aggregate review history, identify patterns, and propose human-approved rule improvements.",
    tools: ["reviews", "evolution_suggestions", "user_rules"],
    backgroundCapable: true,
    defaultMode: "background",
    icon: "dna",
    color: "purple",
    workflowId: "evolution.propose",
    steps: ["Load review history", "Find patterns", "Draft suggestions", "Prepare approval gate"],
  },
  {
    name: "paper-trade",
    displayName: "Paper Trade",
    description: "Foreground execution lifecycle sub-agent for paper trades.",
    systemPrompt: "Execute, monitor, close, and settle paper trades from confirmed DecisionCards.",
    tools: ["decision.record", "market price", "journal", "timeline"],
    backgroundCapable: false,
    defaultMode: "foreground",
    icon: "notebook",
    color: "amber",
    workflowId: "paper.trade.lifecycle",
    steps: ["Load decision", "Resolve price", "Create paper trade", "Journal execution", "Update timeline"],
  },
];

export class SubAgentManager {
  private readonly definitions = new Map<string, AgentDefinition>();
  private readonly sessions = new Map<string, SubAgentSession>();
  private readonly listeners = new Set<(event: SubAgentEvent) => void>();
  private config?: SubAgentManagerConfig;

  constructor() {
    for (const definition of FALLBACK_DEFINITIONS) this.definitions.set(definition.name, definition);
  }

  configure(config: SubAgentManagerConfig) {
    this.config = config;
    this.loadDefinitions();
  }

  loadDefinitions(directory = resolve(dirname(fileURLToPath(import.meta.url)))) {
    for (const fallback of FALLBACK_DEFINITIONS) {
      const file = resolve(directory, `${fallback.name}.md`);
      if (!existsSync(file)) {
        this.definitions.set(fallback.name, fallback);
        continue;
      }
      this.definitions.set(fallback.name, { ...fallback, ...parseDefinition(readFileSync(file, "utf8"), fallback) });
    }
    return this.listDefinitions();
  }

  listDefinitions() {
    return [...this.definitions.values()];
  }

  subscribe(listener: (event: SubAgentEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async spawn(params: SpawnParams, context?: WorkflowContext) {
    const definition = this.definitions.get(params.agent_type);
    if (!definition) throw new Error(`Unknown sub-agent type: ${params.agent_type}`);
    const isBackground = params.background ?? definition.defaultMode === "background";
    if (isBackground && !definition.backgroundCapable) throw new Error(`${definition.name} does not support background mode.`);
    const session = this.createSession(params, definition, isBackground, context);
    this.publish(session, emitCreated(session));
    const execution = this.execute(session, definition, params, context);
    if (isBackground) {
      execution.catch(() => undefined);
      return this.toolResult(session, "background");
    }
    await execution;
    if (session.status === "failed") throw new Error(session.error ?? "Sub-agent failed.");
    return this.toolResult(session, session.status === "cancelled" ? "stopped" : "completed");
  }

  stop(agentId: string, reason = "User requested stop") {
    const session = this.sessions.get(agentId);
    if (!session) return undefined;
    if (session.status === "completed" || session.status === "failed" || session.status === "cancelled") return this.status(agentId);
    session.status = "cancelled";
    session.completedAt = Date.now();
    session.durationMs = session.startedAt ? session.completedAt - session.startedAt : 0;
    this.publish(session, emitCancelled(session, reason));
    return this.status(agentId);
  }

  listActive() {
    return [...this.sessions.values()].map((session) => this.toStatus(session));
  }

  status(agentId: string) {
    const session = this.sessions.get(agentId);
    return session ? this.toStatus(session) : undefined;
  }

  private createSession(params: SpawnParams, definition: AgentDefinition, isBackground: boolean, context?: WorkflowContext): SubAgentSession {
    const id = `sag_${randomUUID()}`;
    const session: SubAgentSession = {
      id,
      agentType: definition.name,
      type: definition.displayName,
      description: params.prompt || definition.description,
      prompt: params.prompt,
      status: "queued",
      isBackground,
      workspaceId: params.workspace_id,
      decisionId: params.decision_id,
      sessionId: context?.sessionId,
      workflowId: definition.workflowId,
      toolUses: 0,
      events: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  private async execute(session: SubAgentSession, definition: AgentDefinition, params: SpawnParams, context?: WorkflowContext) {
    session.status = session.isBackground ? "background" : "running";
    session.startedAt = Date.now();
    this.publish(session, emitStarted(session));
    try {
      this.publish(session, emitStep(session, { stepName: definition.steps[0] ?? "Start", stepNumber: 1, totalSteps: definition.steps.length || 1, detail: params.prompt }));
      const workflowContext = context ?? this.config?.createContext?.(params);
      if (!workflowContext || !this.config) throw new Error("SubAgentManager is not configured with a workflow runner.");
      const workflowInput = this.workflowInput(definition, params);
      const result = await this.config.runWorkflow(definition.workflowId, workflowInput, workflowContext);
      session.runId = result.runId;
      session.result = result.output;
      session.toolUses = this.estimateToolUses(result.output);
      for (let index = 1; index < definition.steps.length; index += 1) {
        this.publish(session, emitStep(session, { stepName: definition.steps[index]!, stepNumber: index + 1, totalSteps: definition.steps.length }));
      }
      await waitForCancellableHold(session, params.min_runtime_ms);
      if (isCancelled(session)) return;
      session.status = "completed";
      session.completedAt = Date.now();
      session.durationMs = session.completedAt - (session.startedAt ?? session.completedAt);
      session.resultPreview = previewResult(result.output);
      this.publish(session, emitCompleted(session));
    } catch (error) {
      if (isCancelled(session)) return;
      session.status = "failed";
      session.error = error instanceof Error ? error.message : String(error);
      session.completedAt = Date.now();
      session.durationMs = session.completedAt - (session.startedAt ?? session.completedAt);
      this.publish(session, emitFailed(session));
    }
  }

  private workflowInput(definition: AgentDefinition, params: SpawnParams) {
    if (definition.name === "deep-research") return { topic: params.prompt, workspaceId: params.workspace_id };
    if (definition.name === "alpha-radar") return { category: params.prompt || undefined };
    if (definition.name === "review") {
      if (!params.workspace_id) throw new Error("review sub-agent requires workspace_id.");
      return { workspaceId: params.workspace_id, period: params.prompt || "workspace" };
    }
    if (definition.name === "evolution") return { focus: params.prompt || "review history and rule suggestions", workspaceId: params.workspace_id };
    if (definition.name === "paper-trade") {
      if (!params.decision_id) throw new Error("paper-trade sub-agent requires decision_id.");
      return { action: "execute", decisionId: params.decision_id, workspaceId: params.workspace_id };
    }
    return { prompt: params.prompt, workspaceId: params.workspace_id, decisionId: params.decision_id };
  }

  private publish(session: SubAgentSession, event: SubAgentEvent) {
    session.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  private toStatus(session: SubAgentSession): SubAgentStatusView {
    const { events, ...rest } = session;
    return { ...rest, recentEvents: events.slice(-25) };
  }

  private toolResult(session: SubAgentSession, status: "background" | "completed" | "stopped") {
    return {
      agentId: session.id,
      subagentType: session.agentType,
      description: session.description,
      status,
      result: session.resultPreview,
      toolUses: session.toolUses,
      durationMs: session.durationMs,
    };
  }

  private estimateToolUses(output: unknown) {
    const text = JSON.stringify(output ?? {});
    const matches = text.match(/"toolName"|"tool"|"skill"/g);
    return matches?.length ?? 1;
  }
}

let defaultManager: SubAgentManager | undefined;

export function getDefaultSubAgentManager() {
  defaultManager ??= new SubAgentManager();
  return defaultManager;
}

function parseDefinition(markdown: string, fallback: AgentDefinition): Partial<AgentDefinition> {
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!frontmatter) return {};
  const parsed: Record<string, unknown> = {};
  for (const line of frontmatter.split("\n")) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    const raw = match[2]!.trim();
    if (raw.startsWith("[") && raw.endsWith("]")) {
      parsed[key] = raw
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (raw === "true" || raw === "false") {
      parsed[key] = raw === "true";
    } else {
      parsed[key] = raw.replace(/^["']|["']$/g, "");
    }
  }
  return {
    name: stringValue(parsed.name, fallback.name),
    displayName: stringValue(parsed.display_name, fallback.displayName),
    description: stringValue(parsed.description, fallback.description),
    systemPrompt: stringValue(parsed.system_prompt, fallback.systemPrompt),
    tools: Array.isArray(parsed.tools) ? (parsed.tools as string[]) : fallback.tools,
    model: stringValue(parsed.model, fallback.model),
    thinkingLevel: stringValue(parsed.thinking_level, fallback.thinkingLevel),
    maxTurns: numberValue(parsed.max_turns, fallback.maxTurns),
    backgroundCapable: booleanValue(parsed.background_capable, fallback.backgroundCapable),
    defaultMode: stringValue(parsed.default_mode, fallback.defaultMode) === "background" ? "background" : "foreground",
    icon: stringValue(parsed.icon, fallback.icon),
    color: stringValue(parsed.color, fallback.color),
  };
}

function previewResult(output: unknown) {
  if (typeof output === "string") return output.slice(0, 1200);
  const text = JSON.stringify(output, null, 2);
  return text.length > 1200 ? `${text.slice(0, 1197)}...` : text;
}

function stringValue(value: unknown, fallback?: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback?: number) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isCancelled(session: SubAgentSession) {
  return session.status === "cancelled";
}

async function waitForCancellableHold(session: SubAgentSession, minRuntimeMs?: number) {
  const runtime = Number(minRuntimeMs ?? 0);
  if (!session.isBackground || !Number.isFinite(runtime) || runtime <= 0 || !session.startedAt) return;
  const remaining = Math.min(runtime, 120_000) - (Date.now() - session.startedAt);
  if (remaining <= 0) return;
  const deadline = Date.now() + remaining;
  while (!isCancelled(session) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
  }
}
