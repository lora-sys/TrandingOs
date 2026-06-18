/**
 * Xueqiu (雪球) — stock quotes, search, trending posts & hot stocks.
 * Pure HTTP API port from Agent-Reach Python channel.
 * Requires cookie auth (xq_a_token) for full functionality.
 */

const XUEQIU_STOCK_BASE = "https://stock.xueqiu.com/v5/stock";
const XUEQIU_SEARCH_BASE = "https://xueqiu.com/stock/search.json";
const XUEQIU_STATUS_BASE = "https://xueqiu.com/v4/statuses";
const XUEQIU_HOME = "https://xueqiu.com";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36";
const REFERER = "https://xueqiu.com/";
const TIMEOUT_MS = 15_000;

// ---------- cookie management ---------- //

let cookieHeader = "";
let cookiesReady = false;

export function setXueqiuCookie(cookieStr: string) {
  cookieHeader = cookieStr.trim();
  cookiesReady = true;
}

function getXueqiuHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: REFERER,
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return headers;
}

async function fetchJson<T>(url: string | URL, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: getXueqiuHeaders(),
    });
    if (!response.ok) throw new Error(`Xueqiu HTTP ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- types ---------- //

export interface XueqiuStockQuote {
  symbol: string;
  name: string;
  current: number | null;
  percent: number | null;
  chg: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  last_close: number | null;
  volume: number | null;
  amount: number | null;
  market_capital: number | null;
  turnover_rate: number | null;
  pe_ttm: number | null;
  timestamp: number | null;
}

export interface XueqiuSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface XueqiuHotPost {
  id: number;
  title: string;
  text: string;
  author: string;
  likes: number;
  url: string;
}

export interface XueqiuHotStock {
  symbol: string;
  name: string;
  current: number | null;
  percent: number | null;
  rank: number;
}

// ---------- public API ---------- //

/**
 * Get real-time stock quote.
 * @param symbol Stock code e.g. SH600519 (Shanghai), SZ000858 (Shenzhen), AAPL (US), 00700 (HK)
 */
export async function getStockQuote(symbol: string, signal?: AbortSignal): Promise<XueqiuStockQuote> {
  const data = await fetchJson<{ data?: { items?: Array<{ quote?: Record<string, unknown> }> } }>(
    `${XUEQIU_STOCK_BASE}/batch/quote.json?symbol=${encodeURIComponent(symbol)}`,
    signal,
  );
  const items = data?.data?.items ?? [];
  const q = items[0]?.quote ?? {};
  return {
    symbol: String(q.symbol ?? symbol),
    name: String(q.name ?? ""),
    current: num(q.current),
    percent: num(q.percent),
    chg: num(q.chg),
    high: num(q.high),
    low: num(q.low),
    open: num(q.open),
    last_close: num(q.last_close),
    volume: num(q.volume),
    amount: num(q.amount),
    market_capital: num(q.market_capital),
    turnover_rate: num(q.turnover_rate),
    pe_ttm: num(q.pe_ttm),
    timestamp: Number(q.timestamp) || null,
  };
}

/**
 * Search stocks by code or Chinese name.
 * @param query e.g. "茅台", "600519"
 */
export async function searchStock(query: string, limit = 10, signal?: AbortSignal): Promise<XueqiuSearchResult[]> {
  const data = await fetchJson<{ stocks?: Array<{ code?: string; name?: string; exchange?: string }> }>(
    `${XUEQIU_SEARCH_BASE}?code=${encodeURIComponent(query)}&size=${limit}`,
    signal,
  );
  return (data.stocks ?? []).slice(0, limit).map((s) => ({
    symbol: s.code ?? "",
    name: s.name ?? "",
    exchange: s.exchange ?? "",
  }));
}

/**
 * Get hot posts from Xueqiu community timeline.
 */
export async function getHotPosts(limit = 20, signal?: AbortSignal): Promise<XueqiuHotPost[]> {
  const data = await fetchJson<{ list?: Array<{ data?: string }> }>(
    `${XUEQIU_STATUS_BASE}/public_timeline_by_category.json?since_id=-1&max_id=-1&count=20&category=-1`,
    signal,
  );
  const items = data.list ?? [];
  const results: XueqiuHotPost[] = [];

  for (const item of items.slice(0, limit)) {
    try {
      const post = typeof item.data === "string" ? JSON.parse(item.data) : {};
      const user = post.user ?? {};
      const text = stripHtml(post.text ?? post.description ?? "");
      const target = post.target ?? "";
      results.push({
        id: post.id ?? 0,
        title: post.title ?? "",
        text: text.slice(0, 200),
        author: user.screen_name ?? "",
        likes: post.like_count ?? 0,
        url: target ? `https://xueqiu.com${target}` : "",
      });
    } catch {
      // skip malformed entries
    }
  }

  return results;
}

/**
 * Get hot stock rankings.
 * @param stockType 10=popularity (default), 12=following
 */
export async function getHotStocks(limit = 10, stockType = 10, signal?: AbortSignal): Promise<XueqiuHotStock[]> {
  const data = await fetchJson<{ data?: { items?: Array<Record<string, unknown>> } }>(
    `${XUEQIU_STOCK_BASE}/hot_stock/list.json?size=${limit}&type=${stockType}`,
    signal,
  );
  const items = data?.data?.items ?? [];
  return items.slice(0, limit).map((item, idx) => ({
    symbol: String(item.code ?? item.symbol ?? ""),
    name: String(item.name ?? ""),
    current: num(item.current),
    percent: num(item.percent),
    rank: idx + 1,
  }));
}

/**
 * Health check — verify the Xueqiu API is reachable and responding.
 */
export async function checkXueqiuHealth(signal?: AbortSignal): Promise<{ status: "ok" | "warn" | "error"; message: string }> {
  try {
    const data = await fetchJson<{ data?: { items?: unknown[] } }>(
      `${XUEQIU_STOCK_BASE}/batch/quote.json?symbol=SH000001`,
      signal,
    );
    const items = data?.data?.items ?? [];
    if (items.length > 0) return { status: "ok", message: "Public API available" };
    return { status: "warn", message: "API returned empty data" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- helpers ---------- //

function num(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
