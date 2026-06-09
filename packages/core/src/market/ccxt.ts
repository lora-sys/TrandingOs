import ccxt from "ccxt";

export async function fetchCcxtTicker(exchangeId: string, symbol: string) {
  const Exchange = (ccxt as any)[exchangeId];
  if (!Exchange) throw new Error(`CCXT exchange not found: ${exchangeId}`);
  const exchange = new Exchange({ enableRateLimit: true });
  const ticker = await exchange.fetchTicker(symbol);
  return {
    source: "ccxt",
    exchange: exchangeId,
    symbol,
    last: ticker.last ?? null,
    bid: ticker.bid ?? null,
    ask: ticker.ask ?? null,
    high: ticker.high ?? null,
    low: ticker.low ?? null,
    percentage: ticker.percentage ?? null,
    timestamp: ticker.timestamp ?? Date.now(),
    datetime: ticker.datetime ?? new Date().toISOString(),
  };
}

export async function fetchCcxtOhlcv(exchangeId: string, symbol: string, timeframe = "1h", limit = 24) {
  const Exchange = (ccxt as any)[exchangeId];
  if (!Exchange) throw new Error(`CCXT exchange not found: ${exchangeId}`);
  const exchange = new Exchange({ enableRateLimit: true });
  const rows = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
  return {
    source: "ccxt",
    exchange: exchangeId,
    symbol,
    timeframe,
    rows: rows.map(([timestamp, open, high, low, close, volume]: number[]) => ({
      timestamp,
      datetime: new Date(timestamp).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    })),
  };
}

