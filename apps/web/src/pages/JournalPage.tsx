/**
 * JournalPage — thin orchestrator.
 *
 * All sub-components, utilities, and types extracted to pages/journal/.
 * This file owns only: state, queries, data-flow wiring, and layout composition.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DownloadIcon,
  FileDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { tradingPiApi } from "@/api/client";
import { JournalEntryCard, type JournalCardTrade } from "@/components/mvp";
import { formatSignedMoney } from "@/lib/formatters";

// ─── Extracted modules ──────────────────────────────────

import { dateRanges, type NormalizedEntry } from "./journal/journal-types";
import {
  deriveJournalMetrics,
  matchesDateRange,
  normalizeEntry,
  normalizeTrade,
  outcomeForTrade,
  sortNewestFirst,
  workspaceName,
} from "./journal/journal-utils";
import { downloadCsv, downloadMarkdown } from "./journal/journal-export";
import { Metric } from "./journal/Metric";
import { AddEntryForm } from "./journal/AddEntryForm";

export function JournalPage() {
  const queryClient = useQueryClient();
  const [assetQuery, setAssetQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newWorkspaceId, setNewWorkspaceId] = useState("global");
  const [newMood, setNewMood] = useState("Analytical");
  const [newDiscipline, setNewDiscipline] = useState(75);
  const [newNotes, setNewNotes] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // ─── Data fetching ────────────────────────────────────

  const { data: journalData, isLoading: journalLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: () => tradingPiApi.journal().catch(() => []),
  });
  const { data: workspaceData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => tradingPiApi.workspaces().catch(() => []),
  });
  const { data: tradeData } = useQuery({
    queryKey: ["paper-trades"],
    queryFn: () => tradingPiApi.paperTrades().catch(() => []),
  });

  // ─── Derived data ─────────────────────────────────────

  const workspaces = Array.isArray(workspaceData) ? workspaceData : [];
  const trades = Array.isArray(tradeData)
    ? tradeData.map(normalizeTrade)
    : [];
  const tradeById = useMemo(
    () => new Map(trades.map((trade) => [trade.id, trade])),
    [trades],
  );
  const entries = useMemo(
    () =>
      Array.isArray(journalData)
        ? journalData.map(normalizeEntry).sort(sortNewestFirst)
        : [],
    [journalData],
  );

  // ─── Filtering & metrics ──────────────────────────────

  const filtered = useMemo(() => {
    const now = Date.now();
    const textNeedle = assetQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const trade = entry.paperTradeId
        ? tradeById.get(entry.paperTradeId)
        : undefined;
      if (workspaceFilter !== "all" && entry.workspaceId !== workspaceFilter)
        return false;
      if (outcomeFilter !== "all" && outcomeForTrade(trade) !== outcomeFilter)
        return false;
      if (!matchesDateRange(entry.createdAt, rangeFilter, now)) return false;
      if (textNeedle) {
        const haystack = [
          entry.rawNotes,
          entry.mood,
          entry.decisionId,
          entry.paperTradeId,
          trade?.asset,
          trade?.direction,
          workspaceName(workspaces, entry.workspaceId),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(textNeedle)) return false;
      }
      return true;
    });
  }, [assetQuery, entries, outcomeFilter, rangeFilter, tradeById, workspaceFilter, workspaces]);

  const metrics = useMemo(
    () => deriveJournalMetrics(filtered, tradeById),
    [filtered, tradeById],
  );

  // ─── Render ───────────────────────────────────────────

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      {/* Header + export actions */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Global timeline across every workspace, decision, and paper-trade
            reflection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:border-cyan-400/40"
            onClick={() =>
              downloadCsv(filtered, tradeById as Map<string, JournalCardTrade>, workspaces)
            }
            type="button"
          >
            <FileDownIcon className="size-4" />
            Export CSV
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:border-cyan-400/40"
            onClick={() =>
              downloadMarkdown(filtered, tradeById as Map<string, JournalCardTrade>, workspaces)
            }
            type="button"
          >
            <DownloadIcon className="size-4" />
            Export Markdown
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black"
            onClick={() => setAddOpen((value) => !value)}
            type="button"
          >
            {addOpen ? (
              <XIcon className="size-4" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            {addOpen ? "Close" : "Add Entry"}
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <section className="mb-4 grid gap-3 md:grid-cols-5">
        <Metric label="Total entries" value={String(metrics.entries)} />
        <Metric
          label="Win rate"
          value={`${Math.round(metrics.winRate * 100)}%`}
        />
        <Metric
          label="Total P&L"
          value={formatSignedMoney(metrics.pnl)}
          tone={metrics.pnl >= 0 ? "positive" : "negative"}
        />
        <Metric label="Best trade" value={metrics.bestTrade} tone="positive" />
        <Metric
          label="Worst trade"
          value={metrics.worstTrade}
          tone={metrics.worstTrade === "n/a" ? undefined : "negative"}
        />
      </section>

      {/* Filter bar */}
      <section className="mb-4 rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_150px_150px]">
          <label className="relative block">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none focus:border-cyan-400/50"
              onChange={(event) => setAssetQuery(event.target.value)}
              placeholder="Search asset, mood, thesis, workspace..."
              value={assetQuery}
            />
          </label>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
            onChange={(event) => setWorkspaceFilter(event.target.value)}
            value={workspaceFilter}
          >
            <option value="all">All workspaces</option>
            {workspaces.map((workspace: any) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
            onChange={(event) => setOutcomeFilter(event.target.value)}
            value={outcomeFilter}
          >
            <option value="all">All outcomes</option>
            <option value="open">Open</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
            onChange={(event) => setRangeFilter(event.target.value)}
            value={rangeFilter}
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Add entry form */}
      <AddEntryForm
        open={addOpen}
        workspaces={workspaces}
        newWorkspaceId={newWorkspaceId}
        setNewWorkspaceId={setNewWorkspaceId}
        newMood={newMood}
        setNewMood={setNewMood}
        newDiscipline={newDiscipline}
        setNewDiscipline={setNewDiscipline}
        newNotes={newNotes}
        setNewNotes={setNewNotes}
      />

      {/* Entry list */}
      <section className="space-y-3">
        {journalLoading ? (
          <div className="rounded-lg border bg-card/70 p-6 text-sm text-muted-foreground">
            Loading journal timeline...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-card/70 p-6 text-sm text-muted-foreground">
            No journal entries match this view.
          </div>
        ) : (
          filtered.map((entry, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 6 }}
              key={entry.id}
              transition={{ delay: index * 0.02 }}
            >
              <JournalEntryCard
                entry={entry}
                expanded={expanded === entry.id}
                onToggle={() =>
                  setExpanded((current) =>
                    current === entry.id ? null : entry.id,
                  )
                }
                trade={
                  entry.paperTradeId
                    ? tradeById.get(entry.paperTradeId)
                    : undefined
                }
                workspaceName={workspaceName(workspaces, entry.workspaceId)}
              />
            </motion.div>
          ))
        )}
      </section>
    </main>
  );
}
