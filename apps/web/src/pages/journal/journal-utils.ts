/**
 * Journal utility functions — normalizers, filters, metrics, helpers.
 *
 * Extracted from JournalPage.tsx for testability and reuse.
 * These are pure functions with no React dependencies.
 */

import type { NormalizedEntry } from "./journal-types";
import type { JournalCardEntry, JournalCardTrade } from "@/components/mvp";
import { formatSignedMoney } from "@/lib/formatters";

// ─── Normalizers ────────────────────────────────────────

/** Normalize a raw journal API entry to NormalizedEntry shape */
export function normalizeEntry(entry: any): NormalizedEntry {
  return {
    id: entry.id,
    workspaceId: entry.workspace_id ?? entry.workspaceId ?? null,
    decisionId: entry.decision_id ?? entry.decisionId ?? null,
    paperTradeId: entry.paper_trade_id ?? entry.paperTradeId ?? null,
    mood: entry.mood ?? null,
    disciplineScore: Number(entry.discipline_score ?? entry.disciplineScore ?? 0),
    notes: entry.notes ?? "",
    rawNotes: entry.notes ?? "",
    createdAt: entry.created_at ?? entry.createdAt ?? null,
  };
}

/** Normalize a raw trade API entry to JournalCardTrade shape */
export function normalizeTrade(trade: any): JournalCardTrade {
  return {
    id: trade.id,
    direction: trade.direction,
    asset: trade.asset,
    entryPrice: numberOrUndefined(trade.entryPrice ?? trade.entry_price),
    exitPrice: numberOrUndefined(trade.exitPrice ?? trade.exit_price),
    positionSize: numberOrUndefined(trade.positionSize ?? trade.position_size),
    pnl: numberOrUndefined(trade.pnl),
    pnlPercent: numberOrUndefined(trade.pnlPercent ?? trade.pnl_percent),
    status: trade.status,
  };
}

// ─── Sorting & Filtering ───────────────────────────────

/** Sort entries newest-first by createdAt */
export function sortNewestFirst(a: NormalizedEntry, b: NormalizedEntry) {
  return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
}

/** Check if an entry's createdAt falls within the given date range */
export function matchesDateRange(value: string | null | undefined, range: string, now: number): boolean {
  if (range === "all") return true;
  const created = Date.parse(value ?? "");
  if (!Number.isFinite(created)) return false;
  if (range === "today") return new Date(created).toDateString() === new Date(now).toDateString();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return now - created <= days * 24 * 60 * 60 * 1000;
}

/** Derive outcome string from a trade's P&L and status */
export function outcomeForTrade(trade?: JournalCardTrade): string {
  if (!trade || trade.status === "open") return "open";
  const pnl = Number(trade.pnl ?? 0);
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "open";
}

// ─── Metrics ────────────────────────────────────────────

/** Derived journal metrics from filtered entries + trade lookup */
export interface JournalMetrics {
  entries: number;
  winRate: number;
  pnl: number;
  bestTrade: string;
  worstTrade: string;
}

export function deriveJournalMetrics(
  entries: NormalizedEntry[],
  tradeById: Map<string | undefined, JournalCardTrade>,
): JournalMetrics {
  const linkedTrades = entries
    .map((entry) => (entry.paperTradeId ? tradeById.get(entry.paperTradeId) : undefined))
    .filter(Boolean) as JournalCardTrade[];
  const closed = linkedTrades.filter((trade) => trade.status !== "open");
  const pnlValues = closed.map((trade) => Number(trade.pnl ?? 0)).filter(Number.isFinite);
  const wins = pnlValues.filter((pnl) => pnl > 0);
  return {
    entries: entries.length,
    winRate: pnlValues.length ? wins.length / pnlValues.length : 0,
    pnl: pnlValues.reduce((sum, value) => sum + value, 0),
    bestTrade: pnlValues.length ? formatSignedMoney(Math.max(...pnlValues)) : "n/a",
    worstTrade: pnlValues.length ? formatSignedMoney(Math.min(...pnlValues)) : "n/a",
  };
}

// ─── Helpers ────────────────────────────────────────────

/** Resolve workspace display name from ID */
export function workspaceName(workspaces: any[], workspaceId?: string | null): string {
  if (!workspaceId) return "Global";
  return workspaces.find((workspace) => workspace.id === workspaceId)?.name ?? workspaceId;
}

/** Convert unknown to number or undefined */
export function numberOrUndefined(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
