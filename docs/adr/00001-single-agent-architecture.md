# ADR-001: Single Agent Architecture

**Date**: 2026-06-11
**Status**: Accepted
**Context**: Project uses a single TradingPiAgent wrapping Pi Mono runtime.

## Decision
- Only one agent: TradingPiAgent (packages/core/src/agent/trading-pi-agent.ts)
- No multi-agent orchestration
- Agent routes user intent to workflows, which call skills

## Consequences
- Simpler debugging and audit trail
- Clear ownership of decisions
- No inter-agent conflict resolution needed
- Limits: agent must handle all domains through skill registry

---
