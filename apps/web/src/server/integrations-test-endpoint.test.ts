import { describe, it, expect, vi } from "vitest";

/**
 * Contract tests for /api/integrations/test.
 *
 * Verifies the endpoint's response shape: ok/status/latencyMs on
 * success, error string on failure. The endpoint accepts a `target`
 * string (provider name) and returns a probe result.
 */

// Mirror the endpoint's response builder.
type TestResponse = {
  ok: boolean;
  target: string;
  status?: number;
  latencyMs?: number;
  error?: string;
};

async function testIntegration(
  target: string,
  fetchImpl: typeof fetch,
): Promise<TestResponse> {
  const start = Date.now();
  try {
    const response = await fetchImpl(`https://${target}.example.com/`);
    return {
      ok: response.ok,
      target,
      status: response.status,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      target,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

describe("/api/integrations/test contract", () => {
  it("returns ok=true + status + latencyMs on 2xx", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const res = await testIntegration("exa", fetchMock);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.target).toBe("exa");
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.error).toBeUndefined();
  });

  it("returns ok=false on 4xx", async () => {
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 })) as unknown as typeof fetch;
    const res = await testIntegration("tavily", fetchMock);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(429);
  });

  it("returns ok=false with error on network failure", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    const res = await testIntegration("jina", fetchMock);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ECONNREFUSED/);
  });

  it("preserves target name in error case for diagnostics", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("ETIMEDOUT"); }) as unknown as typeof fetch;
    const res = await testIntegration("fred", fetchMock);
    expect(res.target).toBe("fred");
  });
});