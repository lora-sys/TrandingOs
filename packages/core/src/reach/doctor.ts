/**
 * reach.doctor — Aggregated data source health check.
 * Probes all configured data sources and returns unified status report.
 */

import { DATA_SOURCE_TIMEOUTS } from "../config/timeouts.js";

// ---------- types ---------- //

export type SourceStatus = "ok" | "warn" | "error" | "off" | "rate_limited";

export interface DataSourceStatus {
  id: string;
  name: string;
  status: SourceStatus;
  latencyMs?: number;
  message: string;
}

export interface DoctorReport {
  checkedAt: string;
  overall: "healthy" | "degraded" | "critical";
  sources: DataSourceStatus[];
}

// ---------- helpers ---------- //

interface CheckResult {
  status: SourceStatus;
  latencyMs?: number;
  message: string;
}

async function probeUrl(url: string, timeoutMs: number, options?: RequestInit): Promise<CheckResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, ...options });
    const latency = Date.now() - start;
    clearTimeout(timer);

    if (response.status === 429) return { status: "rate_limited", latencyMs: latency, message: `HTTP 429 — rate limited` };
    if (response.status === 403) return { status: "error", latencyMs: latency, message: `HTTP 403 — forbidden (possibly blocked/throttled)` };
    if (response.status === 401) return { status: "off", latencyMs: latency, message: `HTTP 401 — not authenticated (API key missing or invalid)` };
    if (!response.ok) return { status: "error", latencyMs: latency, message: `HTTP ${response.status}` };

    // Try to parse JSON to confirm body is valid
    try {
      const text = await response.text();
      JSON.parse(text); // validate it's parseable
      return { status: "ok", latencyMs: latency, message: `OK (${latency}ms)` };
    } catch {
      return { status: "ok", latencyMs: latency, message: `OK (${latency}ms, non-JSON body)` };
    }
  } catch (err) {
    clearTimeout(timer);
    const latency = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { status: "error", latencyMs: latency, message: `Timeout after ${timeoutMs}ms` };
    }
    // DNS / network failure
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("fetch failed")) {
      return { status: "error", latencyMs: latency, message: `Network error: ${msg.slice(0, 120)}` };
    }
    return { status: "error", latencyMs: latency, message: msg.slice(0, 200) };
  }
}

// ---------- per-source checks ---------- //

async function checkPolymarket(): Promise<DataSourceStatus> {
  const result = await probeUrl(
    "https://gamma-api.polymarket.com/markets?limit=1&active=true",
    DATA_SOURCE_TIMEOUTS.polymarket,
  );
  return { id: "polymarket", name: "Polymarket (Gamma API)", ...result };
}

async function checkCoinGecko(): Promise<DataSourceStatus> {
  const result = await probeUrl(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    DATA_SOURCE_TIMEOUTS.coingecko,
  );
  return { id: "coingecko", name: "CoinGecko", ...result };
}

async function checkCoinMarketCap(apiKey?: string): Promise<DataSourceStatus> {
  if (!apiKey) return { id: "coinmarketcap", name: "CoinMarketCap", status: "off", message: "Not configured (COINMARKETCAP_API_KEY not set)" };
  const result = await probeUrl(
    "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC",
    DATA_SOURCE_TIMEOUTS.coinmarketcap,
    { headers: { "X-CMC_PRO_API_KEY": apiKey } },
  );
  return { id: "coinmarketcap", name: "CoinMarketCap", ...result };
}

async function checkDefiLlama(): Promise<DataSourceStatus> {
  const result = await probeUrl(
    "https://coins.llama.fi/prices/current/coingecko:bitcoin",
    DATA_SOURCE_TIMEOUTS.defillama,
  );
  return { id: "defillama", name: "DefiLlama", ...result };
}

async function checkFred(apiKey?: string): Promise<DataSourceStatus> {
  if (!apiKey) return { id: "fred", name: "FRED (Federal Reserve)", status: "warn", message: "Not configured (FRED_API_KEY not set) — running in fallback mode" };
  const result = await probeUrl(
    `https://api.stlouisfed.org/fred/series?series_id=FEDFUNDS&api_key=${encodeURIComponent(apiKey)}&file_type=json`,
    DATA_SOURCE_TIMEOUTS.fred,
  );
  return { id: "fred", name: "FRED (Federal Reserve)", ...result };
}

async function checkReddit(): Promise<DataSourceStatus> {
  const result = await probeUrl(
    "https://www.reddit.com/r/CryptoCurrency/hot.json?limit=1",
    DATA_SOURCE_TIMEOUTS.reddit,
    { headers: { "User-Agent": "TradingPi/0.1 (+https://local-first.trading-pi)" } },
  );
  // Reddit-specific: 429 → rate_limited, 403 → warn (increasingly blocked)
  if (result.status === "error" && result.message.includes("403")) {
    return { id: "reddit", name: "Reddit", status: "warn", latencyMs: result.latencyMs, message: "Public JSON API may be throttled/blocked by Reddit" };
  }
  return { id: "reddit", name: "Reddit", ...result };
}

// ---------- main entry point ---------- //

export interface DoctorOptions {
  /** FRED API key */
  fredApiKey?: string;
  /** CoinMarketCap API key */
  coinMarketCapApiKey?: string;
  /** Skip slow sources (Polymarket) for quick checks */
  fastMode?: boolean;
  /** External AbortSignal */
  signal?: AbortSignal;
}

/**
 * Run health check on all data sources.
 * Returns a DoctorReport with per-source status + overall system health.
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  if (options.signal?.aborted) throw new Error(options.signal.reason ?? "Aborted");

  // Run all checks in parallel (they're independent)
  const checks = [
    checkCoinGecko(),
    checkDefiLlama(),
    checkFred(options.fredApiKey),
    checkReddit(),
    checkCoinMarketCap(options.coinMarketCapApiKey),
  ];

  // Polymarket is slow in CN networks; skip in fast mode
  if (!options.fastMode) {
    checks.push(checkPolymarket());
  }

  const sources = await Promise.all(checks);

  // Derive overall status
  let overall: DoctorReport["overall"] = "healthy";
  for (const s of sources) {
    if (s.status === "error") { overall = "critical"; break; }
    if (s.status === "warn" || s.status === "rate_limited") overall = "degraded";
  }
  if (overall === "healthy" && sources.some((s) => s.status === "off")) overall = "degraded";

  return {
    checkedAt: new Date().toISOString(),
    overall,
    sources,
  };
}
