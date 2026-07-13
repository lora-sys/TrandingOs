import { create } from "zustand";

/**
 * SubAgentStatusView — frontend-facing representation of a sub-agent session.
 * Mirrors the payload shape emitted by core/agents/protocol.ts SSE events.
 */
export interface SubAgentStatusView {
  id: string;
  agentType: string;
  description: string;
  status: string;
  workflowId?: string;
  stepName?: string;
  stepNumber?: number;
  totalSteps?: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  isBackground: boolean;
  result?: unknown;
  error?: string;
  recentEvents?: Array<{ type: string; payload: unknown; timestamp: number }>;
}

interface SubagentsState {
  byId: Record<string, SubAgentStatusView>;
  activeIds: string[];
  upsert: (s: SubAgentStatusView) => void;
  remove: (id: string) => void;
  setAll: (list: SubAgentStatusView[]) => void;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "stopped", "error", "aborted"]);

export const useSubagentsStore = create<SubagentsState>((set) => ({
  byId: {},
  activeIds: [],
  upsert: (s) =>
    set((state) => ({
      byId: { ...state.byId, [s.id]: s },
      activeIds: TERMINAL_STATUSES.has(s.status)
        ? state.activeIds.filter((id) => id !== s.id)
        : state.activeIds.includes(s.id)
          ? state.activeIds
          : [...state.activeIds, s.id],
    })),
  remove: (id) =>
    set((state) => {
      const rest = { ...state.byId };
      delete rest[id];
      return { byId: rest, activeIds: state.activeIds.filter((x) => x !== id) };
    }),
  setAll: (list) =>
    set(() => ({
      byId: Object.fromEntries(list.map((s) => [s.id, s])),
      activeIds: list.filter((s) => !TERMINAL_STATUSES.has(s.status)).map((s) => s.id),
    })),
}));