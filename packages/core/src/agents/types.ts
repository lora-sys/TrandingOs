import type { WorkflowContext } from "../workflows/types.js";

export type SubAgentLifecycleEventType =
  | "subagents:created"
  | "subagents:started"
  | "subagents:step"
  | "subagents:completed"
  | "subagents:failed"
  | "subagents:cancelled";

export type SubAgentStatus = "queued" | "running" | "background" | "completed" | "failed" | "cancelled";

export interface AgentDefinition {
  name: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  model?: string;
  thinkingLevel?: string;
  maxTurns?: number;
  backgroundCapable: boolean;
  defaultMode: "foreground" | "background";
  icon: string;
  color: string;
  workflowId: string;
  steps: string[];
}

export interface SpawnParams {
  agent_type: string;
  prompt: string;
  background?: boolean;
  workspace_id?: string;
  decision_id?: string;
  min_runtime_ms?: number;
}

export interface SubAgentEvent {
  type: SubAgentLifecycleEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface SubAgentSession {
  id: string;
  agentType: string;
  type: string;
  description: string;
  prompt: string;
  status: SubAgentStatus;
  isBackground: boolean;
  workspaceId?: string;
  decisionId?: string;
  sessionId?: string;
  workflowId: string;
  runId?: string;
  result?: unknown;
  resultPreview?: string;
  error?: string;
  toolUses: number;
  tokens?: { input?: number; output?: number; total?: number };
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  events: SubAgentEvent[];
}

export interface SubAgentStatusView extends Omit<SubAgentSession, "events"> {
  recentEvents: SubAgentEvent[];
}

export interface SubAgentManagerConfig {
  runWorkflow: (workflowId: string, input: unknown, context: WorkflowContext) => Promise<{ runId: string; output: unknown }>;
  createContext?: (params: SpawnParams) => WorkflowContext;
}
