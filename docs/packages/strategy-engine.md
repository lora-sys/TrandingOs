> **⚠️ DEPRECATED (v5.0 — 2026-06-14)**
>
> This package has been consolidated into `@trading-pi/core`. See `packages/core/src/strategy.ts`.
> The original package is kept as a backward-compat shim only.
> **New code should import from `@trading-pi/core` directly.**
>
> See ADR-010 for details.

# Strategy Engine (`packages/strategy-engine`)

**Status**: Canonical — matches current code

## Purpose
Strategy scoring and lifecycle management. Creates, versions, and evaluates trading strategies.

## Key Concepts
- **Strategy**: Named trading strategy with parameters
- **Scoring**: Quantitative scoring of strategy performance
- **Lifecycle**: Draft → Testing → Verified → Deprecated

## API
- `GET /api/strategies` — List strategies

## Integration
- Consumed by: Evolution Engine for strategy patches
- Backtest Bridge connects strategy params to historical verification
- Mock backtest bridge implemented; production backtest engine is pending

## Status
- Strategy creation and lifecycle: Implemented
- Mock backtest bridge: Implemented
- Production backtest engine: Pending
- Evolution linkage: Pending

## Migration

| Before (v4.x) | After (v5.0+) |
|---------------|---------------|
| `import { Strategy } from "@trading-pi/strategy-engine"` | `import { Strategy } from "@trading-pi/core/src/strategy"` |
| `import { scoreStrategy } from "@trading-pi/strategy-engine"` | `import { scoreStrategy } from "@trading-pi/core/src/strategy"` |
