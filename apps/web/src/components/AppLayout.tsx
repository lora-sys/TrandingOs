import { Link, useLocation } from "@tanstack/react-router";
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

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await tradingPiApi.deleteSession(sessionId);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch {
      /* silently fail */
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
          <div className="font-medium text-sm">Trading Pi</div>
          <div className="text-muted-foreground text-xs">AI Trading Terminal</div>
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
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
              <span className="ml-auto text-[10px]">{sessions.length}</span>
            </div>
            <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {sessions.slice(0, 10).map((s: any) => (
                <li key={s.id ?? s.name}>
                  <Link
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs truncate transition-colors group",
                      "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                    to="/"
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
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-2">
          <div className="flex items-center justify-between">
            <span className="rounded-md px-2 py-1.5 text-muted-foreground text-xs">
              v0.1.0
            </span>
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
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Adaptive Header */}
        <header
          className={cn(
            "flex h-12 shrink-0 items-center border-b px-4 transition-all",
            sidebarOpen ? "gap-3" : "gap-4",
          )}
        >
          {sidebarOpen ? (
            <>
              <span className="font-medium text-sm">Trading Pi</span>
              <span className="text-muted-foreground text-xs">AI Trading Terminal</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-sm">Trading Pi</span>
              <span className="text-muted-foreground text-xs">AI Trading Terminal</span>
            </>
          )}
        </header>

        {/* Page Content */}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>

      {/* Global Settings Modal */}
      {settingsOpen && (
        <SettingsPanel
          authConfigured={authConfigured}
          authEnabled={authEnabled}
          autoCompaction={autoCompaction}
          onClose={closeSettings}
          onRenameSession={(name) => useSettingsStore.getState().setSessionName(name)}
          onSetAutoCompaction={async (enabled) =>
            useSettingsStore.getState().setAutoCompaction(enabled)
          }
          onSetTheme={(mode) => useSettingsStore.getState().setThemeMode(mode)}
          onSetThinking={async (level) => useSettingsStore.getState().setThinkingLevel(level)}
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
