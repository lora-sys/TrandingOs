import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BrainCircuitIcon,
  CheckIcon,
  DownloadIcon,
  LightbulbIcon,
  ListChecksIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { tradingPiApi } from "@/api/client";
import {
  PnLCurveChart,
  TradeFrequencyChart,
  WinRateTrendChart,
} from "@/components/mvp";
import { formatSignedMoney } from "@/lib/formatters";

import { deriveEvolutionCharts, exportEvolution } from "./chart-utils";
import { Metric, Panel, QuickStatsPanel, StatusBadge, StatusPill } from "./components";

export function EvolutionPage() {
  const queryClient = useQueryClient();
  const [resetConfirm, setResetConfirm] = useState(false);
  const { data: summary } = useQuery({ queryKey: ["evolution-summary"], queryFn: () => tradingPiApi.evolutionSummary().catch(() => null), refetchInterval: 15000 });
  const { data: suggestions } = useQuery({ queryKey: ["evolution-suggestions"], queryFn: () => tradingPiApi.evolutionSuggestions().catch(() => []) });
  const { data: rules } = useQuery({ queryKey: ["user-rules"], queryFn: () => tradingPiApi.userRules().catch(() => []) });
  const { data: decisionsData } = useQuery({ queryKey: ["decisions"], queryFn: () => tradingPiApi.decisions().catch(() => []) });
  const { data: tradesData } = useQuery({ queryKey: ["paper-trades"], queryFn: () => tradingPiApi.paperTrades().catch(() => []) });
  const { data: workspaceData } = useQuery({ queryKey: ["workspaces"], queryFn: () => tradingPiApi.workspaces().catch(() => []) });

  const items = Array.isArray(suggestions) ? suggestions : [];
  const activeRules = Array.isArray(rules) ? rules : [];
  const decisions = Array.isArray(decisionsData) ? decisionsData : [];
  const trades = Array.isArray(tradesData) ? tradesData : [];
  const workspaces = Array.isArray(workspaceData) ? workspaceData : [];
  const charts = useMemo(() => deriveEvolutionCharts(decisions, trades, workspaces), [decisions, trades, workspaces]);

  const suggestRules = useMutation({
    mutationFn: () => tradingPiApi.suggestRules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-summary"] });
    },
  });
  const adopt = useMutation({
    mutationFn: (id: string) => tradingPiApi.adoptRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["user-rules"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-summary"] });
    },
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => tradingPiApi.dismissRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-summary"] });
    },
  });
  const runReview = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("review.workspace", { workspaceId: charts.bestWorkspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-summary"] });
    },
  });

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Evolution</h1>
          <p className="mt-1 text-sm text-muted-foreground">Advice-based improvement aggregation. Human approval stays in the loop.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-400/15 disabled:opacity-60" disabled={suggestRules.isPending} onClick={() => suggestRules.mutate()} type="button">
          <RefreshCwIcon className="size-4" />
          Suggest New Rules
        </button>
      </div>

      <section className="mb-4 grid gap-3 md:grid-cols-5">
        <Metric label="Decisions" value={String(summary?.metrics?.decisions ?? decisions.length)} />
        <Metric label="Win rate" value={`${Math.round((summary?.metrics?.winRate ?? charts.latestWinRate / 100) * 100)}%`} />
        <Metric label="P&L" value={formatSignedMoney(summary?.metrics?.totalPnl ?? charts.totalPnl)} tone={(summary?.metrics?.totalPnl ?? charts.totalPnl) >= 0 ? "positive" : "negative"} />
        <Metric label="Open ideas" value={String(summary?.metrics?.openSuggestions ?? items.filter((item: any) => item.status === "proposed").length)} />
        <Metric label="Rules" value={String(summary?.metrics?.activeRules ?? activeRules.length)} />
      </section>

      <section className="mb-4 rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <BrainCircuitIcon className="size-4 text-cyan-300" />
          Progress Dashboard
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <WinRateTrendChart data={charts.winRateTrend} />
          <PnLCurveChart data={charts.pnlCurve} />
          <TradeFrequencyChart data={charts.tradeFrequency} />
          <QuickStatsPanel stats={charts.quickStats} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel icon={LightbulbIcon} title="Improvement Feed">
          <div className="mb-3 flex flex-wrap gap-2">
            {["proposed", "adopted", "dismissed"].map((status) => (
              <StatusPill count={items.filter((item: any) => (item.status ?? "proposed") === status).length} key={status} status={status} />
            ))}
          </div>
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-lg border bg-background/40 p-6 text-sm text-muted-foreground">No improvement suggestions yet. Run a review or ask for new rules to build the feed.</div>
            ) : (
              items.map((item: any, index: number) => (
                <motion.article className="rounded-lg border bg-background/40 p-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <SparklesIcon className="size-4 text-amber-300" />
                        {item.title}
                        <span className="rounded border border-white/10 px-2 py-0.5 text-xs text-muted-foreground">{item.category ?? "rule"}</span>
                        <span className="rounded border border-white/10 px-2 py-0.5 text-xs text-muted-foreground">{item.priority ?? "medium"}</span>
                        <StatusBadge status={item.status ?? "proposed"} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                      {item.ruleText && <p className="mt-2 rounded border border-cyan-400/20 bg-cyan-400/10 p-2 text-xs text-cyan-100">{item.ruleText}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 px-2 py-1 text-xs text-emerald-200 disabled:opacity-50" disabled={item.status === "adopted" || adopt.isPending} onClick={() => adopt.mutate(item.id)} type="button">
                        <CheckIcon className="size-3" />
                        {item.status === "adopted" ? "Adopted" : "Adopt"}
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-muted-foreground disabled:opacity-50" disabled={item.status === "dismissed" || dismiss.isPending} onClick={() => dismiss.mutate(item.id)} type="button">
                        <XIcon className="size-3" />
                        {item.status === "dismissed" ? "Dismissed" : "Dismiss"}
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))
            )}
          </div>
        </Panel>

        <Panel icon={BrainCircuitIcon} title="Pattern Highlights">
          <div className="grid gap-3">
            {(summary?.patternHighlights ?? ["No patterns yet. Run reviews to build a baseline."]).map((item: string) => (
              <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-50" key={item}>{item}</div>
            ))}
            <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">{charts.quickStats.improvement}</div>
          </div>
        </Panel>

        <Panel icon={ShieldCheckIcon} title="Rule Workshop">
          <div className="space-y-2">
            {activeRules.length === 0 ? <p className="text-sm text-muted-foreground">No active rules yet.</p> : activeRules.map((rule: any) => (
              <div className="flex items-start justify-between gap-3 rounded-md border border-white/10 p-3 text-sm" key={`${rule.scope}:${rule.key}:${rule.value}`}>
                <div>
                  <div className="font-medium">{rule.key}</div>
                  <div className="mt-1 text-muted-foreground">{rule.value}</div>
                </div>
                <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-300/30">
                  <span className="ml-5 size-4 rounded-full bg-emerald-300" />
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={ListChecksIcon} title="Quick Actions">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 disabled:opacity-60" disabled={runReview.isPending || !charts.bestWorkspaceId} onClick={() => runReview.mutate()} type="button">Run Review</button>
            <button className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200 disabled:opacity-60" disabled={suggestRules.isPending} onClick={() => suggestRules.mutate()} type="button">Suggest rules</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm" onClick={() => exportEvolution(summary, items, activeRules, charts)} type="button"><DownloadIcon className="size-4" /> Export</button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm" onClick={() => setResetConfirm((value) => !value)} type="button"><RotateCcwIcon className="size-4" /> Reset</button>
          </div>
          {resetConfirm && (
            <div className="mt-3 rounded-md border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
              Reset Statistics needs a backend reset endpoint before it can alter stored history. This confirmation is intentionally non-destructive.
            </div>
          )}
          {runReview.isSuccess && <p className="mt-3 text-sm text-emerald-300">Review complete. Feed and patterns refreshed.</p>}
        </Panel>
      </section>
    </main>
  );
}
