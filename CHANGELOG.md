# Changelog

All notable changes to Trading Pi are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project adheres
to [Semantic Versioning](https://semver.org/).

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
