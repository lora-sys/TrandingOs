# Trading Pi OS — API Reference

**Last verified**: 2026-06-11
**Base URL**: `http://localhost:8787`

## Overview

The API is a Node HTTP server at `apps/web/server/api.ts`. All endpoints return JSON. Streaming uses SSE (Server-Sent Events).

CORS is open (Access-Control-Allow-Origin: \*) for local Vite dev proxy (`:5173` → `:8787`).

---

## System

### `GET /api/health`

System health check.

```json
{ "ok": true, "name": "Trading Pi", "localFirst": true, "sqlitePath": "/path/to/data", "time": "..." }
```

### `GET /api/status`

Agent runtime status.

```json
{ "status": "idle", "skills": 40, "workflows": 9, "langfuseConfigured": true, "paths": {...} }
```

---

## Chat / Session

### `POST /api/session/message`

Send message, receive complete response.

**Body**: `{ "message": "...", "sessionId?": "..." }`
**Response**: `{ "sessionId": "...", "text": "...", "messages": [...] }`

### `POST /api/session/message/stream`

Send message, receive SSE stream.

**Body**: `{ "message": "...", "sessionId?": "..." }`
**Events**:
- `message_update` — streaming text content
- `tool_execution_start` — skill execution beginning
- `tool_execution_end` — skill execution complete
- `artifact_update` — artifact content generated
- `done` — stream complete (includes full response)
- `error` — error occurred

### `GET /api/messages?sessionId=...`

Get message history for a session.

### `GET /api/sessions`

List all sessions.

---

## Skills & Workflows

### `GET /api/skills`

List all registered skills.

### `GET /api/workflows`

List all registered workflows.

### `POST /api/workflows/:name/run`

Run a named workflow (e.g., `market.snapshot`, `trade.plan`).

**Body**: `{ "input": {...}, "sessionId": "..." }`

### `GET /api/timeline`

List execution timeline events.

---

## Market Data

### `GET /api/market/ohlcv?symbol=ETH/USDT&timeframe=1d&limit=120`

OHLCV candlestick data.

**Query params**: `symbol` (default ETH/USDT), `timeframe` (default 1d), `limit` (default 120)

### `GET /api/portfolio`

Current portfolio snapshot (paper trading balance + positions).

### `GET /api/trades`

Trade history.

---

## Journal & Review

### `GET /api/journal`

List journal entries.

### `POST /api/journal`

Create journal entry.

**Body**: `{ "input": {...}, "sessionId": "..." }`

### `GET /api/reviews`

List review records.

### `GET /api/strategies`

List trading strategies.

---

## Paper Trading

### `POST /api/paper/orders`

Create paper order.

**Body**: `{ "input": {...}, "sessionId": "..." }`

---

## Memory

### `GET /api/memory`

List all memory entries.

### `POST /api/memory/query`

Query memory by domain/workspace.

**Body**: `{ "domain?": "...", "workspace?": "...", "query?": "..." }`

### `POST /api/memory/write`

Write memory entry.

**Body**: `{ "domain": "...", "workspace": "...", "content": "...", "sourceType": "...", "sourceId": "..." }`

---

## MCP & Browser

### `GET /api/mcp/servers`

List registered MCP servers.

### `GET /api/browser/health`

Check browser sandbox configuration.

```json
{ "configured": true, "baseUrl": "http://sandbox:8080", "provider": "aio-sandbox" }
```

---

## Artifacts

### `GET /api/artifacts`

List all artifacts.

### `GET /api/artifacts/:id/preview`

Get preview content for an artifact (Markdown/HTML/PDF/Data/Meta).

---

## Approvals

### `GET /api/approvals`

List pending/existing approval requests.
