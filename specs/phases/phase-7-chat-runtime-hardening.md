# Phase 7 - Chat Runtime Hardening

## Goal
Turn the current OS foundation into a more complete executable cockpit: HeroUI-first Chat Workspace, runtime completeness audit, stronger memory/MCP/browser visibility, and repeatable E2E demo evidence.

## Scope
This phase hardens existing modules. It must not replace `TradingPiAgent`, Workflow Engine, Skill Registry, or Artifact Engine.

## Tasks
- [ ] Upgrade Chat Workspace feed and composer with HeroUI v3 components while preserving TanStack Query/Form/Virtual behavior.
- [ ] Add richer chat cards for message, skill/workflow run, artifact, and approval states.
- [ ] Verify current phases against `specs/design.md`, concept images, and OS addendum.
- [ ] Document completed vs missing requirements in `docs/project-status.md`.
- [ ] Add MCP/Memory/Browser/Artifact Preview visibility to E2E coverage.
- [ ] Record browser E2E video and screenshots into `output/playwright/`.
- [ ] Define next-phase plan for MCP Discovery, Workspace memory binding, Research Hub orchestration, and Strategy/Evolution.

## Deliverables
- HeroUI-first Chat Workspace update.
- Updated project status and gap analysis.
- Phase 7 checklist.
- Browser E2E screenshots and video.

## Acceptance Criteria
- `npm run check`, `npm run test`, and `npm run build` pass.
- Chat page renders with HeroUI cards/chips/buttons and working composer.
- `/research`, `/plan`, `/review-day`, and plain AI chat still route through real workflow/skill/agent paths.
- Inspector shows timeline, skills, approvals/risk, MCP/Sandbox/Memory/AI/mode status.
- Artifact Preview Panel can read latest artifact preview content.
- Workspaces and Marketplace pages still render.
- Browser E2E saves screenshots and a video.

## Test Plan
- API smoke: `/api/health`, `/api/status`, `/api/memory`, `/api/mcp/servers`, `/api/browser/health`, `/api/artifacts`.
- Workflow smoke: `os.bootstrap`, `research.asset`, `trade.plan`, `review.daily`.
- Browser E2E:
  - Open Chat.
  - Verify HeroUI chat feed and composer.
  - Run `/research ETH`.
  - Verify Artifact Preview and Timeline update.
  - Open Workspaces and Marketplace.
  - Save screenshots and video.

## Demo Requirement
Use Playwright/Browser to save:

- `output/playwright/phase-7-chat-runtime.png`
- `output/playwright/phase-7-workspaces.png`
- `output/playwright/phase-7-marketplace.png`
- `output/playwright/phase-7-e2e.webm`
