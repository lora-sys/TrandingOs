import { ClockIcon, SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { tradingPiApi } from "@/api/client";
import type { TimelineEvent } from "@/api/types";

export function TimelinePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => tradingPiApi.timeline().catch(() => null),
    refetchInterval: 10000,
  });

  if (error) {
    return (
      <motion.div className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to connect to backend server. Is it running?
        </div>
      </motion.div>
    );
  }

  const events = Array.isArray(timelineData)
    ? (timelineData as TimelineEvent[])
    : [];

  const filteredEvents = (events || []).filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (searchQuery && !e.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !e.type?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <div className="mt-1 h-0.5 w-24 rounded-full bg-gradient-to-r from-cyan-500/60 to-transparent" />
        <p className="text-muted-foreground text-sm mt-2">执行时间线</p>
      </motion.div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "completed", "running", "error"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? s === "completed" ? "bg-emerald-500/15 text-emerald-400"
                : s === "running" ? "bg-amber-500/15 text-amber-400"
                : s === "error" ? "bg-red-500/15 text-red-400"
                : "bg-cyan-500/15 text-cyan-400"
                : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="relative ml-auto">
          <SearchIcon className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-40 rounded-md border border-white/[0.08] bg-card/50 px-7 py-1 text-xs placeholder:text-muted-foreground focus:border-cyan-500/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ClockIcon className="size-4" />
          工作流事件
        </div>
        <div className="relative">
          <div className="absolute left-[7px] top-12 bottom-4 w-px bg-gradient-to-b from-cyan-500/20 via-border to-transparent" />
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, j) => (
                <motion.div key={j} className="flex items-center gap-3 rounded-md p-2.5" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.15 }}>
                  <span className="size-2.5 rounded-full bg-muted" />
                  <div className="h-3 flex-1 rounded bg-muted max-w-[60%]" />
                </motion.div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无时间线事件。发送消息开始交互后将显示执行流程。</p>
          ) : (
            <motion.div initial="hidden" animate="show" variants={{
              hidden: { opacity: 0 },
              show: { transition: { staggerChildren: 0.04 } }
            }}>
              {filteredEvents.map((event, i) => (
                <motion.div
                  key={event.id || i}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.25 } }
                  }}
                  className="flex items-start gap-3 rounded-md border p-2.5 text-sm hover:bg-white/[0.03] transition-colors"
                  whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.04)" }}
                >
                  {event.status === "running" ? (
                    <motion.span
                      className="mt-0.5 size-2.5 shrink-0 rounded-full bg-amber-500"
                      animate={{ opacity: [1, 0.4, 1], scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ) : (
                    <span
                      className={`mt-0.5 size-2.5 shrink-0 rounded-full ${
                        event.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{event.title || event.type}</div>
                    {event.created_at && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
