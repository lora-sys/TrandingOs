import { BrainIcon, SearchIcon, MessageSquareIcon, TrendingUpIcon, PenToolIcon, BookOpenIcon, WrenchIcon, FlaskConicalIcon, TargetIcon, Trash2Icon, DownloadIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { tradingPiApi } from "@/api/client";

type MemoryDomain = "conversation" | "market" | "trade" | "review" | "skill" | "workspace" | "research" | "strategy";

const DOMAIN_META: Record<MemoryDomain, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  conversation: { label: "对话记忆", icon: MessageSquareIcon, color: "text-blue-400" },
  market: { label: "市场数据", icon: TrendingUpIcon, color: "text-emerald-400" },
  trade: { label: "交易记录", icon: PenToolIcon, color: "text-amber-400" },
  review: { label: "复盘分析", icon: BookOpenIcon, color: "text-purple-400" },
  skill: { label: "技能执行", icon: WrenchIcon, color: "text-cyan-400" },
  workspace: { label: "工作空间", icon: TargetIcon, color: "text-pink-400" },
  research: { label: "研究成果", icon: FlaskConicalIcon, color: "text-orange-400" },
  strategy: { label: "策略引擎", icon: BrainIcon, color: "text-indigo-400" },
};

export function MemoryPage() {
  const [selectedDomain, setSelectedDomain] = useState<MemoryDomain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: memoryData, isLoading, refetch } = useQuery({
    queryKey: ["memory"],
    queryFn: () => tradingPiApi.memory().catch(() => null),
    refetchInterval: 10000,
  });

  const records = Array.isArray(memoryData) ? memoryData : [];

  // Group by domain
  const grouped = records.reduce(
    (acc, record: any) => {
      const domain = (record.domain ?? "conversation") as MemoryDomain;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(record);
      return acc;
    },
    {} as Record<MemoryDomain, any[]>,
  );

  // Filter
  const filteredDomains = selectedDomain ? { [selectedDomain]: grouped[selectedDomain] ?? [] } : grouped;
  const searchedRecords = searchQuery
    ? Object.values(filteredDomains).flat().filter((r: any) =>
        `${r.key} ${r.value}`.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : Object.values(filteredDomains).flat();

  const domainEntries = Object.entries(grouped) as [MemoryDomain, any[]][];

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Memory</h1>
        <p className="text-muted-foreground text-sm mt-1">Agent 记忆管理 — 按领域分组的长期/短期记忆</p>
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-card/50 backdrop-blur-sm border-white/[0.08] pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索记忆内容..."
            value={searchQuery}
          />
        </div>
      </motion.div>

      {/* Domain Summary Cards */}
      {!searchQuery && !selectedDomain && (
        <motion.div
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, staggerChildren: 0.06 }}
        >
          {domainEntries.map(([domain, items]) => {
            const meta = DOMAIN_META[domain];
            const IconComp = meta.icon;
            return (
              <motion.button
                className="flex items-center gap-3 rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] p-3 text-left transition-colors hover:bg-white/[0.04]"
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                type="button"
                whileHover={{ scale: 1.02 }}
              >
                <div className={`size-9 rounded-lg flex items-center justify-center ${meta.color.replace("text-", "bg-").replace("-400", "/15")}`}>
                  <IconComp className={`size-5 shrink-0 ${meta.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{meta.label}</div>
                  <div className="text-muted-foreground text-xs">{items.length} 条记录</div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Domain filter breadcrumb */}
      {selectedDomain && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 text-sm">
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedDomain(null)} type="button">
              ← 全部领域
            </button>
            <span>/</span>
            <span className={`font-medium ${DOMAIN_META[selectedDomain]?.color}`}>
              {DOMAIN_META[selectedDomain]?.label}
            </span>
            <span className="text-muted-foreground">({(grouped[selectedDomain] ?? []).length})</span>
          </div>
        </motion.div>
      )}

      {/* Records list */}
      <div className="rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] space-y-0">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
        ) : searchedRecords.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {records.length === 0
                ? "暂无记忆数据，请先在对话中与 Agent 交互。Agent 会自动将重要信息存入各领域的记忆。"
                : "没有匹配的搜索结果"}
            </motion.p>
          </div>
        ) : (
          searchedRecords.map((record: any, i: number) => {
            const domain = (record.domain ?? "conversation") as MemoryDomain;
            const meta = DOMAIN_META[domain] ?? DOMAIN_META.conversation;
            const IconComp = meta.icon;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                layout
              >
                <div className="group flex items-start gap-3 border-b last:border-b-0 p-3 hover:bg-white/[0.03] transition-colors" key={i}>
                  <IconComp className={`size-4 mt-0.5 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{record.key || "(未命名)"}</div>
                    <pre className="bg-muted rounded-md p-2 mt-1 text-xs overflow-auto whitespace-pre-wrap break-words max-h-32">
                      {typeof record.value === "string" ? record.value : JSON.stringify(record.value, null, 2)}
                    </pre>
                    {record.importance != null && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">重要性:</span>
                        {[...Array(record.importance)].map((_, j) => (
                          <span className="size-1.5 rounded-full bg-primary" key={j} />
                        ))}
                      </div>
                    )}
                    {record.created_at && (
                      <div className="mt-0.5 text-muted-foreground text-xs">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete memory "${record.key}"?`)) return;
                      await tradingPiApi.writeMemory({ action: "delete", key: record.key });
                      refetch();
                    }}
                    className="shrink-0 rounded p-1 text-red-400/60 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    title="Delete memory record"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Stats footer */}
      {records.length > 0 && (
        <div className="text-center text-muted-foreground text-xs">
          共 {records.length} 条记忆记录 · {Object.keys(grouped).length} 个领域
          <button className="ml-2 underline hover:text-foreground" onClick={() => refetch()} type="button">刷新</button>
          <button
            onClick={() => {
              const data = (searchedRecords as any[]).map((r: any) => ({ domain: r.domain, key: r.key, value: r.value, importance: r.importance, timestamp: r.timestamp }));
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `trading-pi-memory-${new Date().toISOString().slice(0,10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <DownloadIcon className="size-3" />
            Export JSON
          </button>
        </div>
      )}
    </motion.div>
  );
}
