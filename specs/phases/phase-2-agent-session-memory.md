# Phase 2 - TradingPiAgent + Session/Memory Runtime

## Goal

Build the single core `TradingPiAgent` runtime by reusing Pi Agent Core for state, tool use, event streaming, hooks, and session concepts, while adding Trading Pi-specific memory and timeline persistence.

## Scope

- `TradingPiAgent` wrapper around Pi `Agent`.
- Pi event subscription mapped into Trading Pi timeline events.
- Runtime-level `beforeToolCall` and `afterToolCall` hooks for approvals, auditing, timeline, and memory.
- JSONL session persistence modeled after Pi sessions.
- SQLite session/workflow/skill metadata indexes.
- Local memory store for user profile, preferences, risk rules, watchlists, and remembered facts.

## Tasks

- [ ] Create `TradingPiAgent` class with one Pi `Agent` instance per active Trading Pi session.
- [ ] Configure Pi model through OpenAI-compatible `.env`.
- [ ] Attach Trading Pi tools from Skill Registry to Pi Agent Core.
- [ ] Add `transformContext` to inject bounded local memory/context.
- [ ] Add `convertToLlm` to filter UI-only Trading Pi messages.
- [ ] Map Pi events to local timeline rows.
- [ ] Persist sessions as JSONL entries.
- [ ] Persist session metadata in SQLite.
- [ ] Persist memory records locally and expose list/upsert APIs.
- [ ] Add session start, continue, list, and inspect endpoints.

## Deliverables

- `TradingPiAgent` runtime package.
- Session and memory APIs.
- Timeline event persistence.
- Frontend chat workspace connected to a real local session.

## Acceptance Criteria

- Only one core agent architecture exists: `TradingPiAgent`.
- A user can start a session, send a message, stream events, and refresh without losing session metadata.
- Pi Agent Core is used for model state, tool calls, hooks, and event streaming.
- Local memory can be inserted and appears in future agent context.
- Timeline shows agent, message, and tool events.

## Test Plan

- Unit test session JSONL append/read.
- Unit test memory upsert/list and context injection.
- Integration test session message flow.
- Browser/Playwright test: send a message and see timeline/session status update.

## Demo Requirement

Open the web UI, send a message to Trading Pi, and capture a screenshot showing chat plus timeline.

