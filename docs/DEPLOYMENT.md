# Deployment Guide

**Last verified**: 2026-06-14

## Prerequisites

- **Node.js** >= 22.19.0
- **npm** (comes with Node)
- **SQLite** (node:sqlite, no external install needed)
- **Docker** (only for AIO Sandbox — optional for basic operation)

## Local Development

```bash
# Install dependencies
npm install

# Start development (API :8787 + Vite :5173)
npm run dev

# Or start only the web frontend dev server
npm run dev:web
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8787`.

## Build

```bash
# Build all packages
npm run build

# Check TypeScript (all packages)
npm run check
```

### Post-Refactor Build Notes

- **`npm run check`** verifies all packages including the refactored frontend (monorepo-wide type checking)
- **Code-splitting**: production build now produces multiple lazy-loaded chunks via Vite's automatic chunk splitting
- **Chunk naming**: Vite follows route patterns — each route becomes its own async chunk for optimal loading

## Production

### Via Docker

```bash
# Build Docker image
docker build -t trading-pi .

# Run container
docker run -d \
  -p 8787:8787 \
  -v ./data:/data \
  -e NODE_ENV=production \
  trading-pi
```

### Manual (no Docker)

```bash
npm run build
npm run start -w @trading-pi/web
```

The API server starts on port 8787 by default (configurable via `TRADING_PI_API_PORT`).

## Environment Variables

Full reference in [`apps/web/.env.example`](../apps/web/.env.example):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | **Yes** | — | AI model provider API key |
| `OPENAI_BASE_URL` | No | — | AI model endpoint base URL |
| `OPENAI_MODEL` | No | — | Default model identifier |
| `TRADING_PI_DATA_DIR` | No | `.trading-pi` | Local data root directory |
| `TRADING_PI_API_PORT` | No | `8787` | Backend API server port |
| `TRADING_PI_WEB_PORT` | No | `5173` | Frontend dev server port |
| `TRADING_PI_DEFAULT_EXCHANGE` | No | `binance` | Default CCXT exchange |
| `TRADING_PI_EXCHANGE_FALLBACKS` | No | `okx,bybit,coinbase,kraken` | Fallback exchange list |
| `TRADING_PI_TRADING_MODE` | No | `paper` | Trading mode (paper/live) |
| `EXA_API_KEY` | No | — | Exa search API key |
| `TAVILY_API_KEY` | No | — | Tavily search API key |
| `JINA_API_KEY` | No | — | Jina search/read API key |
| `COINMARKETCAP_API_KEY` | No | — | CoinMarketCap / CoinGecko fallback |
| `LANGFUSE_PUBLIC_KEY` | No | — | Langfuse telemetry (optional) |
| `LANGFUSE_SECRET_KEY` | No | — | Langfuse telemetry (optional) |
| `LANGFUSE_HOST` | No | — | Langfuse telemetry host (optional) |
| `AIO_SANDBOX_BASE_URL` | No | `http://localhost:8080` | Browser sandbox endpoint (optional) |

Environment loading: [`packages/core/src/config/env.ts`](../packages/core/src/config/env.ts) — supports `.env` files in `apps/web/`, project root, or parent directories.

## Data Storage

```
.trading-pi/
├── trading-pi.sqlite    # Main database
├── artifacts/           # Generated artifacts
├── logs/                # Application logs
├── memory/              # Memory store files
└── sessions/            # JSONL session logs
```

## Infrastructure Notes

- **Database**: SQLite only (no PostgreSQL, no Redis, no ChromaDB)
- **Docker**: Only for aio-sandbox (browser automation)
- **No K8s, no Kafka, no S3/MinIO** required
- AIO Sandbox runs on port 8080 when configured

## Verification

After deployment, verify:
```bash
curl http://localhost:8787/api/health
# → { "ok": true, "name": "Trading Pi" }
```

## Project Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system architecture (v5.0) |
| [FRONTEND.md](./FRONTEND.md) | Frontend architecture details (v5.0) |
| [BACKEND.md](./BACKEND.md) | Backend architecture & API server |
| [API.md](./API.md) | REST API reference |
| [WORKFLOWS.md](./WORKFLOWS.md) | Development workflows |
| `adr/` | Architecture Decision Records (001–010) |
