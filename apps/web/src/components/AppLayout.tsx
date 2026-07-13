import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboardIcon,
  BriefcaseIcon,
  TrendingUpIcon,
  BookOpenIcon,
  ClockIcon,
  PanelLeftCloseIcon,
  HistoryIcon,
  Trash2Icon,
  PlusIcon,
  SettingsIcon,
  BrainCircuitIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/pi-web-ui/app-sidebar";
import { SettingsPanel } from "@/components/pi-web-ui/settings-panel";
import { SubagentDetailSidebar } from "@/components/pi-web-ui/subagent-detail-sidebar";
import { WorkspaceStatusFloat } from "@/components/pi-web-ui/workspace-status-float";
import { useSettingsStore } from "@/lib/settingsStore";
import { useResolvedTheme } from "@/lib/useResolvedTheme";
import { useSubagentsStore, type SubAgentStatusView } from "@/lib/subagentsStore";
import { tradingPiApi } from "@/api/client";
import type { SubagentStatus, SubagentViewState } from "@/core/types";

/* ── Navigation items ── */
export const navItems = [
  { label: "Dashboard", icon: LayoutDashboardIcon, to: "/" as const },
  { label: "Markets", icon: TrendingUpIcon, to: "/markets" as const },
  { label: "Workspace", icon: BriefcaseIcon, to: "/workspace" as const },
  { label: "Journal", icon: BookOpenIcon, to: "/journal" as const },
  { label: "Timeline", icon: ClockIcon, to: "/timeline" as const },
  { label: "Settings", icon: SettingsIcon, to: "/settings" as const },
  { label: "Evolution", icon: BrainCircuitIcon, to: "/evolution" as const },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const setSidebarOpen = useSettingsStore((s) => s.setSidebarOpen);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const [selectedSubagentId, setSelectedSubagentId] = useState<string | null>(null);

  /* Fetch sessions from backend */
  const queryClient = useQueryClient();
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => tradingPiApi.sessions().catch(() => []),
    refetchInterval: 15000,
  });
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];
  const { data: workspacesData } = useQuery({
    queryKey: ["layout-workspaces"],
    queryFn: () => tradingPiApi.workspaces().catch(() => []),
    refetchInterval: 15000,
  });
  const recentWorkspaces = Array.isArray(workspacesData) ? workspacesData.slice(0, 5) : [];

  // Live subagent state via SSE-backed store (replaces 2s polling)
  const subagentsById = useSubagentsStore((s) => s.byId);
  const activeSubagentIds = useSubagentsStore((s) => s.activeIds);
  const setAllSubagents = useSubagentsStore((s) => s.setAll);

  // Initial hydration from /api/sub-agents on mount only (no polling)
  const { data: subAgentData } = useQuery({
    queryKey: ["sub-agents"],
    queryFn: () => tradingPiApi.subAgents().catch(() => ({ agents: [] })),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Convert backend agents into SubAgentStatusView and seed the store once
  useEffect(() => {
    const agents = (subAgentData as { agents?: unknown[] } | undefined)?.agents;
    if (!Array.isArray(agents)) return;
    const views: SubAgentStatusView[] = agents.map((row) => {
      const agent = row as Record<string, unknown>;
      return {
        id: String(agent.id ?? ""),
        agentType: typeof agent.agentType === "string" ? agent.agentType : "",
        description: typeof agent.description === "string" ? agent.description : "",
        status: typeof agent.status === "string" ? agent.status : "running",
        workflowId: typeof agent.workflowId === "string" ? agent.workflowId : undefined,
        stepName: typeof agent.stepName === "string" ? agent.stepName : undefined,
        stepNumber: typeof agent.stepNumber === "number" ? agent.stepNumber : undefined,
        totalSteps: typeof agent.totalSteps === "number" ? agent.totalSteps : undefined,
        startedAt: typeof agent.startedAt === "number" ? agent.startedAt : undefined,
        completedAt: typeof agent.completedAt === "number" ? agent.completedAt : undefined,
        durationMs: typeof agent.durationMs === "number" ? agent.durationMs : undefined,
        isBackground: Boolean(agent.isBackground),
        result: agent.result,
        error: typeof agent.error === "string" ? agent.error : undefined,
      };
    }).filter((v) => v.id);
    if (views.length > 0) setAllSubagents(views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAgentData]);

  // Merge SSE-driven views with backend hydration into a flat sorted list
  const subagentViews = useMemo(() => {
    return Object.values(subagentsById).sort((a, b) => {
      const aActive = activeSubagentIds.includes(a.id) ? 0 : 1;
      const bActive = activeSubagentIds.includes(b.id) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (b.startedAt ?? 0) - (a.startedAt ?? 0);
    });
  }, [subagentsById, activeSubagentIds]);

  // Normalize for the existing WorkspaceStatusFloat / SubagentDetailSidebar contract
  const subagents = useMemo(
    () => subagentViews.map((view) => normalizeSubagentView(view)),
    [subagentViews],
  );

  const selectedSubagent = selectedSubagentId ? subagents.find((agent) => agent.id === selectedSubagentId) : undefined;
  const stopSubagent = useMutation({
    mutationFn: (agent: SubagentViewState) => tradingPiApi.stopSubAgent(agent.id, "Stopped from WorkspaceStatusFloat"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-agents"] });
    },
  });

  /* Health check for connection status */
  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: () => tradingPiApi.health().catch(() => null),
    refetchInterval: 10000,
  });
  const isOnline = !!healthData;

  const handleDeleteSession = async (e: MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await tradingPiApi.deleteSession(sessionId);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch {
      alert("Failed to delete session.");
    }
  };

  /* Settings values from store */
  const themeMode = useSettingsStore((s) => s.themeMode);
  const thinkingLevel = useSettingsStore((s) => s.thinkingLevel);
  const showThinking = useSettingsStore((s) => s.showThinking);
  const autoCompaction = useSettingsStore((s) => s.autoCompaction);
  const sessionName = useSettingsStore((s) => s.sessionName);
  const authEnabled = useSettingsStore((s) => s.authEnabled);
  const authConfigured = useSettingsStore((s) => s.authConfigured);

  /* Apply theme class on body */
  const resolvedTheme = useResolvedTheme(themeMode);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 bg-background text-foreground font-[family-name:var(--font-mono)]",
        resolvedTheme === "dark" && "dark",
      )}
      style={{ colorScheme: resolvedTheme }}
      >
        {/* Collapsible Sidebar (pi-web-ui component) */}
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar open={sidebarOpen} onToggle={setSidebarOpen} onOpenSettings={useSettingsStore.getState().openSettings}>
        {/* ── Expanded content ── */}
        <div className="flex flex-col gap-0.5 border-b px-3 py-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-500" />
            </span>
            Trading Pi
          </div>
          <div className="text-muted-foreground text-xs">AI Terminal</div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              const IconComp = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400 font-medium border-l-2 border-cyan-400 -ml-[1px]"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                    to={item.to}
                  >
                    <IconComp className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                  {item.to === "/workspace" && recentWorkspaces.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-6">
                      {recentWorkspaces.map((workspace: any) => (
                        <li key={workspace.id}>
                          <Link
                            className="block truncate rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            params={{ workspaceId: workspace.id }}
                            to="/workspace/$workspaceId"
                          >
                            {workspace.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sessions List */}
        {sessions.length > 0 && (
          <div className="border-t mt-2 p-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground text-xs font-medium">
              <HistoryIcon className="size-3.5" />
              <span>Session history</span>
              <button
                onClick={() => {
                  useSettingsStore.getState().setCurrentSessionId(null);
                  useSettingsStore.getState().setSessionName("");
                }}
                className="flex size-5 items-center justify-center rounded border border-white/10 text-muted-foreground transition-colors hover:border-cyan-500/40 hover:text-cyan-400"
                title="New Session"
              >
                <PlusIcon className="size-3" />
              </button>
              <span className="ml-auto text-[10px]">{sessions.length}</span>
            </div>
            <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {sessions.slice(0, 10).map((s: any, idx: number) => (
                <motion.li
                  key={s.id ?? s.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <Link
                    key={s.id}
                    to="/workspace"
                    onClick={() => useSettingsStore.getState().setCurrentSessionId(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs truncate transition-colors group",
                      "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <BriefcaseIcon className="size-3 shrink-0" />
                    <span className="truncate flex-1 min-w-0">{s.name ?? s.id ?? "Untitled"}</span>
                    <button
                      className="shrink-0 size-4 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      title="Delete session"
                      type="button"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-md px-2 py-1.5 text-muted-foreground text-xs">
                v0.1.0
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className={`size-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <button
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              type="button"
            >
              <PanelLeftCloseIcon className="size-4" />
            </button>
          </div>
        </div>
        </AppSidebar>
      </div>

      {/* Main Content Area */}
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-0 flex-1 overflow-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        {children}
      </motion.main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-white/[0.08] bg-card/90 px-1 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          const IconComp = item.icon;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] transition-colors",
                isActive ? "text-cyan-400" : "text-muted-foreground hover:text-foreground",
              )}
              key={item.to}
              to={item.to}
            >
              <IconComp className="size-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {subagents.length > 0 && !selectedSubagent && (
        <WorkspaceStatusFloat onOpenSubagent={setSelectedSubagentId} subagents={subagents} />
      )}

      {selectedSubagent && (
        <SubagentDetailSidebar
          agent={selectedSubagent}
          onClose={() => setSelectedSubagentId(null)}
          onStop={(agent) => stopSubagent.mutate(agent)}
          stopBusy={stopSubagent.isPending && stopSubagent.variables?.id === selectedSubagent.id}
        />
      )}

      {/* Global Settings Modal */}
      {settingsOpen && (
        <SettingsPanel
          authConfigured={authConfigured}
          authEnabled={authEnabled}
          autoCompaction={autoCompaction}
          onClose={closeSettings}
          onRenameSession={(name) => useSettingsStore.getState().setSessionName(name)}
          onSetAutoCompaction={async (enabled) => {
            useSettingsStore.getState().setAutoCompaction(enabled);
            try { await tradingPiApi.setConfig({ autoCompaction: enabled }); } catch { /* non-critical */ }
          }}
          onSetTheme={(mode) => useSettingsStore.getState().setThemeMode(mode)}
          onSetThinking={async (level) => {
            useSettingsStore.getState().setThinkingLevel(level);
            try { await tradingPiApi.setConfig({ thinkingLevel: level }); } catch { /* non-critical */ }
          }}
          onToggleAuth={() => useSettingsStore.getState().setAuthEnabled(!authEnabled)}
          sessionName={sessionName}
          showThinking={showThinking}
          setShowThinking={(show) => useSettingsStore.getState().setShowThinking(show)}
          themeMode={themeMode}
          thinkingLevel={thinkingLevel}
        />
      )}
    </div>
  );
}

function normalizeSubagentView(view: SubAgentStatusView): SubagentViewState {
  const status = normalizeSubagentStatus(view.status);
  const source: SubagentViewState["source"] = view.isBackground ? "background" : "foreground";
  const resultPreview = typeof view.result === "string" ? view.result : undefined;
  return {
    id: view.id,
    type: view.agentType || undefined,
    description: view.description || undefined,
    status,
    finalResponse: typeof view.result === "string" && status === "completed" ? view.result : undefined,
    resultPreview,
    error: view.error,
    toolUses: undefined,
    durationMs: view.durationMs,
    isBackground: view.isBackground,
    source,
    recentEvents: view.recentEvents ?? [],
    updatedAt: view.completedAt ?? view.startedAt ?? Date.now(),
  };
}

function normalizeSubagents(input: unknown): SubagentViewState[] {
  const rows = Array.isArray(input) ? input : [];
  return rows.map((row) => {
    const agent = row as Record<string, any>;
    const status = normalizeSubagentStatus(agent.status);
    const source: SubagentViewState["source"] = agent.isBackground ? "background" : "foreground";
    return {
      id: String(agent.id),
      type: agent.type ?? agent.agentType,
      description: agent.description ?? agent.prompt,
      status,
      finalResponse: typeof agent.resultPreview === "string" && status === "completed" ? agent.resultPreview : undefined,
      resultPreview: typeof agent.resultPreview === "string" ? agent.resultPreview : undefined,
      error: typeof agent.error === "string" ? agent.error : undefined,
      toolUses: numberValue(agent.toolUses),
      durationMs: numberValue(agent.durationMs),
      isBackground: Boolean(agent.isBackground),
      source,
      recentEvents: Array.isArray(agent.recentEvents) ? agent.recentEvents : [],
      updatedAt: numberValue(agent.completedAt) || numberValue(agent.startedAt) || Date.now(),
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeSubagentStatus(value: unknown): SubagentStatus {
  if (value === "failed") return "error";
  if (value === "cancelled") return "stopped";
  if (
    value === "queued" ||
    value === "running" ||
    value === "background" ||
    value === "completed" ||
    value === "steered" ||
    value === "aborted" ||
    value === "stopped" ||
    value === "error"
  ) {
    return value;
  }
  return "running";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
