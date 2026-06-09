# Phase 3 - Workflow + Skill Execution + Market Data

## Goal

Implement the first real Trading Pi workflows and skills: AI response, market data from CoinGecko and CCXT, artifact creation, approval gating, and observable workflow/skill runs.

## Scope

- Skill SDK and Skill Registry.
- Workflow Engine with visible runs and node status.
- Market skills using both CoinGecko and CCXT.
- Artifact Engine for Research Reports and Trade Plans.
- Approval Engine for dangerous actions.
- Workflow endpoints and UI workflow controls.

## Tasks

- [ ] Define `TradingSkill` and `TradingWorkflow` interfaces.
- [ ] Register core skills: `ai.respond`, `market.coingecko.quote`, `market.ccxt.ticker`, `market.ccxt.ohlcv`, `artifact.create`, `approval.request`, `risk.positionSizing`.
- [ ] Register workflows: `chat.respond`, `market.snapshot`, `trade.plan`.
- [ ] Persist workflow runs and skill runs in SQLite.
- [ ] Emit timeline events for workflow and skill lifecycle.
- [ ] Create Artifact rows and Markdown files for important outputs.
- [ ] Gate dangerous actions with Approval records.
- [ ] Add API endpoints to list skills, workflows, runs, artifacts, approvals.
- [ ] Add UI controls for market snapshot and trade plan workflow.

## Deliverables

- Skill Registry and Workflow Engine.
- Real CoinGecko quote skill.
- Real CCXT ticker/OHLCV skills.
- Artifact and Approval APIs.
- UI showing workflow runs, skill runs, artifacts, approvals, and market output.

## Acceptance Criteria

- Market snapshot workflow uses both CoinGecko and CCXT when network/exchange access is available.
- Trade plan workflow calls real AI and real market/risk skills.
- Every workflow and skill run is stored and visible.
- Important workflow outputs generate Artifact records/files.
- Dangerous actions create Approval records and are blocked until approved.
- No AI decision logic is hardcoded.

## Test Plan

- Unit test Skill Registry and Workflow Engine.
- Integration test CoinGecko and CCXT skills with graceful failure records.
- Integration test trade plan artifact creation.
- Browser/Playwright test: run market snapshot and verify timeline/artifact output.

## Demo Requirement

Use the browser to trigger a market snapshot or trade plan workflow, then capture a screenshot showing chat/workflow/timeline/artifact state.

