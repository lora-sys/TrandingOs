# Trading Pi — Architecture

**Version**: 4.1
**Last verified**: 2026-06-11
**Status**: Canonical

## 1. System Overview

```
User → Chat (ai-elements Conversation)
  → API Client (fetch bridge, :5173 → :8787)
    → API Server (Node HTTP, apps/web/server/api.ts)
      → @trading-pi/core
        → TradingPiAgent (Pi Mono runtime)
        → Skills (40+ registered)
        → Workflows (9 DAGs)
        → SQLite (persistence)
        → Langfuse (telemetry)

Side panels:
  → Inspector: Timeline, Skills, Risk, MCP Status
  → ArtifactPreviewPanel: Markdown/HTML/Data/Meta tabs
```

## 2. Current Implementation (What Exists)

### Runtime
- **Node.js** >=22.19.0
- **TypeScript** 5.9.3, ES2024 target, NodeNext modules, strict mode
- **Monorepo**: workspaces at `apps/*`, `packages/*`

### Frontend (apps/web)
- **React** 19.2.7
- **HeroUI v3** (3.1.0) + Tailwind CSS v4.3.0
- **TanStack Router** 1.170.15, **Query** 5.101.0, **Table** 8.21.3, **Form** 1.33.0, **Virtual** 3.14.2, **Start** 1.168.25
- **Vite** 7.2.7 (dev :5173), proxy `/api` → `http://localhost:8787`
- **AI**: ai-elements (Conversation, Message, PromptInput, Tool, Artifact, Confirmation)
- **Charts**: lightweight-charts 5.2.0, recharts 3.8.1
- **Other**: framer-motion, lucide-react, cmdk, vaul, shiki, streamdown
- **Build**: `tsc -p tsconfig.json && vite build`

### Backend (packages/core)
- **Agent**: Single `TradingPiAgent` wrapping Pi Mono `@earendil-works/pi-agent-core@0.79.0`
- **AI**: `@earendil-works/pi-ai@0.79.0`, OpenAI-compatible provider
- **Skills**: 40+ registered in `default-skills.ts` (market, search, browser, risk, research, artifact, journal, memory, workspace, mcp, strategy, backtest, evolution, review, approval, airdrop, execution)
- **Workflows**: 9 DAGs in `default-workflows.ts`
- **Persistence**: SQLite (node:sqlite), JSONL sessions, file artifacts
- **Telemetry**: Langfuse 3.38.20

### Sub-packages (all @trading-pi/* v0.1.0)
- `browser-layer`: AIO Sandbox browser action contract
- `journal`: Trade journal normalization
- `mcp-hub`: MCP registry, discovery, health, permissions
- `memory-engine`: Domain-scoped memory with workspace context
- `research-hub`: Research orchestration with search/browser/market bundles
- `search-hub`: Exa/Jina/Tavily search with caching
- `strategy-engine`: Strategy scoring and lifecycle

### Infrastructure
- **Database**: SQLite only (no PostgreSQL, no Redis, no ChromaDB)
- **Docker**: aio-sandbox only (sandbox at :8080)
- **No K8s, no Kafka, no S3/MinIO**

### Ports
- API Server: 8787
- Vite Dev: 5173
- AIO Sandbox: 8080

## 3. Target Design (Future)

The following are documented as future goals but NOT yet implemented:

| Component | Target | Current Status |
|-----------|--------|---------------|
| Database | PostgreSQL | SQLite only |
| Cache | Redis | In-memory cache via repos.setCache |
| Vector DB | ChromaDB | Not implemented |
| Object Store | S3/MinIO | File-based artifacts only |
| Orchestration | K8s | Docker-compose only |
| API Service | Separate apps/api/ | Deleted (API in apps/web/server) |
| Kafka | Event streaming | Audit records in SQLite only |
| ECharts | Charting option | recharts + lightweight-charts only |
| Zustand | Local UI state | Not installed |

## 4. Module Boundaries

- **TradingPiAgent** does not contain business logic. It routes to workflows.
- **Workflow Engine** runs DAGs and emits events.
- **Skill Registry** loads skills and converts to Pi tools.
- **AIO Sandbox** runs untrusted browser operations.
- **MCP Hub** manages external MCP tools and permissions.
- **Artifact Engine** stores, versions, previews generated outputs.

## 5. Domain Directories

| Domain | Package | Skills/Logic |
|--------|---------|-------------|
| Market | core | ticker, ohlcv, snapshot, orderbook, balance, router health |
| Search | search-hub | query, extract, summarize |
| Browser | browser-layer | search, open, extract, screenshot, pdf |
| Risk | core | positionSizing, tradePlan, stop_loss, daily_loss_guard |
| Research | research-hub | asset context, report |
| Journal | journal | entry, signal, emotion, screenshot |
| Memory | memory-engine | write, query by domain/workspace |
| Workspace | core | create, context |
| MCP | mcp-hub | discover, register, health, permission |
| Strategy | strategy-engine | create, lifecycle |
| Backtest | core | run, compare |
| Evolution | core | propose |
| Review | core | daily metrics |
| Execution | core | create_plan, real_order_guarded (disabled), cancel |
| Approval | core | request gate |
| Marketplace | core | seed catalog |
| Airdrop | core | search, eligibility |

## 6. Slash Commands

| Command | Workflow | Description |
|---------|----------|-------------|
| `/research <symbol>` | research.asset | Asset research context |
| `/plan <symbol> <side> <qty> <price>` | trade.plan | Trade plan with risk |
| `/review-day` | review.daily | Daily review metrics |
| `/backtest <symbol>` | strategy.backtest | Run backtest |
| `/browser <url>` | browser.evidence | Browser evidence |
| `/evolve <focus>` | evolution.propose | Strategy improvement |
| `/bootstrap-os` | os.bootstrap | OS bootstrap |
