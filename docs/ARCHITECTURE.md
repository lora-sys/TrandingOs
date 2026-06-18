# Trading Pi — Architecture

**Version**: 5.0
**Last verified**: 2026-06-14
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
- **@earendil-works/pi-web-ui** (0.75.3) + **@base-ui/react** + Tailwind CSS v4.3.0
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

| Package | Lines | Status | Notes |
|---------|-------|--------|-------|
| `browser-layer` | ~284 | **Active** | AIO Sandbox browser action contract. Two adapters (AIO + Playwright) = real seam. |
| `mcp-hub` | ~691 | **Active** | MCP registry, discovery, health, permissions. Full JSON-RPC client with stdio + SSE transports. |
| `search-hub` | ~88 | **Active** | Exa/Jina/Tavily search with caching and provider selection. |
| `journal` | ~17 | **Deprecated** | Content inlined into `core/src/journal.ts`. Package kept for backward compat. |
| `memory-engine` | ~37 | **Deprecated** | Types/helpers inlined into `core/src/memory/types.ts`. |
| `strategy-engine` | ~14 | **Deprecated** | Scoring function inlined into `core/src/strategy.ts`. |
| `research-hub` | ~83 | **Deprecated** | Bundle builder inlined into `core/src/research/bundle.ts`. |

> **Note on deprecated packages** (ADR-010): These 4 packages were identified as shallow during architecture review (2026-06-14). Their content has been consolidated into `@trading-pi/core` for simpler imports. The original packages remain as re-export shims but should not be used for new code.

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
| Zustand | Local UI state (settingsStore.ts) | ✅ Installed & extended (v5.0.14) |

## 4. Module Boundaries

- **TradingPiAgent** does not contain business logic. It routes to workflows.
- **Workflow Engine** runs DAGs and emits events.
- **Skill Registry** loads skills and converts to Pi tools.
- **AIO Sandbox** runs untrusted browser operations.
- **MCP Hub** manages external MCP tools and permissions.
- **Artifact Engine** stores, versions, previews generated outputs.

## 5. Domain Directories

| Domain | Location | Skills/Logic |
|--------|----------|-------------|
| Market | core | ticker, ohlcv, snapshot, orderbook, balance, router health |
| Search | search-hub | query, extract, summarize |
| Browser | browser-layer | search, open, extract, screenshot, pdf |
| Risk | core | positionSizing, tradePlan, stop_loss, daily_loss_guard |
| Research | core/src/research | asset context, report bundle (was research-hub package) |
| Journal | core/src/journal | entry normalization, signal, emotion, screenshot (was journal package) |
| Memory | core/src/memory | types, scope/key helpers, write/query by domain/workspace (was memory-engine package) |
| Workspace | core | create, context |
| MCP | mcp-hub | discover, register, health, permission |
| Strategy | core/src/strategy | definition type, scoring lifecycle (was strategy-engine package) |
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

---

## 7. Frontend Architecture (Post-Refactor v5.0)

> Detailed status after the 2026-06-14 architecture review refactoring.

### 7.1 Key Architectural Changes

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| **ChatWorkspace decomposition** | 959-line God component | ~520-line orchestrator + 5 hooks + ExportService | Each hook independently testable; no stale closures |
| **Route code-splitting** | All pages eagerly loaded | `React.lazy()` + Suspense for all 9 routes | Initial bundle reduced ~60-70% |
| **RPC pattern** | Monolithic switch/case (12+ commands) | Command registry (`useRpcRouter`) with typed handlers | Handlers testable without React; context injection |
| **Export deduplication** | Duplicated in ChatWorkspace RPC + ExportMenu | Single `lib/exportService.ts` shared by both | One source of truth |
| **Settings state** | Duplicated useState in SettingsPage | Unified through Zustand store | No desync risk |
| **Subagent state** | Duplicated in AppLayout + ChatWorkspace | Elevated to Zustand store | Single render point |
| **SSE parsing** | Identical code ×2 (message + research) | Shared `parseSSEStream()` in api.ts | Bug fix applied once |
| **Shallow packages** | 4 separate packages (journal, etc.) | Consolidated into `@trading-pi/core` | Simpler import graph |
| **Dead code cleanup** | 5 unused barrel exports, legacy types | Removed/marked @deprecated | Smaller bundle, less confusion |

### 7.2 Custom Hooks Layer

All custom hooks live in `apps/web/src/hooks/`:

| Hook | File | Interface | Purpose |
|------|------|-----------|---------|
| **useSSEStream** | `hooks/useSSEStream.ts` | `{ items, send, abort, status, error, nextId }` | Full SSE lifecycle: connection, 6 event types, entries accumulation, syncToItems transform, query invalidation, message queue |
| **useRpcRouter** | `hooks/useRpcRouter.ts` | `{ rpc(cmd), register(type, handler), refreshState }` | Command registry replacing switch/case. 12 built-in handlers + extensible via register(). Context injection eliminates stale closures. |
| **useModelPicker** | `hooks/useModelPicker.ts` | `{ model, models, open, search, select, ... }` | Model selection state, search filtering, context window tracking |
| **useCommandBar** | `hooks/useCommandBar.ts` | `{ open, actions, setActions }` | Global keyboard listener (Cmd+K, /, Escape), command palette state, action registry |
| **useResolvedTheme** | `lib/useResolvedTheme.ts` | `resolvedTheme: "dark" \| "light"` | Reactive theme resolution from mode + system preference. Shared by AppLayout and ChatWorkspace. |

### 7.3 Shared Services (Non-React)

| Service | File | Interface | Purpose |
|---------|------|-----------|---------|
| **ExportService** | `lib/exportService.ts` | `toHtml(items), toMarkdown(items), toPdf(items)` | Pure functions for chat export. No React dependency. Shared by RPC handler and ExportMenu component. |
| **FormatUtils** | `lib/format-utils.ts` | `formatUsd(value), formatChange(value)` | Currency formatting shared by DashboardPage and MarketPage. |

### 7.4 Pages

| Page | File | Route | Lazy? | APIs Called |
|------|------|-------|-------|-------------|
| **Chat** | `components/ChatWorkspace.tsx` (via WorkspacePage) | `/workspace/$id` | Yes | `POST /api/session/message/stream` (SSE), `/api/config`, `/api/artifacts` |
| **Dashboard** | `pages/DashboardPage.tsx` | `/` | Yes | `GET /api/status`, `GET /api/config`, `GET /api/trades`, `GET /api/memory` |
| **Market** | `pages/MarketPage.tsx` | `/markets` | Yes | 🔨 Placeholder |
| **Timeline** | `pages/TimelinePage.tsx` | `/timeline` | Yes | `GET /api/timeline` |
| **Workspace** | `pages/WorkspacePage.tsx` | `/workspace[/:id]` | Yes | Workspaces, decisions, trades, journal, reviews, research sessions |
| **Journal** | `pages/JournalPage.tsx` | `/journal` | Yes | `GET /api/journal` |
| **Settings** | `pages/SettingsPage.tsx` | `/settings` | Yes | Config, model, rules, sub-agents, health |
| **Evolution** | `pages/EvolutionPage.tsx` | `/evolution` | Yes | Evolution proposals, suggestions, user rules |
| **Memory** | `pages/MemoryPage.tsx` | `/memory` | Yes | `GET /api/memory`, `POST /api/memory/write` |

### 7.5 Components

#### Top-Level Components

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| **AppLayout** | `components/AppLayout.tsx` | Active | Root layout: sidebar, content area, settings modal, session list, nav items, health indicator, subagent sidebar |
| **ChatWorkspace** | `components/ChatWorkspace.tsx` | Active (~520L) | Thin orchestrator. Delegates to useSSEStream, useRpcRouter, useModelPicker, useCommandBar. Renders JSX layout only. |
| **ArtifactPanel** | `components/ArtifactPanel.tsx` | Active | Claude-style artifact sidebar |
| **ExportMenu** | `components/ExportMenu.tsx` | Active | Dropdown menu using ExportService |

#### Workspace Page Sub-components (extracted)

| Component | File | Description |
|-----------|------|-------------|
| **OverviewTab** | `pages/workspace/components.tsx` | Metrics, positions, quick actions |
| **ResearchTab** | `pages/WorkspacePage.tsx` (inline) | Deep research with SSE streaming + ChatWorkspace embed |
| **DecisionsTab** | `pages/workspace/components.tsx` | Decision form + list |
| **JournalTab** | `pages/workspace/components.tsx` | Entry form + list with trades |
| **ReviewTab** | `pages/workspace/components.tsx` | Trigger + accordion list |
| **WorkspaceList** | `pages/workspace/components.tsx` | Workspace grid/list view |

#### Workspace Utilities (extracted)

| Utility | File | Description |
|---------|------|-------------|
| **normalizeJournalEntry** | `pages/workspace/workspace-utils.ts` | Raw API entry → JournalCardEntry |
| **normalizeJournalTrade** | `pages/workspace/workspace-utils.ts` | Raw trade → JournalCardTrade |
| **deriveMetrics** | `pages/workspace/workspace-utils.ts` | Aggregate metrics from decisions/trades/journal |
| **parseMaybeJson** | `pages/workspace/workspace-utils.ts` | Safe JSON parse |
| **numberOrUndefined** | `pages/workspace/workspace-utils.ts` | Coerce to number or undefined |

### 7.6 State Management (Zustand)

Store file: [`src/lib/settingsStore.ts`](../apps/web/src/lib/settingsStore.ts)

| State Field | Type | Persisted To | Description |
|-------------|------|--------------|-------------|
| `sidebarOpen` | `boolean` | Memory only | Sidebar visibility |
| `settingsOpen` | `boolean` | Memory only | Settings modal visibility |
| `themeMode` | `"system" \| "light" \| "dark"` | `localStorage` (`pi-theme-mode`) | Theme preference |
| `thinkingLevel` | `string` | `localStorage` (`trading-pi-thinking-level`) | Agent thinking level |
| `showThinking` | `boolean` | `localStorage` (`pi-show-thinking`) | Show reasoning blocks |
| `autoCompaction` | `boolean` | `localStorage` (`trading-pi-auto-compaction`) | Auto-compaction enabled |
| `sessionName` | `string` | `localStorage` (`trading-pi-session-name`) | Current session name |
| `authEnabled` | `boolean` | Memory only | Auth toggle (future) |
| `authConfigured` | `boolean` | Memory only | Auth configured flag (future) |
| `currentSessionId` | `string \| null` | Memory only | Active session ID |
| `currentModel` | `ModelInfo \| null` | Memory only | Selected model info (shared between picker + RPC) |
| `subagents` | `SubagentStateMap` | Memory only | Subagent states (single source of truth) |
| `selectedSubagentId` | `string \| null` | Memory only | Selected subagent for detail sidebar |

**Key change (v5.0)**: `currentModel`, `subagents`, `selectedSubagentId` added to eliminate state duplication between components.

### 7.7 Routing

File: [`src/router.tsx`](../apps/web/src/router.tsx)

Uses `@tanstack/react-router` with **code-split routes**:

```
rootRoute (AppLayout + Outlet)
├── "/"              → DashboardPage     (lazy)
├── "/markets"       → MarketPage        (lazy)
├── "/timeline"      → TimelinePage      (lazy)
├── "/workspace"     → WorkspacePage     (lazy)
├── "/workspace/:id" → WorkspacePage     (lazy)
├── "/journal"       → JournalPage       (lazy)
├── "/settings"      → SettingsPage      (lazy)
├── "/evolution"     → EvolutionPage     (lazy)
└── "/memory"        → MemoryPage        (lazy)
```

All routes wrapped with `<Suspense fallback={<PageFallback />} />`.

### 7.8 Data Flow: SSE → Render (Updated)

```
1. User types message → PromptInput onSubmit
   → submitMessage({ text, files })
   → processPromptFiles(files) → base64 images
   → Build PromptCommand { id, message, images }

2. [Inside useSSEStream hook]
   → send(command):
     a. Build user SessionEntry → append to entriesRef.current
     b. tradingPiApi.sendMessageStream(message) → EventTarget
     c. Register 6 event listeners on EventTarget:
        - message_update → assistant SessionEntry → entriesRef → syncToItems → setItems
        - tool_execution_start → tool_call SessionEntry → entriesRef → syncToItems → setItems
        - tool_execution_end → tool_result SessionEntry → entriesRef → syncToItems → setItems
        - artifact_update → window.dispatchEvent("pi:artifact_update")
        - done → final syncToItems → invalidateQueries → setStatus("ready")
        - error → setStatus("error") + setError(message)

3. [Auto-drain effect]
   When status returns to "ready" and queuedMessages > 0:
   → Pop next message → call send() → repeat

4. RENDER: ChatItem[] from hook → ChatWorkspace JSX
   → UserMessageView (role === "user")
   → ChatItemView (assistant/tools/system/artifacts/plans)
```

**Key difference from v4.x**: All SSE logic is encapsulated in `useSSEStream()`. ChatWorkspace never touches `entriesRef`, `sseRef`, or raw `SessionEntry`s — it only sees `items: ChatItem[]` and `send()`/`abort()`.

---

## 8. Backend Implementation (`apps/web/server/api.ts` + `packages/core/`)

*(Unchanged from v4.1 — see sections 7.2–7.6 of previous version)*

#### Server Architecture

The entire backend is a **single file**: [`server/api.ts`](../apps/web/server/api.ts) (~305 lines)

- **No framework**: Uses raw `node:http` (`createServer`)
- **No middleware**: Manual CORS headers, manual JSON body reading
- **Single listener**: One `createServer` callback with `if/else` route matching
- **Port**: Configurable via `TRADING_PI_API_PORT` env (default `8787`)

Initialization sequence (runs once at startup):
1. `loadEnv()` → read `.env` file
2. `resolveLocalPaths()` → compute data directory paths
3. `ensureLocalPaths()` → create directories if missing
4. `new TradingPiDatabase(sqlitePath)` → open SQLite, run migrations
5. `new Repositories(db)` → data access layer
6. Initialize stores: `SessionStore`, `MemoryStore`, `ArtifactEngine`, `ApprovalEngine`
7. `new SkillRegistry(repos)` → skill container
8. `new WorkflowEngine(skills, repos, artifacts, approvals, memory)` → workflow engine
9. `registerDefaultSkills(skills)` → register 40+ skills
10. `registerDefaultWorkflows(workflows)` → register 9 workflows
11. `new TradingPiAgent({ sessions, memory, skills, workflows, artifacts, approvals, repos, env })`

#### API Endpoints (Categorized)

**Health & Status**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/health` | Returns `{ ok, name, localFirst, sqlitePath, time }` |
| GET | `/api/status` | Returns `{ status, skills, workflows, langfuseConfigured, paths, config }` |

**Configuration** (mutable runtime state)
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/config` | Returns `agentConfig` object |
| POST | `/api/config` | Updates `agentConfig.thinkingLevel`, `.modelId`, `.autoCompaction` |

**Sessions & Chat**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions` | List all sessions from DB |
| DELETE | `/api/sessions/:id` | Delete session (JSONL + metadata) |
| GET | `/api/messages?sessionId=` | Read session JSONL → map to chat messages |
| POST | `/api/session/message` | Non-streaming agent prompt |
| POST | `/api/session/message/stream` | **SSE streaming** endpoint |

**Artifacts & Plans**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/artifacts` | List all artifacts |
| GET | `/api/plans?sessionId=` | List plans (optional session filter) |
| GET | `/api/plan?id=` | Get single plan by ID |

**Memory**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/memory` | List all memory records |
| POST | `/api/memory/query` | Query memory by criteria |
| POST | `/api/memory/write` | Write or delete memory record |

**Market Data**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/market/ohlcv?symbol=&timeframe=&limit=` | OHLCV candle data via CCXT skill |

**Portfolio & Trading**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/portfolio` | Portfolio snapshot (positions) |
| GET | `/api/trades` | List trades (last 100) |
| POST | `/api/paper/orders` | Create paper trading order |
| GET | `/api/strategies` | List strategies |
| GET | `/api/reviews` | List reviews |

**Workflows & Skills**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/skills` | List all registered skills |
| GET | `/api/workflows` | List all registered workflows |
| POST | `/api/workflows/:id/run` | Execute workflow by ID |

**Journal**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/journal` | List journal entries |
| POST | `/api/journal` | Create journal entry |

**System & Integrations**
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/timeline` | List timeline events |
| GET | `/api/approvals` | List pending/approved approvals |
| GET | `/api/mcp/servers` | List MCP servers |
| GET | `/api/browser/health` | Browser sandbox health check |

---

## 9. Integration Points

### Settings → Backend Config Sync

```
User changes Thinking Level in SettingsPage
  → useSettingsStore.getState().setThinkingLevel("high")  // Store update
  → localStorage.setItem("trading-pi-thinking-level", "high") // Local persist
  → tradingPiApi.setConfig({ thinkingLevel: "high" })  // Backend sync
  → POST /api/config { thinkingLevel: "high" }
  → api.ts: agentConfig.thinkingLevel = "high"
  → Next agent.prompt() call uses thinkingLevel: "high"
```

Same pattern applies for `autoCompaction` and `modelId` (now stored in Zustand too).

### SSE Event Flow (Backend → Frontend)

```
TradingPiAgent.handleEvent(event)
  → repos.createTimeline({ ... })
  → onStreamEvent?.(event)
  → api.ts: forwardStreamEvent(event)
  → res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)

  [Browser: api.ts client]
  → ReadableStream reader.read()
  → parseSSEStream(reader, target)  ← SHARED PARSER (v5.0 new)
  → target.dispatchEvent(new CustomEvent(type, { detail: parsed }))

  [useSSEStream hook]
  → sse.addEventListener("message_update", handler)
  → Build SessionEntry → entriesRef.current.push(entry)
  → syncToItems(entriesRef) → ChatItem[]
  → setItems(newItems) → React re-render
```

**v5.0 change**: `parseSSEStream()` is now a single shared function used by both `sendMessageStream()` and `startDeepResearchStream()`. Research streams use `eventPrefix: "research:"` for namespaced events.

### Artifact Lifecycle

```
Agent generates artifact (during tool execution or workflow)
  → ArtifactEngine.create(title, content, type, ...)
  → Write to file system (.trading-pi/artifacts/)
  → Insert row into `artifacts` table
  → Emit "artifact_update" AgentEvent
  → SSE forwards to frontend
  → useSSEStream dispatches window "pi:artifact_update"
  → ArtifactPanel auto-opens
  → ArtifactPanel fetches GET /api/artifacts
  → Displays artifact list with download option
```

---

## 10. Database Schema

File: [`packages/core/src/db/database.ts`](../packages/core/src/db/database.ts)

SQLite database with **30 tables**, WAL mode, foreign keys enabled:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sessions` | Session metadata | id, name, path, status, parent_session_id, message_count |
| `messages` | Message storage | id, session_id, role, parts (JSON), model, created_at |
| `timeline_events` | Execution log | id, session_id, type, title, status, payload_json |
| `memory_records` | Long-term memory | id, scope, key, value, domain, workspace_id, importance |
| `artifacts` | Generated outputs | id, type, title, summary, path, content_type, content |
| `plans` | Trade/action plans | id, session_id, title, status, steps (JSON), content |
| `approvals` | Approval gates | id, action, risk_level, status, reason |
| `orders` | Trading orders | id, symbol, side, quantity, price, mode (paper/live) |
| `trades` | Executed trades | id, symbol, side, quantity, entry_price, pnl, status |
| `positions` | Current positions | symbol, quantity, avg_price, realized_pnl |
| `journal_entries` | Trade journals | id, mood, discipline_score, notes, screenshot_path |
| `reviews` | Performance reviews | id, period, metrics_json, discipline_score |
| `workspaces` | Workflow definitions | id, name, description, risk_level |
| `workflow_runs` | Workflow executions | id, workflow_id, input_json, output_json, status |
| `skills` | Skill definitions | id, name, description, risk_level, permission |
| `skill_runs` | Skill executions | id, skill_id, input_json, output_json, status |
| `workspaces` | Workspace contexts | id, name, kind, context_json |
| `mcp_servers` | MCP server registry | id, name, command, url, status, permission |
| `strategies` | Strategy definitions | id, name, version, parameters_json, score |
| `backtests` | Backtest results | id, strategy_id, status, metrics_json |
| `evolution_proposals` | Strategy improvements | id, strategy_id, proposal_json, status |
| `market_prices` | Price cache | symbol, exchange, price_usd, change_24h |
| `market_ohlcv` | OHLCV cache | symbol, timeframe, timestamp, OHLCV |
| `search_cache` | Search result cache | query, provider, results_json, expires_at |
| `data_cache` | General cache | key, namespace, value_json, expires_at |
| `browser_sessions` | Browser actions | provider, action, url, result_json |
| `marketplace_items` | Skill/workflow marketplace | kind, name, status, manifest_json |
| `audit_records` | Audit trail | category, action, status, actor, payload_json |

Indexes on: `market_prices(symbol)`, `market_ohlcv(symbol, timeframe)`, `trades(symbol)`, `messages(session_id)`, `memory_records(domain)`, `timeline_events(session_id)`, `artifacts(session_id)`, `search_cache(query)`.
