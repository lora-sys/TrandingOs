# Local-First Architecture

> **Last verified:** 2026-06-14

Trading Pi runs as a local personal trading OS. Docker exists only to make the local app reproducible for another user.

---

## Data Architecture

### Storage Layout

```txt
.trading-pi/
├── trading-pi.sqlite
├── artifacts/
├── logs/
├── memory/
└── sessions/
```

### SQLite Database (`trading-pi.sqlite`)

The primary relational store for all structured data.

- **30 tables** covering agents, workflows, skills, sessions, artifacts, market data, risk rules, journal entries, and more.
- Runs in **WAL (Write-Ahead Logging) mode** for concurrent read/write performance without blocking.
- Full schema reference: see `BACKEND.md` §5.
- Key table groups:
  - *Core*: agents, workflows, workflow_nodes, workflow_edges, skills, skill_parameters
  - *Sessions*: sessions, session_messages, session_tool_calls
  - *Artifacts*: artifacts, artifact_tags, artifact_versions
  - *Market*: market_assets, market_ohlcv, market_tickers
  - *Risk & Journal*: risk_rules, risk_alerts, journal_entries, journal_tags
  - *Evolution*: evolution_runs, evolution_metrics, evolution_snapshots

### JSONL Sessions (`sessions/`)

Append-only event log for every agent conversation.

- One `.jsonl` file per session, named `{session_id}.jsonl`.
- Each line is a self-contained JSON object representing a single event (user message, assistant response, tool call, tool result, error).
- Append-only design ensures durability — corrupted writes cannot destroy earlier events.
- Full specification: see `BACKEND.md` §10.

### Artifacts (`artifacts/`)

Dual-storage system for generated outputs (reports, charts, analysis notes, backtest results).

- **File system**: actual content stored as markdown, HTML, JSON, or PDF files under `artifacts/`.
- **Database**: metadata index in the `artifacts` table (name, type, tags, version, parent session, created_at).
- Supports versioning via `artifact_versions` table — each update creates a new version record while preserving previous file content.

### Memory Store (`memory/`)

Domain-scoped key-value memory that persists across sessions and evolves over time.

- **8 domains**:
  | Domain        | Purpose                                      |
  |---------------|----------------------------------------------|
  | `user`        | User preferences, trading style, goals       |
  | `market`      | Cached market context, asset watchlists      |
  | `risk`        | Risk limits, drawdown history, alert state   |
  | `research`    | Research findings, hypothesis tracking       |
  | `journal`     | Trading journal summaries, reflection notes  |
  | `strategy`    | Active strategy parameters, signal state     |
  | `evolution`   | Evolution run results, metric baselines      |
  | `workspace`   | Workspace-level settings, layout preferences |

---

## No Cloud Dependencies

### Fully Local (No Network Required)

These subsystems run entirely on the local machine and never initiate outbound connections:

| Component                | Description                                                    |
|--------------------------|----------------------------------------------------------------|
| Agent engine             | TradingPiAgent orchestrates workflows and skills               |
| Workflow DAGs            | Directed acyclic graph execution engine                        |
| Skill registry           | Skill discovery, loading, and parameter validation             |
| SQLite database          | All structured persistence (WAL mode)                          |
| Session management       | Conversation lifecycle, JSONL append-only logging              |
| Artifact storage         | File-based output storage + DB metadata indexing               |
| Memory store             | Domain-scoped persistent key-value store                       |
| Web UI (frontend)        | Serves static assets; communicates via local API               |
| API server               | FastAPI/Node.js backend handling all local requests            |

### Network Optional (Configurable Providers)

These features require network access but are **not required** for core operation. The system degrades gracefully when offline:

| Feature                  | Protocol / Provider                            | Fallback Behavior                          |
|--------------------------|------------------------------------------------|--------------------------------------------|
| AI inference             | OpenAI-compatible API (any base URL)           | Blocks agent responses until connectivity  |
| Web search               | Exa, Jina, or Tavily                           | Returns empty results; logged as warning   |
| Market data — public     | CoinGecko free tier API                        | Uses last-cached data; records stale flag  |
| Market data — exchange   | CCXT unified exchange interface                | Falls back to CoinGecko or cached data     |
| Telemetry (opt-in)       | Langfuse cloud or self-hosted instance         | Silently skipped if unreachable            |

> **Offline mode**: When no network is available, the agent can still browse session history, review artifacts, manage strategies, and run local analyses using cached data. Only AI-powered reasoning and live market queries are blocked.

### Docker-Optional: AIO Sandbox

Browser automation is provided by an optional AIO Sandbox container:

- Exposes a browser automation endpoint on **port `:8080`**.
- Used by the `agent-browser` skill for web interaction tasks (page navigation, screenshot capture, form filling, data extraction).
- Not required for normal trading operations — only needed when the agent must interact with web pages (e.g., reading exchange dashboards, capturing chart screenshots).
- If the sandbox is unavailable, browser-dependent skills fail gracefully with a clear error message.

---

## Data Flow Diagram

Full round-trip from user input to rendered result:

```txt
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                    LOCAL MACHINE                         │
                                                                    │
  User Input                                                        │
    │                                                               │
    ▼                                                               │
┌──────────┐     HTTP/WebSocket      ┌──────────────┐               │
│  Web UI  │ ──────────────────────▶ │  API Server  │               │
│(Frontend)│ ◀────────────────────── │ (FastAPI/..) │               │
└──────────┘     SSE Stream / JSON   └──────┬───────┘               │
                                                 │                    │
                                                 ▼                    │
                                        ┌──────────────┐              │
                                        │   Agent      │              │
                                        │ Orchestrator │              │
                                        └──────┬───────┘              │
                                               │                        │
                                    ┌──────────┼──────────┐            │
                                    ▼          ▼          ▼            │
                              ┌──────────┐ ┌────────┐ ┌────────┐      │
                              │ Workflow │ │ Skill  │ │ Memory │      │
                              │ Router   │ │Registry│ │  Read  │      │
                              └────┬─────┘ └───┬────┘ └───┬────┘      │
                                   │           │          │            │
                                   ▼           ▼          ▼            │
                              ┌──────────────────────────────┐        │
                              │      Tool Execution Layer    │        │
                              │  (DB ops / File I/O / AI API │        │
                              │   / Search / Market / Browser)│        │
                              └──────────────┬───────────────┘        │
                                             │                        │
                          ┌──────────────────┼──────────────────┐     │
                          ▼                  ▼                  ▼     │
                   ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
                   │   SQLite DB  │  │  JSONL Log   │  │ Artifacts│  │
                   │ (30 tables)  │  │ (append-only)│  │(files+DB)│  │
                   └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
                          │                 │               │        │
                          ▼                 ▼               ▼        │
                   ┌──────────────────────────────────────────────┐  │
                   │         Audit Record + Memory Write          │  │
                   │  (every action logged to sessions + memory)  │  │
                   └──────────────────────┬───────────────────────┘  │
                                          │                          │
                                          ▼                          │
                                   ┌──────────────┐                  │
                                   │ SSE Stream   │                  │
                                   │ (real-time   │──────────────────┘
                                   │  updates)    │────▶ Web UI render
                                   └──────────────┘
```

**Key intermediate steps in detail:**

1. **Workflow routing** — The agent matches the user intent against registered workflow DAGs to determine which skills to invoke and in what order.
2. **Tool execution** — Each skill executes one or more tools (database queries, file writes, external API calls, search requests).
3. **Audit records** — Every tool call, result, and error is appended to the session's JSONL log before the response continues.
4. **Memory write** — After successful operations, relevant domain memory is updated (e.g., new risk limit stored in `risk` domain).
5. **Artifact creation** — Generated outputs (charts, reports, analysis) are written to disk and indexed in the artifacts table.
6. **SSE stream** — Server-Sent Events push incremental updates (tool status, partial text, final result) to the Web UI in real time.

---

## Privacy & Security

Trading Pi is designed so that **all personal and trading data stays on the local machine** by default.

| Data Type               | Storage Location          | Leaves Machine?               |
|-------------------------|---------------------------|-------------------------------|
| Trading positions       | SQLite (local DB)         | **Never**                     |
| Order history           | SQLite (local DB)         | **Never**                     |
| Risk limits & alerts    | SQLite + memory store     | **Never**                     |
| Strategy parameters     | SQLite + memory store     | **Never**                     |
| Journal entries         | SQLite (local DB)         | **Never**                     |
| Session conversations   | JSONL files (local disk)  | **Never**                     |
| Artifacts / reports     | Local filesystem + DB     | **Never** (unless exported)   |
| AI prompt content       | Sent to configured AI provider API | **Only to user-chosen provider** |
| Search queries          | Sent to configured search provider | **Only if search skill used** |
| Market data requests    | Sent to CoinGecko / CCXT  | **Only when live data needed** |
| Telemetry traces        | Langfuse (opt-in)        | **Only if explicitly enabled**|

### Principles

- **Zero cloud lock-in**: No proprietary cloud backend stores your data. Everything is in `.trading-pi/`.
- **User-owned keys**: AI API keys, exchange keys, and search provider keys are stored locally and sent only to the endpoints you configure.
- **Opt-in telemetry only**: Langfuse tracing is disabled by default and must be explicitly enabled. When enabled, only trace metadata (not payload contents) is sent unless you configure otherwise.
- **Exportable at any time**: Since all data lives in standard formats (SQLite, JSONL, plain files), you can back up, migrate, or delete everything by copying or removing the `.trading-pi/` directory.

---

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

- **CoinGecko**: no trading key, useful for public quote snapshots.
- **CCXT**: exchange-facing ticker/OHLCV access, useful for symbols and eventual paper/guarded trading alignment.

Network failures must be recorded as skill run errors instead of hidden.
