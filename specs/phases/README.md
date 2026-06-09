# Trading Pi Phase Plan

Trading Pi is a local-first personal trading operating system. It uses one core runtime, `TradingPiAgent`, and expands capability through Workflows and Skills. The implementation must reuse Pi core packages where practical instead of rebuilding agent runtime, tool execution, streaming, memory, or session concepts from scratch.

## Architecture Defaults

- Runtime: Node.js >= 22.19.0, TypeScript, local API plus web UI.
- Agent core: `@earendil-works/pi-agent-core` for agent state, tool use, event streaming, hooks, session concepts, compaction primitives, and skill-loading patterns.
- AI core: `@earendil-works/pi-ai` for OpenAI-compatible model calls.
- UI: React trading cockpit; validate `@earendil-works/pi-web-ui` for partial/direct reuse before recreating chat components.
- Storage: SQLite through `node:sqlite`, JSONL sessions, file-based artifacts.
- Market data: CoinGecko for no-key public quotes and CCXT for exchange quotes/OHLCV.
- Observability: Langfuse plus local timeline/skill/workflow run logs.
- Safety: runtime-level Approval gates for dangerous actions; UI approval cards are only the visible surface.

## Phase Index

1. [Phase 1 - Local Foundation + Pi Reuse Validation](phase-1-local-foundation.md)
2. [Phase 2 - TradingPiAgent + Session/Memory Runtime](phase-2-agent-session-memory.md)
3. [Phase 3 - Workflow + Skill Execution + Market Data](phase-3-workflows-skills-market.md)
4. [Phase 4 - Market Research Planner](phase-4-market-research-planner.md)
5. [Phase 5 - Portfolio Journal Review](phase-5-portfolio-journal-review.md)
6. [Phase 6 - OS Upgrade Foundation](phase-6-os-upgrade-foundation.md)
