/**
 * Simple in-memory token-bucket rate limiter for outbound HTTP calls.
 *
 * Use case: deep-research kicks off parallel fetches to multiple academic +
 * market sources. Without coordination, you can hit 429s from Semantic
 * Scholar, Crossref, or arXiv. Wrap each fetch with `withRateLimit(source, fn)`.
 *
 * Defaults are conservative. Override per-source by registering
 * `registerRateLimit(source, { ratePerMinute, burst })` before first use.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
  ratePerMs: number;
  capacity: number;
}

const buckets = new Map<string, Bucket>();
const DEFAULT_RATE_PER_MINUTE = 30;
const DEFAULT_BURST = 5;

function getBucket(source: string): Bucket {
  let b = buckets.get(source);
  if (!b) {
    const ratePerMinute = DEFAULT_RATE_PER_MINUTE;
    const capacity = DEFAULT_BURST;
    b = { tokens: capacity, lastRefill: Date.now(), ratePerMs: ratePerMinute / 60_000, capacity };
    buckets.set(source, b);
  }
  return b;
}

export function registerRateLimit(source: string, opts: { ratePerMinute: number; burst?: number }) {
  const capacity = opts.burst ?? Math.max(2, Math.ceil(opts.ratePerMinute / 12));
  buckets.set(source, {
    tokens: capacity,
    lastRefill: Date.now(),
    ratePerMs: opts.ratePerMinute / 60_000,
    capacity,
  });
}

export function getRateLimitStatus(source: string): { tokens: number; capacity: number; ratePerMinute: number } | undefined {
  const b = buckets.get(source);
  if (!b) return undefined;
  return { tokens: b.tokens, capacity: b.capacity, ratePerMinute: Math.round(b.ratePerMs * 60_000) };
}

export function listRateLimitedSources(): string[] {
  return [...buckets.keys()];
}

async function takeToken(b: Bucket): Promise<void> {
  const now = Date.now();
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.ratePerMs);
    b.lastRefill = now;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return;
  }
  const deficit = 1 - b.tokens;
  const waitMs = Math.ceil(deficit / b.ratePerMs);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  b.tokens -= 1;
}

/** Run `fn` after acquiring a rate-limit token for `source`. Throws nothing; the
 *  caller decides how to handle the returned promise (e.g. swallow vs surface). */
export async function withRateLimit<T>(source: string, fn: () => Promise<T>): Promise<T> {
  const b = getBucket(source);
  await takeToken(b);
  return fn();
}

/** Acquire `n` tokens at once. Useful for batched multi-result requests. */
export async function withRateLimitN<T>(source: string, n: number, fn: () => Promise<T>): Promise<T> {
  const b = getBucket(source);
  for (let i = 0; i < n; i += 1) await takeToken(b);
  return fn();
}