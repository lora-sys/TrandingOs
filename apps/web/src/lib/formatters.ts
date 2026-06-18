/**
 * Unified formatting utilities for Trading Pi OS frontend.
 *
 * All formatters live here — do NOT duplicate them in page files or components.
 * Previously scattered across 8+ files (WorkspaceOverview, ReviewAccordion,
 * JournalEntryCard, TimelineEventCard, MarketDetailSidebar, chat-item-view,
 * MarketPage, format-utils.ts).
 */

// ─── Money ──────────────────────────────────────────────

/** Format as USD with B/M/K shorthand. Returns "n/a" for non-finite input. */
export function formatUsd(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "n/a";
  if (numeric >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(1)}B`;
  if (numeric >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 1_000) return `$${(numeric / 1_000).toFixed(1)}K`;
  return `$${numeric.toFixed(numeric >= 100 ? 0 : 2)}`;
}

/** Format as signed money with +/- prefix and K/M shorthand. E.g. "+$1.2M" or "-$234.00". */
export function formatMoney(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0.00";
  const abs = Math.abs(numeric);
  const prefix = numeric < 0 ? "-$" : "$";
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}${abs.toFixed(2)}`;
}

/** Format as compact signed money (always 2 decimals, no K/M shorthand). E.g. "+$1234.56". */
export function formatSignedMoney(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0.00";
  return `${numeric >= 0 ? "+" : "-"}$${Math.abs(numeric).toFixed(2)}`;
}

// ─── Percentages ───────────────────────────────────────

/** Format percentage change with +/- prefix. Returns "flat" for non-finite input. */
export function formatChange(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "flat";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

/** Format raw percentage value. Returns "flat" for non-finite input. */
export function formatPercent(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "flat";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

// ─── Dates & Times ─────────────────────────────────────

/** Format date portion only. Returns fallback for invalid input. */
export function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

/** Format full date + time. Returns "recently" for empty/invalid input. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

/** Format relative time ago. Returns "recently" for invalid/future input. */
export function formatSince(value: unknown): string {
  if (!value) return "recently";
  const ms = Date.now() - new Date(String(value)).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "recently";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Misc ──────────────────────────────────────────────

/** Truncate ID/string for display. */
export function shortId(value: string, maxLen = 14): string {
  return value.length > maxLen ? `${value.slice(0, maxLen - 3)}...` : value;
}

/** Format score/numeric to 1 decimal place. Returns "n/a" for non-finite input. */
export function formatScore(value: unknown): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "n/a";
}
