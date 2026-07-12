# Harness Checklist — Trading Pi Agent

> Per `$build-agent-app` references/harness-checklist.md.

## State

| Layer | Where | Lifetime |
|---|---|---|
| Session entries (messages, tool calls, artifacts) | SQLite `sessions` table + JSONL file | session lifetime |
| Workspace state | SQLite `workspaces` table | persistent |
| Decisions / journal / reviews | SQLite `decisions`, `journal_entries`, `reviews` | persistent |
| Memory records | SQLite `memory` table | persistent (importance-weighted) |
| Agent runtime state | `pi-agent-core` in-memory | per prompt() call |
| Compaction summary | `_compactionSummary` field | **broken — instance-level, races** |

## Memory

- **Short-term:** conversation state lives in `pi-agent-core` `agent.state.messages`. Compaction target: 128k tokens.
- **Long-term:** `MemoryStore` with 12 domains (user-preferences, market-context, etc.). Per-turn `contextBlock("user")` injection.
- **Memory write triggers:** end-of-prompt, review completion, evolution suggestions.

## Eval (gaps)

- **No automated evals.** Zero test coverage for agent runtime.
- **Smoke test:** `npm run test` runs 8 cases in 1 file (`core.test.ts`).
- **Required:** goldens for slash commands, snapshot tests for tool output, E2E Playwright journeys per MVP spec REQ.

## Observability

- **Timeline events:** every agent + workflow + tool call → `repos.createTimeline()`.
- **Langfuse:** wired but not active without keys; no UI surfacing of trace IDs.
- **Gaps:** no token/sec metrics, no per-tool latency, no approval-rejection rate.

## Failure paths

- **LLM errors:** currently uncaught → surface as 500.
- **Skill errors:** logged to timeline, agent sees them in tool result.
- **Approval blocked:** agent loop halts with `block: true`; **no resume mechanism** — UI cannot recover.
- **Workflow errors:** catch + write `failed` run; **no rollback** of partial state.
- **Cache stale:** `withCacheStrategy` TTL honored when wrapper used; bypass paths exist.

## Human approval

- **Trigger:** `skill.riskLevel >= high` OR `skill.id ∈ dangerousActions`.
- **Request:** `ApprovalEngine.request()` writes row.
- **UI:** `Confirmation` component exists but **not wired** to `beforeToolCall` blocks.
- **State machine:** requested → approved | rejected | expired (no TTL currently).

## Open contract gaps (audit 2026-07-12)

1. Compaction summary race (CRITICAL).
2. Event listener leak (HIGH).
3. Approval block + resume missing (CRITICAL).
4. Memory double-fetch per turn (HIGH).
5. Sub-agent events not session-scoped (MEDIUM).
6. Streaming event compactness loses data (MEDIUM).
7. No tests for runtime paths (CRITICAL).