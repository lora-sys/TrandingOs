import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  WalletIcon,
  BrainIcon,
  ClockIcon,
  PanelLeftCloseIcon,
  HistoryIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/pi-web-ui/app-sidebar";
import { SettingsPanel } from "@/components/pi-web-ui/settings-panel";
import { useSettingsStore } from "@/lib/settingsStore";
import { tradingPiApi } from "@/api/client";

/* ── Navigation items ── */
export const navItems = [
  { label: "Dashboard", icon: LayoutDashboardIcon, to: "/dashboard" as const },
  { label: "Chat", icon: MessageSquareIcon, to: "/" as const },
  { label: "Market", icon: TrendingUpIcon, to: "/market" as const },
  { label: "Portfolio", icon: WalletIcon, to: "/portfolio" as const },
  { label: "Memory", icon: BrainIcon, to: "/memory" as const },
  { label: "Timeline", icon: ClockIcon, to: "/timeline" as const },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const setSidebarOpen = useSettingsStore((s) => s.setSidebarOpen);
  const closeSettings = useSettingsStore((s) => s.closeSettings);

  /* Fetch sessions from backend */
  const queryClient = useQueryClient();
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => tradingPiApi.sessions().catch(() => []),
    refetchInterval: 15000,
  });
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  /* Health check for connection status */
  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: () => tradingPiApi.health().catch(() => null),
    refetchInterval: 10000,
  });
  const isOnline = !!healthData;

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
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
  const resolvedTheme =
    themeMode === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : themeMode;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 bg-background text-foreground font-[family-name:var(--font-mono)]",
        resolvedTheme === "dark" && "dark",
      )}
      style={{ colorScheme: resolvedTheme }}
    >
      {/* Collapsible Sidebar (pi-web-ui component) */}
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
              <span>Sessions</span>
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
                    to="/"
                    onClick={() => useSettingsStore.getState().setCurrentSessionId(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs truncate transition-colors group",
                      "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <MessageSquareIcon className="size-3 shrink-0" />
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

      {/* Main Content Area */}
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-0 flex-1 overflow-auto"
      >
        {children}
      </motion.main>

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
