# Phase 1 Checklist - Local Foundation + Pi Reuse Validation

## Environment

- [x] Node >= 22.19.0 verified.
- [x] npm workspace created.
- [x] `.gitignore` excludes `.env`, `.DS_Store`, `.trading-pi/`, `node_modules/`, build outputs, and Playwright outputs.
- [x] `.env.example` documents required local variables without secrets.
- [x] Docker local runner added.

## Pi Reuse

- [x] `@earendil-works/pi-agent-core` installed and imported.
- [x] `@earendil-works/pi-ai` installed and used for a real AI ping.
- [x] `@earendil-works/pi-web-ui` compatibility checked.
- [x] Reuse decision documented in `docs/pi-reuse.md`.

## Local Storage

- [x] `.trading-pi/` bootstrap implemented.
- [x] SQLite database bootstrap implemented.
- [x] JSONL sessions directory bootstrap implemented.
- [x] Artifact directory bootstrap implemented.
- [x] Logs/memory directories bootstrap implemented.

## App Shell

- [x] React app shell created.
- [x] Dark trading cockpit layout created.
- [x] Left nav placeholder created.
- [x] Center chat placeholder created.
- [x] Right timeline/status placeholder created.

## Runtime

- [x] Local API server created.
- [x] Health endpoint created.
- [x] Runtime status endpoint created.
- [x] AI ping endpoint created.
- [x] Langfuse wrapper created.

## Verification

- [x] `npm run check` passes.
- [x] `npm run test` passes.
- [x] `npm run dev` starts.
- [x] `docker compose up` starts.
- [x] Browser screenshot captured.
