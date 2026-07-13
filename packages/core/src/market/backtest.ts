/**
 * Real vectorized backtest engine.
 *
 * Implements a long-only SMA crossover strategy with stop-loss and take-profit
 * exits. Candles are supplied via an injected fetcher so the same engine can be
 * exercised against live data (CCXT) or deterministic synthetic arrays in tests.
 */

export interface BacktestCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestInput {
  name: string;
  symbol: string;
  timeframe: string; // "1h" | "4h" | "1d"
  startDate: string; // ISO
  endDate: string;
  initialCapitalUsd: number;
  strategy: {
    fastPeriod: number; // default 10
    slowPeriod: number; // default 30
    stopLossPct?: number; // default 0.02
    takeProfitPct?: number; // default 0.05
    feePct?: number; // default 0.001 (10 bps per side)
  };
}

export interface BacktestTrade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  side: "long" | "short";
  pnlUsd: number;
  pnlPct: number;
  exitReason: "signal" | "stop" | "take_profit" | "end_of_data";
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 0..1
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: Array<{ time: string; equity: number }>;
  warnings: string[];
}

export type FetchCandlesFn = (
  symbol: string,
  timeframe: string,
  start: string,
  end: string,
) => Promise<BacktestCandle[]>;

const TRADING_DAYS_PER_YEAR = 365;

function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function pct(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export async function runBacktest(
  input: BacktestInput,
  fetchCandles: FetchCandlesFn,
): Promise<BacktestResult> {
  const warnings: string[] = [];
  const fastPeriod = Math.max(1, Math.floor(pct(input.strategy.fastPeriod, 10)));
  const slowPeriod = Math.max(fastPeriod + 1, Math.floor(pct(input.strategy.slowPeriod, 30)));
  const stopLossPct = pct(input.strategy.stopLossPct, 0.02);
  const takeProfitPct = pct(input.strategy.takeProfitPct, 0.05);
  const feePct = pct(input.strategy.feePct, 0.001);

  if (input.initialCapitalUsd <= 0) warnings.push("initialCapitalUsd must be positive; using 10000 fallback.");
  const capital = input.initialCapitalUsd > 0 ? input.initialCapitalUsd : 10000;

  const candles = await fetchCandles(input.symbol, input.timeframe, input.startDate, input.endDate);
  if (!Array.isArray(candles) || candles.length === 0) {
    warnings.push("Insufficient data: fetcher returned no candles for the requested range.");
    return emptyResult(capital, warnings);
  }
  if (candles.length < slowPeriod + 1) {
    warnings.push(`Insufficient data: need at least ${slowPeriod + 1} candles, got ${candles.length}.`);
  }

  const closes = candles.map((c) => c.close);
  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);

  const trades: BacktestTrade[] = [];
  const equityCurve: InternalEquityPoint[] = [];
  let cash = capital;
  let position: { entryPrice: number; entryTime: string; size: number } | null = null;
  let peakEquity = capital;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]!;
    const fast = fastSma[i];
    const slow = slowSma[i];
    const prevFast = i > 0 ? fastSma[i - 1] : null;
    const prevSlow = i > 0 ? slowSma[i - 1] : null;
    const iso = new Date(candle.time).toISOString();

    if (position) {
      const stopPrice = position.entryPrice * (1 - stopLossPct);
      const takePrice = position.entryPrice * (1 + takeProfitPct);
      let exit: { price: number; reason: BacktestTrade["exitReason"] } | null = null;
      if (candle.low <= stopPrice) exit = { price: stopPrice, reason: "stop" };
      else if (candle.high >= takePrice) exit = { price: takePrice, reason: "take_profit" };
      else if (fast !== null && slow !== null && prevFast !== null && prevSlow !== null && prevFast >= prevSlow && fast < slow) {
        exit = { price: candle.close, reason: "signal" };
      } else if (i === candles.length - 1) {
        exit = { price: candle.close, reason: "end_of_data" };
      }

      if (exit) {
        const proceeds = position.size * exit.price;
        const entryCost = position.size * position.entryPrice;
        const entryFees = entryCost * feePct;
        const exitFees = proceeds * feePct;
        const pnlUsd = proceeds - entryCost - entryFees - exitFees;
        const pnlPct = (pnlUsd / entryCost) * 100;
        cash += proceeds - exitFees;
        trades.push({
          entryTime: position.entryTime,
          exitTime: iso,
          entryPrice: position.entryPrice,
          exitPrice: exit.price,
          side: "long",
          pnlUsd,
          pnlPct,
          exitReason: exit.reason,
        });
        position = null;
      }
    } else {
      if (
        fast !== null &&
        slow !== null &&
        prevFast !== null &&
        prevSlow !== null &&
        prevFast <= prevSlow &&
        fast > slow
      ) {
        const entryPrice = candle.close;
        const entryFees = cash * feePct;
        const size = (cash - entryFees) / entryPrice;
        if (size > 0 && Number.isFinite(size)) {
          position = { entryPrice, entryTime: iso, size };
          cash -= entryFees + size * entryPrice;
        }
      }
    }

    const equity = position ? position.size * candle.close + cash : cash;
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    equityCurve.push({ time: iso, equity, drawdownPct: drawdown });
  }

  if (trades.length === 0) warnings.push("Strategy produced no trades for the provided data range.");

  const winningTrades = trades.filter((t) => t.pnlUsd > 0).length;
  const losingTrades = trades.filter((t) => t.pnlUsd < 0).length;
  const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1]!.equity : capital;
  const totalReturnPct = ((finalEquity - capital) / capital) * 100;
  const maxDrawdownPct = computeMaxDrawdown(equityCurve);
  const sharpeRatio = computeSharpe(equityCurve);

  return {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate,
    totalReturnPct,
    maxDrawdownPct,
    sharpeRatio,
    trades,
    equityCurve: equityCurve.map((p) => ({ time: p.time, equity: p.equity })),
    warnings,
  };
}

function emptyResult(capital: number, warnings: string[]): BacktestResult {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalReturnPct: 0,
    maxDrawdownPct: 0,
    sharpeRatio: 0,
    trades: [],
    equityCurve: [],
    warnings,
  };
}

interface InternalEquityPoint {
  time: string;
  equity: number;
  drawdownPct: number;
}

function computeMaxDrawdown(curve: InternalEquityPoint[]): number {
  let max = 0;
  for (const point of curve) {
    const dd = point.drawdownPct;
    if (typeof dd === "number" && dd > max) max = dd;
  }
  if (max > 0) return max;
  // Fallback: compute from equity values directly.
  let peak = curve[0]?.equity ?? 0;
  let worst = 0;
  for (const point of curve) {
    if (point.equity > peak) peak = point.equity;
    if (peak > 0) {
      const dd = ((peak - point.equity) / peak) * 100;
      if (dd > worst) worst = dd;
    }
  }
  return worst;
}

function computeSharpe(curve: Array<{ time: string; equity: number }>): number {
  if (curve.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!.equity;
    const cur = curve[i]!.equity;
    if (prev > 0) returns.push((cur - prev) / prev);
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return 0;
  return (mean / stdev) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}
