import { DATA_SOURCE_TIMEOUTS } from "../config/timeouts.js";

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
