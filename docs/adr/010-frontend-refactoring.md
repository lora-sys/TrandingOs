# ADR-010: Frontend Architecture Refactoring (2026-06-14)

**Date**: 2026-06-14
**Status**: Accepted
**Trigger**: Architecture Review (improve-codebase-architecture skill)

## Context

An architecture review identified 7 deepening opportunities across the Trading Pi OS frontend codebase. The most severe issues were:

1. **ChatWorkspace was a 959-line God component** handling 8 distinct responsibilities (SSE streaming, RPC routing, export logic, model picking, command palette, artifact panel, keyboard shortcuts, subagent sidebar) with 20+ `useState` declarations and stale closure bugs via `useCallback(..., [])`.
2. **Zero route code-splitting** — all 9 pages including the 1550-line chat+mvp tree loaded in the initial bundle.
3. **Duplicated logic** — export in 2 places, subagent state in 2 places, settings state in 3 places, SSE parsing in 2 places, format functions in 2 places, theme resolution in 2 places.
4. **4 shallow packages** (journal, memory-engine, strategy-engine, research-hub) adding indirection without depth.

## Decision

### Applied Changes

#### 1. ChatWorkspace Decomposition (STRONG recommendation applied)

Extracted 5 focused modules from the God component:

| Module | Type | Interface | Lines Saved |
|--------|------|-----------|-------------|
| `useSSEStream` | React hook | `{ items, send, abort, status, error, nextId }` | ~250 lines |
| `useRpcRouter` | React hook | `{ rpc, register, refreshState }` | ~200 lines |
| `useModelPicker` | React hook | `{ model, models, open, search, select }` | ~60 lines |
| `useCommandBar` | React hook | `{ open, actions, setActions }` | ~80 lines |
| `ExportService` | Pure module | `toHtml(), toMarkdown(), toPdf()` | ~100 lines |

**Result**: ChatWorkspace went from 959 lines to ~520 lines (-46%). All hooks expose small interfaces hiding complex internals. Each hook is independently testable.

#### 2. Route Code-Splitting (STRONG recommendation applied)

Converted all 9 route imports to `React.lazy()` with `Suspense` boundaries and a shared `PageFallback` spinner component.

**Result**: Initial JS bundle reduced by estimated 60-70%. Charts, research UI, and chat only load when navigating to workspace routes.

#### 3. Logic Deduplication (WORTH EXPLORING recommendations applied)

| Duplication | Resolution | Files Changed |
|-------------|-----------|---------------|
| Export (HTML/MD/PDF) | Single `lib/exportService.ts` | ChatWorkspace, ExportMenu |
| Subagent state | Elevated to Zustand store | AppLayout, ChatWorkspace, settingsStore |
| Settings state (model/thinking/compaction) | Reads from store, not local useState | SettingsPage |
| SSE parsing | Shared `parseSSEStream()` in api.ts | sendMessageStream, startDeepResearchStream |
| Format functions | Shared `lib/format-utils.ts` | DashboardPage, MarketPage |
| Theme resolution | Shared `useResolvedTheme()` hook | AppLayout, ChatWorkspace |

#### 4. Shallow Package Consolidation (SPECULATIVE — applied with caution)

Inlined content of 4 shallow packages into `@trading-pi/core`:

| Package | Target in Core | Rationale |
|---------|----------------|-----------|
| `journal` (17L) | `core/src/journal.ts` | One function — pass-through |
| `memory-engine` (37L) | `core/src/memory/types.ts` | Types + 3 helper functions |
| `strategy-engine` (14L) | `core/src/strategy.ts` | One scoring function |
| `research-hub` (83L) | `core/src/research/bundle.ts` | Assembly function |

Original packages retained as backward-compat shims. All internal imports updated to use relative paths within core.

#### 5. Dead Code Cleanup (SPECULATIVE — applied)

- Removed 5 dead barrel exports from `pi-web-ui/index.ts`
- Marked 2 legacy types as `@deprecated` in `core/types.ts`
- Created shared utilities for duplicated format/theme code

### Design Principles Followed

- **Deletion test applied**: Each extracted module was verified to earn its keep — deleting it would scatter complexity across N callers.
- **Interface is the test surface**: Each hook exposes a minimal interface; internals are hidden behind the seam.
- **One adapter = hypothetical seam; Two adapters = real seam**: ExportService has 2 consumers (RPC handler + ExportMenu) = confirmed real seam.
- **Locality over distribution**: Related workspace page components grouped under `pages/workspace/` instead of scattered flat files.

## Consequences

### Positive

- **Testability**: useSSEStream can be tested by mocking `tradingPiApi`; useRpcRouter can be tested with mock handlers; ExportService can be tested in Node without React.
- **Maintainability**: Changing export format requires editing 1 file instead of 2. Adding a new RPC command requires calling `register()`.
- **Performance**: Code-splitting reduces initial bundle size significantly.
- **Cognitive load**: ChatWorkspace is now readable as a pure orchestrator — you can see the full component tree at a glance.
- **Bug prevention**: Stale closure bug eliminated (handlers receive context via injection, not closure capture).

### Trade-offs

- **More files**: 7 new files created (5 hooks + 2 services). This is intentional — each file has a clear single responsibility.
- **Package deprecation**: 4 packages marked deprecated. Existing external consumers of those packages will need to migrate to `@trading-pi/core` imports.
- **Import indirection**: Some utility functions moved to `lib/` may require slightly longer import paths than inline definitions.

### What Was NOT Done (deferred)

- **API typing** (Candidate #03 — HIGH): The `rpc()` function still returns `Promise<unknown>`. This is the highest-impact remaining item but requires touching 60+ method signatures and 33 call sites. Recommended as the next major refactor.
- **Full package deletion**: Deprecated packages kept as shims rather than deleted, to avoid breaking any undiscovered consumers.
- **WorkspacePage ResearchTab extraction**: Left inline because it embeds ChatWorkspace creating a circular dependency with `workspace/components.tsx`.

## References

- Architecture Review Report: `/tmp/architecture-review-20260614.html`
- ARCHITECTURE.md v5.0 (this document updated)
- FRONTEND.md v5.0 (this document updated)
- ADR-007 (Monorepo structure — partially superseded by this ADR for the 4 shallow packages)
