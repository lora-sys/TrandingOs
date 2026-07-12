# Audit Findings — Trading Pi (TrandingOs)

**Date:** 2026-07-12
**Auditors:** 4 parallel Explore agents (runtime, UI, workflows/skills, docs/tests)
**Skill used:** `$ai-engineering-harness` + `$build-agent-app`
**Total issues:** 130 across 4 clusters

---

## Cluster Map

| Cluster | Theme | # Issues | Critical | High | Med | Low |
|---|---|---|---|---|---|---|
| **A** | Agent UI Visibility | 30 | 5 | 7 | 14 | 4 |
| **B** | Agent Runtime Correctness | 30 | 3 | 5 | 12 | 10 |
| **C** | Workflows / Skills / Approvals | 40 | 5 | 11 | 14 | 10 |
| **D** | Docs / Tests / Evidence | 30 | 3 | 5 | 11 | 11 |

**Top 10 issues (any cluster, any severity) — the must-fix set:**

| # | Cluster | Sev | Title | File |
|---|---|---|---|---|
| 1 | A | CRIT | Model picker hardcodes empty list, LongCat-2.0 unreachable | `apps/web/src/hooks/useModelPicker.ts:43` |
| 2 | A | CRIT | Slash command menu missing from PromptInput | `apps/web/src/components/ChatWorkspace.tsx:430` |
| 3 | A | CRIT | SubagentDetailSidebar entry hidden in chat flow | `apps/web/src/components/ChatWorkspace.tsx:480` |
| 4 | A | CRIT | `beforeToolCall` blocks tool but UI never resolves | `packages/core/src/agent/trading-pi-agent.ts:145` + `confirmation.tsx` |
| 5 | A | CRIT | Empty state has no slash-command hints | `apps/web/src/components/ChatWorkspace.tsx:306` |
| 6 | B | CRIT | `_compactionSummary` is instance-level → race | `packages/core/src/agent/trading-pi-agent.ts:41` |
| 7 | B | CRIT | No test coverage for TradingPiAgent runtime | `packages/core/src/core.test.ts` (only 8 cases) |
| 8 | C | CRIT | Stub package dirs (8) ship as empty workspaces | `packages/{journal,memory-engine,mcp-hub,...}/` |
| 9 | C | CRIT | `strategy.backtest` records but doesn't backtest | `default-workflows.ts` (strategy.backtest block) |
| 10 | D | CRIT | No evidence dir / no CI / no tests for MVP closed loop | `specs/specs/mvp-decision-workspace/` |

---

## Cluster A — Agent UI Visibility (30 issues)

The user reports: **"agent product not visible"**. This cluster is the primary fix area.

### A1. Model Picker empty
- `apps/web/src/hooks/useModelPicker.ts:43` — `useState<ModelInfo[]>([])` never populated
- `apps/web/src/components/pi-web-ui/model-picker.tsx` — shows "No models found"
- LongCat-2.0 unreachable from UI

### A2. Slash command menu missing
- `apps/web/src/components/ChatWorkspace.tsx:430` — only `PromptInputTextarea` + `Submit` + `Tools` used
- `prompt-input.tsx` has `PromptInputCommand` infrastructure unused
- `/research`, `/plan`, `/evolve` undiscoverable

### A3. Subagent entry hidden
- `ChatWorkspace.tsx:480` — `SubagentDetailSidebar` only renders when `selectedSubagent` set
- Only entry point: `WorkspaceStatusFloat` (hidden on mobile via `hidden md:block`)
- Background agents invisible

### A4. Confirmation flow invisible
- `apps/web/src/components/ai-elements/confirmation.tsx` — exists but **no wiring** to `beforeToolCall` blocks
- Agent appears to hang silently when approval required

### A5. Empty state generic
- `ChatWorkspace.tsx:306` — 4 hardcoded action buttons, no slash hints
- No "Type / for commands" affordance

### A6. Token-level streaming not rendered
- `apps/web/src/hooks/useSSEStream.ts:99` — `message_update` overwrites content, doesn't append
- UI shows chunked updates, not true tokens

### A7. Reasoning collapsed by default
- `apps/web/src/components/pi-web-ui/chat-item-view.tsx:244` — gated on `showThinking` from `settingsStore`
- Hidden unless user opens Settings

### A8. Plan visualization no live updates
- `chat-conversion.ts:113` — plan items only from final state, not `plan_update` events

### A9. Tool states under-used
- `ai-elements/tool.tsx:34` — supports 7 states, UI uses only 2
- No `input-streaming` for tool-call JSON parse phase

### A10. Subagent list stale
- `AppLayout.tsx:65` — 2000ms polling vs SSE in `useSSEStream`
- Two sources of truth: AppLayout sees one, ChatWorkspace sees another

### A11. Settings lacks subagent controls
- `settings-panel.tsx:59` — "Agent" section has thinking + compaction only
- No subagent toggles, model defaults, tool whitelist

### A12. No system prompt viewer
- Hardcoded in TS — no UI to view or edit

### A13. No session fork button
- API supports `parentSessionId`; UI lacks "Fork from here"

### A14. MCP server status hidden
- `tradingPiApi.mcpServers()` exists, no consumer UI

### A15. Telemetry trace IDs not surfaced
- Langfuse configured; no run-link popover

### A16. Model picker search useless (because list empty)
### A17. Artifact button no badge for new arrivals
### A18. Subagent stop button hard to tap on mobile
### A19. Reasoning memoized, doesn't update on stream
### A20. Abort reason indistinguishable
### A21. Mobile bottom nav overlaps chat input
### A22. Tool summary truncates with no expand
### A23. Deleted sessions linger 15s
### A24. Artifact list lacks type icons
### A25. DecisionCard confirm has no undo (safety)
### A26. AlphaRadarCard "Research this" button unwired
### A27-A30. Various polish (font, density, animations)

---

## Cluster B — Agent Runtime Correctness (30 issues)

### B1. Compaction summary race
- `_compactionSummary` instance var, parallel sessions collide
- `trading-pi-agent.ts:41, 105, 198`

### B2. Compaction summary cleared too early
- `trading-pi-agent.ts:111` — `= undefined` after first inject, lost on follow-up turns

### B3. Event listener leak
- `trading-pi-agent.ts:171` — `agent.subscribe()` never unsubscribed

### B4. Approval gate unresumable
- `trading-pi-agent.ts:145-154` — `block: true` halts agent; no resume from UI

### B5. Unhandled LLM errors
- `apps/web/server/api.ts:464` — no try/catch around `agent.prompt()`

### B6. Memory fetched twice per turn
- `trading-pi-agent.ts:115, 121` — `contextBlock("user")` called in both `transformContext` and `prepareNextTurn`

### B7. Session fork loses config
- `session-store.ts:93-126` — model, thinking level, tools not copied

### B8. Streaming event data loss
- `compactEvent()` returns `{type}` only for `message_update`
- Token deltas, reasoning, tool-call progress lost

### B9. Sub-agent events unscoped
- `apps/web/server/api.ts:459` — global subscribe leaks cross-session events

### B10. System prompt hardcoded
- Inline string, not hot-reloadable like sub-agent .md files

### B11. Reasoning hardcoded off
- `model.ts:11` — `reasoning: false` for LongCat-2.0 which supports it

### B12. No env validation
- `env.ts:44` — missing OPENAI_API_KEY returns undefined silently

### B13. No SubAgentManager wiring in TradingPiAgent
- Sub-agents cannot be spawned from chat (UI must call API directly)

### B14. Auto-approval no TTL
- `approval-engine.ts:24` — `Set<string>` grows forever

### B15. Sub-agent step events fire after workflow
- `manager.ts:175-185` — not event-driven progress

### B16. Workflow summary hardcoded English strings
- `trading-pi-agent.ts:358-369` — fixed text per workflowId

### B17. `as any` in domain code (CLAUDE.md violation)
- `trading-pi-agent.ts:290` — `data as any`

### B18. Unbounded memory contextBlock
- `memory-store.ts:55` — no limit, can blow context window

### B19. Thinking budget defaults to medium
- `trading-pi-agent.ts:87` — no env override

### B20. Timeline write storm
- `handleEvent` writes per-event, no batching (10+ inserts/sec during streaming)

### B21. Session name no uniqueness check
### B22. Compaction `compactEvent` loses isError
### B23. forwardStreamEvent no shape validation
### B24. fetch health check hang risk (older runtimes)
### B25. Constructor no dep validation
### B26. No metrics layer
### B27. Workflow summary English-only
### B28. Session auto-name strips non-CJK scripts
### B29. Sub-agent result preview truncated to 1200 chars
### B30. prepareNextTurn overwrites systemPrompt

---

## Cluster C — Workflows / Skills / Approvals (40 issues)

### Critical (5)

#### C1. Stub package dirs (8)
- `packages/{journal,memory-engine,mcp-hub,research-hub,search-hub,strategy-engine,browser-layer,integrations}/` — valid `package.json`, zero source files
- Resolve to nothing on import

#### C2. Approval engine no UI resolution
- `approval-engine.ts:60-80` — `requiresApproval()` gates, but no consumer of `approve()`/`reject()`
- Requests pile up in DB unresolved

#### C3. Workflow engine no partial-state rollback
- `workflow-engine.ts:62-73` — error caught, but artifacts/memory/DB writes inside `execute()` persist
- Half-done research/trades visible

#### C4. `strategy.backtest` no backtest
- Records strategy + calls `backtest.run` skill which returns canned metrics
- No historical price replay

#### C5. `paper.trade.lifecycle` incomplete
- Has execute/monitor/close|settle
- Missing: `amend`, `cancel`, `partial_close`
- Cannot correct bad entries

### High (11)

#### C6. `as any` chain in trade.plan (5 casts)
- `default-workflows.ts:288-292`

#### C7. CCXT dynamic loader `as any`
- `default-skills.ts:1821, 1848`

#### C8. Approval dangerousActions hardcoded, no config reload
- `approval-engine.ts:20-35`

#### C9. Deep research no phase checkpointing
- 7 phases all in-memory; crash loses all progress
- `deep-research.ts:100-180`

#### C10. Memory store untyped rows
- `query()` returns `Record<string, any>[]`
- `memory-store.ts:60-95`

#### C11. CoinGecko no fallback
- Single 15s timeout, no CCXT backup, no circuit breaker

#### C12. Alpha Radar score vulnerable to low-volume spikes
- `|change24h| × 1000` dominates when volume is thin

#### C13. Cache no max-age enforcement
- `withCacheStrategy` bypass paths exist

#### C14. Session JSONL no crash recovery
- DB row can exist with incomplete JSONL

#### C15. Artifact engine writes to CWD
- `artifact-engine.ts:30-50` — `./artifacts/` not under dataDir, no rotation

#### C16. Skills default to medium risk
- Triggers unnecessary approvals for read-only skills

### Medium (14)

- C17. DB schema uses `addColumnIfMissing`, no version table
- C18. `evolution.propose` no apply path
- C19. No JSON Schema export from TypeBox skills
- C20. Repositories class is 1673-line god object
- C21. Slash commands implicit, not in declared registry
- C22. Academic search no shared rate limiter
- C23. Risk weights hardcoded magic numbers
- C24. Workflow runs no idempotency key
- C25. No test for workflow partial-failure
- C26. `market.snapshot` returns `(ccxtTicker as any)`
- C27. No telemetry on approval rejection rate
- C28. Memory domains lack ACL
- C29. Browser evidence no AIO Sandbox health check
- C30. Workspace review truncates suggestions without scoring

### Low (10)

- C31. PubSub no replay mechanism
- C32. `os.bootstrap` duplicates workspaces on re-run
- C33. `review.daily` no `workspaceId` filter
- C34. `extractPrice` fallback no logging
- C35. No `artifact.delete` skill
- C36. `core.test.ts` missing approval + cache tests
- C37. `capitalize()` no Unicode handling
- C38. No `exports` field in `package.json`
- C39. Workflow descriptions lack examples
- C40. No version migration path for memory JSON

---

## Cluster D — Docs / Tests / Evidence (30 issues)

### Critical (3)

#### D1. No executable test coverage
- Only `core.test.ts` (8 cases) in entire repo
- No tests for: agent, sub-agents, workflow engine, approval engine, memory, skill registry
- CLAUDE.md claims "10 core tests" (false)
- E2E Playwright spec missing

#### D2. Misleading architecture doc counts
- ARCHITECTURE.md says "40+ skills"
- CLAUDE.md says "52 skills"
- Actual: 66 skills registered
- Claims drift = contributor confusion

#### D3. No evidence directory despite repeated claims
- project-status.md mentions "screenshot evidence saved"
- No `docs/evidence/` exists
- MVP closed-loop claims unverifiable

### High (5)

#### D4. Page count contradiction
- spec.md says 7 pages (incl. Evolution)
- FRONTEND.md says 6
- ARCHITECTURE.md §7.4 missing Evolution row

#### D5. ADR consolidation broken
- `001-single-agent.md` has 9 ADRs in 1 file
- `010-frontend-refactoring.md` jumps to 010
- Standard ADR pattern violated

#### D6. ADR-010 claims unverified
- "60-70% bundle reduction" without before/after numbers

#### D7. MODULE.md claims vs reality
- `skills/MODULE.md` references `cache-utils.ts` and module paths that don't exist
- Actual file system differs

#### D8. Tests "10" claimed, 8 actual

### Medium (11)

- D9. API.md route inconsistency
- D10. No issue/PR templates
- D11. No CI/CD workflows (no `.github/`)
- D12. Ubiquitous language missing Sub-Agent, Event Feed, K-line
- D13. No CHANGELOG.md
- D14. ADR numbering broken (consolidated 001 vs sequential)
- D15-D30. Various doc drift, stale alignment reports, missing spec validation matrix

### Low (11)

- D15. FRONTEND.md component list incomplete
- D16. MODULE.md dependencies in/out missing
- D17. specs/ has 40+ aspirational files, no status markers
- D18. alignment/ reports stale
- D19. ARCHITECTURE.md mentions HeroUI v3 + pi-web-ui inconsistently
- D20. No master glossary index
- D21. MVP tasks.md unverifiable completion
- D22. Bundle claim without measurement
- D23. No `.github/` directory
- D24. AGENTS.md doc contract not enforced
- D25. No spec-compliance matrix

---

## Severity-Criticality Score (top 25)

| Rank | ID | Cluster | Sev | Title |
|---|---|---|---|---|
| 1 | A1 | UI | CRIT | Model picker hardcoded empty |
| 2 | A4 | UI | CRIT | Approval blocks invisible to UI |
| 3 | A2 | UI | CRIT | Slash command menu missing |
| 4 | B1 | Runtime | CRIT | Compaction summary race |
| 5 | B4 | Runtime | CRIT | Approval gate unresumable |
| 6 | C4 | WF | CRIT | `strategy.backtest` no backtest |
| 7 | C8 | WF | CRIT | Approval engine no UI resolution |
| 8 | C1 | WF | CRIT | 8 stub package dirs |
| 9 | D1 | Doc | CRIT | No test coverage for runtime |
| 10 | A5 | UI | CRIT | Empty state has no agent hints |
| 11 | C3 | WF | CRIT | No workflow partial-state rollback |
| 12 | A3 | UI | CRIT | Subagent entry hidden |
| 13 | D3 | Doc | CRIT | No evidence dir |
| 14 | C5 | WF | CRIT | `paper.trade.lifecycle` incomplete |
| 15 | B3 | Runtime | HIGH | Event listener leak |
| 16 | C18 | WF | HIGH | `evolution.propose` no apply path |
| 17 | C9 | WF | HIGH | Deep research no phase checkpoint |
| 18 | C2 | WF | HIGH | Approval no UI (same as A4/C7) |
| 19 | B6 | Runtime | HIGH | Memory fetched twice per turn |
| 20 | C20 | WF | HIGH | Repositories god object (1673 lines) |
| 21 | C6 | WF | HIGH | `as any` chain in trade.plan |
| 22 | D11 | Doc | HIGH | No CI/CD |
| 23 | A6 | UI | HIGH | Token-level streaming broken |
| 24 | A10 | UI | HIGH | Subagent list stale (poll vs SSE) |
| 25 | B7 | Runtime | HIGH | Session fork loses config |

See `pr-roadmap.md` for the sequenced fix plan.