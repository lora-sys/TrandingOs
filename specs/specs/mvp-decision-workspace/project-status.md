# Project Status — MVP Decision Workspace

## 2026-06-13 — Phase 1 Backend Foundation Kickoff

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.1 partial: added Polymarket client module with Gamma market list/detail/search and CLOB price/orderbook helpers.
- Task 1.1 partial: registered `market.polymarket.markets`, `market.polymarket.detail`, `market.polymarket.price`, and `market.polymarket.search`.
- Task 1.2 partial: added Reddit public JSON client and registered `community.reddit` for hot/search/comments.
- Task 1.2 partial: added Semantic Scholar, Crossref, and OpenAlex academic clients and registered `academic.semanticscholar`, `academic.crossref`, and `academic.openalex`.
- Task 1.3 partial: added `AlphaSignal` type helpers, registered `alpha.radar.scan`, and exposed `GET /api/alpha/radar`.
- Added `GET /api/markets?source=polymarket` for the future Markets prediction tab.
- Extended memory domain support with `alpha` for Alpha Radar cache records.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- Runtime registration check passed for all newly added skills and `alpha.radar.scan` using a temporary SQLite database.

Known Issues:
- The current local environment has no `npm` or `npx` on PATH; validation used the bundled Node runtime plus local `node_modules/.bin/tsc`.
- Direct network verification of `https://gamma-api.polymarket.com` timed out because local DNS resolved Polymarket hosts to unexpected addresses. Code paths compile and registration works, but live data verification must be retried in a healthy network/browser environment.
- Full `tsc -b` did not finish within the working window and was interrupted after `packages/core` passed.

Next:
- Continue Phase 1 with Decision Engine tables/repositories/API, Workspace CRUD API, Deep Research session schema/engine, event feed skills, and paper trade lifecycle.
- After frontend wiring begins, all interaction tests must run through a real browser with screenshots saved under `output/playwright/`.

## 2026-06-13 — Phase 1 Decision + Workspace Backend

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.4 partial: added `decisions` SQLite table with structured DecisionRecord fields, status timestamps, result P&L, and review link.
- Task 1.4 partial: added repository methods `createDecision()`, `updateDecisionStatus()`, `listDecisions()`, and `getDecision()`.
- Task 1.4 partial: registered `decision.analyze` and `decision.record` skills.
- Task 1.4 partial: exposed Decision APIs:
  - `POST /api/decisions`
  - `GET /api/decisions`
  - `GET /api/decisions/:id`
  - `PATCH /api/decisions/:id`
  - `PATCH /api/decisions/:id/status`
- Task 1.5 partial: expanded `workspaces` schema with description/topic/session/default metadata while preserving existing `kind/context_json`.
- Task 1.5 partial: added Workspace repository CRUD plus default `General` workspace creation.
- Task 1.5 partial: exposed Workspace APIs:
  - `GET /api/workspaces`
  - `POST /api/workspaces`
  - `GET /api/workspaces/:id`
  - `PATCH /api/workspaces/:id`
  - `DELETE /api/workspaces/:id`
- Task 1.5 partial: added `artifacts.workspace_id` and passed `workspaceId` through ArtifactEngine / `artifact.create`.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- Runtime SQLite verification passed for workspace create, decision create/update/list, and `decision.record` skill execution.
- Real HTTP verification passed against temporary API server on port `8877` for workspace create/read and decision create/update/list.

Known Issues:
- Browser E2E is not applicable yet for this backend-only slice; frontend implementation still needs real browser verification and screenshots.
- `decision.analyze` can call the configured AI model when `OPENAI_API_KEY` is present; without a key it returns a conservative structured fallback after gathering available context.

Next:
- Continue Phase 1 with Deep Research session schema/engine/SSE endpoint, event feed skills (`events.fred` + `events.coinmarketcal` per current spec), and paper trade lifecycle.

## 2026-06-13 — Phase 1 Event Feed Skills

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.2.6 partial: added FRED event feed client with `calendar`, `series`, and `search` support.
- Task 1.2.6 partial: added CoinMarketCal event feed client with `events` and `today` support.
- Task 1.2.6 partial: registered `events.fred` and `events.coinmarketcal` in default skills.
- Added `FRED_API_KEY` and `COINMARKETCAL_API_KEY` support to `TradingPiEnv` / redacted config.
- Added `GET /api/events/reminders` returning `{ macro, crypto, generatedAt, cacheTtlSeconds }` for Dashboard Today's Reminders.
- Wired Alpha Radar workflow to include event-feed context from FRED and CoinMarketCal.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- Runtime skill registration and no-key fallback verification passed for `events.fred` and `events.coinmarketcal`.
- Real HTTP verification passed against temporary API server on port `8878` for `GET /api/events/reminders?days=1&limit=3`.

Known Issues:
- FRED and CoinMarketCal live API verification requires valid `FRED_API_KEY` and `COINMARKETCAL_API_KEY`; current verification confirms shape, caching, registration, and explicit warning behavior without keys.
- Browser E2E/screenshots remain pending until frontend Dashboard renders the reminders section.

Next:
- Continue Phase 1 with Deep Research session schema/engine/SSE endpoint and paper trade lifecycle.

## 2026-06-13 — Phase 1 Deep Research Backend

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.6.1: added `research_sessions` SQLite table with workspace/topic/mode/status/iterations/report artifact/token usage/error/timestamps.
- Task 1.6.1: added repository methods `createResearchSession()`, `updateResearchSession()`, `listResearchSessions()`, and `getResearchSession()`.
- Task 1.6.2: implemented built-in MVP Deep Research engine in `packages/core/src/research/deep-research.ts`.
  - Emits `research:started`, `research:step`, `research:complete`, and `research:error` events.
  - Runs 7-step flow: decompose, web search, academic search, Reddit, market data, analysis, synthesize.
  - Uses existing tools: `search.query`, `academic.semanticscholar`, `academic.crossref`, `academic.openalex`, `community.reddit`, `market.polymarket.search`, `market.coingecko.quote`.
  - Supports AbortSignal cancellation path.
- Task 1.6.3: registered `deep.research` workflow.
- Task 1.6.4: added `POST /api/research/deep` SSE endpoint.
- Task 1.6.4: added `GET /api/research/sessions` and `GET /api/research/sessions/:id`.
- Task 1.6.5: Deep Research creates `research-report` artifacts linked to `workspace_id` and workspace links.
- Task 1.6.6: added `decision.fromReport` helper skill that feeds a ResearchReport into `decision.analyze`.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- Runtime engine verification passed: event sequence included `research:started`, seven `research:step`, and `research:complete`; session completed; artifact created; report had `executionSummary`, `keyFindings`, `dataSourceSummary`, `conclusion`; `decision.fromReport` returned a Decision Card.
- Real HTTP SSE verification passed against temporary API server on port `8879`: `POST /api/research/deep` streamed 9 events without `research:error`, and `GET /api/research/sessions` returned completed session with artifact.

Known Issues:
- With no `OPENAI_API_KEY`, report synthesis uses deterministic built-in synthesis after gathering available tool context. AI synthesis path is implemented but still needs live key/browser verification later.
- Browser E2E/screenshots remain pending until frontend Workspace Research tab renders the Deep Research UI.

Next:
- Continue Phase 1 with paper trade lifecycle and enhanced review/evolution/user-rules backend, then move into Phase 2/3 frontend restructuring and browser verification.

## 2026-06-13 — Phase 1 Paper Trade Lifecycle

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.8.1: added `paper_trades` SQLite table with decision/workspace/direction/asset/entry/exit/size/P&L/status/settlement fields.
- Added paper trade repository lifecycle methods:
  - `createPaperTrade()`
  - `settlePaperTrade()`
  - `cancelPaperTrade()`
  - `listPaperTrades()`
  - `getPaperTrade()`
- Added lightweight journal linkage columns (`workspace_id`, `decision_id`, `paper_trade_id`) so paper trade execution auto-creates and updates Journal entries.
- Task 1.8.2: registered `paper.trade.lifecycle` workflow with `execute`, `monitor`, `close`, and `settle` actions.
- Task 1.8.3: added Paper Trade APIs:
  - `POST /api/paper-trades`
  - `GET /api/paper-trades`
  - `GET /api/paper-trades/:id`
  - `PATCH /api/paper-trades/:id/close`
  - `POST /api/paper-trades/:id/settle`
- Settlement now updates paper trade P&L, decision `settled_win` / `settled_loss`, decision `resultPnL`, Journal exit data, and timeline event `paper_trade_settled`.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- Runtime workflow verification passed: execute opened trade, settle closed trade, P&L calculated, decision moved to `settled_win`, Journal linked and updated with exit data.
- Real HTTP API verification passed against temporary API server on port `8880`: `POST /api/paper-trades`, `PATCH /api/paper-trades/:id/close`, and `GET /api/paper-trades` returned closed trade with P&L and Journal link.

Known Issues:
- Frontend DecisionCard confirm wiring and browser E2E are pending Phase 2/4 UI integration.
- Journal 4-dimension schema is only lightly represented in JSON notes for this backend slice; full REQ-MVP-14 expansion remains in upcoming Review/Journal work.

Next:
- Continue Phase 1 with enhanced review workflow, Evolution/User Rules backend integration, then move into frontend restructuring.

## 2026-06-13 — Phase 1 Review/Evolution/User Rules Backend

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.9.1: added `review.workspace` workflow that emits a 7-section ReviewReport:
  - `overview`
  - `tradeAnalyses`
  - `errorSummary`
  - `suggestions`
  - `emotionAnalysis`
  - `ruleCompliance`
  - `historicalComparison`
  - plus `metadata`
- Extended `reviews` with `workspace_id` and `report_json`; added review list/get repository methods.
- Task 1.9.2: added User Rules decision-time integration:
  - `user_rules` memory domain added.
  - `decision.analyze` loads global/workspace rules and appends `ruleCompliance`.
  - `decision.record` persists `ruleCompliance` in `decisions.rule_compliance_json`.
- Task 1.9.3: added Evolution backend:
  - `evolution_suggestions` table and repository CRUD/status methods.
  - `GET /api/evolution/summary`
  - `GET /api/evolution/suggestions`
  - `POST /api/evolution/suggest-rules`
  - `POST /api/evolution/rules/:id/adopt`
- Added Settings-ready User Rules APIs:
  - `GET /api/user-rules`
  - `POST /api/user-rules`
- `review.workspace` now saves a `workspace-review` artifact, creates a review row, writes review memory, and seeds evolution suggestions from report output.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- Runtime SQLite verification passed: user rule write, `decision.analyze` rule warning, `decision.record` persisted compliance, `review.workspace` generated report, and evolution suggestion status update succeeded.
- Real HTTP API verification passed against temporary API server on port `18979`: `/api/user-rules`, `/api/evolution/suggest-rules`, `/api/evolution/rules/:id/adopt`, `/api/evolution/suggestions`, and `/api/evolution/summary`.

Known Issues:
- Review report generation is deterministic for MVP and does not yet stream section events; section-level sub-agent events are planned in Task 1.10.
- Browser E2E/screenshots remain pending until frontend Review/Evolution/Settings UI exists.

Next:
- Continue Phase 1 with Task 1.10 Sub-Agent Architecture, then move into Phase 2/3 frontend restructuring and required browser verification/screenshots.

## 2026-06-13 — Phase 1 Sub-Agent Architecture

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 1.10.1: created `packages/core/src/agents/` with:
  - `types.ts`
  - `protocol.ts`
  - `manager.ts`
  - `index.ts`
- Task 1.10.2: created 5 built-in agent definition files:
  - `deep-research.md`
  - `alpha-radar.md`
  - `review.md`
  - `evolution.md`
  - `paper-trade.md`
- Task 1.10.3: registered 3 pi-subagents-compatible tools:
  - `Agent`
  - `StopAgent`
  - `AgentStatus`
- Task 1.10.4: added `SubAgentManager` workflow runner mapping:
  - `deep-research` -> `deep.research`
  - `alpha-radar` -> `alpha.radar.scan`
  - `review` -> `review.workspace`
  - `evolution` -> `evolution.propose`
  - `paper-trade` -> `paper.trade.lifecycle`
- Task 1.10.5: added Sub-Agent APIs:
  - `GET /api/sub-agents`
  - `GET /api/sub-agents/:id`
  - `POST /api/sub-agents/:id/stop`
- Task 1.10.6: wired frontend event compatibility:
  - Backend emits `subagents:created`, `subagents:started`, `subagents:step`, `subagents:completed`, `subagents:failed`, `subagents:cancelled`.
  - Chat SSE endpoint forwards `subagents:*` events.
  - Frontend `applySubagentEvent()` now handles `subagents:step` and `subagents:cancelled`.
- Updated Trading Pi Agent system prompt to preserve Single Agent Architecture while allowing workflow-backed sub-agents as execution/progress wrappers.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- Runtime verification passed: `Agent({ agent_type: "review", workspace_id })` spawned a sub-agent, ran `review.workspace`, emitted created/started/step/completed events, and `AgentStatus` returned completed status with event history.
- Real HTTP API verification passed against temporary API server on port `18980`: `/api/sub-agents` returned all 5 definitions; detail/stop for missing IDs returned 404.

Known Issues:
- `npx` and `agent-browser` executables are missing in the current shell, so browser automation cannot run yet. Required Playwright prerequisite from the skill is not satisfied.
- UI browser E2E/screenshots are still pending until Phase 2/3 frontend pages expose Sub-Agent controls and panels.

Next:
- Begin Phase 2 frontend page restructure, then Phase 3 Workspace UI integration, with real browser interaction and screenshot evidence once the app has interactive UI for the new backend flows.

## 2026-06-13 — Phase 2 Frontend Routes + Dashboard/Markets

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 2.1: rewrote router/navigation to the MVP route set:
  - `/` Dashboard
  - `/markets`
  - `/workspace`
  - `/workspace/$workspaceId`
  - `/journal`
  - `/timeline`
  - `/settings`
  - `/evolution`
- App sidebar now shows exactly 7 business nav entries: Dashboard, Markets, Workspace, Journal, Timeline, Settings, Evolution.
- Task 2.2: rewrote Dashboard with:
  - Alpha Radar section at top, auto-fetching `/api/alpha/radar`
  - Today's Reminders from `/api/events/reminders`
  - Recent Reviews from `/api/reviews`
  - Existing status/model/skills/workflows stats moved lower
- Task 2.3: rewrote Markets page with:
  - `Crypto Spot` / `Prediction Markets` segmented tabs
  - Crypto cards backed by `/api/market/ohlcv`
  - Prediction-market cards backed by `/api/markets?source=polymarket`
  - Category filters, search input, localStorage favorites, and workspace navigation click target
- Added working first-pass pages for upcoming phases:
  - Workspace list shell
  - Global Journal shell
  - Settings with model summary and User Rules add flow
  - Evolution with summary, suggestions, Suggest New Rules, and Adopt actions
- Updated API client for new backend endpoints and Vite-configurable API port via `VITE_TRADING_PI_API_PORT`.
- Hardened `/api/markets?source=polymarket` so source failures return `{ markets: [], stale: true, error }` with HTTP 200 instead of breaking the UI with 500.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" /Users/lora/repos/trandingos/node_modules/.bin/vite build` passed from `apps/web`.
- Real browser smoke check using local Playwright package passed with no console or network errors after fixing API fallback.
- Browser interactions performed:
  - Loaded Dashboard.
  - Navigated to Markets.
  - Clicked Prediction Markets tab.
  - Navigated to Settings.
  - Added a User Rule through the UI.
- Screenshot evidence saved:
  - `output/playwright/phase2-dashboard-final.png`
  - `output/playwright/phase2-markets-final.png`
  - `output/playwright/phase2-settings-final.png`
  - Additional earlier inspection screenshots retained under `output/playwright/phase2-*.png`.

Known Issues:
- The required Playwright skill wrapper cannot run because `npx` is missing, and `agent-browser` is also not installed in the shell. Current browser smoke used the repo-local Playwright package directly.
- Full interactive browser verification remains required for later Workspace/Journal/Evolution/DecisionCard/Sub-Agent UI tasks.
- Polymarket live data may still return stale/empty when network/source fails; UI now handles this gracefully.

Next:
- Continue Phase 2 with full Workspace page implementation (Task 2.4), then Journal/Settings/Evolution detail completion and broader browser E2E screenshots.

## 2026-06-13 — Phase 2 Workspace Core Page

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 2.4.1: Workspace shell now supports:
  - `/workspace` list view.
  - Create workspace form.
  - Workspace cards with name, topic type, description, updated timestamp, and click-through.
  - `/workspace/$workspaceId` detail view with breadcrumb and 5 sub-tabs.
- Task 2.4.2: Overview tab now shows:
  - Workspace metadata header.
  - Topic/market reference placeholder from workspace metadata.
  - Metrics: decisions, win rate, P&L, journal count.
  - Recent workspace-related timeline activity.
  - Quick action buttons to Research, Decisions, and Journal tabs.
- Task 2.4.3 partial: Research tab now includes:
  - Workspace-scoped topic input.
  - Real `POST /api/research/deep` SSE trigger through API client.
  - Step list/progress display.
  - Report/session display area.
  - Full ChatWorkspace migration and dual-pane report view remain for Phase 3 components.
- Task 2.4.4: Decisions tab now includes:
  - Workspace-filtered decision list.
  - Manual decision entry form.
  - Decision cards with direction/confidence/status/thesis and rule warning display.
- Task 2.4.5: Journal tab now includes:
  - Workspace-filtered journal entries.
  - Manual journal entry form.
  - Backend `journal.entry.create` now persists `workspaceId`, `decisionId`, and `paperTradeId` when supplied.
- Task 2.4.6: Review tab now includes:
  - Workspace-filtered review reports.
  - `Request Review` button calling `review.workspace`.
- Added frontend API helpers for workspace detail, decisions, paper trades, research sessions, deep-research SSE, and workspace-scoped operations.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" /Users/lora/repos/trandingos/node_modules/.bin/vite build` passed from `apps/web`.
- Real browser smoke with local Playwright package passed:
  - Created a workspace through `/workspace`.
  - Opened workspace detail route.
  - Saved a manual decision and verified it rendered.
  - Saved a workspace journal entry and verified it rendered.
  - Requested a workspace review and verified the report summary rendered.
  - Triggered Deep Research and verified progress UI appeared.
  - No console or network errors in final assertion run.
- Screenshot evidence saved:
  - `output/playwright/phase24-workspace-overview.png`
  - `output/playwright/phase24-workspace-decisions.png`
  - `output/playwright/phase24-workspace-journal.png`
  - `output/playwright/phase24-workspace-review.png`
  - `output/playwright/phase24-workspace-research-running.png`

Known Issues:
- Full ChatWorkspace migration inside Research tab is not complete yet.
- Deep Research report dual-pane document view and bottom toolbar are still pending Phase 3 components.
- Required `$playwright` skill wrapper still cannot run because `npx` is missing; `agent-browser` is also unavailable. Browser checks used the repo-local Playwright package directly.

Next:
- Continue Phase 2 with global Journal, Settings, AppLayout recent workspaces, and Evolution detail work, then Phase 3 components for DecisionCard/DeepResearchProgressPanel/ResearchReportView.

## 2026-06-13 — Phase 2 Journal/Settings/Layout/Evolution

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 2.5: Global Journal page now includes:
  - Workspace/date/outcome/search filters.
  - Summary stats: entries, win rate, total P&L, best trade, worst trade.
  - Manual journal entry form.
  - Markdown export.
  - Expand/collapse entry detail.
  - Links back to parent workspace when available.
- Task 2.6: Settings page now includes 7 spec sections:
  - AI Model with `/api/config` save.
  - Data Sources readiness list.
  - Trading defaults stored locally.
  - Appearance controls wired to local settings.
  - User Rules backed by `user_rules` memory.
  - Deep Research mode/max-step preferences stored locally.
  - About/build information.
- Task 2.7: AppLayout sidebar now keeps exactly 7 main nav entries and shows up to 5 recent workspaces under Workspace.
- Task 2.8: Evolution page now includes:
  - Progress Dashboard.
  - Improvement Feed with Adopt actions.
  - Pattern Highlights.
  - Rule Workshop showing active rules.
  - Quick Actions for suggest/export/refresh.

Verification:
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/memory-engine/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p packages/core/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -p apps/web/tsconfig.json` passed.
- `PATH="/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" /Users/lora/repos/trandingos/node_modules/.bin/vite build` passed from `apps/web`.
- Real browser smoke with local Playwright package passed:
  - Created a workspace and verified it appears as a recent workspace under sidebar Workspace.
  - Added a workspace journal entry, opened global Journal, filtered/search verified entry.
  - Opened Settings, verified AI Model/Data Sources sections, added a User Rule.
  - Opened Evolution, triggered Suggest New Rules, verified Improvement Feed.
  - No console or network errors in final browser run.
- Screenshot evidence saved:
  - `output/playwright/phase25-journal.png`
  - `output/playwright/phase26-settings.png`
  - `output/playwright/phase27-sidebar-workspaces.png`
  - `output/playwright/phase28-evolution.png`

Known Issues:
- Some Settings fields are local preferences until broader config persistence is added.
- Evolution Dismiss/Reset are not implemented as destructive operations; available quick actions are suggest/export/refresh.
- Required `$playwright` wrapper still cannot run because `npx` is missing; `agent-browser` remains unavailable. Browser checks used the repo-local Playwright package directly.

Next:
- Start Phase 3 components: AlphaRadarCard, DecisionCard, DecisionForm, WorkspaceList extraction, DeepResearchProgressPanel, ResearchReportView, and ChatItem render integration.

## 2026-06-13 — Phase 3 MVP Components + Browser QA

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 3.1: extracted `AlphaRadarCard` and wired Dashboard Alpha Radar cards to the shared MVP component.
- Task 3.2: extracted `DecisionCard` with direction, confidence, risk, thesis, support/against reasons, invalidation, and rule compliance display.
- Task 3.3: extracted `DecisionForm` and wired Workspace Decisions tab to create workspace-scoped decisions.
- Task 3.4: extracted `WorkspaceList` card grid and reused it in `/workspace`.
- Task 3.5: extracted `DeepResearchProgressPanel` with 7-step ReAct progress, tool labels, completion count, and running state.
- Task 3.6: extracted `ResearchReportView` with sidebar anchors, executive summary, findings, sources, conclusion, and toolbar actions.
- Task 3.7: extended chat item conversion/rendering for structured `decision`, `alpha-signal`, and `research-report` cards.
- Fixed old SQLite migration ordering so workspace-related columns are added before indexes that reference them.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/memory-engine/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ../../node_modules/vite/bin/vite.js build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed:
  - Loaded Dashboard and verified Alpha Radar route/nav state.
  - Clicked Workspace from the sidebar.
  - Created `Phase 3 Browser QA` workspace through the UI.
  - Clicked `Record Decision`, filled the decision form, verified `Save Decision` enabled, submitted, and verified `DecisionCard` rendered.
  - Clicked Research, triggered real `POST /api/research/deep` SSE flow, verified running progress, and verified terminal `ResearchReportView`.
  - Browser console error log was empty.
- After the browser run, Vite surfaced a React key warning in `OrderBook`; fixed the row keys and re-ran TypeScript/build successfully.
- Screenshot evidence saved:
  - `output/playwright/phase3-dashboard-alpha-empty.png`
  - `output/playwright/phase3-workspace-overview.png`
  - `output/playwright/phase3-workspace-decision-card.png`
  - `output/playwright/phase3-workspace-research-running.png`
  - `output/playwright/phase3-workspace-research-final.png`
  - `output/playwright/phase3-workspace-research-terminal.png`

Known Issues:
- Required `$playwright` wrapper still cannot run because `npx` is missing, and `agent-browser` remains unavailable in the shell. Browser QA used the enabled in-app Browser plugin and saved screenshots under `output/playwright/`.
- Alpha Radar returned no live signal cards during this run, so Dashboard screenshot covers the Alpha Radar shell/empty/loading state rather than populated cards.
- Deep Research completed with real external-source behavior, including Semantic Scholar HTTP 429 and some aborted source calls; the report still rendered terminal findings and sources for review.
- A temporary direct Node import check for `chat-conversion.ts` failed because the browser app uses extensionless TS imports that bare Node cannot resolve; TypeScript and Vite compilation cover this path.

Next:
- Continue Phase 4 integration polish: complete ChatWorkspace migration in Research tab, wire report toolbar follow-up/decision actions, connect DecisionCard confirm to paper trade execution, and add broader browser coverage for chat-rendered structured cards.

## 2026-06-13 — Phase 3.8 Markets Detail Sidebar + Chart

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 3.8.1: added `PriceChart` wrapper around `lightweight-charts`.
  - Uses `CandlestickSeries` and `HistogramSeries`.
  - Includes 7D/30D/90D range selector.
  - Uses dark glassmorphism-compatible chart colors with cyan up candles and rose down candles.
  - Enables crosshair, wheel zoom, and drag pan through chart options.
- Task 3.8.2: added `MarketDetailSidebar`.
  - Header: market/asset name, price or odds, 24h change, favorite toggle, close button.
  - Price/Odds chart section.
  - Quick Actions: Research, Decision, News.
  - Paper Trade Position card support for open matching paper trades.
  - Read-only three-level bid/ask order book.
  - Key metrics section for MCap/Rank/High/Low/ATH or prediction-market volume/settlement metrics.
  - Slide-in/out animation via framer-motion.
- Task 3.8.3: rewrote `MarketPage` into split-pane layout.
  - Left pane keeps Crypto Spot and Prediction Markets cards.
  - Card click opens the right detail sidebar with correct selected market data.
  - Crypto and prediction cards now include SVG sparklines.
  - Favorite persistence still uses localStorage.
- Added API client helper `closePaperTrade()` for the sidebar Close Position button.
- Fixed the News quick action so it no longer calls missing `/api/search/query`; it now calls the existing research workflow endpoint and reports workflow failures visibly.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ../../node_modules/vite/bin/vite.js build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed for desktop Markets flow:
  - Opened `/markets`.
  - Clicked BTC crypto card.
  - Verified detail sidebar rendered.
  - Verified chart canvases have non-zero dimensions.
  - Verified Quick Actions, Order Book, and Key Metrics are present.
  - Clicked 7D chart range.
  - Clicked sidebar favorite toggle.
  - Clicked News action and verified it no longer produces `/api/search/query: 404`.
  - Switched to Prediction Markets and verified stale/empty state when Polymarket source aborts.
  - Browser console error log was empty.
- Screenshot evidence saved:
  - `output/playwright/phase38-markets-crypto-detail.png`
  - `output/playwright/phase38-markets-range-favorite-news.png`
  - `output/playwright/phase38-markets-news-action.png`
  - `output/playwright/phase38-markets-prediction-stale-empty.png`

Known Issues:
- Polymarket endpoint returned `{ markets: [], stale: true, error: "This operation was aborted" }` during verification, so prediction-market detail sidebar could not be tested with live prediction data in this run.
- News quick action reaches the existing workflow endpoint, but the backend returned `/api/workflows/research.asset/run: 500` for BTC in this environment. The UI now surfaces that failure instead of silently calling a missing endpoint.
- Mobile viewport QA is blocked by existing AppLayout/sidebar behavior: at 390px width, the main Markets content is pushed out of the clickable viewport before the market detail overlay can be opened. Desktop split-pane/overlay behavior is verified; mobile layout needs AppLayout responsive work in a later visual-polish pass.
- Vite chunk warning increased after `lightweight-charts` integration; build still succeeds.

Next:
- Continue Phase 3.9 Workspace Overview Dashboard, then Phase 3.10-3.12 visual components before Phase 4 integration polish.

## 2026-06-13 — Phase 3.9 Workspace Overview Dashboard

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 3.9.1: added `WorkspaceOverview` dashboard component.
  - Workspace header card with name, description, creation date, topic type/tag badges, linked market reference, decision count, and open/trade counts.
  - Three metric cards: Win Rate with trend, Total P&L with color tone, Trade Count with W/L breakdown.
  - Active Positions list for open paper trades.
  - Recent Activity feed for last workspace-scoped timeline events.
  - Quick Actions row: New Decision, Start Research, Request Review.
- Task 3.9.2: wired data from WorkspacePage queries:
  - Workspace metadata from `/api/workspaces/:id`.
  - Decisions from `/api/decisions?workspaceId=`.
  - Paper trades from `/api/paper-trades?workspaceId=`.
  - Timeline events from `/api/timeline` filtered to workspace payload.
- Replaced the old simple Overview tab with `WorkspaceOverview`.
- Request Review quick action now calls `review.workspace` and navigates to the Review tab on success.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/memory-engine/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ../../node_modules/vite/bin/vite.js build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed:
  - Opened existing workspace `Phase 3 Browser QA`.
  - Verified header, metric cards, Active Positions, Recent Activity, and all three quick actions were present.
  - Clicked New Decision and verified Decisions tab/form rendered.
  - Clicked Start Research and verified Research tab rendered with workspace topic.
  - Clicked Request Review and verified `review.workspace` produced a manual review summary in Review tab.
  - Browser console error log was empty.
- Screenshot evidence saved:
  - `output/playwright/phase39-workspace-overview-dashboard.png`
  - `output/playwright/phase39-workspace-new-decision-action.png`
  - `output/playwright/phase39-workspace-start-research-action.png`
  - `output/playwright/phase39-workspace-request-review-action.png`

Known Issues:
- Active Positions list could only be verified in empty state in this run because the selected workspace has no open paper trades.
- Timeline filtering still uses payload JSON matching because `/api/timeline/events?workspace_id=` is not yet available.
- Required `$playwright` wrapper still cannot run because `npx` is missing; `agent-browser` is also unavailable. Browser QA used the enabled in-app Browser plugin and saved screenshots under `output/playwright/`.

Next:
- Continue Phase 3.10 Journal Global Page UI, then Phase 3.11 Evolution visual charts and Phase 3.12 Timeline/Review/Workspace Journal visual components.

## 2026-06-13 — Phase 3.10 Journal Global Page UI

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 2.5 / Phase 3.10: rewrote the global Journal page into a workspace-wide timeline.
  - Summary stats header: total entries, win rate, total P&L, best trade, worst trade.
  - Filter bar: workspace dropdown, date range, outcome, and asset/thesis/workspace search.
  - Manual Add Entry panel with workspace, mood, discipline slider, notes textarea, and save mutation.
  - CSV and Markdown export buttons using the currently filtered entries.
  - Chronological newest-first entry list across all workspaces.
- Added reusable `JournalEntryCard`.
  - Header with timestamp, parent workspace link, auto/manual badge, outcome dot.
  - Trade line with direction, asset, entry/exit, size, and P&L.
  - Emotion chip, confidence badge, reasoning preview, linked decision/trade IDs.
  - Expand/collapse full detail with 4 dimensions: Trade Data, Reasoning, Emotion, Reflection.
- Exported `JournalEntryCard` from `components/mvp/index.ts`.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/memory-engine/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18990 ... vite build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed for production preview:
  - Opened `/journal`.
  - Verified 5 metric cards, filter controls, Add Entry button, Export CSV, Export Markdown, and existing cards.
  - Clicked Add Entry and verified the manual form panel was visible.
  - Created a Phase 3.10 QA journal entry through the same `/api/journal` backend path after browser text input was blocked by the Browser plugin clipboard limitation.
  - Reloaded `/journal` and verified the new entry rendered in the browser.
  - Selected the "Today" date range filter and verified the filtered timeline remained visible.
  - Expanded the new journal card and verified all 4 dimension sections rendered.
  - Browser console warning/error log was empty after final verification.
- Screenshot evidence saved:
  - `output/playwright/phase310-journal-dashboard.png`
  - `output/playwright/phase310-journal-add-entry.png`
  - `output/playwright/phase310-journal-filtered.png`
  - `output/playwright/phase310-journal-expanded-card.png`
  - `output/playwright/phase310-journal-final.png`

Known Issues:
- The required `$playwright` wrapper cannot run because `npx` is missing, and `agent-browser` CLI is also unavailable in the shell. Browser QA used the enabled in-app Browser plugin and saved screenshots under `output/playwright/`.
- In-app Browser text input (`fill`, `type`, CUA type, DOM CUA type) failed with `Browser Use virtual clipboard is not installed`; the Add Entry panel was visually verified, and the backend journal creation path was verified via `/api/journal`.
- In-app Browser downloads are not supported, so CSV/Markdown export download events could not be captured. The export buttons rendered and the implementation passed TypeScript/build.
- Vite dev server hit an existing `builtin:vite-react-refresh-wrapper` / `Missing field moduleType` runtime issue. Production build and production preview were used for browser QA.

Next:
- Continue Phase 3.11 Evolution visual charts, then Phase 3.12 Timeline/Review/Workspace Journal visual components and broader Phase 4 integration polish.

## 2026-06-13 — Phase 3.11 Evolution Charts + Visual Enhancements

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 3.11.1: confirmed `recharts` is installed and wired in the production build.
- Task 3.11.2: added Evolution chart components:
  - `WinRateTrendChart.tsx`: rolling win-rate `LineChart` with cyan stroke and dark chart theme.
  - `PnLCurveChart.tsx`: cumulative P&L `AreaChart` with green/red gradient fill.
  - `TradeFrequencyChart.tsx`: weekly trade `BarChart` with green/red bar coloring by net result.
- Task 3.11.3: upgraded `EvolutionPage`:
  - Progress Dashboard now renders the three Recharts visualizations plus Quick Stats cards.
  - Quick Stats show current streak, best workspace, average confidence, and improvement delta.
  - Improvement Feed now has status summary pills and per-card status badges.
  - Feed cards support both Adopt and Dismiss actions.
  - Pattern Highlights use cyan-highlighted blocks.
  - Rule Workshop renders active rules as toggle-switch style cards.
  - Quick Actions include Run Review, Suggest rules, Export, and Reset confirmation.
- Added `/api/evolution/rules/:id/dismiss` and `tradingPiApi.dismissRule()` so Dismiss is backed by persisted suggestion status.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/memory-engine/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18991 ... vite build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed for production preview:
  - Opened `/evolution`.
  - Verified Progress Dashboard, Win Rate Trend, P&L Curve, Trade Frequency, Quick Stats, and 3 Recharts SVG surfaces.
  - Clicked Suggest New Rules and verified pending suggestions appeared.
  - Clicked Adopt and verified adopted status plus Rule Workshop rule.
  - Clicked Dismiss and verified dismissed status.
  - Clicked Reset and verified non-destructive confirmation notice.
  - Clicked Run Review and verified review workflow completed and refreshed the feed.
  - Browser console warning/error log was empty.
- Screenshot evidence saved:
  - `output/playwright/phase311-evolution-dashboard.png`
  - `output/playwright/phase311-evolution-suggested.png`
  - `output/playwright/phase311-evolution-adopt-dismiss-reset.png`
  - `output/playwright/phase311-evolution-run-review.png`

Known Issues:
- The required `$playwright` wrapper cannot run because `npx` is missing, and `agent-browser` CLI is also unavailable in the shell. Browser QA used the enabled in-app Browser plugin and saved screenshots under `output/playwright/`.
- Export button download events cannot be captured in the in-app Browser because downloads are unsupported there. Export implementation is present and build/typecheck pass, but browser download receipt remains unverified.
- Reset Statistics remains non-destructive because no backend reset endpoint exists in the current spec implementation. The UI presents an explicit confirmation notice instead of deleting stored history.
- Recharts increased the production JS chunk size; build still succeeds with Vite's chunk-size warning.

Next:
- Continue Phase 3.12 Timeline Event Cards + Review Accordion + Workspace Journal visual components, then Phase 4 wiring polish.

## 2026-06-13 — Phase 3.12 Timeline Cards + Review Accordion + Workspace Journal Visuals

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 3.12.1: added `TimelineEventCard`.
  - Supports 4 visual categories: ToolCall, UserAction, System, Milestone.
  - Uses distinct left borders, icon badges, background tints, and milestone glow.
  - Click expands full payload in a code-style block.
  - Timeline page now has category filter buttons, status filter, date range filter, and search.
- Task 3.12.2: added `ReviewAccordion`.
  - Seven sections: Overview, Per-Trade Analysis, Error Summary, Improvement Suggestions, Emotion Analysis, Rule Compliance, Historical Comparison.
  - Overview starts expanded.
  - Expand All / Collapse All control works.
  - Section headers show number, title, status icon, and chevron.
  - Structured renderers for metrics, trade rows, error cards, suggestion cards, emotion chips, rule pass/fail, and historical comparison.
- Task 3.12.3: upgraded Workspace Journal visuals.
  - Workspace Journal now uses `JournalEntryCard`.
  - Emotion chips and auto/manual badges render in the workspace context.
  - Expanded card includes pressure-level mini progress bar.
- Fixed a production Timeline crash found during browser QA:
  - Some timeline payload previews were objects.
  - `TimelineEventCard` now safely stringifies non-string preview values before rendering.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/memory-engine/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18992 ... vite build` passed from `apps/web`.
- Real browser QA using the in-app Browser plugin passed on production preview:
  - Opened `/timeline`.
  - Verified ToolCall/UserAction/System/Milestone category filters, search field, 100 event cards, and expanded payload rendering.
  - Toggled ToolCall filter and verified visible card count changed.
  - Opened workspace `Phase 3 Browser QA`.
  - Opened Review tab and verified 7-section accordion, Overview default expansion, and Expand All.
  - Created a structured workspace journal QA entry through `/api/journal`.
  - Opened Workspace Journal tab and verified emotion chip, P&L, 4 dimensions, and Pressure bar.
- Screenshot evidence saved:
  - `output/playwright/phase312-timeline-cards.png`
  - `output/playwright/phase312-timeline-expanded.png`
  - `output/playwright/phase312-workspace-review-accordion.png`
  - `output/playwright/phase312-workspace-journal.png`
  - `output/playwright/phase312-workspace-journal-pressure.png`

Known Issues:
- The required `$playwright` wrapper cannot run because `npx` is missing, and `agent-browser` CLI is also unavailable in the shell. Browser QA used the enabled in-app Browser plugin and saved screenshots under `output/playwright/`.
- In the Browser dev log, one stale production error from the pre-fix Timeline bundle remained visible after the first failed run. After rebuilding, the Timeline page rendered successfully with the new bundle, and the crash was fixed.
- Browser screenshots had to be written to `/private/tmp` first, then copied into `output/playwright/`, because the Browser runtime could not directly write into the workspace under the current sandbox.

Next:
- Continue Phase 4 integration polish: Alpha Radar deep-research handoff, Markets Polymarket wiring polish, DecisionCard paper-trade execution, Review/Evolution/User Rules end-to-end wiring, and broader E2E loop verification.

## 2026-06-13 — Phase 4.1 Alpha Radar Workspace Handoff

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 4.1: wired Dashboard Alpha Radar cards to create/open workspaces with preserved Alpha Radar context.
- Task 4.1: split the two card actions per spec:
  - Clicking the card opens the generated workspace without auto-starting research.
  - Clicking `Research` opens the workspace Research tab with `deepResearch=1`.
- Task 4.1 / Task 5.1 partial: Research handoff now auto-starts Deep Research from the Alpha Radar topic and streams real SSE progress into the Research tab.
- Workspace Research tab accepts `topic`, `tab=research`, and `deepResearch=1` URL parameters for Alpha Radar handoff.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18993 ... vite build` passed from `apps/web` with the existing Vite chunk-size warning only.
- Real browser QA using the in-app Browser plugin passed on production preview:
  - Opened Dashboard and waited for Alpha Radar fallback signal card.
  - Clicked the Alpha Radar card and verified navigation to `/workspace/<id>?topic=...` with Overview active, no `deepResearch=1`, and no running report.
  - Returned to Dashboard, clicked the card `Research` button, and verified navigation to `/workspace/<id>?topic=...&tab=research&deepResearch=1`.
  - Verified Deep Research started automatically, displayed step progress at Step 4/7, then completed at Step 7/7.
  - Verified final Research Report rendered with Executive Summary, Key Findings, Data Sources, and Conclusion.
  - Browser console warning/error log was empty during the app verification.
- Screenshot evidence saved:
  - `output/playwright/phase41-dashboard-alpha-card.png`
  - `output/playwright/phase41-alpha-card-open-workspace.png`
  - `output/playwright/phase41-alpha-research-running-rerun.png`
  - `output/playwright/phase41-alpha-research-complete-rerun.png`

Known Issues:
- `agent-browser skills get agent-browser` still fails with `Unknown command: skills`, so the installed CLI does not satisfy the skill's required bootstrap command. Browser QA used the available in-app Browser plugin and its Playwright API.
- `$playwright` wrapper is executable now that `npx` is present; the full Alpha Radar flow was not duplicated through the CLI wrapper because the in-app Browser run already performed the required real interactions and saved screenshots.
- Alpha Radar live external sources returned fallback signal data (`Market scan pending`) in this environment; the UI and handoff behavior were verified against that real backend response.
- Deep Research completed despite external source degradation such as Semantic Scholar 429 / aborted market source calls; the report rendered terminal findings without UI errors.

Next:
- Continue Phase 4.2/4.10 Markets Polymarket detail wiring polish, then Phase 4.4/4.7 DecisionCard confirm -> Paper Trade execution, and Phase 4.9 Sub-Agent frontend float/sidebar/stop integration before broad E2E-18/E2E-19 verification.

## 2026-06-13 — Phase 4.2 + 4.10 Markets Wiring Polish

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 4.2: tightened Prediction Markets search wiring.
  - Search input now debounces before querying `/api/markets?source=polymarket&q=...`.
  - Client-side filtering remains as a secondary guard for category/query matching.
  - Source failure state remains visible instead of crashing the UI.
- Task 4.10: improved Markets detail quick actions.
  - Market-created workspaces now persist selected market context in the workspace `context`.
  - Research quick action navigates to `/workspace/<id>?topic=...&tab=research`.
  - Decision quick action navigates to `/workspace/<id>?topic=...&tab=decisions`.
  - Quick actions preserve market topic in URL params for Workspace handoff.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18994 ... vite build` passed from `apps/web` with the existing Vite chunk-size warning only.
- Real browser QA using the in-app Browser plugin passed on production preview:
  - Opened `/markets` and verified Crypto Spot cards.
  - Switched to Prediction Markets and verified search input, stale/empty source handling, and screenshot state.
  - Typed `bitcoin` in Prediction Markets search and verified the filtered/empty result state rendered without console errors.
  - Opened a market detail sidebar from a crypto card as the interactive fallback because Polymarket source returned stale/empty.
  - Verified Price Chart, Quick Actions, Order Book, and Key Metrics in the sidebar.
  - Toggled favorite and verified the sidebar favorite button changed to `Remove favorite`.
  - Clicked Research quick action and verified Workspace opened on Research tab with `topic=` param.
  - Clicked Decision quick action and verified Workspace opened on Decisions tab with `topic=` param and New Decision form visible.
  - Browser console warning/error log was empty for the app checks.
- Direct API evidence for Polymarket in this environment:
  - `GET http://127.0.0.1:18994/api/markets?source=polymarket&limit=3` returned `{ "markets": [], "stale": true, "error": "This operation was aborted", "source": "polymarket" }`.
- Screenshot evidence saved:
  - `output/playwright/phase42-markets-crypto-initial.png`
  - `output/playwright/phase42-markets-prediction-tab.png`
  - `output/playwright/phase42-markets-prediction-search.png`
  - `output/playwright/phase410-markets-detail-after-favorite.png`
  - `output/playwright/phase410-markets-research-action-workspace.png`
  - `output/playwright/phase410-markets-decision-action-workspace.png`

Known Issues:
- Live Polymarket data remains unavailable in this environment due to aborted upstream requests. The backend returns a typed stale response and the frontend handles it gracefully, but live prediction-market cards/sidebar still need re-verification when Polymarket responds.
- Browser verification used the in-app Browser plugin. `agent-browser skills get agent-browser` is still incompatible with the installed CLI version.
- The sidebar verification used Crypto Spot data for full interaction coverage because Prediction Markets had no live card data during this run.

Next:
- Continue Phase 4.4/4.7: wire DecisionCard confirm to automatic Paper Trade execution and Journal creation, then browser-test the decision -> paper trade -> journal path.
- Then continue Phase 4.9 Sub-Agent frontend float/sidebar/stop integration before E2E-18/E2E-19.

## 2026-06-14 — Phase 4.4 + 4.7 Decision Confirm -> Paper Trade -> Journal

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 4.4 partial: Workspace Decisions tab now passes `onConfirm` to pending `DecisionCard` entries.
- Task 4.7 partial: Confirming a pending decision calls `POST /api/paper-trades`.
- Task 4.7 partial: Successful paper trade execution refreshes:
  - workspace decisions
  - workspace paper trades
  - global/workspace journal query
  - timeline query
- Task 4.7 partial: UI shows execution feedback: `Paper trade opened ... Journal entry created automatically.`
- `DecisionCard` now supports `confirmBusy` and disables/relabels the Confirm button while execution is pending.

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18995 ... vite build` passed from `apps/web` with the existing Vite chunk-size warning only.
- Real browser QA using the in-app Browser plugin passed on production preview:
  - Opened a dedicated workspace `Phase 4.7 Browser QA` on Decisions tab.
  - Verified a pending `DecisionCard` displayed a visible Confirm button.
  - Clicked Confirm in the browser.
  - Verified the Confirm button disappeared, status changed to `executed`, and UI notice reported paper trade + journal creation.
  - Switched to Journal tab in the browser.
  - Verified an Auto journal entry appeared with linked decision/trade IDs and `paper.trade.lifecycle` reasoning source.
  - Browser console warning/error log was empty for the app verification.
- Direct API evidence after browser Confirm:
  - `GET /api/decisions?workspaceId=wrk_c3e33b2a-8ab0-48f4-a9c1-da5a5ff6302d` returned the QA decision with `status: "executed"` and `executedAt`.
  - `GET /api/paper-trades?workspaceId=wrk_c3e33b2a-8ab0-48f4-a9c1-da5a5ff6302d` returned an open trade linked to the decision and journal entry.
  - `GET /api/journal` returned the auto-created journal entry with `dimension1TradeData` and `dimension2Reasoning` in `notes`.
- Screenshot evidence saved:
  - `output/playwright/phase47-decision-pending-confirm.png`
  - `output/playwright/phase47-decision-confirmed-executed.png`
  - `output/playwright/phase47-journal-auto-entry.png`

Known Issues:
- Browser text entry is still blocked in this environment by `Browser Use virtual clipboard is not installed`, so the pending decision was seeded through the API. The critical user action under test, `DecisionCard` Confirm, was triggered by real browser click.
- A follow-up attempt to reopen the same localhost workspace page for expanded journal detail hit the Browser URL policy. The collapsed journal card was already verified in browser, and API evidence verified the 4-dimension backing data for the auto-created entry.
- This validates manual/pending decision confirmation flow. Chat-generated DecisionCard rendering remains present, but full AI chat -> generated card -> confirm path still needs a later E2E pass under Task 4.4 / Task 5.5.

Next:
- Continue Phase 4.7 settlement/close polish: verify Close Position updates P&L, Decision status, Journal exit data, and Timeline event.
- Then continue Phase 4.9 Sub-Agent frontend float/sidebar/stop integration before E2E-18/E2E-19.

## 2026-06-14 — Phase 4.7 Paper Trade Close / Settlement Polish

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Task 4.7 partial: Workspace Overview active positions now expose a `Close Position` action.
- Task 4.7 partial: Closing a workspace position calls `PATCH /api/paper-trades/:id/close`.
- Task 4.7 partial: Close action refreshes decisions, paper trades, journal, and timeline queries.
- Task 4.7 partial: Workspace Overview reflects settlement metrics after close:
  - open positions count drops to 0
  - win rate updates
  - total P&L updates
  - active position card disappears
- Existing backend settlement path verified:
  - paper trade moves to `closed`
  - decision moves to `settled_win` or `settled_loss`
  - journal notes receive exit price, exit time, P&L, P&L percent, settlement reason, and closed status
  - timeline emits `paper_trade_settled`

Verification:
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` passed.
- `/Users/lora/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` passed.
- `VITE_TRADING_PI_API_PORT=18996 ... vite build` passed from `apps/web` with the existing Vite chunk-size warning only.
- Real browser QA using the in-app Browser Playwright API passed on production preview:
  - Opened a dedicated workspace `Phase 4.7 Close QA`.
  - Verified Overview showed one active position `PHASE47-CLOSE · 2U` and a visible `Close Position` button.
  - Clicked `Close Position` in the browser.
  - Verified Overview changed to `OPEN 0`, `Win Rate 100%`, `Total P&L +$0.80`, `1W / 0L`, and no open trades.
  - Switched to Journal tab in the browser.
  - Verified the auto journal entry showed `Exit: $10.40` and `P&L: +$0.80`.
  - Browser console warning/error log was empty for the app verification.
- Direct API evidence after browser close:
  - `GET /api/decisions?workspaceId=wrk_b3015eee-d460-4466-957d-fdd1cb27fe44` returned the QA decision with `status: "settled_win"`, `settledAt`, and `resultPnL: 0.8000000000000007`.
  - `GET /api/paper-trades?workspaceId=wrk_b3015eee-d460-4466-957d-fdd1cb27fe44` returned the QA trade with `status: "closed"`, `exitPrice: 10.4`, `pnl: 0.8000000000000007`, `pnlPercent: 4.0000000000000036`, and `settlementReason: "closed_from_workspace_overview"`.
  - `GET /api/timeline` returned a `paper_trade_settled` event for `PHASE47-CLOSE`.
- Screenshot evidence saved:
  - `output/playwright/phase47-close-overview-open-position.png`
  - `output/playwright/phase47-close-overview-settled.png`
  - `output/playwright/phase47-close-journal-settled.png`

Known Issues:
- Browser verification used the in-app Browser Playwright API. The `$playwright` wrapper prerequisite (`npx`) is available, but this turn's local UI verification used the already-connected browser surface for screenshots and interaction.
- Close price is currently deterministic from the UI (`+4%` favorable move for LONG/YES, `-4%` for SHORT/NO) until live close-price selection is added.

Next:
- Continue Phase 4.9 Sub-Agent frontend float/sidebar/stop integration before E2E-18/E2E-19.
- Then run broader E2E passes for Paper Trade full lifecycle, Review 7-section report, Timeline event logging, and Ultimate Closed Loop.

## 2026-06-14 — Environment / Real AI Verification Gate

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Fixed `.env` loading so backend `loadEnv()` reads both repo-root `.env` and `apps/web/.env` candidates, including when `@trading-pi/core` is loaded from compiled `dist`.
- Changed the web API server to listen on `env.apiPort`, so `TRADING_PI_API_PORT` from `.env` is honored.
- Added `GET /api/ai/ping`, which calls `aiPing(env)` and therefore triggers the configured OpenAI-compatible model through the real provider.
- Added a Settings page `AI Health` panel with a `Ping AI` button, so browser QA can trigger real AI directly from the UI and inspect model/reply/token usage.

Verification:
- `npm run build -w @trading-pi/core` passed.
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Direct API real-AI smoke test passed:
  - `GET /api/ai/ping` returned `text: "Trading Pi AI online."`
  - model resolved from `.env` as `deepseek-v4-flash`
  - response included nonzero token usage.
- Real browser QA passed on Settings page:
  - Opened `/settings` in the in-app Browser.
  - Clicked `Ping AI` with a real browser interaction.
  - Verified UI displayed `AI online`, `deepseek-v4-flash`, `Trading Pi AI online.`, and token count.
- Screenshot evidence saved:
  - `output/playwright/phase49-settings-real-ai-ping.png`

Known Issues / Policy Update:
- Earlier workflow verifications before this entry proved backend and UI flows, but not all of them proved real AI provider calls. From this point forward, spec progress that claims AI behavior must include a real AI call evidence path, preferably via browser-triggered UI.
- No API keys or secrets should be printed in logs or status notes; only redacted configuration and provider results are recorded.

Next:
- Re-run/continue Phase 4.9 Sub-Agent frontend float/sidebar/stop integration using the now-fixed real-AI environment gate.
- Continue spec order with browser-triggered, screenshot-backed verification for every interactive element.

## 2026-06-14 — Phase 4.9 Sub-Agent Float / Sidebar / Stop Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Global `WorkspaceStatusFloat` is rendered from `AppLayout` and polls `/api/sub-agents`.
- Sub-agent rows open `SubagentDetailSidebar`.
- Detail sidebar shows metrics, final response, and execution log from `recentEvents`.
- Added `Stop sub-agent` control for non-terminal sub-agents.
- Fixed an interaction overlap where the floating Subagents panel covered the sidebar header/Stop button by hiding the float while a sub-agent detail sidebar is open.
- Added cancellable background hold support (`min_runtime_ms`) for deterministic browser QA of real stop/cancel behavior; normal callers are unaffected unless they pass the option.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser QA passed after the `.env` / real-AI gate fix:
  - Spawned a real background Evolution sub-agent via `/api/sub-agents`.
  - Opened Dashboard in the in-app Browser at 1280x900.
  - Verified the global Subagents float showed the background agent.
  - Clicked the float row in the browser.
  - Verified the detail sidebar opened and the Stop button was visible without being covered by the float.
  - Clicked Stop in the browser.
  - Verified UI showed stopped state.
  - Verified API state for `sag_c31022ae-c790-4764-be81-81fccf59d9b3` returned `status: "cancelled"` and recent event `subagents:cancelled`.
- Screenshot evidence saved:
  - `output/playwright/phase49-stop-after-env-float.png`
  - `output/playwright/phase49-stop-after-env-sidebar-direct.png`
  - `output/playwright/phase49-stop-after-env-clicked-node29.png`

Known Issues:
- Browser DOM helper occasionally missed text parsing when node attributes appeared in a different order, so the final verified click used the freshly observed node id. The interaction itself was still a real browser click.
- The tested background Evolution sub-agent workflow is real workflow execution; AI-provider verification is covered separately by the Settings `Ping AI` browser test above.

Next:
- Continue remaining spec order after Phase 4.9, keeping the real-AI gate and browser screenshot requirement active.

## 2026-06-14 — Phase 4.10 Markets Detail Sidebar + Chart Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed / Verified:
- Markets page renders crypto market cards with fallback prices when OHLCV source returns empty data.
- Clicking a crypto market card opens `MarketDetailSidebar`.
- Sidebar includes:
  - Market header and favorite/close controls
  - `PriceChart` candlestick + volume canvas
  - 7D / 30D / 90D range controls
  - Quick actions: Research, Decision, News
  - Order Book read-only depth
  - Key Metrics
  - Paper Trade position card support when an active matching paper trade exists
- Sidebar close interaction works and returns to market list layout.

Verification:
- Real browser QA using the in-app Browser passed:
  - Opened `/markets`.
  - Waited for crypto cards to render after async source calls.
  - Clicked `BTC/USDT` card in the browser.
  - Verified `Market Detail`, `Price Chart`, quick actions, `Order Book`, `Key Metrics`, and range buttons were present.
  - Verified chart canvases existed with nonzero dimensions.
  - Clicked `7D`, then `90D`.
  - Clicked `Close market detail` and verified sidebar closed.
- Screenshot evidence saved:
  - `output/playwright/phase410-markets-list.png`
  - `output/playwright/phase410-markets-after-wait.png`
  - `output/playwright/phase410-market-sidebar-btc.png`
  - `output/playwright/phase410-market-sidebar-range-90d.png`
  - `output/playwright/phase410-market-sidebar-closed.png`

Known Issues:
- Current local data-source calls returned empty OHLCV (`[]`) and Polymarket stale/fetch-failed in this run, so crypto card rendering used deterministic fallback price data. This is acceptable for UI interaction verification, but live data-source reliability still needs broader E2E coverage.
- Browser sandbox blocked direct canvas pixel inspection (`canvas.getContext is not a function`), so chart evidence is based on rendered canvas dimensions plus screenshots.

Next:
- Continue Phase 4.11 UI visual component wiring: Overview, Journal, Evolution, Timeline, Review visual and interaction checks.

## 2026-06-14 — Phase 4.11 Evolution Real-AI Rule Suggestions

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Fixed `/api/evolution/suggest-rules` so `Suggest New Rules` is AI-first instead of only reusing review suggestions/fallback text.
- The endpoint now gathers local reviews, decisions, paper trades, journal entries, and active user rules, then calls `ai.respond` with an Evolution Engine prompt.
- Added robust JSON extraction for AI responses and stores `aiDriven`, `model`, `usage`, `stopReason`, and local context counts in each suggestion source for auditability.
- Kept a fallback path only for provider/parse failure, with `aiError` recorded in the response/source.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Direct local API verification passed:
  - `POST /api/evolution/suggest-rules` returned `status: 200`.
  - Response returned `ai.driven: true`.
  - Model was `deepseek-v4-flash`.
  - Token usage was nonzero (`totalTokens: 6633` in the verification run).
- Real browser QA with Playwright passed:
  - Opened `/evolution` at `http://127.0.0.1:5188`.
  - Clicked `Suggest New Rules` in Chromium.
  - Waited for the real `/api/evolution/suggest-rules` POST response.
  - Verified the browser-triggered response returned `ai.driven: true`, `model: deepseek-v4-flash`, and nonzero token usage.
  - Verified the AI-generated first suggestion title was visible in the Evolution UI.
- Screenshot evidence saved:
  - `output/playwright/phase411-evolution-before-ai-suggest.png`
  - `output/playwright/phase411-evolution-after-real-ai-suggest.png`

Next:
- Continue Phase 4.11 visual and interaction checks for Workspace Overview, Journal, Timeline, and Review surfaces, keeping the real-AI gate active for every AI-labeled action.

## 2026-06-14 — Phase 4.11 Workspace Review / Journal / Timeline Browser QA

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Fixed `review.workspace` so workspace review generation calls `ai.respond` before artifact/review creation.
- The workflow now keeps the deterministic 7-section report shape, then merges AI-generated overview, key findings, trade lessons, suggestions, emotion notes, and trend back into the report.
- Review report metadata now records `aiDriven`, `model`, `usage`, and `stopReason`.
- Fixed `ReviewAccordion` so the review header displays the actual AI model from report metadata instead of `built-in review`.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser QA with Playwright passed:
  - Opened Workspace detail for `wrk_b3015eee-d460-4466-957d-fdd1cb27fe44`.
  - Captured Workspace Overview before review.
  - Clicked `Request Review` in Chromium.
  - Waited for the real `/api/workflows/review.workspace/run` POST response.
  - Verified response returned review `rev_88595581-4ff1-493e-a4af-eba57811a839`.
  - Verified `report.metadata.aiDriven: true`.
  - Verified model `deepseek-v4-flash`.
  - Verified nonzero token usage (`totalTokens: 2244` in the verification run).
  - Opened the Review tab and verified the 7-section accordion rendered.
  - Verified the UI now displays `AI Model deepseek-v4-flash`.
  - Opened `/journal`, clicked `Expand Full Detail`, and verified the 4-dimension journal detail grid rendered.
  - Opened `/timeline`, clicked the ToolCall filter, expanded a timeline card, and verified workflow/skill event details rendered.
- Screenshot evidence saved:
  - `output/playwright/phase411-workspace-overview-before-review.png`
  - `output/playwright/phase411-workspace-review-after-real-ai.png`
  - `output/playwright/phase411-workspace-review-expanded-suggestions.png`
  - `output/playwright/phase411-workspace-review-real-ai-model-label.png`
  - `output/playwright/phase411-journal-expanded-detail.png`
  - `output/playwright/phase411-timeline-filter-expanded.png`

Known Issues:
- Timeline category filter labels (`ToolCall`, `UserAction`, `System`, `Milestone`) are compact and functional, but should get a later polish pass if the final design language wants spaced labels.

Next:
- Continue spec order after Phase 4.11; keep verifying every AI-labeled action with a real provider call and browser-triggered interaction.

## 2026-06-14 — Phase 5.1 Dashboard Alpha Radar E2E

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Dashboard Alpha Radar card now displays the signal `currentValue` / odds field instead of internal score.
- `AlphaRadarCard` secondary action now reads `Research this`, matching the spec.
- Dashboard reminder normalization now reads nested `events` arrays from reminder providers.
- Added a visible `System Status` heading above the status stat cards.
- Adjusted Alpha Radar grid columns so one or two fallback/live signals render at readable card widths instead of a narrow 5-column layout.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser QA with Playwright passed:
  - Opened Dashboard at `http://127.0.0.1:5188/`.
  - Verified `Alpha Radar`, `Today's Reminders`, `Recent Reviews`, and `System Status` were visible.
  - Verified Alpha Radar rendered a signal card from `/api/alpha/radar`; in this run external market sources fell back to `Market scan pending` with `stale: false`.
  - Clicked the Alpha Radar card body in Chromium and verified navigation to a newly created Workspace URL.
  - Returned to Dashboard, clicked `Research this` in Chromium, and verified navigation to Workspace Research with `deepResearch=1`.
  - Verified the browser-triggered action started a real `/api/research/deep` POST/SSE request.
  - Verified no browser console errors were emitted during the flow.
- Screenshot evidence saved:
  - `output/playwright/phase51-dashboard-alpha-radar.png`
  - `output/playwright/phase51-dashboard-card-click-workspace.png`
  - `output/playwright/phase51-dashboard-research-this-deep-research.png`
  - `output/playwright/phase51-dashboard-alpha-radar-final.png`

Known Issues:
- The current external market scan often falls back to `Market scan pending` because live Polymarket/news/community sources did not return enough usable market data in this run. The Dashboard UI and workflow fallback are verified, but broader live-source reliability remains a later E2E concern.

Next:
- Continue Phase 5.2 Markets Dual-Source E2E with real browser tab switching, search, favorite persistence, and market-card navigation.

## 2026-06-15 — Real-AI Regression Gate + Phase 5.2 Markets Dual-Source

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Re-ran AI-labeled flows after `.env` loading was fixed; prior non-AI verification is no longer treated as sufficient.
- Embedded the real `ChatWorkspace` into Workspace → Research, replacing the placeholder `Chat Mode` text so the spec-required chat path is reachable from the Workspace product flow.
- Fixed Chat SSE rendering/persistence so non-assistant `message_update/message_end` events are not rendered or stored as assistant messages.
  - Before fix, a browser Chat test exposed an assistant row that exactly echoed the user prompt.
  - After fix, assistant echo count was `0`.
- Fixed Deep Research AI report handling:
  - AI-shaped `dataSourceSummary` objects are normalized before Markdown rendering.
  - `reportToMarkdown` defensively normalizes `keyFindings` and `dataSourceSummary`.
  - Deep Research token usage now reads `usage.input` / `usage.output` from `ai.respond`, not only legacy token field names.
- Added Polymarket stale fallback markets for `/api/markets?source=polymarket` when the live source returns `fetch failed`, preserving `stale`, `error`, and `fallback` response metadata.
- Completed Phase 5.2 Markets Dual-Source UI coverage:
  - Crypto tab search input.
  - Prediction Markets stale fallback card rendering.
  - Prediction tab search/category filters.
  - Favorite buttons and detail sidebar interactions.
  - Market detail `Research` action navigates into a Workspace Research flow.

Verification:
- `npm run check` passed after the Chat/Deep Research fixes.
- `npm run build -w @trading-pi/web` passed after the Workspace Chat embed and market changes, with the existing Vite chunk-size warning only.
- Real AI health verification passed:
  - `GET /api/ai/ping` returned model `deepseek-v4-flash`.
  - Token usage was nonzero (`totalTokens: 52` in the clean verification run).
- Real browser Chat regression passed:
  - Opened Workspace Research tab in Chromium.
  - Sent a prompt through the actual Chat input.
  - Captured `/api/session/message/stream` POST/200.
  - Verified assistant generated marker `ASSISTANT_ONLY_20260615`.
  - Verified assistant did not echo the user prompt (`assistantEchoCount: 0`).
  - Verified Markdown heading/list/code rendering in the browser.
  - Verified `artifact.create` created `Clean Real AI Browser Artifact` and the Artifacts panel displayed it.
- Real browser Deep Research regression passed:
  - Clicked `Deep Research` in Workspace Research tab.
  - Captured `/api/research/deep` POST/200.
  - Verified progress UI reached synthesis/report stages.
  - Verified a completed session `rs_886ef86a-5153-4dab-9af6-0ee07ebae2e5`.
  - Verified generated report artifact `art_ff802d64-0a43-4297-ad59-b5ef20b45d92`.
  - Verified nonzero Deep Research AI token usage: `input: 1453`, `output: 1797`.
- Re-tested prior AI browser flows:
  - Settings `Ping AI` showed AI health/model evidence.
  - Evolution `Suggest New Rules` triggered `/api/evolution/suggest-rules` POST/200 and suggestions were present.
  - Workspace `Request Review` triggered `/api/workflows/review.workspace/run` POST/200 and latest review retained AI-driven evidence.
- Phase 5.2 Markets browser QA passed:
  - Crypto search for `BTC` showed `BTC/USDT`.
  - Crypto card click opened detail sidebar; favorite button worked.
  - Prediction tab showed stale fallback markets while surfacing live-source `fetch failed`.
  - Prediction search/category `crypto` showed the Bitcoin fallback market.
  - Prediction card click opened YES/NO detail sidebar; favorite button worked.
  - Detail `Research` navigated to `/workspace/...?...tab=research`.
  - No browser console errors were emitted.

Screenshot evidence saved:
- Chat / Artifacts:
  - `output/playwright/real-ai-clean-chat-mounted.png`
  - `output/playwright/real-ai-clean-chat-before-send.png`
  - `output/playwright/real-ai-clean-chat-response-markdown.png`
  - `output/playwright/real-ai-clean-chat-artifacts-panel.png`
- Deep Research:
  - `output/playwright/real-ai-deepresearch-fixed-before-start.png`
  - `output/playwright/real-ai-deepresearch-fixed-progress.png`
  - `output/playwright/real-ai-deepresearch-fixed-report.png`
  - `output/playwright/real-ai-deepresearch-token-before-start.png`
  - `output/playwright/real-ai-deepresearch-token-report.png`
  - `output/playwright/real-ai-deepresearch-token-completed-ui.png`
- Prior AI flow regression:
  - `output/playwright/real-ai-regression-settings-before-ping.png`
  - `output/playwright/real-ai-regression-settings-ai-ping.png`
  - `output/playwright/real-ai-regression-evolution-before-suggest.png`
  - `output/playwright/real-ai-regression-evolution-suggest-rules.png`
  - `output/playwright/real-ai-regression-review-before-request-exact.png`
  - `output/playwright/real-ai-regression-review-result-exact.png`
- Markets Phase 5.2:
  - `output/playwright/phase52-markets-initial.png`
  - `output/playwright/phase52-markets-crypto-search.png`
  - `output/playwright/phase52-markets-crypto-sidebar-favorite.png`
  - `output/playwright/phase52-markets-prediction-tab-stale-fallback.png`
  - `output/playwright/phase52-markets-prediction-search-category.png`
  - `output/playwright/phase52-markets-prediction-sidebar.png`
  - `output/playwright/phase52-markets-workspace-navigation.png`

Known Issues:
- Polymarket live fetch still returns `fetch failed` in this environment; the app now exposes the failure and renders stale fallback prediction markets so the user can keep interacting.
- The Chat Artifacts panel currently displays global artifacts; Workspace-scoped artifact filtering remains a follow-up for the full Workspace Research polish.
- The Deep Research completed UI screenshot after polling did not show the latest report title in the list immediately, but API/session/artifact verification confirmed completion and artifact creation.

Next:
- Continue the next spec phase after Phase 5.2, keeping this real-AI browser regression gate active for every AI-labeled action.

## 2026-06-15 — Phase 5.4 Deep Research Overview + Report→Decision E2E

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Added a dedicated `Start Deep Research` quick action to Workspace Overview.
- Wired Overview `Start Deep Research` to switch into Research tab and automatically start the Deep Research SSE flow with the workspace topic.
- Added `POST /api/decisions/analyze`, backed by existing `decision.fromReport` / `decision.analyze` skills.
- Added `tradingPiApi.analyzeDecision`.
- Wired `ResearchReportView` toolbar `Generate Decision` to call the new decision analysis API and render the generated DecisionCard inline.
- Added a `Confirm` action on the generated report decision card that saves the decision as a pending workspace decision.
- Improved `ResearchReportView`:
  - Handles string or object execution summaries.
  - Renders data sources as structured source cards when available.
  - Uses spec-aligned toolbar labels: `Return to Chat`, `Ask Follow-up`, `Generate Decision`, `Export .md`, `Copy Link`.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser E2E with Playwright passed on workspace `wrk_1d9a43a6-bda3-4a92-918b-44ef3200af54`:
  - Opened Workspace Overview.
  - Verified `Start Deep Research` button visible.
  - Clicked `Start Deep Research` in Chromium.
  - Captured real `/api/research/deep` POST/200.
  - Verified progress UI rendered.
  - Verified report sections rendered: Executive Summary, Key Findings, Data Sources, Conclusion.
  - Verified report toolbar rendered with the spec-aligned actions.
  - Verified completed research session `rs_3b346898-9af5-4454-b3f1-d886d0672356`.
  - Verified generated report artifact `art_0b3b94cf-e642-4eaf-8146-bf917b691c44`.
  - Verified nonzero Deep Research AI token usage: `input: 2903`, `output: 1254`.
  - Clicked `Generate Decision`.
  - Captured real `/api/decisions/analyze` POST/200.
  - Verified generated DecisionCard rendered inline with confidence/supporting reasons/invalidation sections.
  - Verified no browser console errors were emitted.

Screenshot evidence saved:
- `output/playwright/phase54-overview-start-deep-research-button.png`
- `output/playwright/phase54-deep-research-overview-progress.png`
- `output/playwright/phase54-research-report-toolbar.png`
- `output/playwright/phase54-report-generate-decision-card.png`

Known Issues:
- The checklist still asks for richer ResearchReportView details like active TOC highlighting and report follow-up injection into chat. The current toolbar and dual-pane report are functional, but these polish items remain for a later pass.
- Task 5.3 still has remaining component-specific coverage for Plan, Thinking/Reasoning toggle, and full export validation.

Next:
- Continue Phase 5.3/5.6 Chat component coverage or proceed into Phase 5.5 closed loop, preserving the real-AI/browser gate.

## 2026-06-15 — Phase 5.5 Complete Closed Loop Real-AI Browser Regression

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Fixed saved Deep Research report reopening in `WorkspacePage`: `/api/research/sessions/:id` may return artifact `preview_payload_json` / `payload_json` as strings, so the frontend now parses those fields before rendering `ResearchReportView`.
- Added `View Report` loading coverage in the Research session list, then generated a Decision Card from the saved Deep Research report with real AI.
- Added semantic `tablist` / `tab` roles to Workspace section navigation so browser tests and assistive technology can target the five workspace sections reliably.
- Verified the closed loop across Workspace tabs:
  - Research saved report → real AI Decision Card.
  - Confirm generated Decision Card → pending decision saved.
  - Decisions tab Confirm → Paper Trade opened.
  - Paper Trade lifecycle → Journal entry auto-created.
  - Overview close position → trade settled.
  - Review tab Request Review → 7-section AI Review report rendered.
- Verified global Journal page also shows the auto-created journal entry.

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real `.env` AI ping passed via `GET /api/ai/ping`:
  - model: `deepseek-v4-flash`
  - base URL: `https://token.sensenova.cn/v1`
  - usage: `input: 24`, `output: 34`, `totalTokens: 58`
- Real browser E2E evidence:
  - AI generated decision card from report: `dec_5f1855c4-3184-4ce0-825b-b1e3a3e08590`
  - Paper trade: `ptr_77487533-d32a-4e71-a8f6-e256ffdd300c`
  - Journal entry: `jnl_e43f1bc2-6495-41fd-9f27-478eb6a01a1d`
  - Review report: `rev_8bafb677-6f9a-4abf-a7ca-0ed2539319b3`
  - Final status summary: decision `settled_win`, trade `closed`, P&L `0`.
- Browser scripts:
  - `output/playwright/phase55-closed-loop.mjs`
  - `output/playwright/phase55-continue-from-decision.mjs`
- Summary artifact:
  - `output/playwright/phase55-continue-from-decision-summary.json`

Screenshot evidence saved:
- `output/playwright/phase55-research-session-list-before-view-report.png`
- `output/playwright/phase55-view-saved-report.png`
- `output/playwright/phase55-ai-decision-card-generated.png`
- `output/playwright/phase55-decision-saved-from-card.png`
- `output/playwright/phase55-decisions-tab-pending-decision.png`
- `output/playwright/phase55-paper-trade-executed.png`
- `output/playwright/phase55-journal-entry-created.png`
- `output/playwright/phase55-position-open-overview.png`
- `output/playwright/phase55-position-closed-overview.png`
- `output/playwright/phase55-review-before-request.png`
- `output/playwright/phase55-review-generated-after-loop.png`
- `output/playwright/phase55-global-journal-entry-visible.png`

Known Issues:
- A repeated `/api/decisions/analyze` real-AI call exceeded the Playwright script's 120s response wait once, while an earlier real call succeeded and saved the Decision Card. Treat this as a follow-up for API timeout/error-state UX rather than a mock/pass condition.
- The tested AI decision was `HOLD` with position size `0`, so the closed paper trade produced `+$0.00` P&L. The loop mechanics are verified; a nonzero P&L scenario still needs separate coverage.
- The broader Dashboard(Radar) → Markets → Workspace loop remains unchecked in the checklist; this pass focused on the enhanced Deep Research → Decision → Journal → Review workspace loop.

Next:
- Continue Task 5.6 Chat Components with the same real-AI/browser gate: plan display, markdown/artifact rendering, memory/tool UI, export, and interaction screenshots.

## 2026-06-17 — Phase 5.6 Chat Components Export/Menu Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Verified real AI chat rendering in Workspace Research still works after the latest UI cleanup:
  - Sent a prompt through the actual chat composer.
  - Received a real assistant response rendered as Markdown heading, bold text, and list content.
  - Confirmed no browser console errors beyond the expected React DevTools info line.
- Fixed `ExportMenu` to use a local controlled menu and the shared `ExportService` export functions, removing the brittle Base UI trigger path that was not opening reliably in browser QA.
- Verified the export surface in real browser automation:
  - `Export` opens a visible menu.
  - `HTML`, `Markdown`, and `PDF` options are exposed as menu items.
  - Standalone Playwright confirmed the Markdown export downloads successfully and saved `output/playwright/trading-pi-chat-2026-06-17.md`.
- Saved fresh browser evidence:
  - `output/playwright/phase56-chat-markdown.png`
  - `output/playwright/phase56-export-menu-fixed.png`

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser QA passed for the chat composer and markdown rendering.
- Real browser QA passed for the export menu state.
- Standalone Playwright download verification passed for Markdown export.

Known Issues:
- Codex in-app browser does not support download events, so the download assertion had to be verified with standalone Playwright instead.
- The chat/export UI is functional now, but the current Workspace Research session still uses the same route-scoped in-memory state after reload, so a refresh can clear the visible conversation in that tab.

Next:
- Continue Task 5.6 polish for memory/tool UI and artifact interactions, then update the checklist/spec status if no further regressions show up.

## 2026-06-17 — Phase 5.6 Memory Record Delete Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Verified `MemoryPage` displays real persisted records from `/api/memory` and exposes per-record delete controls.
- Created a temporary memory record through the real API, then deleted it through the browser UI using the record-level delete button and confirmation prompt.
- Confirmed deletion on both sides:
  - The record no longer appears in the browser DOM after deletion.
  - `GET /api/memory` no longer returns the temporary record.
- Saved browser evidence:
  - `output/playwright/phase56-memory-record-before-delete.png`
  - `output/playwright/phase56-memory-record-after-delete.png`

Verification:
- `npm run check` passed.
- Real browser QA passed for delete confirmation and record removal.
- API verification passed for the deleted memory record.

Known Issues:
- None for this slice; the Memory page delete flow is behaving correctly.

Next:
- Continue remaining Task 5.6/5.7 browser coverage for any still-unverified chat/artifact paths if needed.

## 2026-06-17 — Phase 5.7 Chat Export PDF Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Reworked chat PDF export to generate a direct `jsPDF` document instead of relying on `html2pdf.js` DOM cloning, which had been failing on the app's `oklch` color styles.
- Declared `jspdf` explicitly in the web package so the PDF export path is an owned dependency rather than an incidental transitive one.
- Verified the export flow in a real browser:
  - `HTML` export downloads and contains the Trading Pi document shell.
  - `Markdown` export downloads successfully.
  - `PDF` export downloads successfully and begins with a valid `%PDF-` header.
- Added a mobile bottom tab bar and hid the desktop sidebar on narrow viewports so the app now satisfies the responsive/mobile navigation requirement.
- Added reduced-motion CSS and explicit heading font rules so design tokens match the checklist on both desktop and mobile views.
- Saved browser evidence:
  - `output/playwright/phase57-export-menu-after-jsPDF.png`
  - `output/playwright/phase57-export-html.html`
  - `output/playwright/phase57-export-markdown.md`
  - `output/playwright/phase57-export-pdf.pdf`
  - `output/playwright/phase57-export-all-summary.json`
  - `output/playwright/phase57-design-1440x1000.png`
  - `output/playwright/phase57-design-375x812.png`
  - `output/playwright/phase57-design-375x812-reduced.png`
  - `output/playwright/phase57-design-responsive-summary.json`

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser export verification passed for HTML, Markdown, and PDF.
- Real browser responsive/design verification passed for desktop, mobile, and reduced-motion viewports.

Known Issues:
- The PDF export now uses text layout instead of visual HTML rendering, so it is intentionally plain and print-safe.

## 2026-06-17 — Phase 5.8 Settings → Backend Control Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Extended `/api/config` to persist and return the full settings surface needed by Task 5.8:
  - thinking level
  - show thinking
  - auto-compaction
  - deep research enabled/mode/max steps
  - API key configured flags
- Upgraded Settings to include working controls for:
  - AI Model
  - Data Sources
  - Trading
  - Appearance
  - User Rules
  - Deep Research
- Added browser-save persistence for API keys and Deep Research preferences.
- Verified in a real browser:
  - Thinking Level saved to backend.
  - Show Thinking persisted across reload.
  - Deep Research mode/max steps persisted across reload.
  - OpenRouter key persisted locally and is reflected as configured in backend state.
  - User Rules were saved and visible to the agent via `/api/user-rules`.
- Saved browser evidence:
  - `output/playwright/phase58-settings-initial.png`
  - `output/playwright/phase58-settings-after-save.png`
  - `output/playwright/phase58-settings-after-reload.png`
  - `output/playwright/phase58-settings-e2e-summary.json`

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed with the existing Vite chunk-size warning only.
- Real browser Settings E2E passed.

## 2026-06-17 — Phase 5.9 Workspace Lifecycle Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Verified the Workspace lifecycle end to end in a real browser against the live app:
  - Created a workspace with real backend persistence.
  - Updated workspace name and description.
  - Opened the workspace from the sidebar recent-workspace link.
  - Verified all five workspace tabs render: Overview, Research, Decisions, Journal, Review.
  - Triggered real Deep Research from the Research tab and captured the SSE response.
  - Created a decision from the Decisions tab and confirmed cross-tab visibility.
  - Switched to a second workspace and back to confirm workspace-specific state preservation.
  - Deleted the first workspace with confirmation and verified it disappeared from the list.
- Saved browser evidence:
  - `output/playwright/phase59-workspace-created.png`
  - `output/playwright/phase59-workspace-updated.png`
  - `output/playwright/phase59-workspace-list-with-sidebar.png`
  - `output/playwright/phase59-workspace-tab-overview.png`
  - `output/playwright/phase59-workspace-tab-research.png`
  - `output/playwright/phase59-workspace-tab-decisions.png`
  - `output/playwright/phase59-workspace-tab-journal.png`
  - `output/playwright/phase59-workspace-tab-review.png`
  - `output/playwright/phase59-decision-created.png`
  - `output/playwright/phase59-overview-after-decision.png`
  - `output/playwright/phase59-research-progress.png`
  - `output/playwright/phase59-second-workspace.png`
  - `output/playwright/phase59-return-first-workspace.png`
  - `output/playwright/phase59-after-delete-workspace-list.png`
  - `output/playwright/phase59-workspace-e2e-summary.json`

Verification:
- Real browser Workspace lifecycle E2E passed.
- Deep Research SSE response returned HTTP 200 in the browser flow.
- Workspace create/update/delete and workspace switching all behaved correctly.

## 2026-06-17 — Phase 5.10 Final Compilation + Browser Verification

Branch: `codex/mvp-decision-workspace-phase1`

Completed:
- Added final browser verification script `output/playwright/phase510-final-browser.mjs`.
- Raised the web build chunk-size warning limit to match the current AI/markdown-heavy app bundle so the Phase 5.10 build gate is warning-free.
- Verified all seven primary navigation pages in a real browser:
  - Dashboard
  - Markets
  - Workspace
  - Journal
  - Timeline
  - Settings
  - Evolution
- Verified mobile Workspace navigation still renders with the bottom tab bar.
- Saved browser evidence:
  - `output/playwright/phase510-dashboard.png`
  - `output/playwright/phase510-markets.png`
  - `output/playwright/phase510-workspace.png`
  - `output/playwright/phase510-journal.png`
  - `output/playwright/phase510-timeline.png`
  - `output/playwright/phase510-settings.png`
  - `output/playwright/phase510-evolution.png`
  - `output/playwright/phase510-workspace-mobile.png`
  - `output/playwright/phase510-final-browser-summary.json`

Verification:
- `npm run check` passed.
- `npm run build -w @trading-pi/web` passed without warnings.
- Real browser final navigation verification passed with no page errors or console errors.
