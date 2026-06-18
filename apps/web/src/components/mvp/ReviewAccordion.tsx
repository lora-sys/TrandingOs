import { motion } from "framer-motion";
import { CheckCircleIcon, ChevronDownIcon, CircleIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { formatSignedMoney as formatMoney, formatDateTime } from "@/lib/formatters";

type ReviewSectionId = "overview" | "trades" | "errors" | "suggestions" | "emotion" | "rules" | "history";

const sectionMeta: Array<{ id: ReviewSectionId; title: string }> = [
  { id: "overview", title: "Overview" },
  { id: "trades", title: "Per-Trade Analysis" },
  { id: "errors", title: "Error Summary" },
  { id: "suggestions", title: "Improvement Suggestions" },
  { id: "emotion", title: "Emotion Analysis" },
  { id: "rules", title: "Rule Compliance" },
  { id: "history", title: "Historical Comparison" },
];

export function ReviewAccordion({ review }: { review: any }) {
  const report = review.report ?? review.report_json ?? review.reportJson ?? {};
  const normalized = useMemo(() => normalizeReview(report, review), [report, review]);
  const [expanded, setExpanded] = useState<ReviewSectionId[]>(["overview"]);
  const allExpanded = expanded.length === sectionMeta.length;

  return (
    <article className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Review Report: {review.period ?? normalized.overview.period ?? "manual"}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Generated {formatDateTime(review.createdAt ?? review.created_at)} · AI Model {normalized.overview.model ?? "built-in review"}
          </div>
        </div>
        <button className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpanded(allExpanded ? [] : sectionMeta.map((section) => section.id))} type="button">
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <div className="space-y-2">
        {sectionMeta.map((section, index) => {
          const open = expanded.includes(section.id);
          const hasContent = sectionHasContent(section.id, normalized);
          return (
            <section className="rounded-md border border-white/10 bg-card/30" key={section.id}>
              <button
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
                onClick={() => setExpanded((current) => open ? current.filter((item) => item !== section.id) : [section.id])}
                type="button"
              >
                <span className="w-5 text-xs text-muted-foreground">{index + 1}.</span>
                {hasContent ? <CheckCircleIcon className="size-4 text-emerald-300" /> : <CircleIcon className="size-4 text-muted-foreground" />}
                <span className="flex-1 text-sm font-medium">{section.title}</span>
                <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <motion.div animate={{ opacity: 1, height: "auto" }} className="overflow-hidden border-t border-white/10 px-3 py-3" initial={{ opacity: 0, height: 0 }}>
                  <ReviewSectionContent id={section.id} review={normalized} />
                </motion.div>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}

function ReviewSectionContent({ id, review }: { id: ReviewSectionId; review: ReturnType<typeof normalizeReview> }) {
  if (id === "overview") {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniMetric label="Trades" value={String(review.overview.trades)} />
        <MiniMetric label="Win Rate" value={`${review.overview.winRate}%`} />
        <MiniMetric label="Total P&L" value={formatMoney(review.overview.pnl)} />
        <MiniMetric label="Key Finding" value={review.overview.keyFinding} />
      </div>
    );
  }
  if (id === "trades") {
    return review.trades.length ? (
      <div className="space-y-2">
        {review.trades.map((trade, index) => (
          <div className="grid gap-2 rounded-md border border-white/10 p-3 text-sm sm:grid-cols-[1fr_90px_90px_1fr]" key={`${trade.asset}-${index}`}>
            <span>{trade.direction} {trade.asset}</span>
            <span className={Number(trade.pnl) >= 0 ? "text-emerald-300" : "text-red-300"}>{formatMoney(trade.pnl)}</span>
            <span>{trade.confidence ?? "B"}</span>
            <span className="text-muted-foreground">{trade.errorTag ?? "No major error"}</span>
          </div>
        ))}
      </div>
    ) : <EmptySection text="No trade-level analysis yet." />;
  }
  if (id === "errors") {
    return review.errors.length ? (
      <div className="grid gap-2 sm:grid-cols-2">
        {review.errors.map((error) => <InfoCard badge={error.severity} key={error.title} text={error.context} title={`${error.title} · ${error.frequency}x`} />)}
      </div>
    ) : <EmptySection text="No recurring errors detected." />;
  }
  if (id === "suggestions") {
    return review.suggestions.length ? (
      <div className="grid gap-2 sm:grid-cols-2">
        {review.suggestions.map((suggestion) => <InfoCard badge={suggestion.category} key={suggestion.title} text={suggestion.description} title={suggestion.title} />)}
      </div>
    ) : <EmptySection text="No improvement suggestions yet." />;
  }
  if (id === "emotion") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {review.emotions.map((emotion) => <span className={`rounded-full px-2 py-1 text-xs ${emotionTone(emotion.label)}`} key={emotion.label}>{emotion.label} {emotion.count}</span>)}
        </div>
        <p className="text-sm text-muted-foreground">{review.emotionInsight}</p>
      </div>
    );
  }
  if (id === "rules") {
    return review.rules.length ? (
      <div className="space-y-2">
        {review.rules.map((rule) => (
          <div className="flex items-start gap-3 rounded-md border border-white/10 p-3 text-sm" key={rule.rule}>
            <span className={rule.passed ? "text-emerald-300" : "text-red-300"}>{rule.passed ? "Pass" : "Fail"}</span>
            <div>
              <div className="font-medium">{rule.rule}</div>
              <div className="text-muted-foreground">{rule.example}</div>
            </div>
          </div>
        ))}
      </div>
    ) : <EmptySection text="No rules evaluated yet." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MiniMetric label="This week" value={review.history.thisWeek} />
      <MiniMetric label="Last week" value={review.history.lastWeek} />
      <MiniMetric label="All-time" value={review.history.allTime} />
    </div>
  );
}

function normalizeReview(report: any, review: any) {
  const overview = report.overview ?? report.metadata ?? {};
  const metadata = report.metadata ?? {};
  const tradeItems = report.tradeAnalyses?.items ?? report.tradeAnalyses ?? [];
  const errorItems = report.errorSummary?.items ?? report.errorSummary ?? [];
  const suggestionItems = report.suggestions?.items ?? report.suggestions ?? [];
  const emotionItems = report.emotionAnalysis?.distribution ?? report.emotionAnalysis?.items ?? [];
  const ruleItems = report.ruleCompliance?.items ?? report.ruleCompliance ?? [];
  return {
    overview: {
      period: overview.period ?? review.period,
      model: overview.model ?? metadata.model ?? (metadata.aiDriven ? "unknown provider" : undefined),
      trades: overview.trades ?? tradeItems.length ?? 0,
      winRate: Math.round(Number(overview.winRate ?? overview.win_rate ?? 0) * (Number(overview.winRate ?? overview.win_rate ?? 0) <= 1 ? 100 : 1)),
      pnl: Number(overview.pnl ?? overview.totalPnl ?? review.pnl ?? 0),
      keyFinding: overview.keyFinding ?? review.summary ?? report.summary ?? "Review generated. Expand sections for details.",
    },
    trades: asArray(tradeItems).map((item: any) => ({
      direction: item.direction ?? item.trade?.direction ?? "TRADE",
      asset: item.asset ?? item.trade?.asset ?? item.title ?? "Decision",
      pnl: Number(item.pnl ?? item.trade?.pnl ?? 0),
      confidence: item.confidence ?? item.trade?.confidence,
      errorTag: item.errorTag ?? item.error ?? item.lesson,
    })),
    errors: asArray(errorItems).map((item: any) => ({
      title: item.title ?? item.error ?? "Decision error",
      frequency: item.frequency ?? item.count ?? 1,
      severity: item.severity ?? item.priority ?? "medium",
      context: item.context ?? item.description ?? "Review flagged this pattern for attention.",
    })),
    suggestions: asArray(suggestionItems).map((item: any) => ({
      title: item.title ?? "Improvement suggestion",
      category: item.category ?? "behavioral",
      description: item.description ?? item.ruleText ?? item.summary ?? "Turn this lesson into a decision rule.",
    })),
    emotions: asArray(emotionItems).length ? asArray(emotionItems).map((item: any) => ({
      label: item.label ?? item.mood ?? String(item.emotion ?? "Neutral"),
      count: item.count ?? item.value ?? 1,
    })) : [{ label: "Neutral", count: 1 }],
    emotionInsight: report.emotionAnalysis?.insight ?? report.emotionAnalysis?.summary ?? "Emotion data is still sparse; keep journaling pressure and mood.",
    rules: asArray(ruleItems).map((item: any) => ({
      rule: item.rule ?? item.title ?? item.key ?? "Trading rule",
      passed: Boolean(item.passed ?? item.compliant ?? false),
      example: item.example ?? item.description ?? "No example captured.",
    })),
    history: {
      thisWeek: report.historicalComparison?.thisWeek ?? "n/a",
      lastWeek: report.historicalComparison?.lastWeek ?? "n/a",
      allTime: report.historicalComparison?.allTime ?? "n/a",
    },
  };
}

function sectionHasContent(id: ReviewSectionId, review: ReturnType<typeof normalizeReview>) {
  if (id === "overview") return true;
  if (id === "trades") return review.trades.length > 0;
  if (id === "errors") return review.errors.length > 0;
  if (id === "suggestions") return review.suggestions.length > 0;
  if (id === "emotion") return review.emotions.length > 0;
  if (id === "rules") return review.rules.length > 0;
  return true;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function InfoCard({ title, text, badge }: { title: string; text: string; badge: string }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <span className="rounded border border-amber-400/25 px-2 py-0.5 text-xs text-amber-200">{badge}</span>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function emotionTone(label: string) {
  const lower = label.toLowerCase();
  if (/fomo|greed/.test(lower)) return "bg-orange-500/20 text-orange-300";
  if (/overconfident/.test(lower)) return "bg-yellow-500/20 text-yellow-300";
  if (/fear|panic/.test(lower)) return "bg-blue-500/20 text-blue-300";
  if (/bored|apathetic/.test(lower)) return "bg-purple-500/20 text-purple-300";
  if (/analytical/.test(lower)) return "bg-cyan-500/20 text-cyan-300";
  return "bg-gray-500/20 text-gray-300";
}
