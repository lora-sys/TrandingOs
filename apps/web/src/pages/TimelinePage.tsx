import { ClockIcon, SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { tradingPiApi } from "@/api/client";
import type { TimelineEvent } from "@/api/types";
import { TimelineEventCard, classifyEvent, type TimelineEventCategory } from "@/components/mvp";

const categories: Array<{ id: TimelineEventCategory; label: string }> = [
  { id: "toolcall", label: "ToolCall" },
  { id: "useraction", label: "UserAction" },
  { id: "system", label: "System" },
  { id: "milestone", label: "Milestone" },
];

export function TimelinePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledCategories, setEnabledCategories] = useState<TimelineEventCategory[]>(categories.map((category) => category.id));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => tradingPiApi.timeline().catch(() => null),
    refetchInterval: 10000,
  });

  const events = Array.isArray(timelineData) ? (timelineData as TimelineEvent[]) : [];
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      const category = classifyEvent(event);
      if (!enabledCategories.includes(category)) return false;
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (!matchesDateRange(event.created_at, rangeFilter, now)) return false;
      if (searchQuery) {
        const haystack = `${event.title} ${event.type} ${event.detail ?? ""} ${event.payload_json ?? ""}`.toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [enabledCategories, events, rangeFilter, searchQuery, statusFilter]);

  if (error) {
    return (
      <motion.div className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Failed to connect to backend server. Is it running?
        </div>
      </motion.div>
    );
  }

  return (
    <motion.main
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-6xl space-y-6 p-6"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <div className="mt-1 h-0.5 w-24 rounded-full bg-gradient-to-r from-cyan-500/60 to-transparent" />
        <p className="mt-2 text-sm text-muted-foreground">Global agent execution event log with typed event cards.</p>
      </motion.div>

      <section className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_170px_150px_220px]">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = enabledCategories.includes(category.id);
              return (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-muted-foreground"}`}
                  key={category.id}
                  onClick={() => setEnabledCategories((current) => active ? current.filter((item) => item !== category.id) : [...current, category.id])}
                  type="button"
                >
                  {category.label}
                </button>
              );
            })}
          </div>
          <select className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="error">Error</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <select className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setRangeFilter(event.target.value)} value={rangeFilter}>
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
          </select>
          <label className="relative block">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan-400/50"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events..."
              value={searchQuery}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <ClockIcon className="size-4 text-cyan-300" />
          Workflow Events
          <span className="rounded border border-white/10 px-2 py-0.5 text-xs text-muted-foreground">{filteredEvents.length}</span>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} className="h-20 rounded-lg border bg-muted/20" key={index} transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.12 }} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events match this view.</p>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event, index) => (
              <motion.div animate={{ opacity: 1, x: 0 }} initial={{ opacity: 0, x: -10 }} key={event.id || index} transition={{ delay: index * 0.02 }}>
                <TimelineEventCard event={event} expanded={expandedId === event.id} onToggle={() => setExpandedId((current) => current === event.id ? null : event.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </motion.main>
  );
}

function matchesDateRange(value: string | undefined, range: string, now: number) {
  if (range === "all") return true;
  const created = Date.parse(value ?? "");
  if (!Number.isFinite(created)) return false;
  if (range === "today") return new Date(created).toDateString() === new Date(now).toDateString();
  const days = range === "7d" ? 7 : 30;
  return now - created <= days * 24 * 60 * 60 * 1000;
}
