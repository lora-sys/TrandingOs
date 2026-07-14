import { randomUUID } from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function id(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function directionSign(direction: string): number {
  return direction === "SHORT" || direction === "NO" ? -1 : 1;
}

export function appendSettlementNotes(
  existing: string,
  settlement: { exitPrice: number; exitTime: string; pnl: number; pnlPercent: number; settlementReason: string },
): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(existing) as Record<string, unknown>;
  } catch {
    parsed = { notes: existing };
  }
  parsed.dimension1TradeData = {
    ...((parsed.dimension1TradeData as Record<string, unknown>) ?? {}),
    exitPrice: settlement.exitPrice,
    exitTime: settlement.exitTime,
    pnl: settlement.pnl,
    pnlPercent: settlement.pnlPercent,
    settlementReason: settlement.settlementReason,
    status: "closed",
  };
  return JSON.stringify(parsed, null, 2);
}

// Domain row interfaces used by the per-domain repos.

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  topic_type: string | null;
  topic_ref: string | null;
  creator_session_id: string | null;
  is_default: number;
  context_json: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionRow {
  id: string;
  workspace_id: string | null;
  topic: string;
  direction: "YES" | "NO" | "LONG" | "SHORT" | "HOLD";
  position_size: number;
  confidence: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
  risk_level: "A" | "B" | "C" | "D";
  supporting_reasons_json: string;
  against_reasons_json: string;
  thesis: string;
  invalidation_criteria: string;
  rule_compliance_json: string;
  status: "pending" | "executed" | "settled_win" | "settled_loss" | "invalidated" | "expired";
  executed_at: string | null;
  settled_at: string | null;
  result_pnl: number | null;
  review_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  id: string;
  session_id: string | null;
  workspace_id: string | null;
  period: string;
  metrics_json: string;
  discipline_score: number;
  summary: string;
  report_json: string;
  artifact_id: string | null;
  created_at: string;
}

export interface EvolutionSuggestionRow {
  id: string;
  workspace_id: string | null;
  review_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  rule_text: string | null;
  source_json: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchSessionRow {
  id: string;
  workspace_id: string | null;
  topic: string;
  mode: "builtin";
  status: "running" | "completed" | "failed" | "cancelled";
  total_iterations: number;
  completed_iterations: number;
  report_artifact_id: string | null;
  token_usage_json: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface PaperTradeRow {
  id: string;
  decision_id: string;
  workspace_id: string;
  direction: string;
  asset: string;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  pnl: number | null;
  pnl_percent: number | null;
  entry_time: string;
  exit_time: string | null;
  status: "open" | "closed" | "cancelled";
  settlement_reason: string | null;
  journal_entry_id: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  amended_at: string | null;
  realized_pnl: number;
}