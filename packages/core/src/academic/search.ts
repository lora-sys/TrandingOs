const DEFAULT_TIMEOUT_MS = 10_000;

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: string[];
  abstract: string | null;
  tldr: string | null;
  citationCount: number;
  url: string | null;
  openAccessPdf: string | null;
  venue: string | null;
  year: number | null;
}

export interface CrossrefWork {
  DOI: string | null;
  title: string[];
  authors: string[];
  published: string | null;
  containerTitle: string[];
  ISSN: string[];
  type: string | null;
  link: Array<{ URL?: string; contentType?: string }>;
  url: string | null;
}

export interface OpenAlexWork {
  id: string;
  title: string;
  publicationYear: number | null;
  citedByCount: number;
  concepts: string[];
  openAccess: boolean;
  url: string | null;
}

export async function searchSemanticScholar(query: string, options: { limit?: number; year?: string | number } = {}, signal?: AbortSignal) {
  const fields = "paperId,title,authors,abstract,tldr,citationCount,url,openAccessPdf,venue,year";
  const json = await fetchJson<Record<string, unknown>>(
    withParams(new URL("https://api.semanticscholar.org/graph/v1/paper/search"), {
      query,
      limit: options.limit ?? 10,
      year: options.year,
      fields,
    }),
    signal,
  );
  return (((json.data as unknown[]) ?? []) as Array<Record<string, unknown>>).map(normalizeSemanticScholarPaper);
}

export async function getSemanticScholarPaper(paperId: string, signal?: AbortSignal) {
  const fields = "paperId,title,authors,abstract,tldr,citationCount,url,openAccessPdf,venue,year";
  return normalizeSemanticScholarPaper(
    await fetchJson<Record<string, unknown>>(
      withParams(new URL(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}`), { fields }),
      signal,
    ),
  );
}

export async function getSemanticScholarCitations(paperId: string, limit = 10, signal?: AbortSignal) {
  return semanticScholarEdges(paperId, "citations", limit, signal);
}

export async function getSemanticScholarReferences(paperId: string, limit = 10, signal?: AbortSignal) {
  return semanticScholarEdges(paperId, "references", limit, signal);
}

export async function searchCrossref(query: string, options: { rows?: number; filter?: string } = {}, signal?: AbortSignal) {
  const json = await fetchJson<Record<string, unknown>>(
    withParams(new URL("https://api.crossref.org/works"), { query, rows: options.rows ?? 10, filter: options.filter }),
    signal,
    { "user-agent": "TradingPi/0.1 (mailto:research@tradingpi.local)" },
  );
  const items = (((json.message as Record<string, unknown> | undefined)?.items ?? []) as Array<Record<string, unknown>>);
  return items.map(normalizeCrossrefWork);
}

export async function getCrossrefByDoi(doi: string, signal?: AbortSignal) {
  const json = await fetchJson<Record<string, unknown>>(
    new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`),
    signal,
    { "user-agent": "TradingPi/0.1 (mailto:research@tradingpi.local)" },
  );
  return normalizeCrossrefWork((json.message as Record<string, unknown> | undefined) ?? {});
}

export async function searchOpenAlex(query: string, options: { perPage?: number; filter?: string } = {}, signal?: AbortSignal) {
  const json = await fetchJson<Record<string, unknown>>(
    withParams(new URL("https://api.openalex.org/works"), {
      search: query,
      per_page: options.perPage ?? 10,
      filter: options.filter,
    }),
    signal,
  );
  return (((json.results as unknown[]) ?? []) as Array<Record<string, unknown>>).map(normalizeOpenAlexWork);
}

export async function getOpenAlexWork(workId: string, signal?: AbortSignal) {
  const id = workId.startsWith("https://") ? workId : `https://openalex.org/${workId}`;
  return normalizeOpenAlexWork(await fetchJson<Record<string, unknown>>(new URL(`https://api.openalex.org/works/${encodeURIComponent(id)}`), signal));
}

async function semanticScholarEdges(paperId: string, edge: "citations" | "references", limit: number, signal?: AbortSignal) {
  const json = await fetchJson<Record<string, unknown>>(
    withParams(new URL(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/${edge}`), {
      limit,
      fields: "paperId,title,authors,abstract,tldr,citationCount,url,openAccessPdf,venue,year",
    }),
    signal,
  );
  return (((json.data as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) =>
    normalizeSemanticScholarPaper((row.citingPaper ?? row.citedPaper ?? row) as Record<string, unknown>),
  );
}

async function fetchJson<T>(url: URL, signal?: AbortSignal, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", ...headers } });
    if (!response.ok) throw new Error(`Academic source HTTP ${response.status} for ${url.hostname}${url.pathname}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function withParams(url: URL, params: Record<string, string | number | undefined>) {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

function normalizeSemanticScholarPaper(row: Record<string, unknown>): SemanticScholarPaper {
  return {
    paperId: String(row.paperId ?? ""),
    title: String(row.title ?? ""),
    authors: (((row.authors as unknown[]) ?? []) as Array<Record<string, unknown>>).map((author) => String(author.name ?? "")).filter(Boolean),
    abstract: stringOrNull(row.abstract),
    tldr: stringOrNull((row.tldr as Record<string, unknown> | undefined)?.text ?? row.tldr),
    citationCount: numberValue(row.citationCount) ?? 0,
    url: stringOrNull(row.url),
    openAccessPdf: stringOrNull((row.openAccessPdf as Record<string, unknown> | undefined)?.url ?? row.openAccessPdf),
    venue: stringOrNull(row.venue),
    year: numberValue(row.year),
  };
}

function normalizeCrossrefWork(row: Record<string, unknown>): CrossrefWork {
  return {
    DOI: stringOrNull(row.DOI),
    title: stringArray(row.title),
    authors: (((row.author as unknown[]) ?? []) as Array<Record<string, unknown>>)
      .map((author) => [author.given, author.family].filter(Boolean).join(" "))
      .filter(Boolean),
    published: dateParts(row.published ?? row["published-print"] ?? row["published-online"]),
    containerTitle: stringArray(row["container-title"]),
    ISSN: stringArray(row.ISSN),
    type: stringOrNull(row.type),
    link: (((row.link as unknown[]) ?? []) as Array<Record<string, unknown>>).map((link) => ({
      URL: stringOrNull(link.URL) ?? undefined,
      contentType: stringOrNull(link["content-type"]) ?? undefined,
    })),
    url: stringOrNull(row.URL),
  };
}

function normalizeOpenAlexWork(row: Record<string, unknown>): OpenAlexWork {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? row.display_name ?? ""),
    publicationYear: numberValue(row.publication_year),
    citedByCount: numberValue(row.cited_by_count) ?? 0,
    concepts: (((row.concepts as unknown[]) ?? []) as Array<Record<string, unknown>>).map((concept) => String(concept.display_name ?? "")).filter(Boolean),
    openAccess: Boolean((row.open_access as Record<string, unknown> | undefined)?.is_oa ?? false),
    url: stringOrNull(row.doi ?? row.id),
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry)).filter(Boolean);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function dateParts(value: unknown): string | null {
  const parts = (value as Record<string, unknown> | undefined)?.["date-parts"];
  if (!Array.isArray(parts) || !Array.isArray(parts[0])) return null;
  return parts[0].map((part) => String(part).padStart(2, "0")).join("-");
}
