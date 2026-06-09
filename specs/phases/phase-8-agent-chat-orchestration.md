# Phase 8 - Agent Chat Orchestration

## Goal
Move Chat Workspace execution from frontend slash-command branching to the backend `TradingPiAgent`, so the chat entry point follows `TradingPiAgent -> Workflow -> Skills -> Artifact`.

## Scope
This phase hardens chat routing only. It does not claim full MCP Hub, Browser Layer, or Memory Engine completion.

## Tasks
- [ ] Route slash commands in `TradingPiAgent`.
- [ ] Preserve normal Pi Agent AI/tool-use path for non-slash prompts.
- [ ] Add timeline evidence for backend intent routing.
- [ ] Return workflow result metadata from `/api/session/message`.
- [ ] Remove frontend `runWorkflow` branching from Chat Workspace.
- [ ] Add core test proving slash commands route through `TradingPiAgent`.
- [ ] Add Vision document to `specs/version.md`.
- [ ] Update project status to mark Phase 8 progress and next gaps.

## Deliverables
- Backend chat orchestration.
- Updated frontend Chat Workspace submit path.
- Phase 8 checklist.
- Updated Vision/status docs.

## Acceptance Criteria
- `/research ETH`, `/plan ETH/USDT 100 spot`, `/review-day`, `/backtest ma ETH/USDT 1h`, and `/bootstrap-os` are sent through `/api/session/message`.
- Frontend Chat Workspace does not call `runWorkflow()` for slash commands.
- Backend timeline contains `agent.intent` events for routed workflow commands.
- Workflow outputs still generate artifacts and preview metadata.
- `npm run check`, `npm run test`, `npm run build` pass.
- Playwright E2E verifies chat -> Agent routing -> workflow artifact -> preview panel.

## Test Plan
- Unit: `TradingPiAgent.prompt("/bootstrap-os")` creates workflow run, timeline, and artifact without external AI.
- API smoke: POST `/api/session/message` with `/bootstrap-os` returns `workflowResult`.
- Browser E2E: enter `/research ETH`, wait for workflow completion, verify Artifact Preview and Timeline.

## Demo Requirement
Save:

- `output/playwright/phase-8-agent-chat-orchestration.png`
- `output/playwright/phase-8-agent-chat-orchestration.webm`
