# ADR-008: Market Data Dual-Source

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- CoinGecko for public quotes (no API key needed)
- CCXT for exchange-facing data (ticker, OHLCV, orderbook, balance)
- CoinMarketCap and DefiLlama as optional additional sources

## Consequences
- Resilient market data: if one source fails, others may work
- Network failures recorded as skill run errors (not hidden)
- Caching via repos.setCache with namespace/key/ttlMs

---
