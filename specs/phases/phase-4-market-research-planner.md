# Phase 4 - Market Research Planner

## Goal
Build the local-first market, research, and trade-planning layer for Trading Pi while preserving a single core Trading Pi Agent and Workflow + Skills execution.

## Scope
This phase expands real market data coverage, adds AI research artifacts, and makes trade planning a first-class workflow. The system must use CoinGecko and CCXT as separate sources, expose source failures plainly, and never fabricate market data.

## Tasks
- [ ] Register `market.snapshot`, `research.asset`, `research.report`, and `risk.tradePlan` skills.
- [ ] Add `research.asset` workflow that gathers market data and calls AI to generate a Research Report artifact.
- [ ] Enhance `trade.plan` workflow with explicit direction, budget, entry, stop, and take-profit inputs.
- [ ] Generate Trade Plan and Risk Report artifacts for every completed trade-planning run.
- [ ] Add Market, Research, and Planner API/UI surfaces.
- [ ] Surface CCXT/CoinGecko source status and errors in the UI without fallback fakery.

## Deliverables
- Phase 4 spec and checklist.
- New/updated Skills and Workflows.
- Research Report, Trade Plan, and Risk Report artifacts.
- Market, Research, and Planner pages in the TanStack frontend.

## Acceptance Criteria
- `POST /api/workflows/research.asset/run` creates a Research Report artifact using real AI.
- `POST /api/workflows/trade.plan/run` creates Trade Plan and Risk Report artifacts.
- `GET /api/artifacts/:id` returns artifact metadata and markdown content.
- Market data shows CoinGecko and CCXT independently, including failure reasons.
- All workflow/skill runs create timeline events.
- No real trading order is submitted.

## Test Plan
- Run `npm run check`.
- Run `npm run test`.
- Run `npm run build`.
- Use browser E2E to run `/research ETH` and `/plan ETH/USDT 100 spot`.
- Confirm artifact cards and timeline events appear.

## Demo Requirement
Open the local Docker page in a browser, run the chat slash commands, and save screenshots under `output/playwright/`.
