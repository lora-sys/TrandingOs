# Phase 13 - Research Hub Market Data Layer

## Goal
Route Research through Research Hub and expand market data to multi-source + router health.

## Scope
Research sources, Search Hub, Browser Layer, Memory, CoinGecko, CoinMarketCap, DefiLlama, CCXT fallback router.

## Tasks
- [x] Add `packages/research-hub`.
- [x] Build Research Bundle with sources and source quality.
- [x] Route `research.asset` through market, search, browser, and memory sources.
- [x] Add CoinMarketCap and DefiLlama attempts with explicit failure/unavailable states.
- [x] Cache market/search results and write audit records.

## Deliverables
Research Hub package, richer research reports, source quality, market data layer metadata.

## Acceptance Criteria
Research Report artifacts contain sources, source quality, market snapshot, and unavailable/failure reasons.

## Test Plan
Run mock/unconfigured source tests, API smoke for `/research ETH`, and Playwright Research demo.

## Demo Requirement
Save `output/playwright/phase-13-research-hub.png` and video when available.
