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

# ADR-002: Local-First Persistence

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- SQLite via node:sqlite for all persistence
- JSONL for session logs
- File system for artifacts

## Consequences
- No external database dependency
- Reproducible local development
- Docker only for aio-sandbox, not for main app
- Future PostgreSQL migration documented but not implemented

---

# ADR-003: AIO Sandbox for Browser Automation

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Browser actions run through Docker sandbox at :8080
- Not direct Playwright in the agent process
- Evidence artifacts persisted for all browser actions

## Consequences
- Safe execution of untrusted operations
- Requires aio-sandbox container running for browser features
- Network isolation for browser automation

---

# ADR-004: Pi Mono Reuse

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Depend on `@earendil-works/pi-agent-core@0.79.0` and `@earendil-works/pi-ai@0.79.0`
- TradingPiAgent wraps Pi Agent, adds skill registry tools and workflow routing

## Consequences
- Leverage existing Pi runtime capabilities
- Focus on trading-specific skills and workflows
- Dependency on external Pi project evolution

---

# ADR-005: Approval Gates for Dangerous Actions

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Skills marked `riskLevel: "high"` or `permission: "dangerous"` require approval
- Paper trading default; live trading disabled by default
- Real order execution blocked until explicit approval

## Consequences
- Safety barrier for financial actions
- User must explicitly enable risky operations
- Audit trail for all gated actions

---

# ADR-006: Skill Schema Validation with TypeBox

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- All skills define parameters via TypeBox schemas
- Runtime validation before skill execution

## Consequences
- Consistent skill interfaces
- TypeScript type safety at compile time
- Runtime safety at execution time

---

# ADR-007: Monorepo with workspace Packages

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- `apps/web` for frontend + API server
- `packages/core` for agent runtime, skills, workflows
- `packages/*` for domain-specific libraries (browser-layer, journal, mcp-hub, etc.)

## Consequences
- Shared types and utilities
- Single `npm run check` across all packages
- Coordinated versioning (all internal packages at 0.1.0)

---

# ADR-008: Market Data Dual-Source

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- CoinGecko for public quotes (no API key needed)
- CCXT for exchange-facing data (ticker, OHLCV, orderbook, balance)
- CoinMarketCap and DefiLlama as optional additional sources

## Consequences
- Resilient market data: if one source fails, others may work
- Network failures recorded as skill run errors (not hidden)
- Caching via repos.setCache with namespace/key/ttlMs

---

# ADR-009: Search Provider Redundancy

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Exa, Jina, Tavily as search providers
- 15-minute cache TTL for search results
- Research Hub orchestrates across search/browser/market/memory

## Consequences
- Redundant search with cost optimization
- Search results cached to avoid redundant API calls
- Research bundles include source quality scores
