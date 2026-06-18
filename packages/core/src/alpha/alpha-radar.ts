export type AlphaSignalCategory = "sports" | "politics" | "crypto" | "macro" | "entertainment";
export type AlphaSignalSource = "polymarket" | "news" | "community" | "composite";

export interface AlphaSignal {
  id: string;
  title: string;
  category: AlphaSignalCategory;
  source: AlphaSignalSource;
  currentValue: string;
  change24h: string;
  volume: string;
  riskRating: 1 | 2 | 3 | 4;
  reasoning: string;
  marketId?: string;
  newsUrls?: string[];
  redditUrls?: string[];
  expiresAt?: string;
}

export function alphaCategory(value: string | undefined): AlphaSignalCategory {
  const text = (value ?? "").toLowerCase();
  if (text.includes("sport")) return "sports";
  if (text.includes("politic") || text.includes("election")) return "politics";
  if (text.includes("crypto") || text.includes("bitcoin") || text.includes("ethereum")) return "crypto";
  if (text.includes("macro") || text.includes("fed") || text.includes("econom")) return "macro";
  return "entertainment";
}

export function formatUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
