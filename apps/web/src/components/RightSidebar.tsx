import { memo, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  TrendingUp,
  FileText,
  ChevronRight,
  ChevronDown,
  Bot,
  Cpu,
  Layers,
  Database,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Menu,
  X,
} from "lucide-react";
import { tradingPiApi } from "../api";
import type { TimelineEvent } from "../api/types.js";

type TradeRecord = {
  symbol: string;
  side: string;
  amount: number;
  price: number;
  pnl: number;
  createdAt: string;
};

type SkillCall = {
  name: string;
  status: "completed" | "running" | "failed";
  duration: string;
};

/* ─── Timeline Item (memoized) ─── */
const TimelineItem = memo(function TimelineItem({
  event,
  isLatest,
  onClick,
}: {
  event: TimelineEvent & { count?: number };
  isLatest?: boolean;
  onClick?: (artifactId: string) => void;
}) {
  const statusClass = event.status ?? "completed";
  const isArtifact = event.type === "artifact" || event.type?.includes("tool.result");
  const handleClick = isArtifact && onClick
    ? () => onClick(event.id)
    : undefined;
  return (
    <div
      className={`timelineItem ${isLatest ? "active" : ""} ${statusClass === "completed" ? "completed" : ""}${isArtifact ? " clickable" : ""}`}
      onClick={handleClick}
      role={isArtifact ? "button" : undefined}
      tabIndex={isArtifact ? 0 : undefined}
      onKeyDown={isArtifact ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick?.(); } : undefined}
    >
      <span className={`t-dot ${statusClass}`} />
      <div className="t-content">
        <span className="t-title">
          {event.title}
          {event.count && event.count > 1 ? ` (${event.count}x)` : ""}
        </span>
        <span className="t-time">
          {event.created_at ? new Date(event.created_at).toLocaleTimeString() : ""}
        </span>
      </div>
    </div>
  );
});

/* ─── Trade Record (memoized) ─── */
const TradeRecord = memo(function TradeRecord({ trade, onClick }: { trade: TradeRecord; onClick?: () => void }) {
  const pnl = trade.pnl ?? 0;
  const pnlClass = pnl >= 0 ? "profit" : "loss";
  return (
    <div className={`tradeRecord ${pnlClass}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined }}>
      <div className="tradeRecord-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tradeRecord-pair">{trade.symbol}</span>
          <span className={`tradeRecord-direction ${trade.side === "buy" ? "buy" : "sell"}`}>
            {trade.side === "buy" ? "买入" : "卖出"}
          </span>
        </div>
        <span className="tradeRecord-time">
          {trade.createdAt ? new Date(trade.createdAt).toLocaleTimeString() : ""}
        </span>
      </div>
      <div className="tradeRecord-details">
        <div className="tradeRecord-row">
          <span className="label">数量</span>
          <span className="value">{trade.amount}</span>
        </div>
        <div className="tradeRecord-row">
          <span className="label">价格</span>
          <span className="value">${trade.price?.toFixed(2)}</span>
        </div>
        <div className="tradeRecord-row">
          <span className="label">盈亏</span>
          <span className={`value ${pnl >= 0 ? "positive" : "negative"}`}>
            {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
});

/* ─── Skill Call Item (memoized) ─── */
const SkillCallItem = memo(function SkillCallItem({ call }: { call: SkillCall }) {
  return (
    <div className={`skillCall ${call.status}`}>
      <span className="skillName">{call.name}</span>
      <span className={`skillStatus ${call.status}`}>
        {call.status === "completed" ? "完成" : call.status === "running" ? "运行中" : "失败"}
      </span>
      <span className="skillDuration">{call.duration}</span>
    </div>
  );
});

/* ─── Collapsible Section ─── */
function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size: number; "aria-hidden"?: boolean }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const IconComp = Icon;

  return (
    <div className="rightSidebarSection collapsible">
      <button
        className="sectionCollapsible"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="section-header-text">
          <Icon size={14} aria-hidden={true} />
          {title}
        </span>
        <span className={`collapseArrow ${open ? "open" : ""}`}>
          <ChevronDown size={14} />
        </span>
      </button>
      {open && <div className="sectionCollapsible-body">{children}</div>}
    </div>
  );
}

export function RightSidebar({ drawerOpen, onCloseDrawer, onOpenPreview }: { drawerOpen: boolean; onCloseDrawer: () => void; onOpenPreview?: (artifactId?: string) => void }) {
  const queryClient = useQueryClient();

  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ["timeline"],
    queryFn: tradingPiApi.timeline,
    refetchInterval: 10000,
  });

  const { data: tradesData, isLoading: isLoadingTrades } = useQuery({
    queryKey: ["trades"],
    queryFn: tradingPiApi.trades,
  });

  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ["reviews"],
    queryFn: tradingPiApi.reviews,
  });

  const { data: statusData } = useQuery({
    queryKey: ["status"],
    queryFn: tradingPiApi.status,
    refetchInterval: 3000,
  });

  const { data: memoryData } = useQuery({
    queryKey: ["memory"],
    queryFn: tradingPiApi.memory,
  });

  const { data: skillsData } = useQuery({
    queryKey: ["skills"],
    queryFn: tradingPiApi.skills,
  });

  const timeline = useMemo(() => {
    if (!Array.isArray(timelineData)) return [];
    const events = timelineData as TimelineEvent[];
    // Filter out message_update events and collapse consecutive similar events
    return events.reduce((acc, event) => {
      // Skip message_update events entirely
      if (event.type?.includes("message_update") || event.type === "message_update") {
        return acc;
      }
      // Collapse consecutive message_end events
      if (event.type?.includes("message_end")) {
        const last = acc[acc.length - 1];
        if (last?.type?.includes("message_end")) {
          last.count = (last.count || 1) + 1;
          return acc;
        }
        acc.push({ ...event, count: 1 });
      } else {
        acc.push(event);
      }
      return acc;
    }, [] as (TimelineEvent & { count?: number })[]);
  }, [timelineData]);

  const trades = useMemo(() => {
    if (!tradesData) return [];
    const raw = (tradesData as any).trades ?? (Array.isArray(tradesData) ? tradesData : []);
    return raw as TradeRecord[];
  }, [tradesData]);

  const reviews = useMemo(() => {
    if (!reviewsData) return [];
    return ((reviewsData as any).reviews ?? (Array.isArray(reviewsData) ? reviewsData : [])) as any[];
  }, [reviewsData]);

  const today = new Date().toDateString();
  const todayTrades = useMemo(
    () => trades.filter((t) => new Date(t.createdAt).toDateString() === today),
    [trades, today]
  );

  const totalPnl = useMemo(
    () => todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    [todayTrades]
  );

  const winRate = useMemo(() => {
    if (todayTrades.length === 0) return 0;
    const winCount = todayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
    return Math.round((winCount / todayTrades.length) * 100);
  }, [todayTrades]);

  const recentSkillCalls = useMemo<SkillCall[]>(() => {
    if (!Array.isArray(timelineData)) return [];
    return (timelineData as TimelineEvent[])
      .filter((e) =>
        e.type === "tool_execution_start" ||
        e.type === "tool_execution_end" ||
        e.type === "pi.tool_execution_start" ||
        e.type === "pi.tool_execution_end" ||
        e.type?.includes("tool."),
      )
      .slice(-5)
      .map((e) => {
        const payload = e.payload_json ? JSON.parse(e.payload_json) : e.payload;
        const name = (payload as any)?.toolName || (payload as any)?.name || e.title?.replace("Pi Agent event: ", "") || "unknown";
        const isEnd = e.type?.endsWith("_end") || e.type?.includes("result");
        return {
          name,
          status: (isEnd
            ? (payload as any)?.isError
              ? "failed"
              : "completed"
            : "running") as "completed" | "running" | "failed",
          duration: isEnd ? "0.3s" : "...",
        };
      });
  }, [timelineData]);

  const activeWorkflow = useMemo(() => {
    if (!Array.isArray(timelineData)) return null;
    const workflowEvents = (timelineData as TimelineEvent[]).filter(
      (e) => e.type === "workflow_start" || e.type === "workflow_step"
    );
    if (workflowEvents.length === 0) return null;
    const last = workflowEvents[workflowEvents.length - 1];
    const payload = last.payload_json ? JSON.parse(last.payload_json) : last.payload;
    return {
      name: (payload as any)?.workflowId ?? "workflow",
      currentStep: (payload as any)?.step ?? "执行中",
      progress: Math.min(90, 30 + workflowEvents.length * 15),
    };
  }, [timelineData]);

  const memoryUsage = useMemo(
    () => ({
      shortTermCount: (memoryData as any)?.conversations?.length ?? 0,
      longTermCount: (memoryData as any)?.facts?.length ?? 0,
      userPrefsLoaded: !!memoryData,
    }),
    [memoryData]
  );

  const agentStatus = statusData?.status === "running" ? "running" : "idle";

  const generateReview = useMutation({
    mutationFn: () => tradingPiApi.runReviewDaily("daily"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  const isLoading = isLoadingTimeline || isLoadingTrades;

  const sidebarClassName = `rightSidebar${drawerOpen ? " drawerOpen" : ""}`;

  return (
    <aside className={sidebarClassName} aria-label="右侧信息面板" style={{ gridColumn: 4 }}>
        {/* Agent State */}
        <CollapsibleSection title="Agent 状态" icon={Bot} defaultOpen={true}>
          <div className="agentStateGrid" aria-live="polite">
            <div className="stateItem">
              <span className="label">状态</span>
              <span className={`value ${agentStatus === "running" ? "running" : ""}`}>
                {agentStatus === "running" ? "运行中" : "空闲"}
              </span>
            </div>
            <div className="stateItem">
              <span className="label">技能</span>
              <span className="value">{(skillsData as any)?.length ?? 0}</span>
            </div>
          </div>

          {/* Recent Skill Calls */}
          <div className="skillCallsSection">
            <div className="subsection-header">
              <Cpu size={12} aria-hidden="true" />
              最近调用
            </div>
            {recentSkillCalls.length > 0 ? (
              recentSkillCalls.map((call, i) => (
                <SkillCallItem key={i} call={call} />
              ))
            ) : (
              <div className="emptyState">暂无调用</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="记忆" icon={Database} defaultOpen={true}>
          <div className="memorySection">
            <div className="memoryItem">
              <span className="memoryType">短期记忆</span>
              <span className="memoryCount">{memoryUsage.shortTermCount} 条</span>
            </div>
            <div className="memoryItem">
              <span className="memoryType">长期记忆</span>
              <span className="memoryCount">{memoryUsage.longTermCount} 条</span>
            </div>
            <div className="memoryItem">
              <span className="memoryType">用户偏好</span>
              <span className={`memoryStatus ${memoryUsage.userPrefsLoaded ? 'loaded' : ''}`}>
                {memoryUsage.userPrefsLoaded ? '已加载' : '未加载'}
              </span>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="执行时间线" icon={Clock} defaultOpen={false}>
          {timeline.length > 0 ? (
            <div className="timelineList">
              {timeline.slice(-10).reverse().map((event, i) => (
                <TimelineItem key={event.id ?? i} event={event} isLatest={i === 0} onClick={onOpenPreview} />
              ))}
            </div>
          ) : (
            <div className="emptyState">暂无执行记录</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="交易记录" icon={TrendingUp} defaultOpen={false}>
          {trades.length > 0 ? (
            <div className="tradeRecords">
              {trades.slice(-5).reverse().map((trade, i) => (
                <TradeRecord key={i} trade={trade} />
              ))}
              {trades.length > 5 && (
                <div className="viewAllTrades">查看全部 {trades.length} 笔交易</div>
              )}
            </div>
          ) : (
            <div className="emptyState">暂无交易记录</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="今日复盘摘要" icon={FileText} defaultOpen={false}>
          <div className="dailyReview">
            <div className="dailyReviewStat">
              <span className="label">今日交易</span>
              <span className="value">{todayTrades.length} 笔</span>
            </div>
            <div className="dailyReviewStat">
              <span className="label">总盈亏</span>
              <span className={`value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
            <div className="dailyReviewStat">
              <span className="label">胜率</span>
              <span className="value">{winRate}%</span>
            </div>
            {reviews.length > 0 && (
              <div className="dailyReviewStat">
                <span className="label">最近复盘</span>
                <span className="value" style={{ fontSize: 'var(--font-xs)' }}>
                  {reviews[0]?.createdAt ? new Date(reviews[0].createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            )}
          </div>
          <button
            className="generateReviewBtn"
            onClick={() => generateReview.mutate()}
            disabled={generateReview.isPending}
          >
            {generateReview.isPending ? '生成中...' : '生成复盘报告'}
          </button>
          {generateReview.isError && (
            <div className="generateReviewError">生成失败，请重试</div>
          )}
          {generateReview.isSuccess && (
            <div className="generateReviewSuccess">复盘报告已生成</div>
          )}
        </CollapsibleSection>
    </aside>
  );
}
