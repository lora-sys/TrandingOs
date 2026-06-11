# Procedural Memory

## [mvp-chat-ui] Fixing HeroUI v3 Type Errors
Type: procedure
Trust: 5
Source: tsc --noEmit analysis, apps/web/src/routes/*.tsx, apps/web/src/components/*.tsx
Status: verified

Content:
When encountering HeroUI v3 type errors:
1. For Chip `variant="flat"` → change to `variant="soft"`
2. For Chip `variant="solid"` → change to `variant="primary"`
3. For Chip `color="primary"` → change to `color="accent"`
4. For Button `variant="flat"` or `variant="solid"` → change to `variant="soft"` or `variant="primary"`
5. For Button `children` type error: the HeroUI v3 Button extends ButtonRootProps which doesn't include children in its type. Fix by wrapping content or using type-safe wrapper

Supersedes: none

---

## [mvp-chat-ui] Using ai-elements Artifact in Chat Feed
Type: procedure
Trust: 4
Source: Evolution report analysis
Status: verified

Content:
To render artifacts in chat feed properly:
1. Import Artifact, ArtifactHeader, ArtifactTitle, ArtifactDescription, ArtifactActions, ArtifactAction, ArtifactContent
2. Wrap artifact data in Artifact → ArtifactHeader (with title + badge) → ArtifactContent (with content)
3. Use ArtifactActions for copy/export buttons
4. This replaces manual card rendering with border/background/padding

Supersedes: none

---

## [mvp-chat-ui] Enabling Streaming Animation
Type: procedure
Trust: 4
Source: ai-elements message.tsx inspection
Status: verified

Content:
MessageResponse from ai-elements wraps Streamdown with plugins (cjk, code, math, mermaid). It accepts `isAnimating` prop for typewriter effect. To enable streaming:
1. When content is being received, track a `streamingContent` state
2. Pass `isAnimating={true}` to MessageResponse when content is being streamed
3. Gradually append text chunks instead of setting full content at once
4. The Streamdown component handles the animation internally via Streamdown's built-in animation support

Supersedes: none
