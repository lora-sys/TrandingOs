const FRED_BASE_URL = "https://api.stlouisfed.org/fred";
const COINMARKETCAL_BASE_URL = "https://developers.coinmarketcal.com/v1";
const RAPIDAPI_COINMARKETCAL_URL = "https://coinmarketcal.p.rapidapi.com";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface FredEvent {
  id: string;
  title: string;
  date: string;
  importance: "low" | "medium" | "high";
  category: "cpi" | "unemployment" | "gdp" | "rate_decision" | "inflation" | "jobs" | "macro";
  source: "fred";
  releaseTime?: string;
  url?: string;
}

export interface FredSeriesObservation {
  date: string;
  value: string;
}

export interface FredSeriesResult {
  seriesId: string;
  title?: string;
  observations: FredSeriesObservation[];
}

export interface FredSearchResult {
  id: string;
  title: string;
  frequency?: string;
  units?: string;
  popularity?: number;
  notes?: string;
}

export interface CryptoEvent {
  id: string;
  title: string;
  date: string;
  coins: string[];
  type: string;
  description: string;
  sourceUrl?: string;
  source: "coinmarketcal";
}

export const KEY_FRED_SERIES = ["FEDFUNDS", "DFEDTARU", "CPIAUCSL", "PCEPILFE", "PAYEMS", "UNRATE", "GDP"] as const;
type FetchErrorResult = { __error: string };

export async function getFredCalendar(
  apiKey: string | undefined,
  options: { releaseDate?: string; realtimeStart?: string; realtimeEnd?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ events: FredEvent[]; warning?: string }> {
  if (!apiKey) return { events: fallbackFredCalendar(options.limit), warning: "FRED_API_KEY is not configured; returned key macro watchlist dates." };
  const releases = await fetchFred<{ release_dates?: Array<Record<string, unknown>> }>(
    apiKey,
    "/releases/dates",
    {
      realtime_start: options.realtimeStart,
      realtime_end: options.realtimeEnd,
      limit: options.limit ?? 25,
      include_release_dates_with_no_data: true,
      sort_order: "asc",
    },
    signal,
  );
  const events = (releases.release_dates ?? [])
    .filter((row) => !options.releaseDate || String(row.date ?? "") === options.releaseDate)
    .map(normalizeFredEvent)
    .slice(0, options.limit ?? 25);
  return { events };
}

export async function getFredSeries(
  apiKey: string | undefined,
  seriesId: string,
  options: { limit?: number; observationStart?: string; observationEnd?: string } = {},
  signal?: AbortSignal,
): Promise<FredSeriesResult & { warning?: string }> {
  if (!apiKey) {
    return { seriesId, observations: [], warning: "FRED_API_KEY is not configured." };
  }
  const [series, observations] = await Promise.all([
    fetchFred<{ seriess?: Array<Record<string, unknown>> }>(apiKey, "/series", { series_id: seriesId }, signal),
    fetchFred<{ observations?: Array<Record<string, unknown>> }>(
      apiKey,
      "/series/observations",
      {
        series_id: seriesId,
        limit: options.limit ?? 12,
        sort_order: "desc",
        observation_start: options.observationStart,
        observation_end: options.observationEnd,
      },
      signal,
    ),
  ]);
  return {
    seriesId,
    title: stringValue(series.seriess?.[0]?.title),
    observations: (observations.observations ?? []).map((row) => ({ date: String(row.date ?? ""), value: String(row.value ?? "") })),
  };
}

export async function searchFred(
  apiKey: string | undefined,
  searchText: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<{ results: FredSearchResult[]; warning?: string }> {
  if (!apiKey) return { results: [], warning: "FRED_API_KEY is not configured." };
  const json = await fetchFred<{ seriess?: Array<Record<string, unknown>> }>(
    apiKey,
    "/series/search",
    { search_text: searchText, limit, order_by: "popularity", sort_order: "desc" },
    signal,
  );
  return {
    results: (json.seriess ?? []).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      frequency: stringValue(row.frequency),
      units: stringValue(row.units),
      popularity: numberValue(row.popularity) ?? undefined,
      notes: stringValue(row.notes),
    })),
  };
}

export async function getCoinMarketCalEvents(
  apiKey: string | undefined,
  options: { days?: number; coins?: string[]; types?: string[] } = {},
  signal?: AbortSignal,
): Promise<{ events: CryptoEvent[]; warning?: string }> {
  if (!apiKey) return { events: [], warning: "COINMARKETCAL_API_KEY is not configured." };
  const now = new Date();
  const maxDate = new Date(now.getTime() + (options.days ?? 7) * 24 * 60 * 60 * 1000);
  const params: Record<string, string | number | undefined> = {
    max: 50,
    dateRangeStart: now.toISOString().slice(0, 10),
    dateRangeEnd: maxDate.toISOString().slice(0, 10),
    coins: options.coins?.join(","),
    categories: options.types?.join(","),
  };
  const primary: unknown | FetchErrorResult = await fetchCoinMarketCal(apiKey, new URL("/events", COINMARKETCAL_BASE_URL), params, signal).catch((error) => ({
    __error: error instanceof Error ? error.message : String(error),
  }));
  const json =
    isFetchError(primary)
      ? await fetchCoinMarketCal(apiKey, new URL("/events", RAPIDAPI_COINMARKETCAL_URL), params, signal, true).catch((error): FetchErrorResult => ({
          __error: error instanceof Error ? error.message : String(error),
        }))
      : primary;
  if (isFetchError(json)) return { events: [], warning: json.__error };
  return { events: extractCryptoEvents(json) };
}

export async function getCoinMarketCalToday(apiKey: string | undefined, signal?: AbortSignal) {
  return getCoinMarketCalEvents(apiKey, { days: 1 }, signal);
}

async function fetchFred<T>(apiKey: string, path: string, params: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) {
  const url = new URL(path, FRED_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return fetchJson<T>(url, signal);
}

async function fetchCoinMarketCal(
  apiKey: string,
  url: URL,
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal,
  rapidApi = false,
) {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = rapidApi
    ? { "x-rapidapi-key": apiKey, "x-rapidapi-host": "coinmarketcal.p.rapidapi.com" }
    : { "x-api-key": apiKey };
  return fetchJson<unknown>(url, signal, headers);
}

function isFetchError(value: unknown): value is FetchErrorResult {
  return Boolean(value && typeof value === "object" && "__error" in value && typeof (value as FetchErrorResult).__error === "string");
}

async function fetchJson<T>(url: URL, signal?: AbortSignal, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", ...headers } });
    if (!response.ok) throw new Error(`${url.hostname} HTTP ${response.status} for ${url.pathname}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeFredEvent(row: Record<string, unknown>): FredEvent {
  const title = String(row.release_name ?? row.name ?? "FRED release");
  return {
    id: String(row.release_id ?? `${title}:${row.date ?? ""}`),
    title,
    date: String(row.date ?? ""),
    importance: fredImportance(title),
    category: fredCategory(title),
    source: "fred",
    url: `https://fred.stlouisfed.org/release?rid=${String(row.release_id ?? "")}`,
  };
}

function fallbackFredCalendar(limit = 10): FredEvent[] {
  return KEY_FRED_SERIES.slice(0, limit).map((seriesId) => ({
    id: `fred_watch_${seriesId}`,
    title: `${seriesId} macro watch`,
    date: new Date().toISOString().slice(0, 10),
    importance: seriesId === "FEDFUNDS" || seriesId === "CPIAUCSL" || seriesId === "UNRATE" ? "high" : "medium",
    category: fredCategory(seriesId),
    source: "fred",
    url: `https://fred.stlouisfed.org/series/${seriesId}`,
  }));
}

function extractCryptoEvents(json: unknown): CryptoEvent[] {
  const rows = Array.isArray(json)
    ? json
    : Array.isArray((json as Record<string, unknown>)?.body)
      ? ((json as Record<string, unknown>).body as unknown[])
      : Array.isArray((json as Record<string, unknown>)?.data)
        ? ((json as Record<string, unknown>).data as unknown[])
        : [];
  return rows.map((row, index) => normalizeCryptoEvent((row ?? {}) as Record<string, unknown>, index));
}

function normalizeCryptoEvent(row: Record<string, unknown>, index: number): CryptoEvent {
  const coins = Array.isArray(row.coins)
    ? (row.coins as Array<Record<string, unknown>>).map((coin) => String(coin.symbol ?? coin.name ?? "")).filter(Boolean)
    : [];
  const categories = Array.isArray(row.categories)
    ? (row.categories as Array<Record<string, unknown>>).map((category) => String(category.name ?? category.title ?? "")).filter(Boolean)
    : [];
  return {
    id: String(row.id ?? `coinmarketcal_${index}`),
    title: String(row.title ?? row.name ?? "Crypto event"),
    date: String(row.date_event ?? row.date ?? row.created_date ?? ""),
    coins,
    type: categories[0] ?? String(row.category ?? row.type ?? "event"),
    description: String(row.description ?? row.proof ?? ""),
    sourceUrl: stringValue(row.source ?? row.source_url ?? row.url),
    source: "coinmarketcal",
  };
}

function fredCategory(title: string): FredEvent["category"] {
  const text = title.toLowerCase();
  if (text.includes("cpi") || text.includes("consumer price")) return "cpi";
  if (text.includes("pce") || text.includes("inflation")) return "inflation";
  if (text.includes("unemployment")) return "unemployment";
  if (text.includes("payems") || text.includes("payroll") || text.includes("employment")) return "jobs";
  if (text.includes("gdp")) return "gdp";
  if (text.includes("fed") || text.includes("funds") || text.includes("rate")) return "rate_decision";
  return "macro";
}

function fredImportance(title: string): FredEvent["importance"] {
  const category = fredCategory(title);
  if (category === "rate_decision" || category === "cpi" || category === "inflation" || category === "jobs" || category === "unemployment") return "high";
  if (category === "gdp") return "medium";
  return "low";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}
