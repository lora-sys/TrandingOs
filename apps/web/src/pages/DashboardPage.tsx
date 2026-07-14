import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  ActivityIcon,
  BellIcon,
  BrainIcon,
  CalendarClockIcon,
  CpuIcon,
  DatabaseIcon,
  GaugeIcon,
} from "lucide-react";
import { tradingPiApi } from "@/api/client";
import { AlphaRadarCard } from "@/components/mvp";
import { formatChange, formatUsd } from "@/lib/formatters";

export function DashboardPage() {
  const navigate = useNavigate();
  const openWorkspace = useMutation({
    mutationFn: async ({ signal, deepResearch }: { signal: any; deepResearch?: boolean }) => {
      const title = signal.title ?? signal.question ?? "Alpha Radar Signal";
      const result = await tradingPiApi.createWorkspace({
        name: title,
        description: signal.reasoning ?? signal.summary ?? "Alpha Radar opportunity workspace",
        topicType: signal.category ?? signal.source ?? "alpha",
        topicRef: signal.id ?? signal.marketId ?? title,
        context: { source: "alpha-radar", signal },
      });
      return { workspaceId: result.workspace?.id ?? result.id, title, deepResearch };
    },
    onSuccess: ({ workspaceId, title, deepResearch }) => {
      if (!workspaceId) {
        navigate({ to: "/workspace" });
        return;
      }
      const params = new URLSearchParams({ topic: title });
      if (deepResearch) {
        params.set("tab", "research");
        params.set("deepResearch", "1");
      }
      window.location.href = `/workspace/${encodeURIComponent(workspaceId)}?${params.toString()}`;
    },
  });
  const { data: alpha, isLoading: alphaLoading } = useQuery({
    queryKey: ["alpha-radar"],
    queryFn: () => tradingPiApi.alphaRadar().catch((error: Error) => ({ signals: [], stale: true, error: error.message })),
    refetchInterval: 300_000,
  });
  const { data: reminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => tradingPiApi.reminders().catch(() => ({ macro: [], crypto: [] })),
    refetchInterval: 1_800_000,
  });
  const { data: reviews } = useQuery({ queryKey: ["recent-reviews"], queryFn: () => tradingPiApi.reviews().catch(() => []) });
  const { data: status } = useQuery({ queryKey: ["status"], queryFn: () => tradingPiApi.status().catch(() => null), refetchInterval: 5000 });
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => tradingPiApi.config().catch(() => null), refetchInterval: 10000 });
  const { data: metrics } = useQuery({
    queryKey: ["agent-metrics"],
    queryFn: () => tradingPiApi.agentMetrics().catch(() => null),
    refetchInterval: 30_000,
  });

  const signals = Array.isArray(alpha?.signals) ? alpha.signals.slice(0, 5) : [];
  const macro = normalizeReminderItems(reminders?.macro);
  const crypto = normalizeReminderItems(reminders?.crypto);
  const recentReviews = Array.isArray(reviews) ? reviews.slice(0, 7) : [];
  const radarGridClass = signals.length > 3 ? "lg:grid-cols-5" : signals.length > 1 ? "lg:grid-cols-3" : "lg:grid-cols-[minmax(18rem,24rem)]";

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <section className="mb-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alpha Radar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Top opportunities from markets, news, community, and event feeds.</p>
          </div>
          {alpha?.stale && <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">stale cache</span>}
        </div>

        <div className={`grid gap-3 ${radarGridClass}`}>
          {alphaLoading ? (
            Array.from({ length: 5 }).map((_, index) => <SignalSkeleton key={index} />)
          ) : signals.length === 0 ? (
            <div className="rounded-lg border bg-card/70 p-5 text-sm text-muted-foreground lg:col-span-5">
              No radar signals yet. The backend will show cached or live signals when sources respond.
            </div>
          ) : (
            signals.map((signal: any, index: number) => (
              <AlphaRadarCard
                category={signal.category ?? signal.source ?? "signal"}
                change24h={formatChange(signal.change24h ?? signal.change)}
                currentValue={signal.currentValue ?? signal.current_value ?? formatScore(signal.score)}
                key={signal.id ?? signal.title ?? index}
                onClick={() => openWorkspace.mutate({ signal })}
                onResearchClick={() => openWorkspace.mutate({ signal, deepResearch: true })}
                reasoning={signal.reasoning ?? signal.summary}
                riskRating={Number(signal.risk ?? signal.riskScore ?? 3)}
                source={signal.source ?? "alpha"}
                title={signal.title ?? signal.question ?? "Untitled signal"}
                volume={formatUsd(signal.volume ?? signal.volumeUsd)}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border bg-card/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <CalendarClockIcon className="size-4 text-cyan-300" />
            Today's Reminders
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ReminderColumn title="Macro" items={macro} />
            <ReminderColumn title="Crypto" items={crypto} />
          </div>
        </div>
        <div className="rounded-lg border bg-card/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <BellIcon className="size-4 text-cyan-300" />
            Recent Reviews
          </div>
          <div className="space-y-2">
            {recentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review reports yet.</p>
            ) : (
              recentReviews.map((review: any) => (
                <div className="rounded-md border border-white/10 p-3 text-sm" key={review.id}>
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{review.period}</span>
                    <span className="text-xs text-muted-foreground">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{review.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <ActivityIcon className="size-4 text-cyan-300" />
        System Status
      </div>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={ActivityIcon} label="Agent" value={status?.status === "running" ? "Running" : "Idle"} />
        <StatCard icon={CpuIcon} label="Model" value={config?.modelId ?? status?.config?.modelId ?? "default"} />
        <StatCard icon={BrainIcon} label="Thinking" value={config?.thinkingLevel ?? "medium"} />
        <StatCard icon={DatabaseIcon} label="Skills" value={String(status?.skills ?? 0)} />
        <StatCard icon={GaugeIcon} label="Workflows" value={String(status?.workflows ?? 0)} />
      </section>

      {metrics && (
        <section className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ActivityIcon} label="Prompts today" value={String(metrics.prompts.today)} />
          <StatCard icon={GaugeIcon} label="Active sub-agents" value={String(metrics.subAgents.active)} />
          <StatCard icon={BellIcon} label="Pending approvals" value={String(metrics.approvals.pending)} />
          <StatCard icon={BrainIcon} label="Sessions today" value={String(metrics.sessions.createdToday)} />
        </section>
      )}
    </main>
  );
}

function normalizeReminderItems(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.events)) return value.events;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

function SignalSkeleton() {
  return <div className="h-44 animate-pulse rounded-lg border bg-card/60" />;
}

function ReminderColumn({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      {items.length === 0 ? (
        <p className="rounded-md border border-white/10 p-3 text-sm text-muted-foreground">No reminders.</p>
      ) : (
        items.slice(0, 5).map((item, index) => (
          <div className="rounded-md border border-white/10 p-3 text-sm" key={item.id ?? item.title ?? index}>
            <div className="font-medium">{item.title ?? item.name ?? item.seriesId ?? "Reminder"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.date ?? item.eventDate ?? item.fetchedAt ?? item.source ?? ""}</div>
          </div>
        ))
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/70 p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {label}
        <Icon className="size-4 text-cyan-300" />
      </div>
      <div className="mt-2 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatScore(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "n/a";
}
