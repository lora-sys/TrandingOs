# Browser Layer (`packages/browser-layer`)

**Status**: Canonical — matches current code

## Purpose
Safe browser automation wrapper for AIO Sandbox. Provides an action contract that browser skills use to interact with web pages through the Docker sandbox at `:8080`.

## Key Concepts
- **AIO Sandbox**: Docker container running Playwright/Firefox for safe browser automation
- **Action Contract**: Standardized interface for search, open, extract, screenshot, PDF operations
- **Evidence Artifacts**: All browser actions produce traceable evidence artifacts

## API
Browser actions go through `apps/web/server/api.ts` → browser-layer package → AIO Sandbox Docker container.

## Dependencies
- Docker (aio-sandbox image)
- `AIO_SANDBOX_BASE_URL` env var for sandbox endpoint

## Status
- Contract implemented and tested
- E2E requires configured `AIO_SANDBOX_BASE_URL`
- Local fallback: Playwright direct (when sandbox unavailable)
