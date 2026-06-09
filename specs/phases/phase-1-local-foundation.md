# Phase 1 - Local Foundation + Pi Reuse Validation

## Goal

Create a local-first project foundation that can run from source or Docker, persists data locally with SQLite/files, and proves the Pi packages can be reused for Trading Pi.

## Scope

- Node 22+ monorepo with API, web, and shared/core runtime packages.
- Local storage directory `.trading-pi/` with SQLite, JSONL sessions, artifacts, logs, and memory files.
- Docker local runner that mounts project data instead of provisioning cloud-style infrastructure.
- OpenAI-compatible AI client wired from `.env`.
- Langfuse wrapper for observable AI/workflow/skill spans.
- Pi reuse validation for agent core, AI core, and Pi Web UI package compatibility.

## Tasks

- [x] Define local-first phase plan and checklists.
- [ ] Initialize monorepo, TypeScript configs, and package scripts.
- [ ] Add `.gitignore` and `.env.example` without committing real secrets.
- [ ] Create API/web/core package structure.
- [ ] Add SQLite schema/migration bootstrap.
- [ ] Add local storage directory bootstrap.
- [ ] Add Dockerfile and docker-compose local runner.
- [ ] Add API health endpoint.
- [ ] Add AI ping endpoint using `@earendil-works/pi-ai`.
- [ ] Add Langfuse trace wrapper.
- [ ] Validate `@earendil-works/pi-agent-core` import and event stream.
- [ ] Validate `@earendil-works/pi-web-ui` compatibility and document direct/partial/no reuse decision.

## Deliverables

- Running local app and Docker app.
- SQLite database file under `.trading-pi/`.
- Health, AI ping, and runtime status endpoints.
- Pi reuse notes in `docs/pi-reuse.md`.
- Phase 1 checklist updated with actual status.

## Acceptance Criteria

- `npm run dev` starts API and web locally.
- `docker compose up` starts the same app for another local user.
- Browser opens the web UI and shows health/runtime status.
- AI ping makes a real model call using `.env` config.
- Langfuse wrapper attempts a real trace when configured and gracefully degrades when not configured.
- No Postgres, Redis, or cloud-only dependency is required.

## Test Plan

- Run TypeScript checks.
- Run unit tests for config, storage, and health/runtime services.
- Run integration smoke against health and AI endpoints.
- Use Browser/Playwright CLI to open the app and capture a screenshot in `output/playwright/`.

## Demo Requirement

Open the local web app in a browser, verify the local-first status panel, and capture a screenshot.

