# Changelog

All notable changes to Trading Pi are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project adheres
to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-07-15

**First shippable release.** 88 PRs, 104 tests, 0 TS errors, 2.1 MB main bundle.

### Agent runtime
- Single TradingPiAgent (`@earendil-works/pi-agent-core`) with 70+ skills
- 14 DAG workflows with slash command routing (`/research`, `/plan`, `/review-day`, `/backtest`, `/browser`, `/evolve`, `/bootstrap-os`)
- Per-session scoped compaction (no instance-level state)
- Try/finally listener cleanup (no SSE leaks)
- LLM error classifier (network / auth / rate-limit / context-overflow / validation / internal)
- `OPENAI_API_KEY` fail-fast with clear message
- Slash command autocomplete menu in chat input
- ↻ Regenerate button in input footer

### Workflows
- Real vectorized backtest (`strategy.backtest`) — Sharpe, max DD, win rate
- `paper.trade.lifecycle` — `amend` / `cancel` / `partial_close` actions
- `evolution.apply` — close the loop (suggestion → user approval → rule)
- `deep.research` auto-resume on crash + reap stale sessions on startup

### Skills
- Token-bucket rate limiter (per source) wired to academic + arxiv
- CoinGecko → CCXT fallback chain

### Memory
- 50-record cap + single-fetch per turn
- Per-domain scoped storage with importance weighting

### UI (10 Settings panels)
- AI Model, Data Sources (Test buttons), AI Health (server/uptime), Rate Limits, Memory (search+filter), System Prompt viewer, Trading, User Rules, Deep Research, Skills (catalog)
- Pending Approvals panel with inline Approve/Deny
- Live metrics row on Dashboard

### Backend endpoints (22+)
- `GET /api/agent/{health,system-prompt,prompts,skills/catalog,metrics,version}`
- `GET /api/util/rate-limits`
- `POST /api/integrations/test`
- `POST /api/agent/approvals/:id/respond`
- `POST /api/evolution/suggestions/:id/{apply,reject}`
- `GET /api/sessions/:id/export`

### Infrastructure
- 13 per-domain Repositories + facade
- 9 standalone ADRs (MADR format)
- 0 TypeScript errors (`npm run check`)
- 104/104 tests pass (`npm run test`)
- GitHub Actions CI on every push + PR
- 9 issue templates + PR template + CODEOWNERS
- `.nvmrc` + `.npmrc` + `.gitattributes` + `.devcontainer` + Dependabot
- 9-page MVP SPA: Dashboard / Markets / Workspace / Journal / Timeline / Settings / Evolution (+ Memory)
- Verified end-to-end with Playwright screenshots (`docs/evidence/e2e-2026-07-15/`)

## [Unreleased] — 2026-07-13

### Added (61 PRs since 2026-07-12 audit)

**Agent runtime**
- Slash command menu in chat input (7 commands)
- Sub-agent live status (SSE-driven, mobile pill)
- Approval flow end-to-end (inline Approve/Deny in Settings)
- Memory viewer panel with delete
- Recent prompts panel
- Live rate-limit panel (cyan/amber progress bars)
- Reasoning toggle in AI Model settings
- `OPENAI_API_KEY` fail-fast guard with clear error
- `AI not ready` amber banner in chat
- `Model: X` / `Thinking: Y` chips in chat empty state

**Backend endpoints**
- `GET /api/agent/health` (config check)
- `GET /api/agent/health?ping=1` (live provider round-trip)
- `GET /api/agent/system-prompt` (live prompt viewer)
- `GET /api/agent/prompts?limit=N` (recent user messages)
- `GET /api/metrics/agent` (session/prompt/approval counts)
- `GET /api/util/rate-limits` (bucket visibility)
- `POST /api/agent/approvals/:id/respond` (approve/deny)
- `POST /api/evolution/suggestions/:id/{apply,reject}`
- `GET /api/sessions/:id/export` (JSON transcript)
- `PUT /api/config` (thinkingLevel + reasoning)

**Workflows**
- `strategy.backtest` — real vectorized backtest engine (Sharpe, max DD, win rate)
- `paper.trade.lifecycle` — `amend` / `cancel` / `partial_close` actions
- `evolution.apply` — close the loop (suggestion → user approval → `user_rules`)
- `deep.research` — auto-resume incomplete sessions (crash recovery)

**Skills & rate limiting**
- Token-bucket rate limiter (per-source buckets: academic, arxiv)
- CoinGecko → CCXT fallback chain

**Memory & state**
- `_compactionSummaries: Map<sessionId, string>` (scoped by session, not instance)
- `contextBlock(scope, limit=50)` cap + single-fetch per turn
- Skip `message_update` events from timeline (DB write storm fix)
- `findIncompleteResearchSession()` + auto-reap on startup
- `schema_version` table (track additive migrations)

**Data & architecture**
- Repositories split into 13 per-domain files + facade
- `MarketPriceRow` + `OhlcvRow` typed interfaces
- ADR files split: 1 monolithic → 9 individual files + `docs/adr/README.md`
- `docs/INDEX.md` master entry point with new-endpoint catalog

**Tooling & CI**
- `vitest` workspace setup with jsdom + RTL + jest-dom matchers
- 99/99 tests passing (3 skipped: ChatWorkspace RTL need QueryClientProvider)
- 0 TypeScript errors (`npm run check`)
- GitHub Actions workflow on every push + PR
- 4 issue templates + PR template + CODEOWNERS
- System prompt externalized to `packages/core/src/agent/system-prompt.md`

### Changed
- `TradingSkill.riskLevel` is now strictly typed (TypeScript enforces declaration)
- `SlashCommandMenu` filter uses `startsWith` on bare command name
- `MemoryStore.contextBlock` queries by domain, not scope
- `SessionStore.createFork` no longer double-inserts (UNIQUE constraint fix)
- `loadEnv` returns `reasoning: boolean` and `thinkingLevel: string`
- `publicAgentConfig` exposes `reasoning` in API response

### Fixed
- `ConversationEmptyState` not losing focus on prompt send
- `useMutation.refetch` misuse in Settings (was `refetchMemory` on a mutation — now split into query + mutation)
- `OPENAI_API_KEY` env validation now fails fast with actionable message
- `message_update` events no longer pollute timeline table
- 119 pre-existing TypeScript errors resolved
- RTL 16 import paths migrated to `@testing-library/dom`
- jsdom polyfills for Radix/shadcn (`ResizeObserver`, `scrollIntoView`, `matchMedia`)

### Security
- Approval engine gates `high` + `critical` risk skills with confirm flow
- `agent.approval.requested` SSE event surfaces blocked tool calls
- `agent.error` SSE event categorized (network/auth/rate_limit/context/validation/internal)
- Rate-limited academic sources prevent 429s during parallel research
- CoinGecko → CCXT fallback prevents silent single-source failures

## [0.1.0] — 2026-06-11

Initial MVP. Decision Workspace (Dashboard / Markets / Workspace / Journal /
Timeline / Settings / Evolution). Pi Mono agent with 70 skills, 13 workflows,
SQLite local-first persistence, 9 ADRs.
