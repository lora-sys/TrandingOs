import { useQuery } from "@tanstack/react-query";
import { Settings, User, Menu, PanelRightOpen } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

interface TopBarProps {
  leftDrawerOpen: boolean;
  onToggleLeftDrawer: () => void;
  onToggleRightDrawer: () => void;
}

export function TopBar({
  leftDrawerOpen,
  onToggleLeftDrawer,
  onToggleRightDrawer,
}: TopBarProps) {
  const { data: statusData } = useQuery({
    queryKey: ["status"],
    queryFn: tradingPiApi.status,
  });

  const agentStatus = statusData?.status === "running" ? "running" : "idle";
  return (
    <header className="topBar">
      <div className="topBar-brand">
        <button
          className="topBar-iconBtn mobileMenuBtn"
          onClick={onToggleLeftDrawer}
          aria-label="Toggle left sidebar"
        >
          <Menu size={18} />
        </button>
        <div className="topBar-logo">π</div>
        <div className="topBar-title">
          <h1 className="topBar-title-full">TRADING PI</h1>
          <h1 className="topBar-title-mobile">TP</h1>
          <span className="mvpBadge">MVP</span>
        </div>
        <span className="topBar-subtitle">
          AI 交易助手 · 研究 → 计划 → 模拟 → 复盘闭环
        </span>
      </div>

      <div className="topBar-actions">
        <button className="paperModeBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="paperModeBtn-label">Paper Mode</span>
        </button>

        <button className="topBar-iconBtn" title="Settings" aria-label="Settings">
          <Settings size={16} />
        </button>

        <div className="topBar-user">
          <div className="topBar-avatar">
            <User size={14} />
          </div>
          <span className="topBar-username">
            {agentStatus === "running" ? "Trading Pi (Running)" : "Trading Pi User"}
          </span>
        </div>

        <button
          className="topBar-iconBtn mobileSidebarBtn"
          onClick={onToggleRightDrawer}
          aria-label="Toggle right sidebar"
        >
          <PanelRightOpen size={18} />
        </button>
      </div>
    </header>
  );
}
