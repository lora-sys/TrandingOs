# Phase 6 - OS Upgrade Foundation

## Goal
Upgrade Trading Pi from Agent + Workflow + Skills into the first Trading Operating System foundation without changing the single-agent architecture or completed core engines.

## Scope
This phase adds OS domain foundations for MCP Hub, Browser Layer, Search Hub, Research Hub, Workspace System, Memory Engine, Journal package, Strategy Engine, Marketplace, data cache, config-driven permissions, and Artifact Preview.

## Tasks
- [ ] Add local-first config for search, sandbox, trading mode, exchange fallback, and API keys without logging secrets.
- [ ] Add SQLite tables for MCP, marketplace, workspaces, audit records, cache, strategies, backtests, and artifact preview metadata.
- [ ] Add package foundations: `packages/search-hub`, `packages/browser-layer`, `packages/memory-engine`, `packages/journal`, `packages/strategy-engine`.
- [ ] Register OS foundation skills for search, browser, MCP health, workspace creation, marketplace seed, strategy creation, backtest bridge, and artifact preview.
- [ ] Register OS workflows: `os.bootstrap` and `strategy.backtest`.
- [ ] Add OS API endpoints for workspace, MCP, marketplace, search, browser health, strategies, backtests, audit, and artifact preview.
- [ ] Add Hero UI v3 + React 19 + Tailwind CSS v4 frontend foundation.
- [ ] Add Workspace Manager, Marketplace shell, and Artifact Preview Panel without breaking Chat Workspace.

## Deliverables
- v4.1 spec and updated concept images committed.
- OS foundation packages and API.
- Hero UI frontend foundation.
- Browser E2E screenshot.

## Acceptance Criteria
- `npm run check`, `npm run test`, and `npm run build` pass.
- Docker app starts from local `main` branch derived feature branch.
- `/api/status` redacts integration secrets and shows configured state only.
- `/api/workflows/os.bootstrap/run` creates default workspace/MCP/marketplace records and artifact.
- `/api/artifacts/:id/preview` returns content and preview metadata.
- Browser Layer reports AIO Sandbox configured/unconfigured state; no direct Playwright agent integration exists.
- Chat Workspace still renders and composer works.

## Test Plan
- Run unit tests for new domain tables and skills.
- Run API smoke tests for health/status/os.bootstrap/artifact preview.
- Use browser to verify Hero UI shell, Chat Workspace, Marketplace, Workspace Manager, and Artifact Preview.

## Demo Requirement
Open Docker app in browser and save `output/playwright/hero-ui-foundation.png`.
