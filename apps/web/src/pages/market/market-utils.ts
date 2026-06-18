import { formatChange, formatDate } from "@/lib/formatters";
import type { ActivePosition, MarketDetailData, PriceCandle } from "@/components/mvp";
import type { NormalizedMarket } from "./types";

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return value > 1 ? Math.min(1, value / 100) : Math.max(0, Math.min(1, value));
}

export function fallbackPrice(symbol: string) {
  if (symbol.startsWith("BTC")) return 67_000;
  if (symbol.startsWith("ETH")) return 3_400;
  if (symbol.startsWith("SOL")) return 142;
  if (symbol.startsWith("BNB")) return 610;
  return 100;
}

export function cryptoTitle(symbol: string) {
  const base = symbol.split("/")[0];
  const names: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", BNB: "BNB" };
  return `${names[base] ?? base} (${base})`;
}

export function cryptoRank(symbol: string) {
  if (symbol.startsWith("BTC")) return 1;
  if (symbol.startsWith("ETH")) return 2;
  if (symbol.startsWith("BNB")) return 4;
  if (symbol.startsWith("SOL")) return 6;
  return "n/a";
}

export function normalizeAsset(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function parseOutcomePrices(market: any) {
  const raw = Array.isArray(market.outcomePrices)
    ? market.outcomePrices
    : typeof market.outcomePrices === "string"
      ? safeJson(market.outcomePrices, [])
      : [];
  const yes = Number(raw[0] ?? market.yesPrice ?? market.bestBid ?? 0.5);
  const no = Number(raw[1] ?? market.noPrice ?? (Number.isFinite(yes) ? 1 - yes : 0.5));
  return { yes: clamp01(yes), no: clamp01(no) };
}

export function normalizeMarkets(data: any): NormalizedMarket[] {
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.markets)
      ? data.markets
      : Array.isArray(data?.data)
        ? data.data
        : [];
  return source.map((market: any, index: number) => {
    const prices = parseOutcomePrices(market);
    return {
      id: String(market.id ?? market.conditionId ?? market.slug ?? index),
      title: String(market.question ?? market.title ?? market.name ?? "Untitled market"),
      yes: prices.yes,
      no: prices.no,
      volume: Number(market.volume ?? market.volumeNum ?? market.volumeUsd ?? market.liquidity ?? 0),
      change24h: Number(market.oneDayPriceChange ?? market.change24h ?? market.priceChange24h ?? 0),
      settlement: formatDate(market.endDate ?? market.end_date ?? market.expiration ?? market.closedTime),
      category: market.category ?? market.tags?.[0],
      raw: market,
    };
  });
}

export function toCryptoDetail(
  market: { symbol: string; candles: any[] },
  price: number,
  change: number,
  title: string,
): MarketDetailData {
  const latest = market.candles[0] ?? {};
  const closes = market.candles.map((item) => Number(item.close ?? 0)).filter(Number.isFinite);
  return {
    id: `crypto:${market.symbol}`,
    type: "crypto",
    title,
    subtitle: market.symbol,
    symbol: market.symbol,
    price,
    change24h: change,
    volume: Number(latest.volume ?? 0),
    candles: market.candles,
    metrics: {
      marketCap: price * 120_000_000,
      rank: cryptoRank(market.symbol),
      high: closes.length ? Math.max(...closes) : price * 1.04,
      low: closes.length ? Math.min(...closes) : price * 0.96,
      ath: price * 1.2,
    },
  };
}

export function toPredictionDetail(market: NormalizedMarket): MarketDetailData {
  return {
    id: `prediction:${market.id}`,
    type: "prediction",
    title: market.title,
    subtitle: market.settlement ? `Settlement ${market.settlement}` : "Prediction market",
    price: market.yes * 100,
    change24h: market.change24h,
    volume: market.volume,
    yes: market.yes,
    no: market.no,
    category: market.category,
    settlement: market.settlement,
    candles: syntheticOddsCandles(market.yes * 100, 90),
    metrics: {
      marketCap: market.volume,
      rank: market.category ?? "P1",
      high: Math.min(99, market.yes * 100 + 8),
      low: Math.max(1, market.yes * 100 - 8),
      ath: Math.min(99, market.yes * 100 + 16),
    },
  };
}

export function findActivePosition(trades: any[], market: MarketDetailData): ActivePosition | null {
  const normalizedSymbol = normalizeAsset(market.symbol ?? market.title);
  const trade = trades.find(
    (item) => item.status === "open" && normalizeAsset(item.asset) === normalizedSymbol,
  );
  if (!trade) return null;
  return {
    id: trade.id,
    direction: trade.direction,
    asset: trade.asset,
    entryPrice: Number(trade.entryPrice ?? trade.entry_price ?? market.price),
    positionSize: Number(trade.positionSize ?? trade.position_size ?? 1),
    entryTime: trade.entryTime ?? trade.entry_time ?? new Date().toISOString(),
  };
}

export function normalizeSparkline(candles: PriceCandle[], fallback: number) {
  const values = (candles.length ? candles : syntheticOddsCandles(fallback, 18))
    .slice(0, 18)
    .reverse()
    .map((item) => Number(item.close ?? fallback));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  return values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * 120,
    y: 40 - ((value - min) / span) * 34,
    value,
  }));
}

export function syntheticOddsCandles(baseValue: number, count: number): PriceCandle[] {
  return Array.from({ length: count }).map((_, index) => {
    const close = Math.max(1, Math.min(99, baseValue + Math.sin(index / 3) * 4 + Math.cos(index / 5) * 2));
    return {
      timestamp: Date.now() - index * 86_400_000,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close,
      volume: 500 + index * 17,
    };
  });
}
