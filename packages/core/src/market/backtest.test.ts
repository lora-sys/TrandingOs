import { describe, expect, it } from "vitest";
import { runBacktest, type BacktestCandle, type BacktestInput } from "./backtest.js";

const T0 = Date.UTC(2024, 0, 1, 0, 0, 0);
const HOUR = 60 * 60 * 1000;

function makeCandles(closes: number[], start: number = T0, step: number = HOUR): BacktestCandle[] {
  return closes.map((close, i) => ({
    time: start + i * step,
    open: close,
    high: close * 1.01,
    low: close * 0.99,
    close,
    volume: 1000,
  }));
}

const baseInput: BacktestInput = {
  name: "test",
  symbol: "BTC/USDT",
  timeframe: "1h",
  startDate: new Date(T0).toISOString(),
  endDate: new Date(T0 + 200 * HOUR).toISOString(),
  initialCapitalUsd: 10000,
  strategy: { fastPeriod: 3, slowPeriod: 7, stopLossPct: 0.02, takeProfitPct: 0.05 },
};

describe("runBacktest", () => {
  it("generates a profitable long trade on a clear uptrend", async () => {
    // Start flat so SMAs converge, then a steady uptrend to trigger long, then decline to exit.
    const closes: number[] = [];
    for (let i = 0; i < 20; i++) closes.push(100);
    for (let i = 0; i < 60; i++) closes.push(100 + i * 0.5);
    // Then a decline to force an exit
    for (let i = 0; i < 30; i++) closes.push(closes[closes.length - 1]! - 1);
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    expect(result.warnings).toEqual([]);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.winningTrades).toBeGreaterThan(0);
    expect(result.totalReturnPct).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBe(closes.length);
  });

  it("produces zero trades on a sustained downtrend (fast stays below slow)", async () => {
    const closes: number[] = [];
    for (let i = 0; i < 80; i++) closes.push(200 - i * 1.5);
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    expect(result.totalTrades).toBe(0);
    expect(result.warnings.some((w) => w.includes("no trades"))).toBe(true);
    expect(result.totalReturnPct).toBe(0);
  });

  it("triggers stop-loss when price falls below the threshold", async () => {
    // Build a sequence that triggers an entry then a hard drop.
    const closes: number[] = [];
    // flat → small up trend so fast crosses above slow
    for (let i = 0; i < 12; i++) closes.push(100);
    for (let i = 0; i < 8; i++) closes.push(100 + i * 0.5);
    // big drop below the 2% stop
    closes.push(85, 80, 75);
    // small recovery
    for (let i = 0; i < 10; i++) closes.push(80 + i);
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    expect(result.totalTrades).toBeGreaterThan(0);
    const stopTrade = result.trades.find((t) => t.exitReason === "stop");
    expect(stopTrade).toBeDefined();
    expect(stopTrade!.pnlUsd).toBeLessThan(0);
  });

  it("triggers take-profit when price rises above the threshold", async () => {
    const closes: number[] = [];
    // flat then rise
    for (let i = 0; i < 12; i++) closes.push(100);
    for (let i = 0; i < 8; i++) closes.push(100 + i * 0.4);
    // sharp spike > 5% to take-profit
    closes.push(108, 110, 112);
    for (let i = 0; i < 10; i++) closes.push(110);
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    expect(result.totalTrades).toBeGreaterThan(0);
    const tpTrade = result.trades.find((t) => t.exitReason === "take_profit");
    expect(tpTrade).toBeDefined();
    expect(tpTrade!.pnlUsd).toBeGreaterThan(0);
  });

  it("computes Sharpe ratio within ±5% of a manual calculation", async () => {
    const closes: number[] = [];
    // Smooth uptrend with small noise so we have a positive equity curve.
    for (let i = 0; i < 120; i++) closes.push(100 + i * 0.3 + (i % 5 === 0 ? 0.5 : 0));
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    // Manual Sharpe from returned equity curve
    const returns: number[] = [];
    for (let i = 1; i < result.equityCurve.length; i++) {
      const prev = result.equityCurve[i - 1]!.equity;
      const cur = result.equityCurve[i]!.equity;
      if (prev > 0) returns.push((cur - prev) / prev);
    }
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const stdev = Math.sqrt(variance);
    const expected = stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(365);

    if (expected === 0) {
      expect(result.sharpeRatio).toBe(0);
    } else {
      const diff = Math.abs(result.sharpeRatio - expected) / Math.abs(expected);
      expect(diff).toBeLessThan(0.05);
    }
  });

  it("computes max drawdown within ±5% of a manual peak-to-trough calculation", async () => {
    // Build a curve that has a known drawdown: rise, dip, recover.
    const closes: number[] = [];
    for (let i = 0; i < 30; i++) closes.push(100 + i);
    for (let i = 0; i < 20; i++) closes.push(closes[closes.length - 1]! - 1.5);
    for (let i = 0; i < 30; i++) closes.push(closes[closes.length - 1]! + 0.5);
    const candles = makeCandles(closes);

    const result = await runBacktest(baseInput, async () => candles);

    // Manual: max drawdown of equity curve in percent.
    let peak = result.equityCurve[0]?.equity ?? 0;
    let worst = 0;
    for (const point of result.equityCurve) {
      if (point.equity > peak) peak = point.equity;
      if (peak > 0) {
        const dd = ((peak - point.equity) / peak) * 100;
        if (dd > worst) worst = dd;
      }
    }

    const diff = worst === 0 ? result.maxDrawdownPct : Math.abs(result.maxDrawdownPct - worst) / worst;
    expect(diff).toBeLessThan(0.05);
  });

  it("returns warnings when insufficient data is provided", async () => {
    const tinyInput: BacktestInput = {
      ...baseInput,
      strategy: { ...baseInput.strategy, slowPeriod: 50 },
    };
    const candles = makeCandles([100, 101, 102, 103, 104]);

    const result = await runBacktest(tinyInput, async () => candles);

    expect(result.warnings.some((w) => w.toLowerCase().includes("insufficient data"))).toBe(true);
    expect(result.totalTrades).toBe(0);
  });
});
