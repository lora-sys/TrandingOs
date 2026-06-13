import { create } from "zustand";
import type { ThemeMode } from "@/core/types";

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
}

export const useSettingsStore = create<SettingsState>((set) => ({
  /* Defaults */
  sidebarOpen: true,
  settingsOpen: false,
  themeMode: (() => {
    try { return (localStorage.getItem("pi-theme-mode") as ThemeMode | null) || "dark"; } catch { return "dark"; }
  })(),
  thinkingLevel: "off",
  showThinking: (() => {
    try { return localStorage.getItem("pi-show-thinking") !== "false"; } catch { return true; }
  })(),
  autoCompaction: true,
  sessionName: "Trading Pi",
  authEnabled: false,
  authConfigured: false,

  /* Actions */
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setThemeMode: (mode) => {
    try { localStorage.setItem("pi-theme-mode", mode); } catch {}
    set({ themeMode: mode });
  },
  setThinkingLevel: (level) => set({ thinkingLevel: level }),
  setShowThinking: (show) => {
    try { localStorage.setItem("pi-show-thinking", String(show)); } catch {}
    set({ showThinking: show });
  },
  setAutoCompaction: (enabled) => set({ autoCompaction: enabled }),
  setSessionName: (name) => set({ sessionName: name }),
  setAuthEnabled: (enabled) => set({ authEnabled: enabled }),
  setAuthConfigured: (configured) => set({ authConfigured: configured }),
}));
