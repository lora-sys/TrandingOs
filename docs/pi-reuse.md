# Pi Reuse Notes

## Decision

Trading Pi reuses Pi core capabilities deeply:

- `@earendil-works/pi-agent-core` for the stateful Agent runtime, tool execution, lifecycle event streaming, tool preflight/finalization hooks, context transformation, and session/compaction concepts.
- `@earendil-works/pi-ai` for OpenAI-compatible model calls and custom model definitions.
- Pi session design for JSONL tree entries, session resume, branching/forking, labels, custom entries, and compaction direction.
- `@earendil-works/pi-web-ui` is treated as a compatibility spike because the published web package currently trails core/ai. If it does not fit cleanly with the React/Hero UI cockpit, Trading Pi still reuses Pi event and message concepts while building its own trading-specific shell.

## What Trading Pi Adds

- Trading-specific workflows and skills.
- Local SQLite metadata and artifact store.
- Risk and approval enforcement.
- Execution timeline and Langfuse trace mapping.
- Market data through CoinGecko and CCXT.
- Trading cockpit UI.

## What Trading Pi Must Not Add

- A multi-agent system.
- Cloud-only storage requirements.
- Hardcoded AI decisions.
- Silent execution of high-risk actions.
- Fake market/AI outputs for accepted workflows.

