# Current Task Spec

## Task ID
mvp-chat-ui

## Goal
Rewrite ChatWorkspace.tsx to use ai-elements (Conversation, Message, MessageResponse, Tool, PromptInput) and ArtifactPreviewPanel to use ai-elements Artifact, matching the concept design in images/frtontend.png.

## Non-Goals
- Backend changes (API server, agent, skills, workflows stay untouched)
- Adding new features beyond UI migration
- Refactoring other pages (Market, Research, etc.)
- Changing the Layout/Inspector components

## Affected Files
- `apps/web/src/components/ChatWorkspace.tsx` — Full rewrite: Conversation + Message + MessageResponse + Tool + PromptInput
- `apps/web/src/components/ArtifactPreviewPanel.tsx` — Enhance with ai-elements Artifact component
- `apps/web/src/styles.css` — CSS adjustments for ai-elements shadcn classes
- `apps/web/src/api/types.ts` — Add/update types if needed for tool call mapping

## Acceptance Criteria
- [ ] Chat uses Conversation (stick-to-bottom scroll) replacing TanStack Virtual
- [ ] Messages render with Message + MessageContent + MessageResponse (Streamdown markdown)
- [ ] Tool calls render with Tool + ToolHeader + ToolContent (collapsible, status badges)
- [ ] Approval/confirmation renders with Confirmation component
- [ ] Input uses PromptInput + PromptInputTextarea + PromptInputSubmit
- [ ] ArtifactPreviewPanel uses ai-elements Artifact component for header/actions/content
- [ ] Agent status (streaming/loading) shown in PromptInputSubmit
- [ ] All existing functionality preserved (send message, view messages, view artifacts)
- [ ] Dark theme renders correctly with shadcn CSS variables

## Verification Plan
- **Typecheck:** `npm run check` (from project root)
- **Unit:** `cd packages/core && npm test`
- **E2E:** Playwright CLI — open browser, test chat flow end-to-end

## Dependencies
- Alignment Loop approved at score 91
- ai-elements components installed at apps/web/src/components/ai-elements/
- shadcn CSS variables defined in styles.css