# Decision Memory

## [mvp-chat-ui] Decision: Migrate from TanStack Virtual to ai-elements Conversation
Type: decision
Trust: 5
Source: current-task-spec.md, review.md
Status: verified

Content:
Replaced TanStack Virtual message list with ai-elements Conversation + StickToBottom for scroll behavior. Rationale:
- ai-elements provides pre-built chat-specific components with proper scroll-to-bottom
- TanStack Virtual was over-engineered for a chat list that doesn't need virtualization
- Conversation provides built-in empty state and scroll button

Supersedes: none

---

## [mvp-chat-ui] Decision: Keep backend polling instead of implementing SSE
Type: decision
Trust: 3
Source: review.md issue note, user feedback
Status: inferred

Content:
Current implementation uses TanStack Query polling (refetchInterval: 4000) instead of SSE/WebSocket streaming. This was likely a scope tradeoff — task spec said "Backend changes: no" (non-goal). Result: no real-time streaming. User explicitly wants streaming.

Supersedes: none

---

## [mvp-chat-ui] Decision: buildFeed() merged timeline events into message feed
Type: decision
Trust: 3
Source: ChatWorkspace.tsx analysis
Status: verified

Content:
buildFeed() was designed to show tool call progress between AI responses by interleaving timeline events (tool.start, tool.result, pi.prompt) with messages. The approach tried to match tool events to their parent message using a positional cursor. This resulted in system logs and agent events appearing as chat messages — poor UX.

Should have split: messages in Conversation, tools as inline collapsible within their parent Message, artifacts as Artifact cards, system logs in a separate panel.

Supersedes: none

---

## [mvp-chat-ui] Decision: Next iteration scope
Type: decision
Trust: 5
Source: evolution-report.md
Status: verified

Content:
Next development iteration should fix:
1. HeroUI v3 type errors (21 across 8 files)
2. Chat feed separation (messages, tools, artifacts in proper containers)
3. Streaming animation via MessageResponse isAnimating
4. Mono font for AI responses
5. Layout constraints (max-width, centering)
6. Proper Artifact component usage in feed

Supersedes: none
