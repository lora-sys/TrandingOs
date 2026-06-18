/**
 * arXiv API client — academic paper search (AI / quant / crypto).
 *
 * Free, no API key required. Returns Atom XML (parsed to structured objects).
 * Docs: https://info.arxiv.org/help/api/user-manual.html
 *
 * Key categories for Trading Pi OS:
 *   AI:       cs.AI, cs.LG, cs.CL, stat.ML
 *   Quant:    q-fin.* (q-fin.CP, q-fin.GN, q-fin.PM, q-fin.TR, q-fin.ST)
 *   Crypto:   cs.CR (Cryptography and Security)
 */

const ARXIV_BASE = "http://export.arxiv.org/api/query";
const ATOM_NS = "{http://www.w3.org/2005/Atom}";
const ARXIV_NS = "{http://arxiv.org/schemas/atom}";

const TIMEOUT_MS = 15_000;

// Predefined category sets for common queries
export const ARXIV_CATEGORIES = {
  ai: ["cs.AI", "cs.LG", "cs.CL", "stat.ML"],
  quant: ["q-fin.CP", "q-fin.GN", "q-fin.PM", "q-fin.TR", "q-fin.ST"],
  crypto: ["cs.CR"],
  all: [] as string[], // no filter — search all
} as const;

// ---------- types ---------- //

export interface ArxivPaper {
  id: string;           // e.g. "2401.12345"
  title: string;
  summary: string;      // abstract (truncated)
  authors: string[];     // author names
  categories: string[]; // e.g. ["cs.LG", "stat.ML"]
  published: string;    // ISO date
  updated: string;
  pdfUrl?: string;      // direct PDF link
  comment?: string;     // author comments (journal ref etc.)
  journalRef?: string;
}

export interface ArxivSearchResult {
  papers: ArxivPaper[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

// ---------- internal XML helpers ---------- //

function text(el: Element | null, path: string, ns = ATOM_NS): string {
  if (!el) return "";
  const node = el.querySelector(path);
  return node?.textContent?.trim() ?? "";
}

function texts(el: Element | null, path: string, ns = ATOM_NS): string[] {
  if (!el) return [];
  return Array.from(el?.querySelectorAll(path) ?? []).map((n) => n.textContent?.trim() ?? "").filter(Boolean);
}

function attr(el: Element | null, name: string): string | undefined {
  return el?.getAttribute(name) ?? undefined;
}

/** Parse a single Atom <entry> element into ArxivPaper */
function parseEntry(entry: Element): ArxivPaper {
  const idAttr = text(entry, "atom:id");
  // Extract arXiv ID from URL like "http://arxiv.org/abs/2401.12345v1"
  const idMatch = idAttr.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  const id = idMatch?.[1] ?? idAttr.replace("http://arxiv.org/abs/", "");

  const pdfLink = entry.querySelector(`${ATOM_NS}link[title="pdf"]`);
  const pdfUrl = pdfLink?.getAttribute("href") ?? undefined;

  const summary = text(entry, "atom:summary")
    .replace(/\s+/g, " ")
    .slice(0, 1000); // truncate long abstracts

  return {
    id,
    title: text(entry, "atom:title").replace(/\s+/g, " "),
    summary,
    authors: texts(entry, "atom:author/atom:name"),
    categories: Array.from(entry.querySelectorAll(`${ARXIV_NS}category`)).map((c) => c.getAttribute("term") ?? "").filter(Boolean),
    published: text(entry, "atom:published"),
    updated: text(entry, "atom:updated"),
    pdfUrl,
    comment: text(entry, `${ARXIV_NS}comment`) || undefined,
    journalRef: text(entry, `${ARXIV_NS}journal_ref`) || undefined,
  };
}

// ---------- public API ---------- //

/**
 * Search arXiv papers by query string.
 * @param query Search query (supports field prefixes: ti:, au:, abs:, cat:, all:)
 * @param options Max results, sort order, start offset, category filter
 */
export async function searchPapers(
  query: string,
  options?: { maxResults?: number; sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate"; sortOrder?: "ascending" | "descending"; start?: number; categories?: string[] },
  signal?: AbortSignal,
): Promise<ArxivSearchResult> {
  const max = options?.maxResults ?? 10;
  const sort = options?.sortBy ?? "submittedDate";
  const order = options?.sortOrder ?? "descending";
  const start = options?.start ?? 0;

  // Build search_query with optional category filter
  let searchQuery = query;
  if (options?.categories && options.categories.length > 0) {
    const catFilter = `(${options.categories.map((c) => `cat:${c}`).join(" OR ")})`;
    searchQuery = `(${query}) AND ${catFilter}`;
  }

  const params = new URLSearchParams({
    search_query: searchQuery,
    start: String(start),
    max_results: String(Math.min(max, 200)), // arXiv max per request is 200... actually it's higher now
    sortBy: sort,
    sortOrder: order,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${ARXIV_BASE}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`arXiv HTTP ${response.status}`);
    const xml = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const entries = doc.querySelectorAll(`${ATOM_NS}entry`);
    const papers: ArxivPaper[] = [];
    for (let i = 0; i < entries.length; i++) {
      papers.push(parseEntry(entries[i] as Element));
    }

    // Parse totalResults from OpenSearch extension
    const totalEl = doc.querySelector("{http://a9.com/-/spec/opensearch/1.1/}totalResults");
    const totalResults = totalEl ? parseInt(totalEl.textContent ?? "0", 10) : papers.length;

    return { papers, totalResults, startIndex: start, itemsPerPage: papers.length };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get a single paper by arXiv ID.
 * @param arxivId e.g. "2401.12345"
 */
export async function getPaperById(arxivId: string, signal?: AbortSignal): Promise<ArxivPaper | null> {
  const result = await searchPapers(`id:${arxivId}`, { maxResults: 1 }, signal);
  return result.papers[0] ?? null;
}

/**
 * Get recent papers from specific categories.
 * @param days How many days back to look (default 7)
 * @param categories Category filter (default: all)
 */
export async function getRecentPapers(
  days = 7,
  categories?: string[],
  signal?: AbortSignal,
): Promise<ArxivSearchResult> {
  // Use submittedDate sort to get newest
  const result = await searchPapers(
    "*", // match all
    {
      maxResults: 20,
      sortBy: "submittedDate",
      sortOrder: "descending",
      categories,
    },
    signal,
  );

  // Filter client-side by date (arXiv doesn't support date range in query well)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = result.papers.filter((p) => {
    const d = new Date(p.published);
    return d >= cutoff;
  });

  return { ...result, papers: recent, totalResults: recent.length };
}

/**
 * Get trending/hot papers — top by recent submissions in popular categories.
 * Uses a heuristic: recent + popular categories (AI/quant/crypto).
 */
export async function getTrendingPapers(
  limit = 10,
  signal?: AbortSignal,
): Promise<ArxivPaper[]> {
  // Search across high-value categories, sorted by recency
  const hotCategories = [...ARXIV_CATEGORIES.ai, ...ARXIV_CATEGORIES.quant, ...ARXIV_CATEGORIES.crypto];
  const result = await searchPapers("*", {
    maxResults: limit * 3, // fetch extra to account for cross-category overlap
    sortBy: "submittedDate",
    sortOrder: "descending",
    categories: hotCategories,
  }, signal);

  // Deduplicate by ID and take top N
  const seen = new Set<string>();
  const trending: ArxivPaper[] = [];
  for (const paper of result.papers) {
    if (!seen.has(paper.id)) {
      seen.add(paper.id);
      trending.push(paper);
      if (trending.length >= limit) break;
    }
  }

  return trending;
}

/**
 * Health check — verify arXiv API is reachable.
 */
export async function checkArxivHealth(signal?: AbortSignal): Promise<{ status: "ok" | "warn" | "error"; message: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const response = await fetch(`${ARXIV_BASE}?search_query=cat:cs.LG&max_results=1`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok) return { status: "ok", message: "API reachable" };
      return { status: "error", message: `HTTP ${response.status}` };
    } catch (err) {
      clearTimeout(timer);
      return { status: "error", message: err instanceof Error ? err.message : String(err) };
    }
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
