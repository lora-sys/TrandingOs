import { DATA_SOURCE_TIMEOUTS } from "../config/timeouts.js";
import { fetchCcxtTicker } from "./ccxt.js";

export async function fetchCoinGeckoQuote(symbol: string, signal?: AbortSignal) {
  const id = mapSymbol(symbol);
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATA_SOURCE_TIMEOUTS.coingecko);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
    const json = (await response.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
    const quote = json[id];
    if (!quote) throw new Error(`CoinGecko did not return quote for ${symbol}`);
    return {
      source: "coingecko",
      symbol,
      assetId: id,
      priceUsd: quote.usd,
      change24h: quote.usd_24h_change ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export interface CoinGeckoFallbackOptions {
  /** Exchange to use as fallback (default: "binance"). Must be a ccxt-supported exchange. */
  fallbackExchange?: string;
  /** Max ms to wait for CoinGecko before falling back (default: DATA_SOURCE_TIMEOUTS.coingecko). */
  primaryTimeoutMs?: number;
}

/**
 * Try CoinGecko first; on any error (network, 4xx/5xx, missing symbol), fall
 * back to a CCXT ticker on the configured exchange. Returns a quote shaped
 * like fetchCoinGeckoQuote() with `source` set to whichever path succeeded.
 */
export async function fetchCoinGeckoQuoteWithFallback(
  symbol: string,
  signal?: AbortSignal,
  options: CoinGeckoFallbackOptions = {},
) {
  const fallbackExchange = options.fallbackExchange ?? "binance";
  try {
    return await fetchCoinGeckoQuote(symbol, signal);
  } catch (primaryErr) {
    const ticker = await fetchCcxtTicker(fallbackExchange, symbol);
    if (!ticker?.last) throw primaryErr; // both sources failed
    return {
      source: `ccxt:${fallbackExchange}`,
      symbol,
      assetId: symbol,
      priceUsd: Number(ticker.last),
      change24h: ticker.percentage ?? null,
      fetchedAt: new Date().toISOString(),
      fallback: true,
      primaryError: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
    };
  }
}

function mapSymbol(symbol: string) {
  const base = symbol.split("/")[0]?.toLowerCase() ?? symbol.toLowerCase();
  const map: Record<string, string> = {
    btc: "bitcoin",
    eth: "ethereum",
    sol: "solana",
    bnb: "binancecoin",
    xrp: "ripple",
    doge: "dogecoin",
  };
  return map[base] ?? base;
}
