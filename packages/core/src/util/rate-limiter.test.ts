import { describe, it, expect } from "vitest";
import { listRateLimitedSources, getRateLimitStatus, withRateLimit, registerRateLimit } from "./rate-limiter.js";

/**
 * Contract tests for the rate limiter that backs /api/util/rate-limits.
 * Verifies the exposed API surface: per-source registration, token
 * accounting, and the readonly inspection methods.
 */

describe("rate-limiter contract", () => {
  it("registerRateLimit + getRateLimitStatus returns capacity + ratePerMinute", () => {
    registerRateLimit("t-rl-1", { ratePerMinute: 60, burst: 10 });
    const s = getRateLimitStatus("t-rl-1");
    expect(s).toBeDefined();
    expect(s?.capacity).toBe(10);
    expect(s?.ratePerMinute).toBe(60);
    expect(s?.tokens).toBeGreaterThan(0);
  });

  it("listRateLimitedSources returns every registered source", () => {
    registerRateLimit("t-rl-2", { ratePerMinute: 30, burst: 5 });
    registerRateLimit("t-rl-3", { ratePerMinute: 60, burst: 8 });
    const sources = listRateLimitedSources();
    expect(sources).toContain("t-rl-2");
    expect(sources).toContain("t-rl-3");
  });

  it("getRateLimitStatus returns undefined for unknown source", () => {
    const s = getRateLimitStatus("does-not-exist-source");
    expect(s).toBeUndefined();
  });

  it("withRateLimit returns the wrapped fn's value after acquiring a token", async () => {
    registerRateLimit("t-rl-4", { ratePerMinute: 600, burst: 5 });
    const result = await withRateLimit("t-rl-4", async () => "ok");
    expect(result).toBe("ok");
    const s = getRateLimitStatus("t-rl-4");
    expect(s?.tokens).toBeLessThan(s!.capacity);
  });

  it("burst is consumable (single call within capacity)", async () => {
    registerRateLimit("t-rl-5", { ratePerMinute: 600, burst: 3 });
    const s0 = getRateLimitStatus("t-rl-5");
    expect(s0?.tokens).toBe(3);
    await withRateLimit("t-rl-5", async () => "first");
    await withRateLimit("t-rl-5", async () => "second");
    const s1 = getRateLimitStatus("t-rl-5");
    expect(s1?.tokens).toBeLessThan(3);
  });
});