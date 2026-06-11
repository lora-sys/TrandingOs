import { Chip } from "@heroui/react/chip";
import { Link } from "@tanstack/react-router";
import { Activity, BarChart3, BookOpen, Boxes, BrainCircuit, ClipboardList, Database, FileClock, FolderKanban, GraduationCap, LineChart, MessageSquare, MonitorCog, NotebookPen, Settings, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { tradingPiApi } from "../api/client.js";
import { Inspector } from "./Inspector.js";
import { SessionProvider } from "./session.js";

const nav = [
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/workspaces", label: "Workspaces", icon: FolderKanban },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/research", label: "Research", icon: BrainCircuit },
  { to: "/planner", label: "Planner", icon: ClipboardList },
  { to: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/review", label: "Review", icon: FileClock },
  { to: "/evolution", label: "Evolution", icon: BookOpen },
  { to: "/marketplace", label: "Marketplace", icon: Boxes },
  { to: "/journey", label: "Beginner", icon: GraduationCap },
  { to: "/system", label: "System", icon: MonitorCog },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const status = useQuery({ queryKey: ["status"], queryFn: tradingPiApi.status });

  return (
    <SessionProvider>
      <main className="appShell">
        <aside className="sideNav">
          <div className="brandMark">
            <span>π</span>
            <div>
              <strong>Trading Pi</strong>
              <small>Local Trading OS</small>
            </div>
          </div>
          <nav>
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="navItem" activeProps={{ className: "navItem active" }}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sideStatus">
            <StatusLine icon={<Database size={14} />} label="SQLite" value="local" />
            <StatusLine icon={<Activity size={14} />} label="Langfuse" value={status.data?.langfuseConfigured ? "on" : "off"} />
            <StatusLine icon={<Shield size={14} />} label="Sandbox" value={status.data?.env?.aioSandboxBaseUrl ? "aio" : "off"} />
            <StatusLine icon={<Boxes size={14} />} label="MCP" value={String(status.data?.mcpServers ?? 0)} />
          </div>
        </aside>
        <section className="workspace">{children}</section>
        <Inspector />
      </main>
    </SessionProvider>
  );
}

function StatusLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="statusLine">
      <span>{icon}{label}</span>
      <Chip size="sm" variant="flat" color={value === "off" ? "warning" : "success"}>{value}</Chip>
    </div>
  );
}
