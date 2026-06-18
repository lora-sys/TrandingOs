import type { ComponentType, ReactNode } from "react";
import { formatMoney, formatDate, formatDateTime, formatSince } from "@/lib/formatters";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  ScaleIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";

export type WorkspaceOverviewMetrics = {
  winRate: number;
  previousWinRate?: number;
  pnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  decisionCount: number;
};

export function WorkspaceOverview({
  workspace,
  metrics,
  activePositions,
  events,
  onNewDecision,
  onStartResearch,
  onStartDeepResearch,
  onRequestReview,
  onClosePosition,
  busyReview,
  busyClosePositionId,
  settlementNotice,
}: {
  workspace: any;
  metrics: WorkspaceOverviewMetrics;
  activePositions: any[];
  events: any[];
  onNewDecision: () => void;
  onStartResearch: () => void;
  onStartDeepResearch?: () => void;
  onRequestReview: () => void;
  onClosePosition?: (position: any) => void;
  busyReview?: boolean;
  busyClosePositionId?: string;
  settlementNotice?: string;
}) {
  const workspaceName = workspace?.name ?? "Workspace";
  const topicType = workspace?.topicType ?? workspace?.topic_type ?? workspace?.kind ?? "custom";
  const topicRef = workspace?.topicRef ?? workspace?.topic_ref ?? workspace?.context?.topic;
  const createdAt = workspace?.createdAt ?? workspace?.created_at;
  const trend = metrics.previousWinRate === undefined ? 0 : metrics.winRate - metrics.previousWinRate;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-cyan-400/15 bg-card/70 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-cyan-100">{topicType}</span>
              <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">{createdAt ? `Created ${formatDate(createdAt)}` : "Created recently"}</span>
              <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">{metrics.decisionCount} decisions</span>
            </div>
            <div className="flex items-center gap-3">
              <BriefcaseIcon className="size-6 shrink-0 text-cyan-300" />
              <h2 className="truncate text-2xl font-semibold">{workspaceName}</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{workspace?.description || "Decision workspace for research, execution records, reviews, and improvement loops."}</p>
            <div className="mt-4 rounded-md border border-white/10 bg-background/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Linked Market</div>
              <div className="mt-1 text-foreground">{topicRef || "No linked market reference yet."}</div>
            </div>
          </div>
          <div className="grid min-w-52 grid-cols-2 gap-2 text-xs">
            <InfoPill label="Open" value={String(activePositions.length)} />
            <InfoPill label="Trades" value={String(metrics.tradeCount)} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <MetricCard
          icon={TrendingUpIcon}
          label="Win Rate"
          tone={trend >= 0 ? "good" : "bad"}
          value={`${Math.round(metrics.winRate * 100)}%`}
          detail={`${trend >= 0 ? "+" : ""}${Math.round(trend * 100)}% vs previous period`}
        />
        <MetricCard
          icon={TargetIcon}
          label="Total P&L"
          tone={metrics.pnl >= 0 ? "good" : "bad"}
          value={`${metrics.pnl >= 0 ? "+" : ""}${formatMoney(metrics.pnl)}`}
          detail={metrics.pnl >= 0 ? "profit retained" : "drawdown active"}
        />
        <MetricCard
          icon={ScaleIcon}
          label="Trade Count"
          tone="neutral"
          value={String(metrics.tradeCount)}
          detail={`${metrics.wins}W / ${metrics.losses}L`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Active Positions" icon={ActivityIcon}>
          {settlementNotice && (
            <div role="status" className="mb-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {settlementNotice}
            </div>
          )}
          {activePositions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open paper trades in this workspace.</p>
          ) : (
            <div className="space-y-2">
              {activePositions.slice(0, 5).map((position) => (
                <PositionRow
                  busy={busyClosePositionId === position.id}
                  key={position.id}
                  onClose={onClosePosition ? () => onClosePosition(position) : undefined}
                  position={position}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Activity" icon={CalendarClockIcon}>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workspace activity yet.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 10).map((event, index) => <ActivityRow event={event} key={event.id ?? index} />)}
            </div>
          )}
        </Panel>
      </section>

      <section className="flex flex-wrap gap-2 rounded-lg border bg-card/70 p-4">
        <QuickAction icon={ScaleIcon} label="New Decision" onClick={onNewDecision} />
        <QuickAction icon={FlaskConicalIcon} label="Start Research" onClick={onStartResearch} />
        <QuickAction icon={FlaskConicalIcon} label="Start Deep Research" onClick={onStartDeepResearch ?? onStartResearch} />
        <QuickAction busy={busyReview} icon={ListChecksIcon} label="Request Review" onClick={onRequestReview} />
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
}) {
  const TrendIcon = tone === "bad" ? ArrowDownRightIcon : ArrowUpRightIcon;
  return (
    <div className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {label}
        <Icon className="size-4 text-cyan-300" />
      </div>
      <div className={`mt-3 text-3xl font-semibold ${tone === "good" ? "text-emerald-200" : tone === "bad" ? "text-red-200" : ""}`}>{value}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <TrendIcon className={`size-3.5 ${tone === "bad" ? "text-red-300" : "text-emerald-300"}`} />
        {detail}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-cyan-300" />
        {title}
      </div>
      {children}
    </section>
  );
}

function PositionRow({ position, onClose, busy }: { position: any; onClose?: () => void; busy?: boolean }) {
  const pnl = Number(position.pnl ?? 0);
  return (
    <article className="rounded-md border border-white/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-100">Open</span>
          <span className="rounded border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">{position.direction ?? "OPEN"}</span>
        </div>
        <span className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}{formatMoney(pnl)}</span>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{position.asset ?? "paper trade"} · {position.positionSize ?? position.position_size ?? 1}U</span>
        <span>Elapsed {formatSince(position.entryTime ?? position.entry_time)}</span>
      </div>
      {onClose && (
        <button className="mt-3 rounded-md border border-emerald-400/30 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-400/10 disabled:opacity-50" disabled={busy} onClick={onClose} type="button">
          {busy ? "Closing" : "Close Position"}
        </button>
      )}
    </article>
  );
}

function ActivityRow({ event }: { event: any }) {
  return (
    <div className="flex gap-3 rounded-md border border-white/10 p-3 text-sm">
      <span className="mt-0.5 size-2 rounded-full bg-cyan-300" />
      <div className="min-w-0">
        <div className="truncate">{event.title || event.type || "Workspace event"}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.createdAt ?? event.created_at ?? event.timestamp)} · {event.status ?? "logged"}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, busy }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:border-cyan-400/40 disabled:opacity-50" disabled={busy} onClick={onClick} type="button">
      <Icon className="size-4 text-cyan-300" />
      {label}
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
