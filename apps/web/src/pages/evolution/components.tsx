import type { ComponentType, ReactNode } from "react";
import type { QuickStats } from "./types";

export function Panel({ icon: Icon, title, children }: { icon: ComponentType<{ className?: string }>; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-cyan-300" />
        {title}
      </div>
      {children}
    </section>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-xl font-semibold ${tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : ""}`}>{value}</div>
    </div>
  );
}

export function QuickStatsPanel({ stats }: { stats: QuickStats }) {
  return (
    <section className="rounded-lg border bg-card/50 p-4 backdrop-blur-xl">
      <div className="mb-3 text-sm font-medium">Quick Stats</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniStat label="Current streak" value={stats.streak} />
        <MiniStat label="Best workspace" value={stats.bestWorkspace} />
        <MiniStat label="Avg confidence" value={stats.avgConfidence} />
        <MiniStat label="Improvement" value={stats.improvement} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function StatusPill({ status, count }: { status: string; count: number }) {
  return <span className={`rounded border px-2 py-1 text-xs ${statusTone(status)}`}>{statusLabel(status)} {count}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded border px-2 py-0.5 text-xs ${statusTone(status)}`}>{statusLabel(status)}</span>;
}

function statusTone(status: string): string {
  if (status === "adopted") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "dismissed") return "border-white/10 bg-white/[0.03] text-muted-foreground";
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

function statusLabel(status: string): string {
  if (status === "adopted") return "Adopted";
  if (status === "dismissed") return "Dismissed";
  return "Pending";
}
