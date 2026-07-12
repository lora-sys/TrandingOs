import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnv, type TradingPiEnv } from "./env.js";

function tempCwd() {
  return mkdtempSync(resolve(tmpdir(), "trading-pi-env-test-"));
}

describe("TradingPiEnv.thinkingLevel", () => {
  it("parses TRADING_PI_THINKING_LEVEL env var", () => {
    const cwd = tempCwd();
    try {
      const previous = process.env.TRADING_PI_THINKING_LEVEL;
      process.env.TRADING_PI_THINKING_LEVEL = "high";
      try {
        const env: TradingPiEnv = loadEnv(cwd);
        expect(env.thinkingLevel).toBe("high");
      } finally {
        if (previous === undefined) delete process.env.TRADING_PI_THINKING_LEVEL;
        else process.env.TRADING_PI_THINKING_LEVEL = previous;
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("defaults to medium when TRADING_PI_THINKING_LEVEL is not set", () => {
    const cwd = tempCwd();
    try {
      const previous = process.env.TRADING_PI_THINKING_LEVEL;
      delete process.env.TRADING_PI_THINKING_LEVEL;
      try {
        const env: TradingPiEnv = loadEnv(cwd);
        expect(env.thinkingLevel).toBe("medium");
      } finally {
        if (previous !== undefined) process.env.TRADING_PI_THINKING_LEVEL = previous;
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});