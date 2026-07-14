import { describe, expect, it, vi } from "vitest";

vi.mock("./ccxt.js", () => ({
  fetchCcxtTicker: vi.fn(async (exchange: string, symbol: string) => ({
    source: "ccxt",
    exchange,
    symbol,
    last: 1234.5,
    bid: 1234.0,
    ask: 1235.0,
    percentage: 1.5,
  })),
}));

vi.mock("./coingecko.js", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./coingecko.js");
  return actual;
});

const realFetch = globalThis.fetch;

describe("fetchCoinGeckoQuoteWithFallback", () => {
  it("returns the coingecko result when primary succeeds", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ ethereum: { usd: 2000, usd_24h_change: 1.0 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const { fetchCoinGeckoQuoteWithFallback } = await import("./coingecko.js");
    const result = await fetchCoinGeckoQuoteWithFallback("ETH");
    expect(result.source).toBe("coingecko");
    expect(result.priceUsd).toBe(2000);
    expect(result.change24h).toBe(1.0);
  });

  it("falls back to ccxt on coingecko HTTP error", async () => {
    globalThis.fetch = vi.fn(async () => new Response("rate limited", { status: 429 })) as unknown as typeof fetch;
    const { fetchCoinGeckoQuoteWithFallback } = await import("./coingecko.js");
    const { fetchCcxtTicker } = await import("./ccxt.js");
    const result = await fetchCoinGeckoQuoteWithFallback("ETH", undefined, { fallbackExchange: "binance" });
    expect("fallback" in result).toBe(true);
    if ("fallback" in result) {
      expect(result.source).toBe("ccxt:binance");
      expect(result.fallback).toBe(true);
      expect(result.priceUsd).toBe(1234.5);
      expect(result.primaryError).toMatch(/429/);
    }
    expect(vi.mocked(fetchCcxtTicker)).toHaveBeenCalledWith("binance", "ETH");
  });

  it("falls back to ccxt on network error", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    const { fetchCoinGeckoQuoteWithFallback } = await import("./coingecko.js");
    const result = await fetchCoinGeckoQuoteWithFallback("BTC", undefined, { fallbackExchange: "okx" });
    expect("fallback" in result).toBe(true);
    if ("fallback" in result) {
      expect(result.source).toBe("ccxt:okx");
      expect(result.fallback).toBe(true);
      expect(result.primaryError).toMatch(/ECONNREFUSED/);
    }
  });
});