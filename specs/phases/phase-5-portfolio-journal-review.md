# Phase 5 - Portfolio Journal Review

## Goal
Build the local paper-trading, journal, and review layer so Trading Pi can track simulated execution and produce reflective review artifacts without enabling real trading.

## Scope
This phase adds local SQLite tables for paper orders, trades, positions, journal entries, and reviews. It adds safe paper trading only, journal creation, and daily review workflows that calculate basic metrics and discipline scoring.

## Tasks
- [ ] Add SQLite tables for `orders`, `trades`, `positions`, `journal_entries`, and `reviews`.
- [ ] Register `paper.order.create`, `journal.entry.create`, `review.daily`, and `artifact.read` skills.
- [ ] Implement `POST /api/paper/orders` for local simulated orders only.
- [ ] Implement portfolio/trades/journal/review API endpoints.
- [ ] Implement Daily Review workflow with metrics, journal context, and Review Report artifact.
- [ ] Add Portfolio, Journal, and Review Center pages using TanStack Table.

## Deliverables
- Phase 5 spec and checklist.
- Local paper-trading persistence.
- Journal entry creation.
- Daily Review artifact generation.
- Portfolio, Journal, and Review UI pages.

## Acceptance Criteria
- Paper orders never touch a live exchange API.
- `POST /api/paper/orders` creates local order/trade/position rows.
- `POST /api/journal` creates a local journal entry and artifact.
- `POST /api/workflows/review.daily/run` creates a Daily Review artifact.
- Portfolio, trades, journal, and review data render in the UI.
- Dangerous live-trade style operations remain approval gated or unavailable.

## Test Plan
- Run `npm run check`.
- Run `npm run test`.
- Run `npm run build`.
- Create a paper order by API and UI.
- Create a journal entry by API and UI.
- Run daily review and verify Review artifact.

## Demo Requirement
Open the local Docker page in a browser, create a paper order, add a journal entry, run daily review, and save screenshots under `output/playwright/`.
