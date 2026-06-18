const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const CLOB_BASE_URL = "https://clob.polymarket.com";
const DEFAULT_TIMEOUT_MS = 30_000;

export type PolymarketCategory = "sports" | "politics" | "crypto" | "macro" | "entertainment" | "other";

export interface PolymarketEvent {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface PolymarketToken {
  tokenId: string;
  outcome: string;
  price?: number | null;
}

export interface PolymarketMarket {
  id: string;
  conditionId: string;
  question: string;
  slug?: string;
  category: PolymarketCategory;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  change24h: number | null;
  endDate: string | null;
  outcomes: string[];
  outcomePrices: number[];
  tokens: PolymarketToken[];
  event?: PolymarketEvent;
  raw: unknown;
}

export interface PolymarketPrice {
  conditionId: string;
  yes: number | null;
  no: number | null;
  tokens: Array<{ tokenId: string; outcome: string; price: number | null }>;
  fetchedAt: string;
}

export interface PolymarketOrderbook {
  conditionId: string;
  tokenId: string;
  bids: PolymarketBookLevel[];
  asks: PolymarketBookLevel[];
  minOrderSize?: string;
  tickSize?: string;
  raw: unknown;
  fetchedAt: string;
}

export interface PolymarketBookLevel {
  price: number;
  size: number;
}

export interface PolymarketListOptions {
  active?: boolean;
  closed?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
  q?: string;
}

type GammaMarket = Record<string, unknown>;

export async function getPolymarketMarkets(options: PolymarketListOptions = {}, signal?: AbortSignal): Promise<PolymarketMarket[]> {
  const url = gammaUrl("/markets", {
    active: options.active ?? true,
    closed: options.closed ?? false,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
    archived: false,
  });
  const json = await fetchJson<unknown>(url, signal);
  const rows = Array.isArray(json) ? json : Array.isArray((json as { data?: unknown[] }).data) ? (json as { data: unknown[] }).data : [];
  const markets = rows.map((row) => normalizeMarket(row as GammaMarket));
  const filtered = options.category ? markets.filter((market) => market.category === normalizeCategory(options.category)) : markets;
  const searched = options.q ? filtered.filter((market) => market.question.toLowerCase().includes(options.q!.toLowerCase())) : filtered;
  return searched;
}

export async function searchPolymarketMarkets(query: string, limit = 25, signal?: AbortSignal): Promise<PolymarketMarket[]> {
  const url = gammaUrl("/public-search", { q: query, limit });
  try {
    const json = await fetchJson<unknown>(url, signal);
    const rows = extractSearchMarkets(json);
    return rows.map((row) => normalizeMarket(row));
  } catch {
    return getPolymarketMarkets({ q: query, limit }, signal);
  }
}

export async function getPolymarketMarket(conditionIdOrId: string, signal?: AbortSignal): Promise<PolymarketMarket> {
  try {
    return normalizeMarket(await fetchJson<GammaMarket>(gammaUrl(`/markets/${encodeURIComponent(conditionIdOrId)}`), signal));
  } catch {
    const matches = await searchPolymarketMarkets(conditionIdOrId, 10, signal);
    const match = matches.find((market) => market.conditionId === conditionIdOrId || market.id === conditionIdOrId);
    if (!match) throw new Error(`Polymarket market not found: ${conditionIdOrId}`);
    return match;
  }
}

export async function getPolymarketPrice(conditionIdOrId: string, signal?: AbortSignal): Promise<PolymarketPrice> {
  const market = await getPolymarketMarket(conditionIdOrId, signal);
  const pricedTokens = await Promise.all(
    market.tokens.map(async (token) => {
      const clobPrice = await getTokenPrice(token.tokenId, signal).catch(() => null);
      return { tokenId: token.tokenId, outcome: token.outcome, price: clobPrice ?? token.price ?? null };
    }),
  );
  return {
    conditionId: market.conditionId,
    yes: pricedTokens.find((token) => isYes(token.outcome))?.price ?? market.outcomePrices[0] ?? null,
    no: pricedTokens.find((token) => isNo(token.outcome))?.price ?? market.outcomePrices[1] ?? null,
    tokens: pricedTokens,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getPolymarketOrderbook(conditionIdOrId: string, signal?: AbortSignal): Promise<PolymarketOrderbook> {
  const market = await getPolymarketMarket(conditionIdOrId, signal);
  const token = market.tokens.find((entry) => isYes(entry.outcome)) ?? market.tokens[0];
  if (!token) throw new Error(`Polymarket market has no CLOB token IDs: ${conditionIdOrId}`);
  const url = clobUrl("/book", { token_id: token.tokenId });
  const json = await fetchJson<Record<string, unknown>>(url, signal);
  return {
    conditionId: market.conditionId,
    tokenId: token.tokenId,
    bids: normalizeBookLevels(json.bids),
    asks: normalizeBookLevels(json.asks ?? json.offers),
    minOrderSize: stringValue(json.min_order_size ?? json.minOrderSize),
    tickSize: stringValue(json.tick_size ?? json.tickSize),
    raw: json,
    fetchedAt: new Date().toISOString(),
  };
}

async function getTokenPrice(tokenId: string, signal?: AbortSignal) {
  const json = await fetchJson<Record<string, unknown>>(clobUrl("/price", { token_id: tokenId, side: "buy" }), signal);
  return numberValue(json.price ?? json.midpoint ?? json.value);
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "TradingPi/0.1 (+https://local-first.trading-pi)" },
    });
    if (!response.ok) throw new Error(`Polymarket HTTP ${response.status} for ${url.pathname}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function gammaUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  return withParams(new URL(path, GAMMA_BASE_URL), params);
}

function clobUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  return withParams(new URL(path, CLOB_BASE_URL), params);
}

function withParams(url: URL, params: Record<string, string | number | boolean | undefined>) {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

function extractSearchMarkets(json: unknown): GammaMarket[] {
  if (Array.isArray(json)) return json as GammaMarket[];
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const candidates = [root.markets, root.results, root.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as GammaMarket[];
  }
  return [];
}

function normalizeMarket(raw: GammaMarket): PolymarketMarket {
  const outcomes = parseStringArray(raw.outcomes);
  const outcomePrices = parseNumberArray(raw.outcomePrices ?? raw.outcome_prices);
  const tokens = parseTokens(raw, outcomes, outcomePrices);
  const category = normalizeCategory(stringValue(raw.category ?? raw.tags ?? raw.groupItemTitle) ?? inferCategory(String(raw.question ?? "")));
  const event = normalizeEvent(raw.events ?? raw.event);
  return {
    id: String(raw.id ?? raw.marketId ?? raw.conditionId ?? raw.condition_id ?? ""),
    conditionId: String(raw.conditionId ?? raw.condition_id ?? raw.id ?? ""),
    question: String(raw.question ?? raw.title ?? raw.slug ?? "Untitled Polymarket market"),
    slug: stringValue(raw.slug),
    category,
    active: booleanValue(raw.active, true),
    closed: booleanValue(raw.closed, false),
    volume: numberValue(raw.volumeNum ?? raw.volume ?? raw.volume24hr ?? raw.volume24hrClob) ?? 0,
    liquidity: numberValue(raw.liquidityNum ?? raw.liquidity ?? raw.liquidityClob) ?? 0,
    change24h: numberValue(raw.volume24hrChange ?? raw.oneDayPriceChange ?? raw.priceChange24h),
    endDate: stringValue(raw.endDate ?? raw.end_date ?? raw.endDateIso ?? raw.gameStartTime) ?? null,
    outcomes,
    outcomePrices,
    tokens,
    event,
    raw,
  };
}

function parseTokens(raw: GammaMarket, outcomes: string[], prices: number[]): PolymarketToken[] {
  const clobTokenIds = parseStringArray(raw.clobTokenIds ?? raw.clob_token_ids);
  const tokenRows = Array.isArray(raw.tokens) ? (raw.tokens as Array<Record<string, unknown>>) : [];
  if (tokenRows.length) {
    return tokenRows
      .map((token, index) => ({
        tokenId: String(token.token_id ?? token.tokenId ?? token.id ?? clobTokenIds[index] ?? ""),
        outcome: String(token.outcome ?? token.name ?? outcomes[index] ?? `Outcome ${index + 1}`),
        price: numberValue(token.price ?? prices[index]),
      }))
      .filter((token) => token.tokenId);
  }
  return clobTokenIds.map((tokenId, index) => ({
    tokenId,
    outcome: outcomes[index] ?? (index === 0 ? "Yes" : index === 1 ? "No" : `Outcome ${index + 1}`),
    price: prices[index] ?? null,
  }));
}

function normalizeEvent(raw: unknown): PolymarketEvent | undefined {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return undefined;
  const event = row as Record<string, unknown>;
  return {
    id: String(event.id ?? event.eventId ?? event.slug ?? ""),
    title: String(event.title ?? event.name ?? event.slug ?? "Polymarket event"),
    slug: stringValue(event.slug),
    category: stringValue(event.category),
    startTime: stringValue(event.startTime ?? event.start_time) ?? null,
    endTime: stringValue(event.endTime ?? event.end_time) ?? null,
  };
}

function parseStringArray(value: unknown): string[] {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry) => String(entry)).filter(Boolean);
}

function parseNumberArray(value: unknown): number[] {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry) => numberValue(entry)).filter((entry): entry is number => entry !== null);
}

function parseMaybeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value.split(",").map((entry) => entry.trim());
  }
}

function normalizeBookLevels(value: unknown): PolymarketBookLevel[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const level = row as Record<string, unknown>;
    return {
      price: numberValue(level.price ?? level.px) ?? 0,
      size: numberValue(level.size ?? level.qty) ?? 0,
    };
  });
}

function normalizeCategory(value: string | undefined): PolymarketCategory {
  const text = (value ?? "").toLowerCase();
  if (text.includes("sport")) return "sports";
  if (text.includes("politic") || text.includes("election")) return "politics";
  if (text.includes("crypto") || text.includes("bitcoin") || text.includes("ethereum")) return "crypto";
  if (text.includes("macro") || text.includes("fed") || text.includes("econom")) return "macro";
  if (text.includes("entertainment") || text.includes("culture")) return "entertainment";
  return "other";
}

function inferCategory(question: string) {
  return question;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,%]/g, "")) : NaN;
  return Number.isFinite(number) ? number : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function isYes(outcome: string) {
  return outcome.toLowerCase() === "yes";
}

function isNo(outcome: string) {
  return outcome.toLowerCase() === "no";
}
