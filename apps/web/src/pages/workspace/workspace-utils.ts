/**
 * Workspace utility functions extracted from WorkspacePage.tsx.
 *
 * These were previously page-local but contain domain logic that should
 * be importable and testable independently.
 */

import type { JournalCardEntry, JournalCardTrade } from "@/components/mvp";

/** Metrics derived from decisions, trades, and journal entries */
export interface WorkspaceMetrics {
  decisionCount: number;
  winRate: number;
  previousWinRate: number;
  pnl: number;
  journalCount: number;
  wins: number;
  losses: number;
}

/** Normalize a raw journal API entry to JournalCardEntry shape */
export function normalizeJournalEntry(entry: any, workspaceId: string): JournalCardEntry {
  return {
    id: entry.id,
    workspaceId: entry.workspace_id ?? entry.workspaceId ?? workspaceId,
    decisionId: entry.decision_id ?? entry.decisionId ?? null,
    paperTradeId: entry.paper_trade_id ?? entry.paperTradeId ?? null,
    mood: entry.mood ?? null,
    disciplineScore: Number(entry.discipline_score ?? entry.disciplineScore ?? 0),
    notes: entry.notes ?? "",
    createdAt: entry.created_at ?? entry.createdAt ?? null,
  };
}

/** Normalize a raw paper-trade API entry to JournalCardTrade shape */
export function normalizeJournalTrade(trade: any): JournalCardTrade {
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

/** Derive aggregate metrics from decisions, trades, and journal */
export function deriveMetrics(decisions: any[], trades: any[], journal: any[]): WorkspaceMetrics {
  const settled = decisions.filter(
    (decision) => decision.status === "settled_win" || decision.status === "settled_loss",
  );
  const wins = settled.filter((decision) => decision.status === "settled_win").length;
  const losses = settled.filter((decision) => decision.status === "settled_loss").length;
  const pnl = trades.reduce((sum, trade) => sum + Number(trade.pnl ?? 0), 0);
  const previousSettled = settled.slice(1);
  const previousWins = previousSettled.filter(
    (decision) => decision.status === "settled_win",
  ).length;

  return {
    decisionCount: decisions.length,
    winRate: settled.length ? wins / settled.length : 0,
    previousWinRate: previousSettled.length ? previousWins / previousSettled.length : 0,
    pnl,
    journalCount: journal.length,
    wins,
    losses,
  };
}

/** Parse a maybe-JSON string safely */
export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Coerce a value to number or undefined if not finite */
export function numberOrUndefined(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
