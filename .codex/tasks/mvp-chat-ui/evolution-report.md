# Evolution Report

## Task
- id: mvp-chat-ui
- goal: Migrate ChatWorkspace to ai-elements, matching concept design
- branch: feature/mvp-chat-ui

## What Worked
- ai-elements components (Conversation, Message, MessageContent, MessageResponse, Tool, PromptInput) rendered correctly
- Conversation stick-to-bottom scroll works via `use-stick-to-bottom`
- PromptInput + PromptInputTextarea + PromptInputSubmit form works for sending messages
- MessageResponse renders Streamdown markdown correctly
- Tool components collapsible with status badges
- ArtifactPreviewPanel uses ai-elements Artifact component with tabs
- Dark theme CSS variables render correctly

## What Failed
- buildFeed() interleaves timeline events (tool calls, system events) with messages causing content mixing
- 21 pre-existing HeroUI v3 type errors remain unfixed (Chip variant="flat" → "soft", Button children type issues, Button variant mismatches)
- No real streaming — backend uses request/response, no SSE/WebSocket
- MessageResponse `isAnimating` prop not used — no typewriter effect
- AI responses don't use mono font (JetBrains Mono)
- Conversation area has no max-width constraint — can overflow
- Artifact component not used for rendering artifacts within chat feed (manual card instead)
- prompt-input.tsx has type error: openDelay/closeDelay not valid on HoverCard

## Root Causes
1. **Content mixing**: buildFeed() was designed to interleave tool events between messages based on timestamp proximity, but the logic pushes ALL timeline events into the feed regardless of message context
2. **No streaming**: Backend API server (`server/api.ts`) uses request/response pattern with no SSE support. Frontend uses polling (refetchInterval: 4000) instead of streaming
3. **Type errors**: HeroUI v3 uses different variant/color types than v2. Chip: `"flat"`→`"soft"`, `"solid"`→`"primary"`, color `"primary"`→`"accent"`. Button: same variant changes, plus React 19 children type issue with ButtonRootProps
4. **Layout unconstrained**: Conversation uses `minmax(360px, 1fr)` instead of fixed max-width with proper centering
5. **Artifact component not embedded in feed**: Manual card rendering instead of Artifact + ArtifactHeader + ArtifactContent

## Fix Patterns
1. **Type fixes**: Change variant/color values to HeroUI v3 valid values. For Button children, use wrapper or type assertion
2. **Feed separation**: Split buildFeed() into separate render zones: messages in Conversation, artifacts as proper Artifact cards, system logs in separate section
3. **Streaming**: Add isAnimating prop to MessageResponse for typewriter effect. Future: implement SSE backend
4. **Layout constraints**: Add max-w-3xl/4xl to Conversation container, center with auto margins
5. **Mono font**: Add font-mono class to MessageResponse for AI responses
6. **Artifact in feed**: Use Artifact + ArtifactHeader + ArtifactTitle + ArtifactContent for artifact cards in chat

## Reusable Procedures
- HeroUI v3 variant mapping: `flat`→`soft`, `solid`→`primary`
- Chip color mapping: `primary`→`accent` (since HeroUI v3 Chip color uses `"default"|"accent"|"danger"|"success"|"warning"`)
- ai-elements Artifact component usage pattern for artifact cards

## Skill Candidates
- `heroui-v3-migration-guide` — track HeroUI v3 API differences (variant/color prop changes, Button children type)
- `chat-workspace-layout` — reusable pattern for constrained chat layout with mono font + streaming

## Drift Signals
- Review approved the mvp-chat-ui task, but the actual user experience is poor: content mixing, no streaming, unconstrained layout
- Verification state shows typecheck as `partial` but no follow-up action was taken
- The user's actual expectations (streaming, mono font, proper Artifact usage, constrained layout) are not reflected in the task spec's acceptance criteria

## Recommended Next Entry
- development — fix the known issues (type errors, feed separation, streaming, layout, Artifact usage) in a new development iteration
