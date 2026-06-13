import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ActivityIcon,
  BotIcon,
  BrainIcon,
  CpuIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DatabaseIcon,
  ZapIcon,
} from "lucide-react";
import { tradingPiApi } from "@/api/client";

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      className="rounded-lg border bg-card/70 backdrop-blur-xl p-4 border-white/[0.08]"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{label}</span>
        <Icon className={`size-4 ${label === "思考等级" ? "text-cyan-500/80" : "text-cyan-500/80"}`} />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold">{value}</span>
        {trend === "up" && <TrendingUpIcon className="size-3 text-emerald-500" />}
        {trend === "down" && <TrendingDownIcon className="size-3 text-red-500" />}
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { data: statusData, error: statusError } = useQuery({
    queryKey: ["status"],
    queryFn: () => tradingPiApi.status().catch(() => null),
    refetchInterval: 5000,
  });

  const { data: configData, error: configError } = useQuery({
    queryKey: ["config"],
    queryFn: () => tradingPiApi.config().catch(() => null),
    refetchInterval: 10000,
  });

  const { data: tradesData } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradingPiApi.trades().catch(() => null),
  });

  const { data: memoryData } = useQuery({
    queryKey: ["memory"],
    queryFn: () => tradingPiApi.memory().catch(() => null),
  });

  if (statusError || configError) {
    return (
      <motion.div className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to connect to backend server. Is it running?
        </div>
      </motion.div>
    );
  }

  const agentStatus = statusData?.status === "running" ? "Running" : "Idle";
  const trades = Array.isArray(tradesData) ? tradesData : [];
  const todayTrades = trades.filter((t: any) => {
    if (!t.createdAt) return false;
    const today = new Date().toDateString();
    return new Date(t.createdAt).toDateString() === today;
  });
  const pnl = todayTrades.reduce((sum: number, t: any) => sum + (t.pnl ?? 0), 0);
  const thinkingLevel = configData?.thinkingLevel ?? statusData?.thinkingLevel ?? "medium";
  const modelId = configData?.modelId ?? statusData?.model ?? "—";
  const autoCompaction = configData?.autoCompaction ?? true;

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Trading Pi 总览仪表盘</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Agent 状态"
          value={agentStatus}
          icon={ActivityIcon}
          trend={agentStatus === "Running" ? "up" : "neutral"}
        />
        <StatCard
          label="今日盈亏"
          value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          icon={DollarSignIcon}
          trend={pnl > 0 ? "up" : pnl < 0 ? "down" : "neutral"}
        />
        <StatCard
          label="今日交易"
          value={`${todayTrades.length} 笔`}
          icon={ZapIcon}
        />
        <StatCard
          label="模型"
          value={modelId !== "—" ? modelId : "—"}
          icon={CpuIcon}
        />
        <StatCard
          label="思考等级"
          value={thinkingLevel}
          icon={BrainIcon}
          trend={thinkingLevel === "high" ? "up" : thinkingLevel === "low" ? "down" : "neutral"}
        />
      </div>

      {/* Two-column detail */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Agent Status */}
        <div className="rounded-lg border bg-card/70 backdrop-blur-xl p-4 space-y-3 border-white/[0.08]">
          <div className="flex items-center gap-2 font-medium text-sm">
            <BotIcon className="size-4" />
            Agent 状态
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <span className={agentStatus === "Running" ? "text-emerald-500" : "text-muted-foreground"}>
                {agentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">模型</span>
              <span>{modelId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thinking</span>
              <span className="text-cyan-400">{thinkingLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">自动压缩</span>
              <span>{autoCompaction ? "开启" : "关闭"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">会话</span>
              <span>{statusData?.sessionName ?? "Trading Pi"}</span>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="rounded-lg border bg-card/70 backdrop-blur-xl p-4 space-y-3 border-white/[0.08]">
          <div className="flex items-center gap-2 font-medium text-sm">
            <TrendingUpIcon className="size-4" />
            最近交易
          </div>
          {todayTrades.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无交易记录</p>
          ) : (
            <div className="space-y-2">
              {todayTrades.slice(-5).map((trade: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trade.symbol}</span>
                    <span className={`text-xs ${trade.side === "buy" ? "text-emerald-500" : "text-red-500"}`}>
                      {trade.side === "buy" ? "买入" : "卖出"}
                    </span>
                  </div>
                  <span className={(trade.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {(trade.pnl ?? 0) >= 0 ? "+" : ""}${(trade.pnl ?? 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Memory Summary */}
      <div className="rounded-lg border bg-card/70 backdrop-blur-xl p-4 space-y-3 border-white/[0.08]">
        <div className="flex items-center gap-2 font-medium text-sm">
          <DatabaseIcon className="size-4" />
          记忆摘要
        </div>
        {memoryData ? (
          <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-48">
            {typeof memoryData === "string" ? memoryData : JSON.stringify(memoryData, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground text-sm">暂无记忆数据</p>
        )}
      </div>
    </motion.div>
  );
}
