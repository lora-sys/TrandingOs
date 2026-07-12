# PR Roadmap — Trading Pi Improvement Sprint

**Date:** 2026-07-12
**Scope:** 130 issues → 18 PRs across 5 waves
**Strategy:** Each PR ships with tests + Evidence; smallest blast radius first; merge order unlocks later work.

---

## Wave 0 — Foundation (parallel, no deps)

### PR-00: Bootstrap harness + docs scaffold
**Branch:** `chore/00-harness-bootstrap`
**Closes:** —
**Files:**
- `docs/agent-spec/trading-pi-agent.md` ✅ (this PR)
- `docs/agent-spec/harness-checklist.md` ✅ (this PR)
- `docs/evidence/audit-2026-07-12/findings.md` ✅ (this PR)
- `docs/evidence/audit-2026-07-12/pr-roadmap.md` ✅ (this PR)
- `docs/agent-spec/decisions/001-agent-contract.md` (ADR for this contract)
- `.github/ISSUE_TEMPLATE/{bug,feature,refactor,spike}.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml` — vitest + tsc + build
- `CHANGELOG.md`
**Evidence:** n/a (scaffold only)
**Reviewers:** n/a (infra PR)

### PR-01: Fix claim drift in CLAUDE.md / ARCHITECTURE.md
**Branch:** `docs/01-claim-sync`
**Closes:** D2, D4, D8
**Changes:**
- Recount skills from `default-skills.ts` (66, not 52/40)
- Recount tests from `core.test.ts` (8, not 10)
- Add Evolution to ARCHITECTURE.md §7.4
- Sync "Single Agent" terminology everywhere
**Evidence:** grep output saved to `docs/evidence/01-claim-sync/grep.txt`

---

## Wave 1 — Agent Runtime Correctness (parallel where safe)

### PR-02: Fix compaction summary scoping
**Branch:** `fix/02-compaction-session-scoped`
**Closes:** B1, B2
**Files:** `packages/core/src/agent/trading-pi-agent.ts`, `sessions/session-store.ts`
**Change:** Move `_compactionSummary` into `Map<sessionId, string>`, persist on session record. Clear only on session close.
**Tests:** `compaction.test.ts` — 4 cases: parallel sessions, follow-up turn, restart, summary reused.
**Evidence:** unit test pass; parallel-session integration.

### PR-03: Fix event listener leak
**Branch:** `fix/03-event-listener-cleanup`
**Closes:** B3
**Files:** `packages/core/src/agent/trading-pi-agent.ts`
**Change:** Capture `agent.subscribe()` unsubscribe; call in `finally`.
**Tests:** `agent-lifecycle.test.ts` — listener count after 100 prompts stays at 1.
**Evidence:** heap snapshot diff.

### PR-04: Handle LLM errors with structured categories
**Branch:** `fix/04-llm-error-handling`
**Closes:** B5, B26 (partial)
**Files:** `apps/web/server/api.ts`, `packages/core/src/agent/trading-pi-agent.ts`
**Change:** Wrap `agent.prompt()` in try/catch; classify errors (network/auth/rate-limit/context-overflow); surface to UI via SSE.
**Tests:** `error-handling.test.ts` with mocked fetch failures.
**Evidence:** SSE event log per error category.

### PR-05: Session-scoped sub-agent events
**Branch:** `fix/05-subagent-event-scoping`
**Closes:** B9
**Files:** `apps/web/server/api.ts`, `packages/core/src/agents/manager.ts`
**Change:** Filter `subAgents.subscribe` by sessionId; unsubscribe on session end.
**Tests:** cross-session isolation unit test.
**Evidence:** SSE capture for two concurrent sessions.

---

## Wave 2 — Agent UI Visibility (high user impact)

### PR-06: Wire model picker to backend
**Branch:** `feat/06-model-picker-live`
**Closes:** A1, A18
**Files:** `apps/web/src/hooks/useModelPicker.ts`, `model-picker.tsx`, `apps/web/server/api.ts`
**Change:** New `/api/config/models` endpoint returns `{id, name, reasoning?, contextWindow}`; picker fetches on mount; current model selectable.
**Tests:** `model-picker.test.ts`; Playwright snapshot.
**Evidence:** `docs/evidence/06-model-picker/screenshots/desktop.png` + `mobile.png`.

### PR-07: Add slash command menu to PromptInput
**Branch:** `feat/07-slash-command-menu`
**Closes:** A2, A5, A21
**Files:** `apps/web/src/components/ChatWorkspace.tsx`, `apps/web/src/components/ai-elements/prompt-input.tsx`, new `slash-command-menu.tsx`
**Change:** On `/`, show menu with all 7 slash commands + descriptions + keybindings. Trigger keyboard nav. Insert on select.
**Tests:** Playwright — type `/`, screenshot menu, click `/research`, verify input prefilled.
**Evidence:** `docs/evidence/07-slash-menu/screenshots/`.

### PR-08: Wire Confirmation flow for approval blocks
**Branch:** `feat/08-approval-confirmation-ui`
**Closes:** A4, C2 (UI half)
**Files:** `apps/web/src/components/ai-elements/confirmation.tsx`, `chat-item-view.tsx`, `useSSEStream.ts`, `apps/web/server/api.ts`
**Change:** When `beforeToolCall` returns `block: true`, emit `agent.approval.requested` SSE event. UI renders Confirmation inside Tool card with approve/deny buttons. On approve, replay tool call via `/api/agent/resume`.
**Tests:** Approval round-trip test; Playwright approval flow.
**Evidence:** `docs/evidence/08-approval-flow/screenshots/` + replay log.

### PR-09: Make subagent status visible in chat
**Branch:** `feat/09-subagent-inline-status`
**Closes:** A3, A10, A26
**Files:** `AppLayout.tsx`, `ChatWorkspace.tsx`, `pi-web-ui/workspace-status-float.tsx`, `pi-web-ui/subagent-detail-sidebar.tsx`, `useSSEStream.ts`
**Change:** Subscribe SSE `subagents:*` events in `useSSEStream`, push to store. Replace 2000ms poll with SSE. Add inline subagent card in conversation. Mobile-friendly status pill in chat header.
**Tests:** Live subagent progress Playwright test (spawn background, watch UI).
**Evidence:** `docs/evidence/09-subagent-live/`.

---

## Wave 3 — Workflow / Skill Hardening

### PR-10: Remove or implement 8 stub packages
**Branch:** `chore/10-stub-packages`
**Closes:** C1
**Files:** All `packages/{journal,memory-engine,mcp-hub,research-hub,search-hub,strategy-engine,browser-layer,integrations}/package.json` + new minimal `src/index.ts` + `MODULE.md`
**Decision per package:** (a) implement skeleton with TODOs, (b) remove from workspace if truly unused.
**Tests:** Each package has a smoke test that imports it.
**Evidence:** n/a (chore).

### PR-11: Make `strategy.backtest` actually backtest
**Branch:** `feat/11-real-backtest`
**Closes:** C4
**Files:** `packages/core/src/workflows/default-workflows.ts`, new `packages/core/src/market/backtest.ts`
**Change:** Implement vectorized backtest with ccxt OHLCV. Compute Sharpe, max DD, win rate. Output JSON + markdown artifact.
**Tests:** Backtest against fixture (BTC 2024 H1), asserts Sharpe within tolerance.
**Evidence:** `docs/evidence/11-backtest/` — sample run + artifact.

### PR-12: Complete `paper.trade.lifecycle`
**Branch:** `feat/12-paper-trade-lifecycle-complete`
**Closes:** C5
**Files:** `default-workflows.ts`, `skill/*paper-trade*`
**Change:** Add `amend`, `cancel`, `partial_close` actions. Tests for each.
**Evidence:** lifecycle state-machine diagram + screenshots.

### PR-13: Add `evolution.apply` path
**Branch:** `feat/13-evolution-apply`
**Closes:** C18
**Files:** `default-workflows.ts`, new `evolution.apply` workflow, new `evolution.apply` skill
**Change:** Close the loop: suggestions → user approval → apply to rules table. Diff preview in UI.
**Tests:** End-to-end apply-with-approval test.
**Evidence:** `docs/evidence/13-evolution-apply/`.

---

## Wave 4 — Process + Quality

### PR-14: Add test infrastructure + baseline tests
**Branch:** `feat/14-test-baseline`
**Closes:** D1 (partial), C25, C36
**Files:**
- New `vitest.config.ts` workspace setup
- `packages/core/src/agent/trading-pi-agent.test.ts` (LLM fallback, slash router, fork, compaction)
- `packages/core/src/agents/manager.test.ts` (spawn/cancel/stop/step events)
- `packages/core/src/approvals/approval-engine.test.ts` (gating, request, list)
- `packages/core/src/memory/memory-store.test.ts` (query, contextBlock, ACL)
- `apps/web/src/components/ChatWorkspace.test.tsx` (Vitest + RTL)
**Coverage target:** 60% lines on `packages/core/src/agent/` + `packages/core/src/workflows/`.
**Evidence:** coverage report.

### PR-15: Set up CI workflow
**Branch:** `ci/15-github-actions`
**Closes:** D11
**Files:** `.github/workflows/{ci.yml,coverage.yml}`
**Change:** Run vitest + tsc + build on every PR. Block merge on failure. Upload coverage to Codecov.
**Evidence:** first green CI run captured.

### PR-16: Decouple Repositories (refactor)
**Branch:** `refactor/16-repositories-split`
**Closes:** C20
**Files:** `packages/core/src/db/repositories.ts` → split into `paper-trading.repo.ts`, `journal.repo.ts`, `workspace.repo.ts`, `review.repo.ts`, `artifact.repo.ts`, `Repositories` becomes facade.
**Tests:** All existing tests pass + new per-repo tests.
**Evidence:** n/a (refactor preserves behavior).

---

## Wave 5 — Polish + Evidence

### PR-17: System prompt to .md + viewer
**Branch:** `feat/17-system-prompt-md`
**Closes:** B10, A12, B19
**Files:**
- New `packages/core/src/agent/system-prompt.md` (replaces inline string)
- `trading-pi-agent.ts` reads file with fallback
- Settings UI: "View system prompt" expandable section
**Tests:** Fallback when file missing.

### PR-18: Evidence gate for MVP closed loop
**Branch:** `docs/18-mvp-evidence-pack`
**Closes:** D3 (initial)
**Files:** `docs/evidence/mvp-decision-workspace/{change-summary.md, screenshots/, test-results/, review-report.md}`
**Change:** Generate E2E evidence for the 7-page MVP: Playwright run with screenshots per page, console-clean check, test report.
**Tests:** Spec compliance matrix linked.

---

## Dependency Graph

```
PR-00 (scaffold)
  └── PR-01 (claim sync)
PR-02 ─┐
PR-03  ├─── PR-04 (LLM errors depend on stable listener + compaction)
PR-05 ─┘
PR-06 (model picker — independent)
PR-07 (slash menu — uses API from PR-00)
PR-08 (approval UI — needs PR-04 for error handling)
PR-09 (subagent live — independent)
PR-10 (stubs — independent)
PR-11 (real backtest — depends on stub cleanup PR-10 for skill placement)
PR-12 (lifecycle — depends on PR-10)
PR-13 (evolution apply — independent)
PR-14 (test infra — needs PR-02..05 stable)
PR-15 (CI — needs PR-14)
PR-16 (repositories refactor — needs PR-14 baseline tests)
PR-17 (system prompt md — independent)
PR-18 (evidence pack — needs PR-15 CI + PR-14 tests)
```

## Suggested Order

**Sprint 1 (3 days):** PR-00, PR-01, PR-06, PR-07, PR-09, PR-17
**Sprint 2 (3 days):** PR-02, PR-03, PR-04, PR-05, PR-14
**Sprint 3 (3 days):** PR-08, PR-10, PR-11, PR-12, PR-13, PR-16
**Sprint 4 (2 days):** PR-15, PR-18

Total: ~10 working days, 18 PRs, 130 issues covered (some PRs cover multiple).

---

## What user must approve before merge

- PR-04 touches LLM error contract — possible breaking change for UI consumers
- PR-10 either removes or stubs 8 packages — affects downstream imports
- PR-11 introduces new artifact type — schema migration needed
- PR-15 enables CI — initial config may need secrets (no secrets needed for vitest + tsc)

All other PRs are safe local-first changes with feature flags.