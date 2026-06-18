# Trading Pi OS — Backend Architecture

> **Version**: 0.2.0 | **Last Updated**: 2026-06-14 | **Branch**: `main`
>
> Complete reference for `apps/web/server/api.ts` + `packages/core/` — Node.js HTTP server, agent engine, SQLite persistence, and skill/workflow system.
>
> **Stability Note** (2026-06-14): This document is stable. The frontend refactoring described in ADR-010 only affected `apps/web/src/`. The backend server (`api.ts`) and core packages were **not changed** by that refactoring. All content below remains accurate as-is.

---

## 1. Server Architecture

### Single-File HTTP Server

The entire backend lives in **one file**: [`apps/web/server/api.ts`](../apps/web/server/api.ts) (~305 lines)

**Key architectural decisions**:

| Decision | Rationale |
|----------|-----------|
| **No Express/Fastify/Hono** | Minimal dependencies; route count is small (~30 endpoints); no need for middleware pipeline |
| **Raw `node:http`** (`createServer`) | Built-in, zero-dependency HTTP |
| **Manual routing** (`if/else` on `url.pathname`) | Simple, readable, easy to trace for a single-file server |
| **Manual CORS** | Single `Access-Control-Allow-Origin: *` header for all responses |
| **Manual body parsing** | `readBody()` reads chunks → Buffer → `JSON.parse` |

### Initialization Sequence

When the server starts (via `node server/api.ts`), it runs this exact sequence:

```
1. loadEnv()                    ← Read .env file from apps/web/ or project root
2. resolveLocalPaths(env)       ← Compute .trading-pi/ directory paths
3. ensureLocalPaths(paths)      ← mkdir -p all data directories
4. new TradingPiDatabase(path)   ← Open SQLite, run migrations (30+ tables)
5. new Repositories(db)          ← Data access layer (CRUD helpers)
6. new LangfuseTelemetry(env)    ← Optional observability
7. new SessionStore(paths, repos)← JSONL session files
8. new MemoryStore(repos)        ← Domain-scoped memory
9. new ArtifactEngine(paths, repos) ← File + DB artifact storage
10. new ApprovalEngine(repos)    ← Risk-gated approval system
11. new SkillRegistry(repos)     ← Skill container
12. new WorkflowEngine(skills, repos, artifacts, approvals, memory)
13. registerDefaultSkills(skills)     ← Register 40+ skills
14. registerDefaultWorkflows(workflows) ← Register 9 DAG workflows
15. new TradingPiAgent({ sessions, memory, skills, workflows,
                        artifacts, approvals, repos, env })
16. createServer(callback).listen(port)
```

All state is **in-memory** and **singleton** — one instance of each service, shared across all requests.

### Request Lifecycle

```
HTTP Request arrives at :8787
  │
  ├─ Set CORS headers (Allow-Origin: *, Allow-Methods, Allow-Headers)
  ├─ Handle OPTIONS preflight → 204
  │
  └─ Parse URL pathname:
     ├── /api/health        → sendJson(res, { ok, name, ... })
     ├── /api/status        → sendJson(res, { status, skills, workflows, config, ... })
     ├── /api/config GET    → sendJson(res, agentConfig)
     ├── /api/config POST   → mutate agentConfig → sendJson(res, agentConfig)
     ├── /api/sessions GET  → sendJson(res, repos.list("sessions"))
     ├── /api/sessions/:id DELETE → sessions.deleteSession(id)
     ├── /api/messages GET   → sessions.read(sessionId).map(toChatMessage)
     ├── /api/session/message POST → agent.prompt(body) → sendJson(result)
     ├── /api/session/message/stream POST → SSE streaming (see §3)
     ├── /api/artifacts GET  → sendJson(res, repos.list("artifacts"))
     ├── /api/plans GET      → sendJson(res, repos.listPlans(sessionId))
     ├── /api/plan GET       → sendJson(res, repos.getPlan(id))
     ├── /api/skills GET     → sendJson(res, skills.list())
     ├── /api/workflows GET  → sendJson(res, workflows.list())
     ├── /api/timeline GET   → sendJson(res, repos.list("timeline_events"))
     ├── /api/memory GET     → sendJson(res, memory.list())
     ├── /api/memory/query POST → sendJson(res, memory.query(body))
     ├── /api/memory/write POST → sendJson(res, memory.write(body))
     ├── /api/market/ohlcv GET → skill execution → sendJson(rows)
     ├── /api/portfolio GET  → sendJson(res, repos.portfolioSnapshot())
     ├── /api/trades GET     → sendJson(res, repos.list("trades"))
     ├── /api/workflows/:id/run POST → workflows.run(id, input, context)
     ├── /api/paper/orders POST → skill execution
     ├── /api/journal GET/POST → skill execution or list
     ├── /api/reviews GET     → sendJson(res, repos.list("reviews"))
     ├── /api/strategies GET  → sendJson(res, repos.list("strategies"))
     ├── /api/approvals GET   → sendJson(res, repos.list("approvals"))
     ├── /api/mcp/servers GET → sendJson(res, repos.list("mcp_servers"))
     ├── /api/browser/health GET → sendJson(res, { configured, baseUrl })
     ├── /api/*              → sendJson(res, { error: "Not found" }, 404)
     └── /                   → sendJson(res, { ok: true, message: "Trading Pi API" })
  
  On error: sendJson(res, { error: err.message }, 500)
```

### Port Configuration

| Port | Default | Env Variable | Purpose |
|------|---------|-------------|---------|
| 8787 | Yes | `TRADING_PI_API_PORT` | Backend API server |
| 5173 | Yes | `TRADING_PI_WEB_PORT` | Vite dev server (proxies `/api` → 8787) |
| 8080 | No | `AIO_SANDBOX_BASE_URL` | Browser sandbox (Docker) |

---

## 2. Agent System

### TradingPiAgent

File: [`packages/core/src/agent/trading-pi-agent.ts`](../packages/core/src/agent/trading-pi-agent.ts)

The agent is a wrapper around `@earendil-works/pi-agent-core`'s `Agent` class. It provides:

1. **Session management** (ensure/create/fork)
2. **Slash command routing** (7 commands → workflow dispatch)
3. **Context injection** (memory, compaction summary)
4. **Tool lifecycle hooks** (timeline recording, approval gates)
5. **Auto-compaction** (threshold-based summary generation)

### prompt() Method Signature

```typescript
async prompt(
  input: {
    message: string;
    sessionId?: string;
    parentSessionId?: string;  // for session forks
    name?: string;
  },
  onStreamEvent?: (event: AgentEvent) => void,  // SSE callback
  options?: PromptOptions
): Promise<{
  sessionId: string;
  messages: AgentMessage[];
  text: string;  // extracted assistant text
}>
```

### PromptOptions

```typescript
interface PromptOptions {
  thinkingLevel?: string;  // "off" | "minimal" | "low" | "medium" | "high" | "xhigh"
  modelId?: string;        // Override model identifier
  autoCompaction?: boolean; // Enable/disable (default: true)
}
```

### Agent Event Lifecycle

```
agent.prompt(message)
  │
  ├─ [Session] ensureSession() or createFork()
  │   └─ Append user message to JSONL
  │
  ├─ [Route] routeSlashCommand(message)
  │   ├─ Match → workflows.run(workflowId, input, context)
  │   │   └─ Return { sessionId, messages: [fauxAssistantMessage], text }
  │   └─ No match → continue to Agent
  │
  ├─ [Create Agent] new Agent({ initialState, tools, model, thinkingBudgets, ... })
  │
  ├─ [Subscribe] agent.subscribe((event) => { handleEvent + onStreamEvent })
  │   Events emitted:
  │   - message_update     → streaming token deltas
  │   - tool_execution_start → tool invoked with args
  │   - tool_execution_end   → tool completed/failed
  │   - artifact_update      → artifact generated
  │   - message_end          → final message complete
  │
  ├─ [Execute] agent.prompt(message)
  │   Runs tool loop:
  │   1. Generate assistant response (with thinking if budget > 0)
  │   2. If tool calls present → beforeToolCall hook
  │   3. Execute tool → afterToolCall hook
  │   4. Append tool result → back to step 1
  │   5. Repeat until no more tool calls
  │
  ├─ [Compaction] if autoCompaction && messages > 50
  │   ├─ estimateContextTokens(messages)
  │   ├─ shouldCompact(tokens, 128000, DEFAULT_COMPACTION_SETTINGS)
  │   └─ generateSummary(...) → store as _compactionSummary
  │
  └─ [Return] { sessionId, messages, extractAssistantText(lastMessage) }
```

### System Prompt

```
You are Trading Pi Agent, the only core agent in a local-first personal trading OS.
Use available tools and workflows for market, risk, artifact, and approval work.
Never design or imply a multi-agent system.
Never place or prepare real orders without approval.
Make important results traceable and artifact-ready.
Do not claim a market source, tool, workflow, or integration is online unless
it succeeded in the current run or appears in observed tool results.
If a source was not checked, say it is available as a capability, not online.
If a source failed or was blocked, surface that plainly.
```

### Slash Commands

| Command | Pattern | Workflow ID | Input |
|---------|---------|-------------|-------|
| `/research <symbol>` | `/research\s+(.+)` | `research.asset` | `{ symbol }` |
| `/plan <sym> [qty] [dir]` | `/plan\s+(\S+)(?:\s+(\d+))?(?:\s+(\S+))?` | `trade.plan` | `{ symbol, budgetUsd, direction }` |
| `/review-day` | `/review-day` | `review.daily` | `{ period: "daily" }` |
| `/backtest <name> [sym] [tf]` | `/backtest\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?` | `strategy.backtest` | `{ name, symbol, timeframe }` |
| `/browser <action> [url]` | `/browser\s+(search\|open\|...)(?:\s+(.+))?` | `browser.evidence` | `{ action, query/url }` |
| `/evolve [focus]` | `/evolve(?:\s+(.+))?` | `evolution.propose` | `{ focus }` |
| `/bootstrap-os` | `/bootstrap-os$` | `os.bootstrap` | `{}` |

---

## 3. SSE Protocol

### Endpoint

```
POST /api/session/message/stream
Content-Type: application/json

{ "message": "analyze ETH", "sessionId": "optional" }
```

Response headers:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

### Event Types

#### `message_update` — Streaming tokens

```typescript
{
  type: "message_update",
  message: {
    id: string,
    content: PiContentBlock[],  // [{ type:"text", text }, { type:"thinking", thinking }, { type:"toolCall", ... }]
    usage?: Usage,
    // ... full PiMessage
  },
  assistantMessageEvent: {
    type: string,
    delta?: string,  // token delta
  }
}
```

#### `tool_execution_start` — Tool invocation

```typescript
{
  type: "tool_execution_start",
  toolCallId: string,
  toolName: string,    // e.g., "market.ccxt.ohlcv"
  args: unknown,       // tool input parameters
}
```

#### `tool_execution_end` — Tool completion

```typescript
{
  type: "tool_execution_end",
  toolCallId: string,
  toolName: string,
  isError: boolean,
  result: unknown,         // tool return value
  partialResult?: unknown, // intermediate result (for long-running tools)
}
```

#### `artifact_update` — Artifact generated

```typescript
{
  type: "artifact_update",
  artifactId: string,
  content: string,
  title: string,
}
```

#### `done` — Stream complete

```typescript
{
  sessionId: string,
  text: string,           // Final assistant text (extracted)
  messages: Array<{       // All messages in conversation
    id, role, kind: "pi_message",
    content: string,      // Extracted text only
    timestamp: number
  }>
}
```

Also triggers **auto-session naming**: if session name is still "Trading Pi Session" or "新对话", renames it to first 40 chars of user message.

#### `error` — Stream error

```typescript
{
  error: string  // Error message
}
```

### forwardStreamEvent() Normalization

All events pass through `forwardStreamEvent()` before being sent:

```typescript
function forwardStreamEvent(event: any) {
  // message_update: forward FULL structured message (no stripping)
  if (event.type === "message_update") {
    return { type, message, assistantMessageEvent };
  }
  // tool events: forward with full context (toolName, args, result)
  if (event.type === "tool_execution_start") {
    return { type, toolCallId, toolName, args };
  }
  if (event.type === "tool_execution_end") {
    return { type, toolCallId, toolName, isError, result, partialResult };
  }
  // artifact events
  if (event.type === "artifact_update") {
    return { type, artifactId, content, title };
  }
  // Everything else: forward as-is (message_end, etc.)
  return { type: event.type, ...event };
}
```

### Client-Side Parsing

In [`src/api.ts`](../apps/web/src/api.ts), the SSE client:

1. Creates an `EventTarget` + `AbortController`
2. Opens `fetch()` with `signal: controller.signal`
3. Gets `ReadableStream` reader from response body
4. Reads chunks → decodes UTF-8 → splits on `\n\n` (SSE frame boundary)
5. Parses each frame: extracts `event:` line → `data:` line → `JSON.parse(data)`
6. Dispatches as `CustomEvent(eventType, { detail: parsed })` on the EventTarget

---

## 4. Config API

### Runtime Config Object

Defined in [`server/api.ts`](../apps/web/server/api.ts) (lines 47–51):

```typescript
const agentConfig = {
  thinkingLevel: "medium" as string,   // Current thinking level
  modelId: env.openaiModel ?? "default",  // Active model identifier
  autoCompaction: true,                // Auto-compaction enabled
};
```

This object is **mutable at runtime** — changed by `POST /api/config`, read by every subsequent `agent.prompt()` call.

### Endpoints

**GET /api/config**
```json
{
  "thinkingLevel": "medium",
  "modelId": "gpt-4o",
  "autoCompaction": true
}
```

**POST /api/config**
```json
// Request body (any field optional):
{ "thinkingLevel": "high" }

// Response: updated config
{
  "thinkingLevel": "high",
  "modelId": "gpt-4o",
  "autoCompaction": true
}
```

Only three fields are mutable. Unknown fields are silently ignored.

### How Config Flows to Agent

```
POST /api/config { thinkingLevel: "high" }
  ↓
api.ts: agentConfig.thinkingLevel = "high"
  ↓
Next POST /api/session/message/stream:
  agent.prompt(body, onStreamEvent, {
    thinkingLevel: agentConfig.thinkingLevel,  // "high" ← from config
    modelId: agentConfig.modelId,
    autoCompaction: agentConfig.autoCompaction,
  })
  ↓
TradingPiAgent.prompt():
  const thinkingTokens = THINKING_TOKEN_BUDGETS[thinkingLevel]  // 16384
  new Agent({ thinkingBudgets: { medium: thinkingTokens, ... }})
```

---

## 5. Database Schema

### Engine & Mode

- **SQLite** via `node:sqlite` (built-in Node.js builtin)
- **WAL mode** (`PRAGMA journal_mode = WAL`) for concurrent reads
- **Foreign keys** enabled (`PRAGMA foreign_keys = ON`)
- **Location**: `.trading-pi/data/trading-pi.db` (configurable via `TRADING_PI_DATA_DIR`)

### Migration Strategy

[`database.migrate()`](../packages/core/src/db/database.ts) runs `CREATE TABLE IF NOT EXISTS` for all tables, plus:

- **Indexes**: Created with `CREATE INDEX IF NOT EXISTS` on frequently queried columns
- **Additive columns**: `addColumnIfMissing(table, column, definition)` uses `PRAGMA table_info` to check existence, then `ALTER TABLE ADD COLUMN` if missing
- **Backward compatible**: Never drops or modifies existing columns

### Complete Table Reference

#### Core Tables

| Table | Columns | Description |
|-------|---------|-------------|
| **sessions** | `id PK`, `name`, `path`, `created_at`, `updated_at`, `status`, `parent_session_id FK`, `message_count`, `prompt_tokens`, `completion_tokens` | Chat session metadata |
| **messages** | `id PK`, `session_id FK→sessions`, `role`, `parts JSON`, `model`, `created_at INT`, `finished_at` | Message storage (structured parts) |
| **timeline_events** | `id PK`, `session_id`, `workflow_run_id`, `skill_run_id`, `type`, `title`, `detail`, `status`, `payload_json`, `created_at` | Execution event log |

#### Memory & Knowledge

| Table | Columns | Description |
|-------|---------|-------------|
| **memory_records** | `id PK`, `scope`, `key`, `value`, `domain`, `workspace_id`, `source_type`, `source_id`, `importance REAL`, `metadata_json`, `created_at`, `updated_at`, `UNIQUE(scope,key)` | Long-term memory (8 domains) |

#### Artifacts & Plans

| Table | Columns | Description |
|-------|---------|-------------|
| **artifacts** | `id PK`, `session_id`, `workflow_run_id`, `type`, `title`, `summary`, `path`, `content_type`, `content TEXT`, `preview_ready INT`, `preview_payload_json`, `payload_json`, `created_at` | Generated outputs (reports, plans, analyses) |
| **plans** | `id PK`, `session_id FK`, `title`, `description`, `status`, `steps JSON`, `content`, `result`, `created_at`, `updated_at` | Trade/action plans (draft/active/completed/failed) |

#### Trading

| Table | Columns | Description |
|-------|---------|-------------|
| **orders** | `id PK`, `session_id`, `symbol`, `side`, `order_type`, `quantity REAL`, `price REAL`, `status`, `mode` (paper/live), `source_plan_artifact_id`, `payload_json`, `created_at`, `filled_at` | Order records |
| **trades** | `id PK`, `order_id`, `session_id`, `symbol`, `side`, `quantity REAL`, `entry_price REAL`, `exit_price REAL`, `pnl REAL`, `status`, `opened_at`, `closed_at` | Executed trades |
| **positions** | `symbol PK`, `quantity REAL`, `avg_price REAL`, `realized_pnl REAL`, `updated_at` | Current holdings |

#### Journal & Review

| Table | Columns | Description |
|-------|---------|-------------|
| **journal_entries** | `id PK`, `session_id`, `trade_id`, `plan_artifact_id`, `mood`, `discipline_score INT`, `rules_violated_json`, `notes`, `screenshot_path`, `artifact_id`, `created_at` | Trade journaling |
| **reviews** | `id PK`, `session_id`, `period`, `metrics_json`, `discipline_score INT`, `summary`, `artifact_id`, `created_at` | Performance reviews |

#### Workflows & Skills

| Table | Columns | Description |
|-------|---------|-------------|
| **workflows** | `id PK`, `name`, `description`, `risk_level` | Workflow definitions (9 registered) |
| **workflow_runs** | `id PK`, `workflow_id FK`, `session_id`, `input_json`, `output_json`, `status`, `error`, `started_at`, `finished_at` | Workflow executions |
| **skills** | `id PK`, `name`, `description`, `risk_level`, `permission` | Skill definitions (40+ registered) |
| **skill_runs** | `id PK`, `workflow_run_id`, `skill_id FK`, `input_json`, `output_json`, `status`, `error`, `started_at`, `finished_at` | Skill executions |

#### Strategy & Evolution

| Table | Columns | Description |
|-------|---------|-------------|
| **strategies** | `id PK`, `name`, `version`, `status`, `parameters_json`, `score REAL`, `created_at`, `updated_at` | Strategy definitions |
| **backtests** | `id PK`, `strategy_id`, `status`, `metrics_json`, `artifact_id`, `created_at` | Backtest results |
| **evolution_proposals** | `id PK`, `strategy_id`, `status`, `proposal_json`, `artifact_id`, `approval_id`, `created_at`, `updated_at` | Strategy improvement proposals |

#### System

| Table | Columns | Description |
|-------|---------|-------------|
| **approvals** | `id PK`, `session_id`, `workflow_run_id`, `action`, `risk_level`, `status`, `input_json`, `reason`, `created_at`, `decided_at` | Approval gates |
| **audit_records** | `id PK`, `category`, `action`, `status`, `actor`, `payload_json`, `created_at` | Audit trail |
| **workspaces** | `id PK`, `name`, `kind`, `context_json`, `created_at`, `updated_at` | Workspace contexts |
| **data_cache** | `id PK`, `namespace`, `value_json`, `source`, `expires_at`, `created_at` | General key-value cache |

#### Integrations

| Table | Columns | Description |
|-------|---------|-------------|
| **mcp_servers** | `id PK`, `name`, `command`, `url`, `status`, `permission`, `health_json`, `manifest_json`, `created_at`, `updated_at` | MCP server registry |
| **mcp_discoveries** | `id PK`, `query`, `provider`, `candidates_json`, `created_at` | MCP discovery cache |
| **mcp_permissions** | `id PK`, `server_id FK`, `permission`, `status`, `approval_id`, `created_at`, `updated_at` | MCP permission grants |
| **browser_sessions** | `id PK`, `provider`, `status`, `action`, `url`, `payload_json`, `result_json`, `artifact_id`, `created_at` | Browser action log |
| **marketplace_items** | `id PK`, `kind`, `name`, `description`, `status`, `permission`, `manifest_json`, `created_at`, `updated_at` | Skill/workflow marketplace |
| **workspace_links** | `id PK`, `workspace_id`, `kind`, `ref_id`, `metadata_json`, `created_at` | Workspace-entity links |

#### Market Data Cache

| Table | Columns | Description |
|-------|---------|-------------|
| **market_prices** | `id PK`, `symbol`, `exchange`, `source`, `price_usd REAL`, `change_24h REAL`, `bid`, `ask`, `last`, `high`, `low`, `volume REAL`, `extra_json`, `fetched_at` | Ticker price cache |
| **market_ohlcv** | `id PK`, `symbol`, `exchange`, `timeframe`, `timestamp INT`, `open/high/low/close/volume REAL`, `fetched_at` | OHLCV candle cache |
| **search_cache** | `id PK`, `query`, `provider`, `results_json`, `fetched_at`, `expires_at` | Search result cache |

### Indexes

```
idx_market_prices_symbol      ON market_prices(symbol, fetched_at DESC)
idx_market_ohlcv_symbol       ON market_ohlcv(symbol, timeframe, timestamp DESC)
idx_trades_symbol             ON trades(symbol, status)
idx_messages_session          ON messages(session_id, created_at)
idx_memory_domain             ON memory_records(domain, workspace_id)
idx_timeline_session          ON timeline_events(session_id, created_at)
idx_artifacts_session         ON artifacts(session_id, created_at)
idx_search_cache_query        ON search_cache(query, provider, fetched_at)
```

---

## 6. Skill System

### Registration

File: [`packages/core/src/skills/default-skills.ts`](../packages/core/src/skills/default-skills.ts)

Skills are registered at startup via `registerDefaultSkills(skills)`:

```typescript
registry.register({
  id: "ai.respond",           // Unique identifier
  name: "AI Response",        // Display name
  description: "...",         // Used in tool description for LLM
  riskLevel: "low",           // low | medium | high | critical
  permission: "read",         // read | write | execute | admin
  parameters: Type.Object({   // TypeBox schema for validation
    prompt: Type.String(),
    systemPrompt: Type.Optional(Type.String()),
  }),
  execute: async (input, context) => {
    // Skill implementation
    return { text, usage, stopReason };
  },
});
```

### Default Skills (40+)

Organized by domain:

| Domain | Skills | Risk Level |
|--------|--------|------------|
| **AI** | `ai.respond` | low |
| **Market** | `market.ccxt.ticker`, `market.ccxt.ohlcv`, `market.coingecko.quote`, `market.snapshot` | low |
| **Search** | `search.exa.query`, `search.exa.extract`, `search.exa.summarize`, `search.tavily.search`, `search.jina.search`, `search.jina.read` | low |
| **Browser** | `browser.search`, `browser.open`, `browser.extract`, `browser.screenshot`, `browser.pdf` | medium |
| **Risk** | `risk.position_sizing`, `risk.trade_plan`, `risk.stop_loss`, `risk.daily_loss_guard` | medium |
| **Research** | `research.asset_context`, `research.report` | low |
| **Journal** | `journal.entry.create` | low |
| **Memory** | `memory.read`, `memory.write`, `memory.search`, `memory.forget` | low |
| **Workspace** | `workspace.create`, `workspace.context` | low |
| **Artifact** | `artifact.create`, `artifact.read`, `artifact.list` | low |
| **Strategy** | `strategy.create`, `strategy.score`, `strategy.update` | medium |
| **Backtest** | `backtest.run`, `backtest.compare` | medium |
| **Execution** | `execution.create_plan`, `execution.real_order_guarded` (disabled), `execution.cancel` | high |
| **Approval** | `approval.request`, `approval.check` | low |
| **MCP** | `mcp.discover`, `mcp.register`, `mcp.health_check`, `mcp.invoke_tool` | medium |
| **Evolution** | `evolution.propose`, `evolution.evaluate` | medium |
| **Review** | `review.daily_metrics`, `review.generate_summary` | low |
| **Airdrop** | `airdrop.search`, `airdrop.eligibility` | low |
| **Marketplace** | `marketplace.seed_catalog`, `marketplace.list`, `marketplace.install` | low |

### Tool Conversion

Skills are converted to Pi tools via `skills.toPiTools(context)`:

```typescript
// In TradingPiAgent.prompt():
const agentTools = this.deps.skills.toPiTools(baseContext);
// Returns: PiTool[] (compatible with pi-agent-core Agent)
```

Each tool gets:
- A `name` matching the skill's `id`
- A `description` from the skill's `description` field
- An `inputSchema` derived from the TypeBox `parameters`
- An `execute` function that calls `skill.execute(input, context)`

### Execution Context

Every skill receives a `SkillContext`:

```typescript
type SkillContext = {
  env: TradingPiEnv;        // Environment variables
  repos: Repositories;       // Data access
  artifacts: ArtifactEngine; // Artifact creation
  approvals: ApprovalEngine; // Approval checks
  memory: MemoryStore;       // Memory access
  skills: SkillRegistry;     // Skill introspection
  sessionId: string;         // Current session
};
```

---

## 7. Artifact Engine

File: [`packages/core/src/artifacts/artifact-engine.ts`](../packages/core/src/artifacts/artifact-engine.ts)

### create()

```typescript
async create(input: {
  sessionId?: string;
  workflowRunId?: string;
  type: string;            // e.g., "report", "plan", "backtest", "research"
  title: string;
  summary: string;
  content: string;        // Full content (markdown, HTML, JSON...)
  contentType?: string;   // Default: "text/markdown"
}): Promise<Artifact>
```

### Storage

Artifacts are stored in **two places**:

1. **File system**: `.trading-pi/artifacts/{artifactId}.md` (or .html, .json, etc.)
2. **SQLite**: Row in `artifacts` table with metadata + optional `content` column

### Preview

- `preview_ready`: Boolean flag (0/1) indicating if preview is generated
- `preview_payload_json`: Structured preview data (e.g., chart config, table rows)

### Access Patterns

| Operation | API | Source |
|-----------|-----|--------|
| List all | `GET /api/artifacts` | `repos.list("artifacts")` |
| Get single | `GET /api/artifacts/:id` | Not yet implemented in api.ts routes (client has method) |
| Get preview | `GET /api/artifacts/:id/preview` | Not yet implemented in api.ts routes (client has method) |
| Create | Via skill/tool execution | `ArtifactEngine.create()` |
| Download | Frontend-only | ArtifactPanel reads content → Blob → `<a download>` |

---

## 8. Plan System

### Database Table

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | active | completed | failed
  steps TEXT,                            -- JSON array of { id, title, status, content }
  content TEXT,                         -- Full plan content (markdown)
  result TEXT,                          -- Execution result
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/plans?sessionId=` | List plans, optionally filtered by session |
| GET | `/api/plan?id=` | Get single plan by ID |

Plans are currently **read-only via API** — they are created by workflow executions (e.g., `/plan` slash command triggers `trade.plan` workflow which creates a plan record).

### Status Flow

```
draft → active → completed
                 ↘ failed
```

---

## 9. Auto-Compaction

### Trigger Conditions

Auto-compaction runs **after each `agent.prompt()` call** when:

1. `options.autoCompaction !== false` (default: enabled)
2. `messageCount > 50` (message count in agent state)

### Logic

```typescript
// In TradingPiAgent.prompt(), after agent.prompt() completes:

const autoCompaction = options?.autoCompaction !== false; // default: true
const messageCount = agent.state.messages.length;

if (autoCompaction && messageCount > 50) {
  const usage = estimateContextTokens(agent.state.messages);
  // DEFAULT_COMPACTION_SETTINGS from pi-agent-core defines thresholds
  
  if (shouldCompact(usage.tokens, 128_000, DEFAULT_COMPACTION_SETTINGS)) {
    // 1. Create timeline event: "agent.compaction.check" (running)
    
    const summaryResult = await generateSummary(
      agent.state.messages,
      agent.state.model,
      DEFAULT_COMPACTION_SETTINGS.reserveTokens,  // tokens to reserve for next turn
      env.openaiApiKey,
    );
    
    if (summaryResult.ok) {
      this._compactionSummary = summaryResult.value;
      // Stored as instance variable, injected via transformContext on NEXT prompt()
      
      // 2. Create timeline event: "agent.compaction.complete" (completed)
    }
  }
}
```

### shouldCompact() Parameters

From `@earendil-works/pi-agent-core`:

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `tokens` | Actual token count | Estimated via `estimateContextTokens()` |
| `maxTokens` | 128,000 | Context window limit |
| `settings` | `DEFAULT_COMPACTION_SETTINGS` | Threshold ratios |

### Summary Injection

The generated summary is **not** immediately applied to messages. Instead:

1. Stored in `_compactionSummary` (instance variable)
2. On **next** `prompt()` call, `transformContext` injects it:
   ```typescript
   transformContext: async (messages) => {
     const contextMessages = [];
     if (this._compactionSummary) {
       contextMessages.push({
         role: "user",
         content: `--- Previous conversation summary ---\n${this._compactionSummary}`,
       });
       this._compactionSummary = undefined;  // consume once
     }
     // Also inject current memory context
     contextMessages.push({
       role: "user",
       content: `Local memory snapshot:\n${this.deps.memory.contextBlock("user")}`,
     });
     return [...contextMessages, ...messages];
   },
   ```

### Error Handling

Compaction failures are **silently caught** — they never cause the prompt to fail:

```typescript
try {
  // compaction logic...
} catch {
  // Compaction is best-effort; do not fail the prompt
}
```

---

## 10. Session Management

### Storage Model

Sessions use a **hybrid storage** approach:

1. **JSONL files** for message history (append-only log)
2. **SQLite** for metadata (name, status, counts, timestamps)

### JSONL Format

Each line in the session JSONL file is a JSON object:

```jsonl
{"type":"message","id":"msg_1","data":{"role":"user","content":"Hello"},"timestamp":1718300000000}
{"type":"pi_message","id":"pi_1","data":{"role":"assistant","content":[{"type":"text","text":"Hi there!"}]},"timestamp":1718300001000}
{"type":"tool_call","id":"tc_1","data":{"toolName":"market.ticker","content":{"symbol":"ETH"}},"timestamp":1718300002000}
{"type":"tool_result","id":"tr_1","data":{"result":{"price":3500}},"timestamp":1718300003000}
{"type":"workflow_result","data":{"workflowId":"research.asset","output":{...}},"timestamp":1718300004000}
```

### Entry Types

| Type | Source | Description |
|------|--------|-------------|
| `message` | User input | `{ role: "user", content: string }` |
| `pi_message` | Assistant response | Full `PiMessage` with content blocks |
| `tool_call` | Tool invocation | `{ toolName, content: args }` |
| `tool_result` | Tool completion | `{ result, isError? }` |
| `agent_state` | Post-turn metadata | `{ messageCount }` |
| `workflow_result` | Workflow output | `{ workflowId, runId, output }` |

### Session Store Operations

| Operation | Method | Side Effects |
|-----------|--------|--------------|
| Ensure/create | `ensureSession(id?, name?)` | Creates JSONL file + SQLite row if not exists |
| Fork | `createFork(parentSessionId)` | Copies parent's JSONL to new file |
| Append | `append(sessionId, type, data)` | Appends JSON line to file |
| Read | `read(sessionId)` | Reads all lines → parses JSON → returns entries |
| Delete | `deleteSession(sessionId)` | Deletes JSONL file + SQLite row |
| Rename | `updateSessionName(sessionId, name)` | Updates SQLite row |
| Get meta | `getSession(sessionId)` | Returns SQLite row |
| List | `list()` | Returns all SQLite rows |

### Auto-Naming

After each streamed response completes, if the session still has its default name ("Trading Pi Session" or "新对话"), it's auto-renamed to the first 40 characters of the user's message (stripped of special characters):

```typescript
const newName = message.slice(0, 40)
  .replace(/[^\w\u4e00-\u9fff\s]/g, "")
  .trim() || "新对话";
sessions.updateSessionName(result.sessionId, newName);
```

---

## 11. Environment Variables

Full reference in [`apps/web/.env.example`](../apps/web/.env.example):

| Variable | Required | Used By | Default |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | Yes | AI model provider | — |
| `OPENAI_BASE_URL` | No | AI model endpoint | — |
| `OPENAI_MODEL` | No | Default model identifier | — |
| `LANGFUSE_PUBLIC_KEY` | No | Telemetry | — |
| `LANGFUSE_SECRET_KEY` | No | Telemetry | — |
| `LANGFUSE_HOST` | No | Telemetry | — |
| `TRADING_PI_DATA_DIR` | No | Local data root | `.trading-pi` |
| `TRADING_PI_API_PORT` | No | Backend port | `8787` |
| `TRADING_PI_WEB_PORT` | No | Frontend port | `5173` |
| `TRADING_PI_DEFAULT_EXCHANGE` | No | CCXT exchange | `binance` |
| `TRADING_PI_EXCHANGE_FALLBACKS` | No | Fallback exchanges | `okx,bybit,coinbase,kraken` |
| `TRADING_PI_TRADING_MODE` | No | Paper vs live | `paper` |
| `EXA_API_KEY` | No | Exa search | — |
| `TAVILY_API_KEY` | No | Tavily search | — |
| `JINA_API_KEY` | No | Jina search/read | — |
| `COINMARKETCAP_API_KEY` | No | CoinGecko fallback | — |
| `AIO_SANDBOX_BASE_URL` | No | Browser sandbox | `http://localhost:8080` |

Environment loading: [`packages/core/src/config/env.ts`](../packages/core/src/config/env.ts) — supports `.env` files in `apps/web/`, project root, or parent directories.

---

## 12. Post-Refactor Status (v5.0 Frontend Changes)

The 2026-06-14 frontend refactoring (ADR-010) was **scoped exclusively to `apps/web/src/`** and did **not** modify any backend or core package code.

| Component | File(s) | Changed? |
|-----------|---------|----------|
| Server API (`api.ts`) | `apps/web/server/api.ts` | ❌ Unchanged |
| Agent Engine (`trading-pi-agent.ts`) | `packages/core/src/agent/trading-pi-agent.ts` | ❌ Unchanged |
| Skills / Workflows | `packages/core/src/skills/`, `packages/core/src/workflows/` | ❌ Unchanged |
| Database (schema + migrations) | `packages/core/src/db/database.ts` | ❌ Unchanged |
| Frontend (UI + API client) | `apps/web/src/` | ✅ Refactored (see [FRONTEND.md](./FRONTEND.md) v5.0 & ADR-010) |

**Summary**: The v5.0 refactoring replaced the frontend's component architecture, state management, and UI layer from scratch. All server-side endpoints, agent logic, skill execution, database schema, and core packages remain identical to their pre-refactor state.
