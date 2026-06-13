# Fact Memory — Trading Pi OS
**Extracted**: 2026-06-13T00:00:00Z
**Source**: Code-only (trust = 5 for all entries)

## Project Identity
| Fact | Value | Source |
|------|-------|--------|
| Name | trading-pi (workspace) / @trading-pi/web (app) / @trading-pi/core (core) | package.json:2 |
| Version | 0.1.0 (all packages) | package.json:3 |
| Type | ESM (`"type": "module"`) | package.json:5 |
| Workspaces | `apps/*`, `packages/*` (npm workspaces) | package.json:6-9 |
| Node engine | >=22.19.0 | package.json:11 |
| Package manager | npm (workspaces, no pnpm-lock/yarn.lock) | package.json structure |

## Tech Stack — Frontend (apps/web)
| Fact | Value | Source |
|------|-------|--------|
| Framework | React 19.2.7 (overridden at root) | apps/web/package.json:31 + root overrides |
| Router | @tanstack/react-router ^1.170.15 | apps/web/package.json:20 |
| State | zustand ^5.0.14 | apps/web/package.json:39 |
| Data Fetching | @tanstack/react-query ^5.101.0 (refetchInterval=4000, staleTime=1500) | apps/web/package.json:19 + main.tsx:8-14 |
| Animations | framer-motion ^12.40.0 | apps/web/package.json:27 |
| Icons | lucide-react ^0.468.0 | apps/web/package.json:29 |
| UI Primitives | @base-ui/react ^1.5.0 | apps/web/package.json:13 |
| Command Palette | cmdk ^1.1.1 | apps/web/package.json:26 |
| Markdown Renderer | streamdown ^2.5.0 + plugins (@streamdown/cjk, code, math, mermaid) | apps/web/package.json:34 + :16-18 |
| Code Highlighting | shiki ^3.23.0 | apps/web/package.json:33 |
| AI SDK | ai ^6.0.201 (Vercel AI SDK) | apps/web/package.json:23 |
| PDF Export | html2pdf.js ^0.14.0 | apps/web/package.json:28 |
| CSS | Tailwind v4.3.0 + tw-animate-css ^1.4.0 + @tailwindcss/vite ^4.3.1 | apps/web/package.json:36-37 + devDeps:42 |
| Virtual Scrolling | @tanstack/react-virtual ^3.14.2 | apps/web/package.json:22 |
| Stick to Bottom | use-stick-to-bottom ^1.1.6 | apps/web/package.json:38 |
| ID Generation | nanoid ^3.3.12 | apps/web/package.json:30 |
| Controllable State | @radix-ui/react-use-controllable-state ^1.2.3 | apps/web/package.json:14 |
| CVA | class-variance-authority ^0.7.1 | apps/web/package.json:24 |
| Build tool | Vite 7.2.7 (root) + @vitejs/plugin-react ^6.0.2 | root package.json:28 + web devDeps:45 |
| Font (headings/body) | Geist Variable → Inter → SF Pro Display → system-ui (CSS var --font-sans) | styles.css:95 |
| Font (data/code/mono) | JetBrains Mono → Cascadia Code → Fira Code → monospace (CSS var --font-mono) | styles.css:34 |

## Tech Stack — Backend (apps/web/server)
| Fact | Value | Source |
|------|-------|--------|
| Server | Raw node:http (createServer, no framework) | server/api.ts:1 |
| Protocol | SSE (Server-Sent Events) for streaming chat | server/api.ts:166-218 |
| Database | SQLite via node:sqlite (DatabaseSync, WAL mode, FK on) | packages/core/src/db/database.ts:1,11-12 |
| Agent Engine | @earendil-works/pi-agent-core 0.79.0 | packages/core/package.json:12 |
| AI Model Interface | @earendil-works/pi-ai 0.79.0 | packages/core/package.json:13 |
| UI Components | @earendil-works/pi-web-ui 0.75.3 | packages/core/package.json:14 |
| Exchange Library | ccxt 4.5.27 | packages/core/package.json:22 |
| Observability | langfuse 3.38.20 | packages/core/package.json:23 |
| Schema Validation | typebox 1.1.38 | packages/core/package.json:24 |

## Architecture
| Fact | Value | Source |
|------|-------|--------|
| Pattern | Monorepo (npm workspaces) | package.json:6-9 |
| Packages (8) | core, web, browser-layer, journal, mcp-hub, memory-engine, research-hub, search-hub, strategy-engine | */package.json |
| Entry Point | main.tsx → StrictMode → QueryClientProvider(refetchInterval=4000,staleTime=1500) → RouterProvider | main.tsx:17-22 |
| Root Route | createRootRoute → AppLayout > Outlet | router.tsx:11-17 |
| Frontend Pages (6) | Chat(/), Dashboard(/dashboard), Market(/market), Portfolio(/portfolio), Memory(/memory), Timeline(/timeline) | router.tsx:20-54 |
| Layout | AppSidebar(collapsible, pi-web-ui) + motion.main(animate page transitions) + global Settings Modal (pi-web-ui SettingsPanel) | AppLayout.tsx:33-247 |
| Nav Items (6) | Dashboard, Chat, Market, Portfolio, Memory, Timeline (lucide icons) | AppLayout.tsx:24-31 |
| Chat Data Flow | submitMessage → sendPrompt → tradingPiApi.sendMessageStream(SSE) → entriesRef[] → syncToItems() → ChatItem[] → render (UserMessageView / ChatItemView) | ChatWorkspace.tsx:366-515 |
| API Client Base URL | `http://localhost:${TRADING_PI_API_PORT ?? 8787}` | api.ts:2 |
| Health Check Interval | 10s (frontend api.ts:28), 10s (AppLayout query), 15s (sessions query) | api.ts:28 + AppLayout.tsx:53 |
| Vite Dev Port | TRADING_PI_WEB_PORT env → default 5173 | vite.config.ts:18 |
| Vite Proxy | /api → http://localhost:8787 | vite.config.ts:19 |
| Path Alias | @/* → ./src/* (tsconfig + vite) | tsconfig.json:13 + vite.config.ts:14 |
| TypeScript Target | ES2024 (base), ESNext (web module) | tsconfig.base.json:3 + tsconfig.json:10 |

## All Packages Summary
| Package | Version | Deps | Scripts |
|---------|---------|------|---------|
| trading-pi (root) | 0.1.0 | react,react-dom,typescript,vite,vitest,concurrently,playwright,@tanstack/react-start,clsx,lightweight-charts,recharts,socks-proxy-agent,tailwind-merge,tailwind-variants,vinxi,ws | dev,dev:web,build,check,test |
| @trading-pi/web | 0.1.0 | 25 deps (see above) | dev(vite),server(node server/api.ts),build(tsc+vite),start |
| @trading-pi/core | 0.1.0 | pi-agent-core,pi-ai,pi-web-ui,ccxt,langfuse,typebox + 8 internal pkgs | build(tsc) |
| @trading-pi/browser-layer | 0.1.0 | (none) | build(tsc) |
| @trading-pi/journal | 0.1.0 | (none) | build(tsc) |
| @trading-pi/mcp-hub | 0.1.0 | (none) | build(tsc) |
| @trading-pi/memory-engine | 0.1.0 | (none) | build(tsc) |
| @trading-pi/research-hub | 0.1.0 | (none) | build(tsc) |
| @trading-pi/search-hub | 0.1.0 | (none) | build(tsc) |
| @trading-pi/strategy-engine | 0.1.0 | (none) | build(tsc) |

## API Endpoints (server/api.ts — complete)
| Method | Path | Purpose | Source |
|--------|------|---------|--------|
| GET | /api/health | Health check ({ok,name,localFirst,sqlitePath,time}) | api.ts:127 |
| GET | /api/status | Agent status + skills/workflows count + langfuse config + paths + agentConfig | api.ts:128 |
| GET | /api/config | Runtime config (thinkingLevel/modelId/autoCompaction) | api.ts:131-133 |
| POST | /api/config | Update runtime config (thinkingLevel/modelId/autoCompaction) | api.ts:134-140 |
| GET | /api/skills | List registered skills | api.ts:141 |
| GET | /api/workflows | List registered workflows | api.ts:142 |
| GET | /api/timeline | List timeline events | api.ts:143 |
| GET | /api/sessions | List sessions | api.ts:144 |
| DELETE | /api/sessions/:id | Delete session | api.ts:145-149 |
| GET | /api/approvals | List approvals | api.ts:151 |
| GET | /api/mcp/servers | List MCP servers | api.ts:153 |
| GET | /api/browser/health | Browser integration health check | api.ts:154 |
| POST | /api/session/message | Non-streaming chat (returns full result) | api.ts:155-163 |
| POST | /api/session/message/stream | **SSE streaming chat** (event: message_update, tool_execution_start, tool_execution_end, artifact_update, done, error) | api.ts:166-218 |
| GET | /api/messages?sessionId= | Session messages | api.ts:219-223 |
| GET | /api/artifacts | List artifacts | api.ts:224 |
| GET | /api/plans?sessionId= | List plans | api.ts:227-231 |
| GET | /api/plan?id= | Get single plan | api.ts:232-238 |
| POST | /api/workflows/:id/run | Run workflow by ID | api.ts:240-246 |
| POST | /api/paper/orders | Create paper order | api.ts:248-253 |
| GET | /api/journal | List journal entries | api.ts:254 |
| POST | /api/journal | Create journal entry | api.ts:255-260 |
| GET | /api/market/ohlcv?symbol=&timeframe=&limit= | OHLCV candle data | api.ts:261-271 |
| GET | /api/portfolio | Portfolio snapshot (positions+orders+trades) | api.ts:272 |
| GET | /api/trades | Trade history | api.ts:273-280 |
| GET | /api/reviews | List reviews | api.ts:281 |
| GET | /api/strategies | List strategies | api.ts:282 |
| GET | /api/memory | All memory records | api.ts:284 |
| POST | /api/memory/query | Semantic memory query (domain/workspaceId/q/limit) | api.ts:285-288 |
| POST | /api/memory/write | Write memory record | api.ts:289-292 |
| GET | /* | Fallback: {ok,message:"Trading Pi API"} | api.ts:295 |

## API Client Methods (api.ts — frontend)
| Method | Call | Notes |
|--------|------|-------|
| GET | health() | /api/health |
| GET | status() | /api/status |
| GET | aiPing() | /api/ai/ping |
| GET/POST | config() / setConfig() | /api/config |
| POST | sendMessage() | /api/session/message |
| POST | sendMessageStream() | /api/session/message/stream (SSE, returns EventTarget with abort()) |
| GET | sessions() | /api/sessions |
| DELETE | deleteSession(id) | /api/sessions/:id |
| GET | messages(sessionId) | /api/messages?sessionId= |
| GET | skills() | /api/skills |
| GET | workflows() | /api/workflows |
| GET | timeline() | /api/timeline |
| GET | audit() | /api/audit |
| GET | cache() | /api/cache |
| GET | artifacts() | /api/artifacts |
| GET | artifact(id) | /api/artifacts/:id |
| GET | artifactPreview(id) | /api/artifacts/:id/preview |
| GET | approvals() | /api/approvals |
| GET | marketplace() | /api/marketplace |
| POST | seedMarketplace(sessionId) | /api/marketplace/seed |
| POST | searchQuery(input) | /api/search/query |
| POST | runResearch(input) | /api/workflows/research.asset/run |
| POST | runMarketSnapshot(input) | /api/workflows/market.snapshot/run |
| POST | runWorkflow(workflowId,input,sessionId?) | /api/workflows/:id/run |
| POST | runReviewDaily(period?) | /api/workflows/review.daily/run |
| POST | createPaperOrder(input,sessionId?) | /api/paper/orders |
| GET | portfolio() | /api/portfolio |
| GET | trades() | /api/trades |
| GET | strategies() | /api/strategies |
| GET | backtests() | /api/backtests |
| GET | evolution() | /api/evolution/proposals |
| GET | evolutionProposals() | /api/evolution/proposals |
| GET | journal() | /api/journal |
| POST | createJournal(input,sessionId?) | /api/journal |
| GET | reviews() | /api/reviews |
| GET | workspaces() | /api/workspaces |
| GET | workspaceMemory(id) | /api/workspaces/:id/memory |
| GET | workspaceArtifacts(id) | /api/workspaces/:id/artifacts |
| POST | createWorkspace(input,sessionId?) | /api/workspaces |
| GET | mcpServers() | /api/mcp/servers |
| POST | discoverMcp(query,sessionId?) | /api/mcp/discover |
| POST | registerMcp(input,sessionId?) | /api/mcp/servers |
| POST | checkMcp(id,sessionId?) | /api/mcp/servers/:id/health |
| GET | getMarketplace() | /api/marketplace |
| GET | browserHealth() | /api/browser/health |
| GET | memory() | /api/memory |
| POST | queryMemory(input) | /api/memory/query |
| POST | writeMemory(input) | /api/memory/write |
| GET | ohlcv(symbol,timeframe,limit) | /api/market/ohlcv?... |

**Note:** Some client methods (audit, cache, marketplace, searchQuery, backtests, evolution, workspaces, mcp discover/register/check) have no corresponding server handler in server/api.ts — they are stubbed on client or handled elsewhere.

## Database Tables (database.ts — complete schema)
| Table | Columns | Purpose |
|-------|---------|---------|
| sessions | id PK, name, path, created_at, updated_at, status(default 'active'), parent_session_id(FK), message_count, prompt_tokens, completion_tokens | Conversation sessions |
| messages | id PK, session_id FK, role, parts(JSON), model, created_at(INT), finished_at | Message storage |
| timeline_events | id PK, session_id, workflow_run_id, skill_run_id, type, title, detail, status, payload_json, created_at | Event log |
| memory_records | id PK, scope, key(UQ with scope), value, domain, workspace_id, source_type, source_id, importance(default 0.5), metadata_json, created_at, updated_at | Agent memory (key-value with domain scoping) |
| workflows | id PK, name, description, risk_level | Workflow definitions |
| workflow_runs | id PK, workflow_id FK, session_id, input_json, output_json, status, error, started_at, finished_at | Workflow executions |
| skills | id PK, name, description, risk_level, permission | Skill definitions |
| skill_runs | id PK, workflow_run_id FK, skill_id FK, input_json, output_json, status, error, started_at, finished_at | Skill executions |
| artifacts | id PK, session_id, workflow_run_id, type, title, summary, path, content_type(default text/markdown), content, preview_ready(0/1), preview_payload_json, payload_json, created_at | Agent outputs/files |
| plans | id PK, session_id FK, title, description(default ''), status(default 'draft'), steps(JSON), content, result, created_at, updated_at | Execution plans |
| approvals | id PK, session_id, workflow_run_id, action, risk_level, status(default 'pending'), input_json, reason, created_at, decided_at | Trade/action approvals |
| orders | id PK, session_id, symbol, side, order_type, quantity, price, status, mode(default 'paper'), source_plan_artifact_id, payload_json, created_at, filled_at | Order records |
| trades | id PK, order_id FK, session_id, symbol, side, quantity, entry_price, exit_price, pnl(default 0), status, opened_at, closed_at | Trade records |
| positions | symbol PK, quantity, avg_price, realized_pnl(default 0), updated_at | Current positions |
| journal_entries | id PK, session_id, trade_id FK, plan_artifact_id FK, mood, discipline_score(default 0), rules_violated_json(JSON), notes, screenshot_path, artifact_id FK, created_at | Trading journal |
| reviews | id PK, session_id, period, metrics_json, discipline_score(default 0), summary, artifact_id FK, created_at | Periodic reviews |
| audit_records | id PK, category, action, status, actor(default 'system'), payload_json, created_at | Audit trail |
| data_cache | key PK, namespace, value_json, source, expires_at, created_at | Generic key-value cache with TTL |
| mcp_servers | id PK, name, command, url, status, permission, health_json, manifest_json(default '{}'), created_at, updated_at | MCP server registry |
| mcp_discoveries | id PK, query, provider, candidates_json, created_at | MCP discovery results |
| mcp_permissions | id PK, server_id FK, permission, status, approval_id, created_at, updated_at | MCP permission grants |
| browser_sessions | id PK, provider, status, action, url, payload_json, result_json, artifact_id FK, created_at | Browser automation sessions |
| workspace_links | id PK, workspace_id FK, kind, ref_id, metadata_json, created_at | Workspace→entity links |
| marketplace_items | id PK, kind, name, description, status, permission, manifest_json, created_at, updated_at | Marketplace items |
| workspaces | id PK, name, kind, context_json, created_at, updated_at | Workspaces |
| strategies | id PK, name, version, status, parameters_json, score(default 0), created_at, updated_at | Trading strategies |
| backtests | id PK, strategy_id FK, status, metrics_json, artifact_id FK, created_at | Backtest runs |
| evolution_proposals | id PK, strategy_id FK, status, proposal_json, artifact_id FK, approval_id, created_at, updated_at | Strategy evolution proposals |
| market_prices | id PK, symbol, exchange, source, price_usd, change_24h, bid, ask, last, high, low, volume, extra_json, fetched_at | Market price cache |
| market_ohlcv | id PK, symbol, exchange, timeframe, timestamp(INT), open, high, low, close, volume(default 0), fetched_at | OHLCV candle persistence |
| search_cache | id PK, query, provider, results_json, fetched_at, expires_at | Search results cache |

### DB Indexes
| Index | On | Columns |
|-------|-----|---------|
| idx_market_prices_symbol | market_prices | (symbol, fetched_at DESC) |
| idx_market_ohlcv_symbol | market_ohlcv | (symbol, timeframe, timestamp DESC) |
| idx_trades_symbol | trades | (symbol, status) |
| idx_messages_session | messages | (session_id, created_at) |
| idx_memory_domain | memory_records | (domain, workspace_id) |
| idx_timeline_session | timeline_events | (session_id, created_at) |
| idx_artifacts_session | artifacts | (session_id, created_at) |
| idx_search_cache_query | search_cache | (query, provider, fetched_at) |

## Agent Configuration (TradingPiAgent / PromptOptions)
| Option | Type | Default | Source |
|--------|------|---------|--------|
| thinkingLevel | string ("off"|"minimal"|"low"|"medium"|"high"|"xhigh") | "medium" | trading-pi-agent.ts:24, server/api.ts:48 |
| modelId | string | env.openaiModel ?? "gpt-4o-mini" | trading-pi-agent.ts:26, env.ts:47 |
| autoCompaction | boolean | true | trading-pi-agent.ts:28, server/api.ts:50 |

## Thinking Level Token Budgets
| Level | Tokens | Source |
|-------|--------|--------|
| off | 0 | trading-pi-agent.ts:32 |
| minimal | 1,024 | trading-pi-agent.ts:33 |
| low | 4,096 | trading-pi-agent.ts:34 |
| medium | 8,192 | trading-pi-agent.ts:35 |
| high | 16,384 | trading-pi-agent.ts:36 |
| xhigh | 32,768 | trading-pi-agent.ts:37 |

## Slash Commands (parsed in TradingPiAgent.routeSlashCommand)
| Command | Pattern | Workflow Routed To |
|---------|---------|-------------------|
| /research <symbol> | `/research\s+(.+)$` | research.asset (input: {symbol}) |
| /plan <symbol> [budget] [direction] | `/plan\s+(\S+)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\S+))?` | trade.plan (input: {symbol,budgetUsd,direction}) |
| /review-day | `/review-day` | review.daily (input: {period:"daily"}) |
| /backtest <name> [symbol] [timeframe] | `/backtest\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?` | strategy.backtest (input: {name,symbol,timeframe}) |
| /browser <action> [value] | `/browser\s+(search\|open\|extract\|screenshot\|pdf)(?:\s+(.+))?` | browser.evidence (input: {action,url}) |
| /evolve [focus] | `/evolve(?:\s+(.+))?` | evolution.propose (input: {focus}) |
| /bootstrap-os | `/bootstrap-os$` | os.bootstrap (input: {}) |

## Environment Variables (env.ts + .env.example + .env)
| Var | Required | Default | .env Value | Source |
|-----|----------|---------|------------|--------|
| OPENAI_API_KEY | Yes (for AI) | "" | *(set)* | env.ts:45 |
| OPENAI_BASE_URL | No | "" | https://token.sensenova.cn/v1 | env.ts:46 |
| OPENAI_MODEL | No | "gpt-4o-mini" | deepseek-v4-flash | env.ts:47 |
| LANGFUSE_PUBLIC_KEY | No | "" | *(set)* | env.ts:53 |
| LANGFUSE_SECRET_KEY | No | "" | *(set)* | env.ts:54 |
| LANGFUSE_HOST | No | "" | https://jp.cloud.langfuse.com | env.ts:55 |
| EXA_API_KEY | No | "" | *(not set)* | env.ts:48 |
| TAVILY_API_KEY | No | "" | *(not set)* | env.ts:49 |
| JINA_API_KEY | No | "" | *(not set)* | env.ts:50 |
| COINMARKETCAP_API_KEY | No | "" | *(not set)* | env.ts:51 |
| AIO_SANDBOX_BASE_URL | No | "" | http://localhost:8080 | env.ts:52 |
| TRADING_PI_DATA_DIR | No | ".trading-pi" | *(not set, uses default)* | env.ts:56 |
| TRADING_PI_API_PORT | No | 8787 | 8787 | env.ts:57 |
| TRADING_PI_WEB_PORT | No | 5173 | 5173 | env.ts:58 |
| TRADING_PI_DEFAULT_EXCHANGE | No | "binance" | binance | env.ts:59 |
| TRADING_PI_EXCHANGE_FALLBACKS | No | "okx,bybit,coinbase,kraken" | okx,bybit,coinbase,kraken | env.ts:60-62 |
| TRADING_PI_TRADING_MODE | No | "paper" ("mock"\|"paper"|"live_guarded") | paper | env.ts:64 |

## Trading Modes
| Mode | Description | Source |
|------|-------------|--------|
| mock | Mock/dry-run mode | env.ts:98 |
| paper | Paper trading (default) | env.ts:99 |
| live_guarded | Live trading with guard rails | env.ts:99 |

## Settings Store Fields (settingsStore.ts — complete)
| Field | Type | Default | Persisted To (localStorage key) | Sync to Backend? |
|-------|------|---------|-------------------------------|------------------|
| sidebarOpen | boolean | true | No (memory only) | No |
| settingsOpen | boolean | false | No (memory only) | No |
| themeMode | "light"\|"dark"\|"system" | "dark" | pi-theme-mode | No (frontend-only) |
| thinkingLevel | string | "medium" | trading-pi-thinking-level | **Yes** → POST /api/config |
| showThinking | boolean | true* | pi-show-thinking | No (frontend-only) |
| autoCompaction | boolean | true | trading-pi-auto-compaction | **Yes** → POST /api/config |
| sessionName | string | "" | trading-pi-session-name | No |
| authEnabled | boolean | false | No (memory only) | No |
| authConfigured | boolean | false | No (memory only) | No |
| currentSessionId | string \| null | null | No (memory only) | No |

*\*Note: Default for showThinking is `true` (from localStorage check: `!== "false"`), not `false`. The template said `false` but code reads `true`.*

## Frontend Components Status (ai-elements/)
| Component | File | Importers | Status | Used By |
|-----------|------|-----------|-------|---------|
| Conversation | conversation.tsx | ChatWorkspace | ACTIVE | ChatWorkspace |
| ConversationContent | conversation.tsx | ChatWorkspace | ACTIVE | ChatWorkspace |
| ConversationEmptyState | conversation.tsx | ChatWorkspace | ACTIVE | ChatWorkspace |
| ConversationScrollButton | conversation.tsx | ChatWorkspace | ACTIVE | ChatWorkspace |
| PromptInput | prompt-input.tsx | ChatWorkspace, prompt-attachments | ACTIVE | ChatWorkspace |
| PromptInputBody/Footer/Textarea/Submit/Tools | prompt-input.tsx | ChatWorkspace | ACTIVE | ChatWorkspace |
| PromptAttachmentButton/Preview | prompt-input.tsx | ChatWorkspace, prompt-attachments | ACTIVE | ChatWorkspace |
| Message | message.tsx | chat-item-view, user-message-view, subagent-detail-sidebar | ACTIVE | ChatItemView, UserMessageView |
| Reasoning (+Content,+Trigger) | reasoning.tsx | chat-item-view | ACTIVE | ChatItemView |
| Tool (+Header,+Input,+Output,+Content) | tool.tsx | chat-item-view | ACTIVE | ChatItemView |
| Plan (+Header,+Title,+Steps,+Step) | plan.tsx | chat-item-view | **WIRED** | ChatItemView (new) |
| Artifact (+Header,+Title,+Description,+Actions,+Action,+Content,+Close) | artifact.tsx | chat-item-view, ArtifactPanel | **WIRED** | ChatItemView, ArtifactPanel |
| Shimmer | shimmer.tsx | reasoning, plan | ACTIVE | Plan & Reasoning components |
| Confirmation | confirmation.tsx | **None** | **DEAD CODE** | None |
| Sources | sources.tsx | **None** | **DEAD CODE** | None |
| Task | task.tsx | **None** | **DEAD CODE** | None |
| Suggestion | suggestion.tsx | *check needed* | Unknown | ? |
| CodeBlock | code-block.tsx | *check needed* | Unknown | ? |
| ChainOfThought | chain-of-thought.tsx | *check needed* | Unknown | ? |

## Core Exports (packages/core/src/index.ts)
| Module | Export Path |
|--------|-------------|
| Env config | ./config/env.js |
| Local paths | ./config/paths.js |
| Database | ./db/database.js |
| Repositories | ./db/repositories.js |
| AI Model | ./ai/model.js |
| Telemetry | ./telemetry/langfuse.js |
| Sessions | ./sessions/session-store.js |
| Memory | ./memory/memory-store.js |
| Artifacts | ./artifacts/artifact-engine.js |
| Approvals | ./approvals/approval-engine.js |
| Skills (types,registry,default,schema) | ./skills/*.js |
| Workflows (types,engine,default) | ./workflows/*.js |
| Agent | ./agent/trading-pi-agent.js |
| PubSub events | ./events/pubsub.js |

## Infrastructure
| Fact | Value | Source |
|------|-------|--------|
| Docker base image | node:22-bookworm-slim | Dockerfile:1 |
| Docker installed tools | ca-certificates, git, ripgrep | Dockerfile:4 |
| Docker exposed port | 8787 | Dockerfile:28 |
| Docker CMD | npm run start (= node --import ./dist/server.js) | Dockerfile:30 |
| Docker Compose services | trading-pi (main app), aio-sandbox (ghcr.io/agent-infra/sandbox:latest) | docker-compose.yml:2-26 |
| Docker volumes | trading-pi-data → /data | docker-compose.yml:15 |
| AIO Sandbox image | ghcr.io/agent-infra/sandbox:latest | docker-compose.yml:20 |
| AIO Sandbox port | 8080:8080 | docker-compose.yml:23 |
| Docker security | seccomp:unconfined (sandbox) | docker-compose.yml:25 |

## Auto-Compaction Logic (trading-pi-agent.ts:173-207)
| Trigger | Condition | Action |
|---------|-----------|--------|
| Message count | > 50 messages | Check token estimate |
| Token threshold | shouldCompact(tokens, 128000, DEFAULT_COMPACTION_SETTINGS) | Generate summary via generateSummary() |
| Summary storage | Stored in `_compactionSummary` private field | Prepended to next turn context via transformContext |

## RPC Commands (ChatWorkspace.rpc — internal, maps to API/tradingPiApi)
| Command | Action |
|---------|--------|
| get_state | Fetch status + config from backend |
| abort | Abort SSE stream |
| compact | Return placeholder (backend endpoint not ready) |
| set_session_name | Update session name in store |
| set_auto_compaction | Update store + POST /api/config |
| set_thinking_level | Update store + POST /api/config |
| set_model | Set currentModel state |
| navigate_tree | No-op (return success) |
| get_available_models | Return hardcoded list + backend config |
| export_html | Generate HTML blob download |
| export_markdown | Generate Markdown blob download |
| export_pdf | Generate PDF via html2pdf.js |
| get_session_stats | Show message/tool counts as system message |
| prompt / cycle_thinking_level | No-op |

## Keyboard Shortcuts (ChatWorkspace)
| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+K | Open command palette |
| / | Focus textarea |
| Escape | Close command palette → close model picker → close settings → abort streaming |

## Conflicts (Doc vs Code)
| Doc Claim (template) | Code Truth | Action |
|---------------------|------------|--------|
| showThinking default = false | **true** (localStorage check: `getItem("pi-show-thinking") !== "false"` evaluates missing key → true) | Fix documentation |
| UI Base = kkkiio/pi-web-ui (customized) | **@earendil-works/pi-web-ui 0.75.3** (core dep); pi-web-ui components are local copies in src/components/pi-web-ui/ | Clarify: both exist |
| DB table name = "memory" | **memory_records** (actual table name in database.ts) | Fix documentation |
| Memory columns listed as id,domain,key,value,importance,... | Actual: id,scope,key(UQ),value,domain,workspace_id,source_type,source_id,importance,metadata_json,created_at,updated_at | Fix documentation |
| Artifacts columns listed without content_type,content,preview_ready,preview_payload_json | These columns exist (added via migration addColumnIfMissing) | Fix documentation |
| Plans column "steps" is TEXT (JSON) | Confirmed: steps stored as JSON.stringify(array) | OK |
| Approvals column "payload_json" | Actual: input_json (not payload_json) | Fix documentation |
| Trades columns listed without order_id FK | Has order_id FK column | Fix documentation |
| Root scripts include "dev:web" | Confirmed: `"dev:web": "npm run dev -w @trading-pi/web"` | OK |
| Server start script = "node --import ./dist/server.js" | Confirmed in apps/web/package.json:10 | OK |
