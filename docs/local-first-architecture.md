# Local-First Architecture

Trading Pi runs as a local personal trading OS. Docker exists only to make the local app reproducible for another user.

## Storage Layout

```txt
.trading-pi/
├── trading-pi.sqlite
├── artifacts/
├── logs/
├── memory/
└── sessions/
```

## Runtime Flow

```txt
User
-> Web UI
-> Local API
-> TradingPiAgent
-> Workflow Engine
-> Skill Registry
-> Pi Agent Core / Pi AI / market integrations
-> SQLite + JSONL + Artifact files
-> Timeline + Langfuse
-> Web UI
```

## Market Data

Both first-version market sources are supported:

- CoinGecko: no trading key, useful for public quote snapshots.
- CCXT: exchange-facing ticker/OHLCV access, useful for symbols and eventual paper/guarded trading alignment.

Network failures must be recorded as skill run errors instead of hidden.

