# Trading Pi — Architecture

**Version**: 4.1
**Last verified**: 2026-06-13
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
| Zustand | Local UI state (settingsStore.ts) | ✅ Installed (v5.0.14) |

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

---

## 7. Current Implementation Status (2026-06)

> Detailed status of each layer as of the `refactor/frontend` branch.

### 7.1 Frontend Implementation (`apps/web/src/`)

#### Pages

| Page | File | Route | Status | APIs Called |
|------|------|-------|--------|-------------|
| **Chat** | `pages/ChatPage.tsx` → `components/ChatWorkspace.tsx` | `/` | ✅ Fully functional | `POST /api/session/message/stream` (SSE), `/api/config`, `/api/artifacts` |
| **Dashboard** | `pages/DashboardPage.tsx` | `/dashboard` | ✅ Fully functional | `GET /api/status`, `GET /api/config`, `GET /api/trades`, `GET /api/memory` |
| **Market** | `pages/MarketPage.tsx` | `/market` | 🔨 Placeholder (no backend calls) | None — animated SVG placeholder with feature list |
| **Portfolio** | `pages/PortfolioPage.tsx` | `/portfolio` | 🔨 Placeholder (no backend calls) | None — animated donut chart placeholder with feature list |
| **Memory** | `pages/MemoryPage.tsx` | `/memory` | ✅ Fully functional | `GET /api/memory`, `POST /api/memory/write` |
| **Timeline** | `pages/TimelinePage.tsx` | `/timeline` | ✅ Fully functional | `GET /api/timeline` |

#### Components

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| **AppLayout** | `components/AppLayout.tsx` | ✅ Active | Global layout: collapsible sidebar (`AppSidebar`), main content area, settings modal, session list, nav items, health indicator |
| **ChatWorkspace** | `components/ChatWorkspace.tsx` | ✅ Active | Main chat interface. Handles SSE streaming, message rendering, tool call display, artifact panel toggle, export, command palette, model picker, subagent sidebar |
| **ArtifactPanel** | `components/ArtifactPanel.tsx` | ✅ Active | Claude-style artifact sidebar. Fetches from `GET /api/artifacts`, displays list with download, auto-opens on `pi:artifact_update` event |
| **ExportMenu** | `components/ExportMenu.tsx` | ✅ Active | Dropdown menu for HTML/Markdown/PDF export. Renders below prompt input |
| **SettingsPanel** | `components/pi-web-ui/settings-panel.tsx` | ✅ Active | Global settings modal (theme, thinking level, compaction, session name, auth toggle). Props-driven from Zustand store |

#### ai-elements (Custom Chat Components)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| `Conversation` | `ai-elements/conversation.tsx` | ✅ Active | Scrollable chat container with content area and scroll button |
| `Message` | `ai-elements/message.tsx` | ✅ Active | Assistant/user message rendering |
| `PromptInput` | `ai-elements/prompt-input.tsx` | ✅ Active | Multi-line input with attachments, submit button, footer tools |
| `Tool` | `ai-elements/tool.tsx` | ✅ Active | Expandable tool call card (input/output/error) |
| `Artifact` | `ai-elements/artifact.tsx` | ✅ Active | Artifact card component used in ArtifactPanel |
| `Reasoning` | `ai-elements/reasoning.tsx` | ✅ Active | Thinking/reasoning block display |
| `CodeBlock` | `ai-elements/code-block.tsx` | ✅ Active | Syntax-highlighted code (shiki) |
| `ChainOfThought` | `ai-elements/chain-of-thought.tsx` | ⚠️ Partial | Defined but limited usage in current flow |
| `Plan` | `ai-elements/plan.tsx` | ⚠️ Partial | Plan card component, defined but plans UI not fully wired |
| `Shimmer` | `ai-elements/shimmer.tsx` | ✅ Active | Loading skeleton animation |
| `Suggestion` | `ai-elements/suggestion.tsx` | ⚠️ Defined | Quick-reply suggestion chips (not yet wired to suggestions API) |
| `Confirmation` | `ai-elements/confirmation.tsx` | 🔴 Dead code | Approval confirmation dialog — exists but no approval UI flow yet |
| `Sources` | `ai-elements/sources.tsx` | 🔴 Dead code | Source reference cards — not used in current chat flow |
| `Task` | `ai-elements/task.tsx` | 🔴 Dead code | Task progress component — not used |

#### pi-web-ui (Inherited Base Components)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| `AppSidebar` | `pi-web-ui/app-sidebar.tsx` | ✅ Active | Collapsible sidebar container used by AppLayout |
| `AppSidebarContent` | `pi-web-ui/app-sidebar-content.tsx` | ✅ Active | Sidebar inner content structure |
| `SessionSidebar` | `pi-web-ui/session-sidebar.tsx` | ✅ Active | Session list in sidebar |
| `SettingsPanel` | `pi-web-ui/settings-panel.tsx` | ✅ Active | Settings modal (props-driven) |
| `ChatItemView` | `pi-web-ui/chat-item-view.tsx` | ✅ Active | Unified renderer for messages/tools/system items |
| `UserMessageView` | `pi-web-ui/user-message-view.tsx` | ✅ Active | User bubble renderer |
| `ModelPicker` | `pi-web-ui/model-picker.tsx` | ✅ Active | Model selection popover |
| `CommandPalette` | `pi-web-ui/command-palette.tsx` | ✅ Active | Cmd+K command palette (compact, export, stats) |
| `ContextPopover` | `pi-web-ui/context-popover.tsx` | ✅ Active | Context window usage display |
| `WorkspaceStatusFloat` | `pi-web-ui/workspace-status-float.tsx` | ✅ Active | Floating status indicator |
| `SubagentDetailSidebar` | `pi-web-ui/subagent-detail-sidebar.tsx` | ⚠️ Reserved | Subagent detail view (single-agent arch, minimal use) |
| `ExtensionDialog` | `pi-web-ui/extension-dialog.tsx` | ⚠️ Reserved | Extension interaction dialog |
| `ProjectLauncher` | `pi-web-ui/project-launcher.tsx` | 🔴 Dead code | Project launcher (IDE concept, N/A for trading terminal) |
| `ImagePreviewStrip` | `pi-web-ui/image-preview-strip.tsx` | ⚠️ Minor | Image attachment preview strip |
| `PromptAttachments` | `pi-web-ui/prompt-attachments.tsx` | ✅ Active | File/image attachment handling in prompt input |

#### State Management (Zustand)

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

**Sync flow**: When user changes `thinkingLevel`, `autoCompaction`, or `themeMode` via SettingsPanel → Zustand store updates → `localStorage` saved → **also** sent to backend via `POST /api/config` → updates `agentConfig` in `api.ts`.

#### Routing

File: [`src/router.tsx`](../apps/web/src/router.tsx)

Uses `@tanstack/react-router` with a flat route tree:

```
rootRoute (AppLayout + Outlet)
├── "/"              → ChatPage
├── "/dashboard"     → DashboardPage
├── "/market"        → MarketPage
├── "/portfolio"     → PortfolioPage
├── "/memory"        → MemoryPage
└── "/timeline"      → TimelinePage
```

All routes are lazy-loaded through standard imports (no React.lazy currently). The router is type-safe via module declaration.

#### Data Flow: SSE → Render

This is the most critical data path in the application:

```
1. User types message → submitMessage() in ChatWorkspace
2. → sendPrompt() creates SessionEntry { type: "message", role: "user" }
3. → Appends to entriesRef.current (mutable ref array)
4. → Calls tradingPiApi.sendMessageStream(message)
5. → Opens POST /api/session/message/stream (fetch + ReadableStream)
6. → Backend agent.prompt() starts, subscribes to events

   [SSE Events flow back through EventTarget]

7. "message_update" event:
   → Build SessionEntry { type: "message", role: "assistant", content }
   → Append/update entriesRef.current
   → Call syncToItems(entriesRef.current) → converts entries to ChatItem[]
   → setItems(newItems) → triggers re-render
   → ChatItemView renders with streaming=true

8. "tool_execution_start" event:
   → Build SessionEntry { type: "tool_call", ... }
   → Append to entriesRef → syncToItems → setItems
   → Tool component renders with state="input-streaming"

9. "tool_execution_end" event:
   → Build SessionEntry { type: "tool_result", ... }
   → Append to entriesRef → syncToItems → setItems
   → Tool component updates with output

10. "artifact_update" event:
    → Dispatches window CustomEvent("pi:artifact_update")
    → ArtifactPanel listens → auto-opens panel

11. "done" event:
    → Final syncToItems pass (streaming=false on all)
    → Invalidate react-query caches (messages, timeline, artifacts, sessions)
    → Set chatStatus="ready"
```

Key function: [`syncToItems()`](../apps/web/src/core/chat-conversion.ts) — transforms raw `SessionEntry[]` into typed `ChatItem[]` (message/tool/system/artifact/plan).

---

### 7.2 Backend Implementation (`apps/web/server/api.ts` + `packages/core/`)

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

#### Agent Pipeline

File: [`packages/core/src/agent/trading-pi-agent.ts`](../packages/core/src/agent/trading-pi-agent.ts)

```
user message arrives
  │
  ├─ [1] Ensure/create session (sessions.ensureSession)
  │     └─ Append user message to JSONL
  │
  ├─ [2] Check slash commands (routeSlashCommand)
  │     ├─ If match → run workflow directly → return result
  │     └─ If no match → continue to agent
  │
  ├─ [3] Create Agent instance (from pi-agent-core)
  │     ├── systemPrompt(): "You are Trading Pi Agent..."
  │     ├── model: createTradingPiModel(env)  // OpenAI-compatible
  │     ├── tools: skills.toPiTools(context)   // 40+ Pi tools
  │     ├── thinkingBudgets: { low, medium, high }
  │     ├── transformContext: inject compaction summary + memory context
  │     ├── prepareNextTurn: refresh memory context per turn
  │     ├── beforeToolCall: timeline record + approval gate
  │     └── afterToolCall: timeline record
  │
  ├─ [4] Subscribe to AgentEvents → forward to onStreamEvent callback
  │
  ├─ [5] agent.prompt(message) → runs tool loop
  │     └─ Emits: message_update → tool_execution_start → tool_execution_end → message_end
  │
  ├─ [6] Auto-compaction check (if messageCount > 50)
  │     ├─ estimateContextTokens(messages)
  │     ├─ shouldCompact(tokens, 128000, DEFAULT_COMPACTION_SETTINGS)
  │     └─ generateSummary(...) → store as _compactionSummary
  │
  └─ [7] Return { sessionId, messages, text }
```

**Thinking Level Token Budgets**:

| Level | Tokens |
|-------|--------|
| off | 0 |
| minimal | 1,024 |
| low | 4,096 |
| medium | 8,192 |
| high | 16,384 |
| xhigh | 32,768 |

#### Config System

Runtime configuration object (in-memory, mutable):

```typescript
const agentConfig = {
  thinkingLevel: "medium",   // string: off|minimal|low|medium|high|xhigh
  modelId: env.openaiModel ?? "default",  // string: model identifier
  autoCompaction: true,      // boolean: enable auto-compaction
};
```

- **GET /api/config** → returns current state
- **POST /api/config** → mutates fields → next `agent.prompt()` call uses updated values
- **Frontend sync**: SettingsPanel changes → Zustand → localStorage → POST /api/config

#### Database Schema

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
| `workflows` | Workflow definitions | id, name, description, risk_level |
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

Schema migration is additive: `addColumnIfMissing()` ensures new columns are added without breaking existing databases.

---

### 7.3 Integration Points

#### Settings → Backend Config Sync

```
User changes Thinking Level in SettingsPanel
  → useSettingsStore.getState().setThinkingLevel("high")
  → localStorage.setItem("trading-pi-thinking-level", "high")
  → tradingPiApi.setConfig({ thinkingLevel: "high" })
  → POST /api/config { thinkingLevel: "high" }
  → api.ts: agentConfig.thinkingLevel = "high"
  → Next agent.prompt() call uses thinkingLevel: "high"
```

Same pattern applies for `autoCompaction` and `modelId`.

#### SSE Event Flow (Backend → Frontend)

```
TradingPiAgent.handleEvent(event)
  → repos.createTimeline({ ... })       // persist to SQLite
  → onStreamEvent?.(event)              // forward to api.ts callback
  → api.ts: forwardStreamEvent(event)   // normalize event shape
  → res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)  // SSE frame
  →
  [Browser: api.ts client]
  → ReadableStream reader.read()
  → Parse SSE frames (event: + data:)
  → target.dispatchEvent(new CustomEvent(type, { detail: parsed }))
  →
  [ChatWorkspace.tsx]
  → sse.addEventListener("message_update", handler)
  → Build SessionEntry → entriesRef.current.push(entry)
  → syncToItems(entriesRef) → ChatItem[]
  → setItems(newItems) → React re-render
```

#### Artifact Lifecycle

```
Agent generates artifact (during tool execution or workflow)
  → ArtifactEngine.create(title, content, type, ...)
  → Write to file system (.trading-pi/artifacts/)
  → Insert row into `artifacts` table
  → Emit "artifact_update" AgentEvent
  → SSE forwards to frontend
  → ChatWorkspace dispatches window "pi:artifact_update"
  → ArtifactPanel auto-opens
  → ArtifactPanel fetches GET /api/artifacts
  → Displays artifact list with download option
```
