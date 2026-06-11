# Phase 2 Checklist - TradingPiAgent + Session/Memory Runtime

## Agent Core

- [x] `TradingPiAgent` wraps Pi `Agent`.
- [x] Pi tools are attached from Skill Registry.
- [x] Pi `beforeToolCall` hook gates risky skills.
- [x] Pi `afterToolCall` hook writes audit/timeline details.
- [x] Pi events map to Trading Pi timeline events.

## Session Runtime

- [x] Create session endpoint.
- [x] Continue session endpoint.
- [x] List sessions endpoint.
- [x] Session metadata stored in SQLite.
- [x] Session entries appended to JSONL.

## Memory

- [x] Memory schema created.
- [x] Memory upsert endpoint.
- [x] Memory list endpoint.
- [x] Agent context transform injects bounded memory.

## UI

- [x] Chat workspace sends a real message.
- [x] Timeline updates after agent run.
- [x] Session id/status is visible.

## Verification

- [x] Unit tests cover session store.
- [x] Unit tests cover memory store.
- [x] Integration test covers session message flow.
- [x] Browser screenshot captured with chat and timeline.
