/**
 * Centralized data source timeout constants.
 * All fetch calls to external APIs MUST use these values.
 */

export const DATA_SOURCE_TIMEOUTS = {
  /** Polymarket Gamma/CLOB — slow in CN network, needs generous timeout + retry */
  polymarket: 30_000,
  /** CoinGecko public API */
  coingecko: 15_000,
  /** CoinMarketCap Pro API */
  coinmarketcap: 15_000,
  /** DefiLlama prices API */
  defillama: 15_000,
  /** FRED (Federal Reserve) macro data */
  fred: 15_000,
  /** Reddit public JSON API — often throttled, give extra time */
  reddit: 20_000,
  /** Xueqiu (雪球) stock API */
  xueqiu: 15_000,
  /** GitHub REST API */
  github: 15_000,
  /** RSS/Atom feed parsing */
  rss: 15_000,
} as const;

/** Retry config for unreliable sources (Polymarket, Reddit) */
export const RETRY_CONFIG = {
  maxRetries: 2,
  backoffMs: [1_000, 3_000], // exponential: 1s → 3s
} as const;
