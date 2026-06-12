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
