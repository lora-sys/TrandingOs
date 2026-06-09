# Phase 11 - AIO Browser Layer Artifact Preview

## Goal
Make Browser Layer a real AIO Sandbox contract that produces browser session records and artifacts.

## Scope
Browser actions, sessions, explicit unavailable state, artifact preview for Markdown/HTML/PDF/screenshots.

## Tasks
- [x] Expand `packages/browser-layer` action contract.
- [x] Add `/api/browser/actions`, `/api/browser/sessions/:id`, `/api/browser/artifacts/:id`.
- [x] Generate browser evidence artifacts from Browser Skills.
- [x] Add preview tabs for Markdown, HTML, PDF, Data, and Meta.
- [x] Keep unconfigured AIO as explicit unavailable evidence.

## Deliverables
Browser action API, browser session persistence, browser artifacts, preview panel tabs.

## Acceptance Criteria
`/browser search ETH risks` creates browser evidence through Trading Pi Agent and does not fake AIO success when unconfigured.

## Test Plan
Run BrowserLayer unit coverage through core tests and Playwright Chat/Artifact Preview flow.

## Demo Requirement
Save `output/playwright/phase-11-browser-preview.png` and video when available.
