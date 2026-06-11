# Facts Memory

## [mvp-chat-ui] ai-elements Components Available
Type: fact
Trust: 5
Source: Codebase inspection, apps/web/src/components/ai-elements/
Status: verified

Content:
Chat UI uses ai-elements components installed at apps/web/src/components/ai-elements/:
- Conversation (stick-to-bottom scroll via use-stick-to-bottom)
- Message (user/assistant roles, 95% max-width)
- MessageContent (renders children with proper styling)
- MessageResponse (Streamdown markdown, supports isAnimating)
- Tool (collapsible tool call display)
- PromptInput (form with textarea + submit)
- Artifact (header/title/description/actions/content)
- Confirmation (approval flow)
- Sources (collapsible source list)

Supersedes: none

---

## [mvp-chat-ui] HeroUI v3 Type Constraints
Type: fact
Trust: 5
Source: tsc --noEmit errors, apps/web/src/components/*.tsx
Status: verified

Content:
HeroUI v3 `@heroui/react` uses different variant/color enums than v2:
- Chip variant: `"primary" | "secondary" | "soft" | "tertiary"` (not `"flat"` or `"solid"`)
- Chip color: `"default" | "accent" | "danger" | "success" | "warning"` (not `"primary"`)
- Button variant: `"primary" | "secondary" | "soft" | "tertiary"` (not `"flat"` or `"solid"`)
- ButtonRootProps does not include `children` in type definition (React 19 gap)
- `@heroui/react/button` Button uses React Aria Components under the hood

Supersedes: none

---

## [mvp-chat-ui] Backend API Pattern
Type: fact
Trust: 5
Source: apps/web/server/api.ts
Status: verified

Content:
Backend API uses request/response pattern (Node http.createServer):
- GET /api/messages?sessionId=X — fetch all messages for session
- POST /api/session/message — send message, get response
- No SSE/WebSocket streaming support
- Frontend polls every 4s (refetchInterval: 4000) for updates
- All sessions, artifacts, timeline events stored in SQLite via repos

Supersedes: none

---

## [mvp-chat-ui] Chat Feed Structure
Type: fact
Trust: 5
Source: apps/web/src/components/ChatWorkspace.tsx
Status: verified

Content:
ChatWorkspace uses a `buildFeed()` function that merges messages, timeline events (tool calls), and artifacts into a single `FeedItem[]` array. Timeline events are conditionally interleaved between messages based on a poorly-configured `toolIndex` cursor that pushes ALL events of certain types.

Supersedes: none
