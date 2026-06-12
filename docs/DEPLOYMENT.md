# Deployment Guide

**Last verified**: 2026-06-11

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

| Variable | Default | Purpose |
|----------|---------|---------|
| `TRADING_PI_API_PORT` | `8787` | API server port |
| `AI_API_KEY` | — | AI provider API key |
| `AI_BASE_URL` | — | AI provider base URL |
| `AI_MODEL` | `deepseek-v4-flash` | AI model name |
| `LANGFUSE_PUBLIC_KEY` | — | Langfuse telemetry (optional) |
| `LANGFUSE_SECRET_KEY` | — | Langfuse telemetry (optional) |
| `LANGFUSE_BASE_URL` | — | Langfuse telemetry (optional) |
| `AIO_SANDBOX_BASE_URL` | — | AIO Sandbox endpoint (optional) |

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
