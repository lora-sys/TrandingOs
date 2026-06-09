# Trading Pi Project Status

Last updated: 2026-06-09

## Architecture Invariants

- Single core agent remains `TradingPiAgent`.
- Capabilities continue to flow through `TradingPiAgent -> Workflow -> Skills -> Artifact`.
- Local-first runtime remains SQLite, JSONL sessions, file artifacts, and local API/web.
- Dangerous skills use approval gates; live trading remains unavailable by default.
- Browser automation for product capability is represented by Browser Skills and the AIO Sandbox Browser Layer, not direct Playwright calls inside the Agent.

## Current State

| Area | Status | Evidence |
|---|---|---|
| Single Agent | Implemented | `packages/core/src/agent/trading-pi-agent.ts` wraps Pi `Agent` and attaches Skill Registry tools. |
| Pi mono/core reuse | Implemented | `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` are used; reuse decision is documented in `docs/pi-reuse.md`. |
| Tool use | Implemented | Skills are converted to Pi tools through `SkillRegistry.toPiTools()`. |
| Workflow engine | Implemented | Workflow runs, timeline events, success/failure states are persisted. |
| Skill registry | Implemented | Core trading, market, research, journal, review, search, browser, MCP, marketplace, workspace, strategy, and artifact preview skills are registered. |
| Sessions | Implemented | `/api/messages`, `/api/session/message`, JSONL session store, and SQLite session metadata exist. |
| Memory | Foundation implemented | SQLite `memory_records`, API `/api/memory`, and agent context injection exist; long-term workspace/trade/review memory policies need deeper implementation. |
| MCP Hub | Foundation implemented | SQLite `mcp_servers`, `mcp.health`, `/api/mcp/servers`, `/api/mcp/health`, and Marketplace linkage exist; discovery/install/update/remove are not complete. |
| Browser Layer | Foundation implemented | `packages/browser-layer` exposes browser actions through AIO Sandbox configuration; actions return explicit unavailable states when sandbox is not configured. |
| Search Hub | Foundation implemented | `packages/search-hub` supports Exa/Jina/Tavily/free routing shape; Research needs full source citation and cache policies. |
| Artifact Preview | Implemented for Markdown | Artifact content/preview metadata, `/api/artifacts/:id/preview`, and frontend preview panel exist. HTML/PDF sandbox preview/export still needs deeper coverage. |
| Journal/Review | Implemented for paper data | Journal entries, review metrics, artifacts, and UI pages exist. |
| Strategy/Backtest | Foundation implemented | Strategy creation and mock backtest bridge exist; production backtest engine and Evolution linkage are next. |
| Marketplace | Local catalog implemented | Local Skills/Workflow/MCP/Template catalog and UI shell exist; install/update/remove flows are pending. |
| Frontend design | In progress | Dark trading cockpit, nav, inspector, chat, artifact preview, workspace and marketplace pages exist. Phase 7 continues HeroUI chat/runtime hardening. |

## Gap Analysis

| Requirement | Completion | Gap |
|---|---|---|
| Chat UI should use HeroUI chat-style components | In progress | Core feed, cards, chips, and composer now use HeroUI; slash suggestions and approval actions need richer interactive states. |
| Full MCP Hub | Partial | Registry and health exist; discovery, permissions UI, lifecycle, install/update/remove, and marketplace activation are pending. |
| Browser Layer through AIO Sandbox | Partial | Package and skills exist; configured sandbox E2E, screenshot/PDF artifact persistence, and browser extraction workflows are pending. |
| Search Hub for all Research workflows | Partial | Research includes Search Hub context; full Research Hub orchestration across search/news/browser/onchain/documents is pending. |
| Memory Engine | Partial | Conversation memory exists; trade/review/skill/workspace memory scopes need automatic writes and retrieval policy. |
| Workspace System as domain | Partial | Workspace records and UI exist; workspace-scoped sessions/artifacts/memory/workflows are pending. |
| Strategy + Evolution | Partial | Strategy library and backtest bridge foundation exist; evolution proposal, approval, rollback, and version timeline are pending. |
| Artifact Preview Markdown/HTML/PDF | Partial | Markdown preview works; HTML/PDF rendering through Browser Skill/Sandbox is pending. |
| Observability for every call | Partial | Workflow/skill/timeline records exist; audit records are incomplete for all skill/browser/search/cache calls. |
| Config/permissions/secrets | Partial | Env config and redaction exist; config-driven risk/strategy/skill/mcp/workspace rule files are pending. |
| Data cache | Partial | DB table and repository methods exist; market/search/browser workflows do not consistently use cache yet. |
| E2E video | Pending | Screenshots are generated; video recording will be added in Phase 7 verification. |

## Direction

Next development should harden the OS shell instead of adding unrelated features:

1. Make Chat Workspace the primary executable cockpit with HeroUI cards, clear skill blocks, approval cards, and artifact preview selection.
2. Turn foundations into operating domains: MCP, Memory, Workspace, Search/Research, Browser, Strategy, and Marketplace should have observable APIs and UI states.
3. Add policy/config files before live trading: permissions, risk limits, sandbox rules, cache TTLs, and trading modes.
4. Expand tests from package-level unit tests to browser E2E scripts with screenshots/video for each phase.
5. Keep real trading guarded and disabled until approval, permission, and exchange compliance layers are explicit.
