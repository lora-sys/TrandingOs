import { memo, useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  BarChart3,
  BookOpen,
  FileClock,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus,
} from "lucide-react";
import { tradingPiApi } from "../api.js";
import { useSession } from "./session.js";

const workspaces = [
  { id: "trading", label: "交易工作台", icon: BarChart3 },
  { id: "research", label: "研究中心", icon: BookOpen },
  { id: "review", label: "复盘中心", icon: FileClock },
  { id: "notes", label: "学习笔记", icon: NotebookPen },
];

function getConversationName(conv: { id: string; name?: string; title?: string; createdAt?: string }) {
  if (conv.name && conv.name !== "Trading Pi Session") return conv.name;
  if (conv.title && conv.title !== "Trading Pi Session") return conv.title;
  if (conv.createdAt) {
    const d = new Date(conv.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "新对话";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
  return "新对话";
}

/* ─── Conversation Item (memoized to prevent re-renders) ─── */
const ConversationItem = memo(function ConversationItem({
  conv,
  isActive,
  collapsed,
  onSelect,
}: {
  conv: { id: string; name?: string; title?: string; createdAt?: string };
  isActive: boolean;
  collapsed: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`conversationItem${isActive ? " active" : ""}`}
      role="option"
      aria-selected={isActive}
      onClick={() => onSelect(conv.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(conv.id);
      }}
      title={collapsed ? conv.title : undefined}
    >
      <span className="conv-title">{getConversationName(conv)}</span>
      {!collapsed && (
        <span className="conv-time">{conv.createdAt ? new Date(conv.createdAt).toLocaleDateString() : ""}</span>
      )}
    </div>
  );
});

/* ─── Workspace Item (memoized) ─── */
const WorkspaceItem = memo(function WorkspaceItem({
  ws,
  collapsed,
}: {
  ws: { id: string; label: string; icon: React.ComponentType<{ size: number; "aria-hidden"?: boolean }> };
  collapsed: boolean;
}) {
  const Icon = ws.icon;
  return (
    <div
      className="workspaceItem"
      role="option"
      tabIndex={0}
      aria-label={ws.label}
      title={collapsed ? ws.label : undefined}
    >
      <Icon size={16} aria-hidden={true} />
      {!collapsed && <span>{ws.label}</span>}
    </div>
  );
});

export function LeftSidebar({ drawerOpen, onCloseDrawer }: { drawerOpen: boolean; onCloseDrawer: () => void }) {
  const { sessionId, setSessionId } = useSession();
  const [paperTrading, setPaperTrading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Detect breakpoints
  useEffect(() => {
    const checkBreakpoints = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    checkBreakpoints();
    window.addEventListener("resize", checkBreakpoints);
    return () => window.removeEventListener("resize", checkBreakpoints);
  }, []);

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet && !collapsed) {
      setCollapsed(true);
      localStorage.setItem("sidebar-collapsed", "true");
    }
  }, [isTablet]);

  // Always expand on mobile when drawer opens
  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed]);

  // Fetch real sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: tradingPiApi.sessions,
    refetchInterval: 5000,
  });

  // Fetch real portfolio
  const { data: portfolioData } = useQuery({
    queryKey: ["portfolio"],
    queryFn: tradingPiApi.portfolio,
  });

  const conversations = Array.isArray(sessionsData) ? sessionsData : sessionsData?.sessions ?? [];
  const totalPnl = portfolioData?.positions?.reduce((sum: number, p: any) => sum + (p.unrealizedPnl || 0), 0) ?? 0;
  const tradeCount = portfolioData?.trades?.length ?? 0;
  const winCount = portfolioData?.trades?.filter((t: any) => t.pnl > 0).length ?? 0;
  const winRate = tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : 0;
  const totalBalance = portfolioData?.balance ?? 10000;

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    const appShell = document.getElementById("appShell");
    if (appShell) {
      appShell.style.setProperty("--sidebar-w", collapsed ? "60px" : "280px");
    }
  }, [collapsed]);

  const handleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleNewConversation = useCallback(() => {
    setSessionId("");
    if (isMobile) onCloseDrawer();
  }, [setSessionId, isMobile, onCloseDrawer]);

  const handleConvSelect = useCallback((id: string) => {
    setSessionId(id);
    if (isMobile) onCloseDrawer();
  }, [setSessionId, isMobile, onCloseDrawer]);

  const handlePaperTradingToggle = useCallback(() => {
    setPaperTrading((prev) => !prev);
  }, []);

  const handleToggleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      setPaperTrading((prev) => !prev);
    }
  }, []);

  const sidebarClassName = [
    "leftSidebar",
    collapsed && !isMobile ? " collapsed" : "",
    drawerOpen ? " drawerOpen" : "",
  ].filter(Boolean).join("");

  return (
    <>
        <aside ref={sidebarRef} className={sidebarClassName}>
        {!isMobile && (
          <button
            className="collapseToggle"
            type="button"
            onClick={handleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        )}

        <button
          className="newConversationBtn"
          type="button"
          onClick={handleNewConversation}
          aria-label="新建对话 (快捷键 Command+K)"
        >
          {collapsed ? (
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          ) : (
            <>
              <span>+ 新建对话</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </>
          )}
        </button>

        <div className="sectionHeader">
          {!collapsed && (
            <>
              <span>对话列表</span>
              <Search size={14} style={{ marginLeft: "auto", cursor: "pointer" }} />
            </>
          )}
        </div>
        <div className="conversationList" role="listbox" aria-label="对话列表">
          {sessionsLoading ? (
            <div className="sidebarSkeleton">
              <div className="sidebarSkeletonLine" style={{ width: "80%" }} />
              <div className="sidebarSkeletonLine" style={{ width: "65%" }} />
              <div className="sidebarSkeletonLine" style={{ width: "70%" }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="sidebarEmptyState enhanced">
              <div className="emptyStateIcon"><MessageSquarePlus size={20} /></div>
              <div className="emptyStateTitle">暂无对话</div>
              <div className="emptyStateDescription">
                点击上方按钮开始新对话
              </div>
              {!collapsed && (
                <div className="emptyStateHint">按 ⌘K 快速创建</div>
              )}
            </div>
          ) : (
            conversations.map((conv: any) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === sessionId}
                collapsed={collapsed}
                onSelect={handleConvSelect}
              />
            ))
          )}
        </div>

        <div className="sectionHeader">{!collapsed && "工作空间"}</div>
        <div className="workspaceList" role="listbox" aria-label="工作空间导航">
          {workspaces.map((ws) => (
            <WorkspaceItem key={ws.id} ws={ws} collapsed={collapsed} />
          ))}
        </div>

        <div className="performanceCard">
          <div className="card-title">本月表现（模拟）</div>
          <div className="performanceGrid">
            <div className="performanceStat">
              <span className="label">总收益</span>
              <span className={`value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
            <div className="performanceStat">
              <span className="label">交易次数</span>
              <span className="value">{tradeCount}</span>
            </div>
            <div className="performanceStat">
              <span className="label">胜率</span>
              <span className="value">{winRate}%</span>
            </div>
          </div>
        </div>

        <div className="accountSection">
          <div className="sectionHeader">账户</div>
          <div className="accountRow">
            <span className="label">模拟资金</span>
            <span className="value">${totalBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="paperTradingToggle">
          <span className="toggle-label" id="paper-trading-label">Paper Trading</span>
          <div
            className={`toggle-switch${paperTrading ? " active" : ""}`}
            onClick={handlePaperTradingToggle}
            role="switch"
            aria-checked={paperTrading}
            aria-labelledby="paper-trading-label"
            aria-label="Paper Trading 模拟交易开关"
            tabIndex={0}
            onKeyDown={handleToggleKeyDown}
          />
        </div>
      </aside>
    </>
  );
}
