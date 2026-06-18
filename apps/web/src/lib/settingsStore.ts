import { create } from "zustand";
import type { ThemeMode } from "@/core/types";
import type { ModelInfo } from "@/core/types";
import type { SubagentStateMap } from "@/core/subagents";

interface SettingsState {
  /* ── UI state ── */
  sidebarOpen: boolean;
  settingsOpen: boolean;

  /* ── Settings values ── */
  themeMode: ThemeMode;
  thinkingLevel: string;
  showThinking: boolean;
  autoCompaction: boolean;
  sessionName: string;
  authEnabled: boolean;
  authConfigured: boolean;

  /* ── Session ── */
  currentSessionId: string | null;

  /* ── Model (shared between ChatWorkspace and RPC router) ── */
  currentModel: ModelInfo | null;

  /* ── Subagent state (single source of truth, replaces per-component state) ── */
  subagents: SubagentStateMap;
  selectedSubagentId: string | null;

  /* ── Actions ── */
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setThinkingLevel: (level: string) => void;
  setShowThinking: (show: boolean) => void;
  setAutoCompaction: (enabled: boolean) => void;
  setSessionName: (name: string) => void;
  setAuthEnabled: (enabled: boolean) => void;
  setAuthConfigured: (configured: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setCurrentModel: (model: ModelInfo | null) => void;
  setSubagents: (s: SubagentStateMap) => void;
  setSelectedSubagentId: (id: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  /* Defaults */
  sidebarOpen: true,
  settingsOpen: false,
  themeMode: (() => {
    try { return (localStorage.getItem("pi-theme-mode") as ThemeMode | null) || "dark"; } catch { return "dark"; }
  })(),
  thinkingLevel: (typeof localStorage !== 'undefined' ? localStorage.getItem("trading-pi-thinking-level") : null) || "medium",
  showThinking: (() => {
    try { return localStorage.getItem("pi-show-thinking") !== "false"; } catch { return true; }
  })(),
  autoCompaction: (typeof localStorage !== 'undefined' ? localStorage.getItem("trading-pi-auto-compaction") : null) === "false" ? false : true,
  sessionName: (typeof localStorage !== 'undefined' ? localStorage.getItem("trading-pi-session-name") : null) || "",
  authEnabled: false,
  authConfigured: false,
  currentSessionId: null,

  /* Model */
  currentModel: null,

  /* Subagents */
  subagents: {},
  selectedSubagentId: null,

  /* Actions */
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setThemeMode: (mode) => {
    try { localStorage.setItem("pi-theme-mode", mode); } catch {}
    set({ themeMode: mode });
  },
  setThinkingLevel: (level) => {
    try { localStorage.setItem("trading-pi-thinking-level", level); } catch {}
    set({ thinkingLevel: level });
  },
  setShowThinking: (show) => {
    try { localStorage.setItem("pi-show-thinking", String(show)); } catch {}
    set({ showThinking: show });
  },
  setAutoCompaction: (enabled) => {
    try { localStorage.setItem("trading-pi-auto-compaction", String(enabled)); } catch {}
    set({ autoCompaction: enabled });
  },
  setSessionName: (name) => {
    try { localStorage.setItem("trading-pi-session-name", name); } catch {}
    set({ sessionName: name });
  },
  setAuthEnabled: (enabled) => set({ authEnabled: enabled }),
  setAuthConfigured: (configured) => set({ authConfigured: configured }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  /* Model actions */
  setCurrentModel: (model) => set({ currentModel: model }),

  /* Subagent actions */
  setSubagents: (subagents) => set({ subagents }),
  setSelectedSubagentId: (id) => set({ selectedSubagentId: id }),
}));
