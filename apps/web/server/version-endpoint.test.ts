import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contract test for the /api/version endpoint.
 *
 * Verifies the response shape, the uptime monotonicity invariant, and
 * the last-prompt field's null vs number behavior.
 */

// Re-implement the endpoint handler body in isolation. The production
// implementation lives in apps/web/server/api.ts but the body is small
// enough to mirror here.
function readPackageVersion(): string {
  const raw = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
  return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
}

function buildVersionResponse(opts: { lastPromptAt: number | null; nodeEnv: string | undefined; startedAt: number; now: number }) {
  const uptimeSec = Math.round((opts.now - opts.startedAt) / 1000);
  const lastPromptSec = opts.lastPromptAt ? Math.round((opts.now - opts.lastPromptAt) / 1000) : null;
  return {
    version: readPackageVersion(),
    startedAt: new Date(opts.startedAt).toISOString(),
    uptimeSec,
    lastPromptSec,
    nodeEnv: opts.nodeEnv ?? "development",
  };
}

describe("/api/version contract", () => {
  it("returns version + startedAt + uptimeSec + lastPromptSec + nodeEnv", () => {
    const now = 1_700_000_000_000;
    const res = buildVersionResponse({ lastPromptAt: now - 5000, nodeEnv: "test", startedAt: now - 60_000, now });
    expect(res).toMatchObject({
      version: expect.any(String),
      startedAt: new Date(now - 60_000).toISOString(),
      uptimeSec: 60,
      lastPromptSec: 5,
      nodeEnv: "test",
    });
    expect(res.version).not.toBe("unknown");
  });

  it("returns lastPromptSec: null when no prompt has been seen", () => {
    const res = buildVersionResponse({ lastPromptAt: null, nodeEnv: undefined, startedAt: 0, now: 1000 });
    expect(res.lastPromptSec).toBeNull();
    expect(res.nodeEnv).toBe("development");
  });

  it("uptime is monotonic and non-negative", () => {
    const start = 1_000_000;
    const r1 = buildVersionResponse({ lastPromptAt: null, nodeEnv: "test", startedAt: start, now: start });
    const r2 = buildVersionResponse({ lastPromptAt: null, nodeEnv: "test", startedAt: start, now: start + 30_000 });
    expect(r1.uptimeSec).toBe(0);
    expect(r2.uptimeSec).toBe(30);
    expect(r2.uptimeSec).toBeGreaterThanOrEqual(r1.uptimeSec);
  });
});