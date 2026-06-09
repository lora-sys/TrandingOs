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
| Single Agent | Implemented | `packages/core/src/agent/trading-pi-agent.ts` wraps Pi `Agent`, attaches Skill Registry tools, and routes slash commands into workflows. |
| Pi mono/core reuse | Implemented | `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` are used; reuse decision is documented in `docs/pi-reuse.md`. |
| Tool use | Implemented | Skills are converted to Pi tools through `SkillRegistry.toPiTools()`. |
| Workflow engine | Implemented | Workflow runs, timeline events, success/failure states are persisted. |
| Skill registry | Implemented | Core trading, market, research, journal, review, search, browser, MCP, marketplace, workspace, strategy, and artifact preview skills are registered. |
| Sessions | Implemented | `/api/messages`, `/api/session/message`, JSONL session store, and SQLite session metadata exist. |
| Memory | Domain upgrade implemented | Memory now includes domain/workspace/source/importance metadata, query/write APIs, automatic writes from workspace/research/trade/journal/review/strategy paths, and workspace memory UI. |
| MCP Hub | Domain upgrade implemented | `packages/mcp-hub`, local discovery, registration, health checks, permission approval gates, audit records, API routes, and Marketplace controls exist. Real network install/update/remove remains future work. |
| Browser Layer | Contract upgrade implemented | Browser actions use an AIO Sandbox action contract, persist browser sessions, create evidence artifacts, and surface explicit unavailable states. Configured external AIO E2E still depends on `AIO_SANDBOX_BASE_URL`. |
| Search Hub | Research-routed foundation | Search is cached and Research now consumes Search/Browser/Market/Memory through Research Hub bundles with source quality. |
| Artifact Preview | Markdown/HTML/PDF tabs implemented | Artifact content/preview metadata, `/api/artifacts/:id/preview`, browser evidence artifacts, and frontend Markdown/HTML/PDF/Data/Meta tabs exist. Full binary PDF export depends on configured Browser/AIO output. |
| Journal/Review | Implemented for paper data | Journal entries, review metrics, artifacts, and UI pages exist. |
| Strategy/Backtest | Foundation implemented | Strategy creation and mock backtest bridge exist; production backtest engine and Evolution linkage are next. |
| Marketplace | Local catalog implemented | Local Skills/Workflow/MCP/Template catalog and UI shell exist; install/update/remove flows are pending. |
| Frontend design | In progress | Dark trading cockpit, nav, inspector, chat, artifact preview, workspace and marketplace pages exist. Chat now submits to the backend Agent path. |

## Gap Analysis

| Requirement | Completion | Gap |
|---|---|---|
| Chat UI should use HeroUI chat-style components | In progress | Core feed, cards, chips, and composer now use HeroUI. Slash execution has moved to backend Agent routing; approval actions need richer interactive states. |
| Full MCP Hub | Partial | Registry and health exist; discovery, permissions UI, lifecycle, install/update/remove, and marketplace activation are pending. |
| Browser Layer through AIO Sandbox | Partial | Package and skills exist; configured sandbox E2E, screenshot/PDF artifact persistence, and browser extraction workflows are pending. |
| Search Hub for all Research workflows | Partial | Research includes Search Hub context; full Research Hub orchestration across search/news/browser/onchain/documents is pending. |
| Memory Engine | Partial | Conversation memory exists; trade/review/skill/workspace memory scopes need automatic writes and retrieval policy. |
| Workspace System as domain | Partial | Workspace records and UI exist; workspace-scoped sessions/artifacts/memory/workflows are pending. |
| Strategy + Evolution | Proposal loop implemented | Strategy lifecycle, backtest compare, evolution proposal artifact, approval gate, and Evolution UI exist. Rollback/apply remains guarded future work. |
| Artifact Preview Markdown/HTML/PDF | Partial | Markdown preview works; HTML/PDF rendering through Browser Skill/Sandbox is pending. |
| Observability for every call | Improved | Workflow/skill/timeline records exist; MCP, browser, market, research, memory, strategy, backtest, and evolution actions write audit records. Some low-level provider calls still use parent skill audit. |
| Config/permissions/secrets | Partial | Env config and redaction exist; config-driven risk/strategy/skill/mcp/workspace rule files are pending. |
| Data cache | Partial | DB table and repository methods exist; market/search/browser workflows do not consistently use cache yet. |
| E2E video | Pending | Screenshots are generated; video recording will be added in Phase 7 verification. |

## Direction

Next development should harden the OS shell instead of adding unrelated features:

1. Complete Playwright/Docker verification for Phase 9-15 surfaces.
2. Connect a configured AIO Sandbox instance and verify screenshot/PDF binary artifacts end to end.
3. Add real MCP network install/update/remove only after permission UX is stable.
4. Expand strategy apply/rollback under approval after more paper-trading review data exists.
5. Keep real trading guarded and disabled until approval, permission, and exchange compliance layers are explicit.
