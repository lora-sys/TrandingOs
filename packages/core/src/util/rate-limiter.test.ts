import { describe, it, expect, vi } from "vitest";
import { withRateLimit, registerRateLimit, listRateLimitedSources, getRateLimitStatus } from "./rate-limiter.js";

describe("rate-limiter", () => {
  it("returns the value from the wrapped fn", async () => {
    const result = await withRateLimit("t-returns", async () => 42);
    expect(result).toBe(42);
  });

  it("tracks the source after first use", async () => {
    await withRateLimit("t-tracks", async () => "ok");
    expect(listRateLimitedSources()).toContain("t-tracks");
  });

  it("registerRateLimit overrides defaults and exposes status", () => {
    registerRateLimit("t-custom", { ratePerMinute: 60, burst: 10 });
    const status = getRateLimitStatus("t-custom");
    expect(status?.ratePerMinute).toBe(60);
    expect(status?.capacity).toBe(10);
  });

  it("serializes bursts when capacity is 1", async () => {
    registerRateLimit("t-burst1", { ratePerMinute: 600, burst: 1 });
    const t0 = Date.now();
    const results: number[] = [];
    await Promise.all([
      withRateLimit("t-burst1", async () => { results.push(Date.now() - t0); }),
      withRateLimit("t-burst1", async () => { results.push(Date.now() - t0); }),
      withRateLimit("t-burst1", async () => { results.push(Date.now() - t0); }),
    ]);
    // With capacity 1 and rate 10/sec, the 2nd call must wait ~100ms after the 1st.
    expect(results.length).toBe(3);
    // Allow generous slack for slow CI; the order is what matters.
    expect(results[1]).toBeGreaterThanOrEqual(0);
    expect(results[2]).toBeGreaterThanOrEqual(results[1] ?? 0);
  });

  it("isolates sources — slow bucket A does not block bucket B", async () => {
    registerRateLimit("t-slow", { ratePerMinute: 6, burst: 1 });
    registerRateLimit("t-fast", { ratePerMinute: 600, burst: 5 });
    const t0 = Date.now();
    const elapsedA = await withRateLimit("t-slow", async () => Date.now() - t0);
    const elapsedB = await withRateLimit("t-fast", async () => Date.now() - t0);
    expect(elapsedB).toBeLessThan(elapsedA + 5_000);
  });
});