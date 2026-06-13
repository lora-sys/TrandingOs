# Phase 3 Checklist - Workflow + Skill Execution + Market Data

## Skill Registry

- [x] Trading Skill SDK defined.
- [x] Skill Registry defined.
- [x] `ai.respond` registered.
- [x] `market.coingecko.quote` registered.
- [x] `market.ccxt.ticker` registered.
- [x] `market.ccxt.ohlcv` registered.
- [x] `risk.positionSizing` registered.
- [x] `artifact.create` registered.
- [x] `approval.request` registered.

## Workflow Engine

- [x] Workflow SDK defined.
- [x] Workflow Engine persists workflow runs.
- [x] Skill runs are persisted.
- [x] `chat.respond` workflow registered.
- [x] `market.snapshot` workflow registered.
- [x] `trade.plan` workflow registered.

## Artifacts / Approvals

- [x] Artifact rows persisted.
- [x] Artifact markdown files written.
- [x] Approval rows persisted.
- [x] Dangerous skill/action is blocked before execution.

## UI

- [x] Skill list visible.
- [x] Workflow list visible.
- [x] Market snapshot workflow can be triggered.
- [x] Trade plan workflow can be triggered.
- [x] Artifacts and approvals visible.

## Verification

- [x] Unit tests cover Skill Registry.
- [x] Unit tests cover Workflow Engine.
- [x] Integration test covers CoinGecko.
- [x] Integration test covers CCXT. Binance returned a real 451 restricted-location response in this environment; failure is recorded observably.
- [x] Browser screenshot captured after workflow run.
