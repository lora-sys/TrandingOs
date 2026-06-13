# Project Spec — 2026-06-11

## Scope
Build a working MVP of Trading Pi OS that completes a real closed loop:
User Input → Chat → Agent → Workflow → Skills → Artifact → Preview → Approval → Journal

## MVP Constraints
- Single agent (TradingPiAgent), no multi-agent
- Local-first: SQLite + files, no cloud dependencies
- Paper trading default, live requires explicit approval
- ai-elements for chat UI, HeroUI for other UI components
- AI model: deepseek-v4-flash via token.sensenova.cn

## Frontend Architecture
- Chat UI: ai-elements (Conversation, Message, MessageResponse, Tool, Confirmation, PromptInput)
- Artifact Preview: ai-elements Artifact + HeroUI Tabs
- Layout: 3-column (sideNav + workspace + inspectorRail)
- Inspector: Timeline + Skills + Risk + Runtime status
- Routes: Chat, Market, Research, Planner, Portfolio, Journal, Review, Evolution, Marketplace, System, etc.

## Implementation Priorities
1. ChatWorkspace → ai-elements migration (high)
2. ArtifactPreviewPanel → ai-elements Artifact (medium)
3. Playwright E2E validation (high)

## Test Strategy
- E2E via Playwright: real browser, real API calls
- Test every MVP user story from specs/userstory.md