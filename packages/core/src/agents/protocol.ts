import type { SubAgentEvent, SubAgentLifecycleEventType, SubAgentSession } from "./types.js";

export function subAgentEvent(type: SubAgentLifecycleEventType, payload: Record<string, unknown>): SubAgentEvent {
  return { type, payload, timestamp: Date.now() };
}

export function emitCreated(session: SubAgentSession) {
  return subAgentEvent("subagents:created", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    source: session.isBackground ? "background" : "foreground",
    isBackground: session.isBackground,
    status: "queued",
  });
}

export function emitStarted(session: SubAgentSession) {
  return subAgentEvent("subagents:started", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    prompt: session.prompt,
    status: session.isBackground ? "background" : "running",
  });
}

export function emitStep(session: SubAgentSession, input: { stepName: string; stepNumber: number; totalSteps: number; detail?: string }) {
  return subAgentEvent("subagents:step", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    stepName: input.stepName,
    stepNumber: input.stepNumber,
    totalSteps: input.totalSteps,
    detail: input.detail,
    status: session.isBackground ? "background" : "running",
  });
}

export function emitCompleted(session: SubAgentSession) {
  return subAgentEvent("subagents:completed", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    status: "completed",
    result: session.resultPreview ?? "Agent completed.",
    resultPreview: session.resultPreview,
    toolUses: session.toolUses,
    durationMs: session.durationMs,
    tokens: session.tokens,
  });
}

export function emitFailed(session: SubAgentSession) {
  return subAgentEvent("subagents:failed", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    status: "failed",
    error: session.error ?? "Sub-agent failed.",
    durationMs: session.durationMs,
  });
}

export function emitCancelled(session: SubAgentSession, reason = "cancelled") {
  return subAgentEvent("subagents:cancelled", {
    id: session.id,
    sessionId: session.sessionId,
    type: session.type,
    agentType: session.agentType,
    description: session.description,
    status: "stopped",
    reason,
    durationMs: session.durationMs,
  });
}
