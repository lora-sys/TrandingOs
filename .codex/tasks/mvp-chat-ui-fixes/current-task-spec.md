# Current Task Spec

## Task ID
mvp-chat-ui-fixes

## Goal
Polish the chat UI to production-quality: complete CSS redesign with terminal-aesthetic dark theme, proper 3-column layout, ai-elements integration with mono font SSE streaming, Inspector restyling.

## Non-Goals
- Backend changes (API server, agent, skills, workflows stay untouched)
- Changing other pages (Market, Research, etc.)
- Adding new features beyond UI polish
- pi-web-ui migration

## Affected Files
- `apps/web/src/styles.css` — Complete CSS redesign with design token system
- `apps/web/src/components/ChatWorkspace.tsx` — Use CSS classes, clean inline styles
- `apps/web/src/components/Inspector.tsx` — Restyle with new CSS classes
- `apps/web/src/components/Layout.tsx` — Brand markup refinement
- `apps/web/src/routes/ChatPage.tsx` — Already simplified (single ChatWorkspace)
- `apps/web/server/api.ts` — SSE streaming endpoint (done)
- `apps/web/src/api.ts` — SSE client (done)

## Acceptance Criteria
- [ ] Dark terminal theme renders correctly (background #080b10, cyan/emerald accents)
- [ ] Three-column layout: sidebar (210px) | chat (max 900px) | inspector (320px)
- [ ] AI responses display in JetBrains Mono 14px
- [ ] SSE streaming with isAnimating typewriter effect
- [ ] Status badge shows READY / RUNNING / ERROR correctly
- [ ] Tool calls collapsible with status indicators
- [ ] Artifact preview is click-to-load (not auto-fetch)
- [ ] Right panel shows timeline/skills/approvals/runtime properly
- [ ] All HeroUI v3 type errors fixed
- [ ] No console errors on page load
- [ ] Chat messages send and receive via SSE

## Verification Plan
- **Typecheck:** `cd apps/web && npx tsc --noEmit`
- **E2E:** playwright-cli — open browser, send message, verify streaming response

## Dependencies
- Evolution Loop completed (iteration 1, drift score 20 — minor)
- ai-elements installed at apps/web/src/components/ai-elements/
