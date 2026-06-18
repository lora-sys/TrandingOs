const REDDIT_BASE_URL = "https://www.reddit.com";
const DEFAULT_TIMEOUT_MS = 10_000;

export const SUPPORTED_SUBREDDITS = ["CryptoCurrency", "PredictionMarkets", "soccer", "politics", "wallstreetbets"] as const;

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  score: number;
  comments: number;
  url: string;
  permalink: string;
  created: string;
  author: string;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created: string;
  permalink: string;
}

export async function getRedditHot(subreddit: string, limit = 10, signal?: AbortSignal) {
  const safeSubreddit = normalizeSubreddit(subreddit);
  const json = await redditJson<Record<string, unknown>>(`/r/${safeSubreddit}/hot.json`, { limit }, signal);
  return extractPosts(json);
}

export async function searchReddit(query: string, subreddit?: string, sort = "relevance", limit = 10, signal?: AbortSignal) {
  const path = subreddit ? `/r/${normalizeSubreddit(subreddit)}/search.json` : "/search.json";
  const json = await redditJson<Record<string, unknown>>(path, { q: query, sort, limit, restrict_sr: Boolean(subreddit) }, signal);
  return extractPosts(json);
}

export async function getRedditComments(postIdOrPermalink: string, limit = 20, signal?: AbortSignal) {
  const permalink = postIdOrPermalink.startsWith("/") ? postIdOrPermalink : `/comments/${postIdOrPermalink}`;
  const json = await redditJson<unknown[]>(`${permalink.replace(/\/$/, "")}.json`, { limit }, signal);
  const commentsRoot = json[1] as Record<string, unknown> | undefined;
  return extractComments(commentsRoot);
}

async function redditJson<T>(path: string, params: Record<string, string | number | boolean | undefined>, signal?: AbortSignal, attempt = 0): Promise<T> {
  const url = new URL(path, REDDIT_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "TradingPi/0.1 research bot (local user agent)" },
    });
    if (response.status === 429 && attempt < 2) {
      await sleep(750 * (attempt + 1));
      return redditJson(path, params, signal, attempt + 1);
    }
    if (!response.ok) throw new Error(`Reddit HTTP ${response.status} for ${url.pathname}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function extractPosts(json: Record<string, unknown>): RedditPost[] {
  const children = ((json.data as Record<string, unknown> | undefined)?.children ?? []) as Array<{ data?: Record<string, unknown> }>;
  return children.map((child) => normalizePost(child.data ?? {})).filter((post) => post.id);
}

function normalizePost(data: Record<string, unknown>): RedditPost {
  const permalink = String(data.permalink ?? "");
  return {
    id: String(data.id ?? ""),
    subreddit: String(data.subreddit ?? ""),
    title: String(data.title ?? ""),
    selftext: String(data.selftext ?? ""),
    score: numberValue(data.score) ?? 0,
    comments: numberValue(data.num_comments) ?? 0,
    url: String(data.url ?? (permalink ? `${REDDIT_BASE_URL}${permalink}` : "")),
    permalink: permalink ? `${REDDIT_BASE_URL}${permalink}` : "",
    created: new Date((numberValue(data.created_utc) ?? 0) * 1000).toISOString(),
    author: String(data.author ?? ""),
  };
}

function extractComments(root: Record<string, unknown> | undefined): RedditComment[] {
  const children = ((root?.data as Record<string, unknown> | undefined)?.children ?? []) as Array<{ data?: Record<string, unknown>; kind?: string }>;
  return children
    .filter((child) => child.kind === "t1")
    .map((child) => {
      const data = child.data ?? {};
      const permalink = String(data.permalink ?? "");
      return {
        id: String(data.id ?? ""),
        author: String(data.author ?? ""),
        body: String(data.body ?? ""),
        score: numberValue(data.score) ?? 0,
        created: new Date((numberValue(data.created_utc) ?? 0) * 1000).toISOString(),
        permalink: permalink ? `${REDDIT_BASE_URL}${permalink}` : "",
      };
    })
    .filter((comment) => comment.id);
}

function normalizeSubreddit(subreddit: string) {
  const normalized = subreddit.replace(/^r\//i, "").trim();
  if (!SUPPORTED_SUBREDDITS.some((allowed) => allowed.toLowerCase() === normalized.toLowerCase())) {
    throw new Error(`Unsupported subreddit: ${subreddit}. Supported: ${SUPPORTED_SUBREDDITS.join(", ")}`);
  }
  return normalized;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
