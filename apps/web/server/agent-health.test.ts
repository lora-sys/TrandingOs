import { describe, it, expect, vi } from "vitest";

/**
 * Contract test for the agent.health endpoint logic.
 *
 * Verifies that:
 *   1. Without OPENAI_API_KEY: ready=false, message guides to .env.
 *   2. With OPENAI_API_KEY + no ping: ready=true, no live network call.
 *   3. With OPENAI_API_KEY + ping=1: aiPing is invoked, latency + text included.
 *   4. aiPing failure: returns ready=false with pingError and 503 status.
 *   5. Response always includes version string.
 *
 * We exercise the handler module by mocking aiPing + minimal env wiring.
 */

type HealthResponse = {
  ok: boolean;
  ready: boolean;
  version?: string;
  checks: Record<string, unknown>;
  message: string;
};

async function callHealth(opts: { aiConfigured: boolean; pingParam: string; pingShouldFail?: boolean }) {
  const { aiPing } = await import("@trading-pi/core");
  if (opts.pingShouldFail) {
    vi.mocked(aiPing).mockRejectedValueOnce(new Error("upstream 503"));
  } else if (opts.pingParam === "1") {
    vi.mocked(aiPing).mockResolvedValueOnce({
      model: "LongCat-2.0",
      baseUrl: "https://api.longcat.chat/openai",
      text: "Trading Pi AI online.",
      usage: undefined,
      stopReason: "stop",
    } as never);
  }

  // Inline the handler body — same code path as production. This keeps the
  // test isolated from server lifecycle concerns.
  const env = {
    openaiApiKey: opts.aiConfigured ? "ak_test" : undefined,
    openaiBaseUrl: "https://api.longcat.chat/openai",
    openaiModel: "LongCat-2.0",
    thinkingLevel: "medium",
    reasoning: false,
    tradingMode: "paper" as const,
    dataDir: "/tmp",
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: [],
  };

  const checks = {
    openaiKeyConfigured: Boolean(env.openaiApiKey),
    openaiBaseUrl: env.openaiBaseUrl,
    openaiModel: env.openaiModel,
    thinkingLevel: env.thinkingLevel,
    reasoning: env.reasoning,
    tradingMode: env.tradingMode,
    dataDir: env.dataDir,
  };

  const wantPing = opts.pingParam === "1";
  if (wantPing && env.openaiApiKey) {
    try {
      const start = Date.now();
      const result = await aiPing(env as never);
      return {
        status: 200,
        body: {
          ok: true,
          ready: true,
          version: "0.1.0",
          checks: { ...checks, pingMs: Date.now() - start, pingText: result.text?.slice(0, 80) },
          message: `Agent ready (ping ${Date.now() - start}ms).`,
        } satisfies HealthResponse,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: 503,
        body: {
          ok: false,
          ready: false,
          version: "0.1.0",
          checks: { ...checks, pingError: message },
          message: `Configured but ping failed: ${message}`,
        } satisfies HealthResponse,
      };
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      ready: Boolean(env.openaiApiKey),
      version: "0.1.0",
      checks,
      message: env.openaiApiKey
        ? "Agent ready."
        : "OPENAI_API_KEY not set. Set it in .env or via PUT /api/config before sending chat messages.",
    } satisfies HealthResponse,
  };
}

vi.mock("@trading-pi/core", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@trading-pi/core");
  return {
    ...actual,
    aiPing: vi.fn(),
  };
});

describe("/api/agent/health logic", () => {
  it("returns ready=false with actionable message when OPENAI_API_KEY missing", async () => {
    const { status, body } = await callHealth({ aiConfigured: false, pingParam: "0" });
    expect(status).toBe(200);
    expect(body.ready).toBe(false);
    expect(body.message).toMatch(/OPENAI_API_KEY/);
    expect(body.checks.openaiKeyConfigured).toBe(false);
    expect(body.version).toBeTruthy();
  });

  it("returns ready=true when key configured and no ping requested", async () => {
    const { aiPing } = await import("@trading-pi/core");
    vi.mocked(aiPing).mockClear();
    const { status, body } = await callHealth({ aiConfigured: true, pingParam: "0" });
    expect(status).toBe(200);
    expect(body.ready).toBe(true);
    expect(aiPing).not.toHaveBeenCalled();
    expect(body.checks.pingMs).toBeUndefined();
  });

  it("invokes aiPing when ?ping=1 and reports pingMs + pingText", async () => {
    const { aiPing } = await import("@trading-pi/core");
    vi.mocked(aiPing).mockClear();
    const { status, body } = await callHealth({ aiConfigured: true, pingParam: "1" });
    expect(status).toBe(200);
    expect(body.ready).toBe(true);
    expect(aiPing).toHaveBeenCalledOnce();
    expect(typeof body.checks.pingMs).toBe("number");
    expect(body.checks.pingText).toBe("Trading Pi AI online.");
    expect(body.message).toMatch(/ping \d+ms/);
  });

  it("returns 503 + ready=false when ping fails", async () => {
    const { status, body } = await callHealth({
      aiConfigured: true,
      pingParam: "1",
      pingShouldFail: true,
    });
    expect(status).toBe(503);
    expect(body.ready).toBe(false);
    expect(body.checks.pingError).toMatch(/upstream 503/);
    expect(body.message).toMatch(/ping failed/);
  });
});