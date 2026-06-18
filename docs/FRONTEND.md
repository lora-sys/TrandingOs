# Trading Pi OS — Frontend Architecture

> **Version**: 5.0 | **Last Updated**: 2026-06-14 | **Post-Architecture-Review Refactoring**
>
> Complete reference for `apps/web/src/` — React 19 frontend with Vite, Tailwind v4, TanStack Router, code-split routing, custom hooks layer, and SSE streaming.

---

## 1. Tech Stack Details

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.7 | UI framework (concurrent features, hooks) |
| **Vite** | 7.2.7 | Dev server + bundler (:5173) |
| **TypeScript** | 5.9.3 | Type safety, strict mode |
| **Tailwind CSS** | 4.3.0 | Utility-first CSS (v4 with `@theme inline`) |
| **@tailwindcss/vite** | 4.3.1 | Vite plugin for Tailwind v4 |
| **@tanstack/react-router** | 1.170.15 | File-based routing, type-safe links, lazy loading |
| **@tanstack/react-query** | 5.101.0 | Server state management, caching, refetch intervals |
| **@tanstack/react-virtual** | 3.14.2 | Virtual scrolling (available, not yet used for chat) |
| **framer-motion** | 12.40.0 | Animation library (stagger, spring, layout) |
| **Zustand** | 5.0.14 | Client-side state (settings + model + subagents) |
| **lucide-react** | 0.468.0 | Icon library (SVG, tree-shakeable) |
| **ai** (Vercel AI SDK) | ^6.0.201 | ChatStatus type import only |
| **shiki** | 3.23.0 | Syntax highlighting in code blocks |
| **streamdown** | ^2.5.0 | Markdown renderer (CJK, math, mermaid, code plugins) |
| **html2pdf.js** | 0.14.0 | PDF export from HTML |
| **cmdk** | ^1.1.1 | Command palette (Cmd+K) |
| **clsx** | ^2.1.1 | Conditional class names |
| **nanoid** | ^3.3.12 | ID generation |
| **use-stick-to-bottom** | ^1.1.6 | Auto-scroll to bottom in chat |

### Base UI Inheritance

The frontend is built on top of **`@earendil-works/pi-web-ui@0.75.3`**, then heavily customized:

- **pi-web-ui components**: Sidebar, settings panel, chat item views, model picker, command palette — imported from `components/pi-web-ui/`
- **ai-elements**: Custom chat components (Conversation, Message, PromptInput, Tool, Artifact, Reasoning, etc.) — in `components/ai-elements/`
- **UI primitives**: shadcn/ui-style base components (Button, Card, Dialog, Input, Select, Tooltip, etc.) — in `components/ui/`

---

## 2. Directory Map (v5.0 — Post Refactor)

```
apps/web/src/
├── api.ts                        # API client: fetch wrapper, health check,
│                                 #   shared parseSSEStream(), 60+ methods
├── api/
│   ├── client.ts                 # Re-export shim → imports from ../api.ts
│   └── types.ts                  # API response types (TimelineEvent, etc.)
│
├── app.tsx                       # App root: RouterProvider + <Router />
├── main.tsx                      # Entry: ReactDOM.createRoot + <App />
├── router.tsx                    # TanStack Router: 9 lazy-loaded routes
│
├── styles.css                    # Design system: CSS variables, @theme, glass tokens
│
├── hooks/                        # ★ NEW (v5.0) — Custom React hooks
│   ├── useSSEStream.ts           # SSE lifecycle, event handling, entries→items
│   ├── useRpcRouter.ts           # Command registry pattern (replaces switch/case)
│   ├── useModelPicker.ts         # Model selection state + search
│   └── useCommandBar.ts          # Keyboard shortcuts + command palette
│
├── lib/                          # Non-React utilities & services
│   ├── settingsStore.ts          # Zustand store (settings + model + subagents)
│   ├── exportService.ts          # ★ NEW (v5.0) — HTML/MD/PDF export (pure functions)
│   ├── format-utils.ts           # ★ NEW (v5.0) — formatUsd(), formatChange()
│   ├── useResolvedTheme.ts       # ★ NEW (v5.0) — Reactive theme resolution hook
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│
├── components/
│   │
│   ├── ai-elements/              # Custom chat UI components (11 active files)
│   │   ├── conversation.tsx      # Scrollable chat container
│   │   ├── message.tsx           # Message bubble component
│   │   ├── prompt-input.tsx      # Multi-line input + attachments + submit
│   │   ├── tool.tsx              # Expandable tool call card
│   │   ├── artifact.tsx          # Artifact display card
│   │   ├── reasoning.tsx         # Thinking/reasoning block
│   │   ├── code-block.tsx        # Shiki syntax highlighter
│   │   ├── chain-of-thought.tsx  # CoT display
│   │   ├── plan.tsx              # Plan card component
│   │   ├── suggestion.tsx        # Quick-reply chips
│   │   └── shimmer.tsx           # Loading skeleton animation
│   │
│   ├── pi-web-ui/                # Inherited base components (15 files)
│   │   ├── index.ts              # Barrel exports (cleaned up in v5.0)
│   │   ├── app-sidebar.tsx       # Collapsible sidebar container
│   │   ├── app-sidebar-content.tsx
│   │   ├── session-sidebar.tsx   # Session list in sidebar
│   │   ├── settings-panel.tsx    # Settings modal (props-driven)
│   │   ├── chat-item-view.tsx    # Unified message/tool/system renderer
│   │   ├── user-message-view.tsx # User message bubble
│   │   ├── command-palette.tsx   # Cmd+K command menu
│   │   ├── model-picker.tsx      # Model selection popover
│   │   ├── context-popover.tsx   # Context window usage
│   │   ├── workspace-status-float.tsx
│   │   ├── extension-dialog.tsx  # Extension interaction
│   │   ├── subagent-detail-sidebar.tsx
│   │   ├── project-launcher.tsx  # (kept for potential future use)
│   │   ├── image-preview-strip.tsx
│   │   ├── prompt-attachments.tsx
│   │   └── ...
│   │
│   ├── ui/                       # shadcn/ui primitives (18 files)
│   │   ├── button.tsx, card.tsx, dialog.tsx,
│   │   ├── input.tsx, select.tsx, textarea.tsx,
│   │   ├── tooltip.tsx, dropdown-menu.tsx,
│   │   ├── scroll-area.tsx, collapsible.tsx,
│   │   ├── badge.tsx, spinner.tsx, separator.tsx,
│   │   ├── alert.tsx, command.tsx, hover-card.tsx,
│   │   ├── input-group.tsx, button-group.tsx
│   │
│   ├── AppLayout.tsx             # Root layout: sidebar + content + settings
│   ├── ChatWorkspace.tsx         # ★ REFACTORED (v5.0) — Thin orchestrator (~520L)
│   ├── ArtifactPanel.tsx         # Artifact sidebar panel
│   └── ExportMenu.tsx            # Export dropdown (uses ExportService)
│
├── core/                         # Business logic & types
│   ├── types.ts                  # All TypeScript types (ChatItem, SessionEntry, etc.)
│   ├── chat-conversion.ts        # syncToItems(): SessionEntry[] → ChatItem[]
│   ├── format.ts                 # copyText(), isEditableTarget()
│   ├── tool-summary.ts           # isToolExpandable(): which tools can expand
│   └── subagents.ts              # subagentList(): SubagentStateMap helpers
│
├── pages/                        # Route page components (9 files)
│   ├── DashboardPage.tsx         # Stats grid + agent status + trades + memory
│   ├── MarketPage.tsx            # Placeholder (animated SVG + feature grid)
│   ├── TimelinePage.tsx          # Event log + status filters + text search
│   ├── WorkspacePage.tsx         # ★ REFACTORED (v5.0) — Orchestrator + ResearchTab inline
│   │                             #   Sub-components extracted to workspace/
│   ├── JournalPage.tsx           # Journal entries list
│   ├── SettingsPage.tsx          # ★ REFACTORED (v5.0) — Uses store, no local state dupes
│   ├── EvolutionPage.tsx         # Evolution proposals + suggestions + rules
│   └── MemoryPage.tsx            # Domain cards + record list + search + filter
│
└── pages/workspace/              # ★ NEW (v5.0) — Extracted workspace page components
    ├── components.tsx            # OverviewTab, DecisionsTab, JournalTab,
    │                             #   ReviewTab, ResearchSessionList, WorkspaceEmpty
    └── workspace-utils.ts        # normalizeJournalEntry, normalizeJournalTrade,
                                  #   deriveMetrics, parseMaybeJson, numberOrUndefined
```

---

## 3. Custom Hooks Architecture (v5.0 New)

### 3.1 Hook Dependency Graph

```
ChatWorkspace.tsx (orchestrator)
  ├── useSSEStream()          ← Core streaming hook
  │     └─ Internal: entriesRef, sseRef, itemCounterRef
  │     └─ Dependencies: tradingPiApi, syncToItems, queryClient
  │
  ├── useRpcRouter(ctx)       ← Command registry
  │     └─ ctx = { items, currentModel, addSystemMessage, abortStream, setError }
  │     └─ Built-in: get_state, abort, compact, set_session_name,
  │                export_html/markdown/pdf → delegates to ExportService
  │     └─ Extensible: register(type, handler)
  │
  ├── useModelPicker(opts)     ← Model selection
  │     └─ opts.onSetModel → calls rpc.rpc({ type: "set_model", ... })
  │
  ├── useCommandBar(opts)     ← Keyboard shortcuts
  │     └─ opts.initialActions → command palette items
  │     └─ opts.isStreaming + opts.onAbort → Escape key behavior
  │
  └── Reads from:
      ├── useSettingsStore (themeMode, showThinking, currentModel,
      │                     subagents, selectedSubagentId)
      └── useResolvedTheme(themeMode) → resolvedTheme string
```

### 3.2 useSSEStream — The Most Critical Hook

**File**: [`hooks/useSSEStream.ts`](../apps/web/src/hooks/useSSEStream.ts)

This hook encapsulates the entire SSE streaming lifecycle that was previously inline in ChatWorkspace.

```typescript
interface UseSSEStreamReturn {
  items: ChatItem[];           // Render-ready chat items
  setItems: Dispatch<...>;      // External mutation (e.g., toggleAllTools)
  status: ChatSubmitStatus;     // "ready" | "submitted" | "streaming" | "error"
  error: string | null;         // Error message when status === "error"
  send: (cmd: PromptCommand) => void;  // Send a message (queues if streaming)
  abort: () => void;             // Abort current stream
  nextId: (prefix: string) => string;  // ID generator
  viewingHistory: boolean;      // History mode flag
  setViewingHistory: (v: boolean) => void;
}
```

**What it hides from callers**:
- `entriesRef: Ref<SessionEntry[]>` — raw wire format accumulator
- `sseRef: Ref<EventTarget | null>` — SSE connection handle
- `itemCounterRef: Ref<number>` — ID sequence counter
- `drainingRef: Ref<boolean>` — message queue drain guard
- 6 event listener registrations on EventTarget
- `syncToItems()` transformation call
- Query cache invalidation on "done"

**Message queuing**: If `send()` is called while `status !== "ready"`, the command is pushed to `queuedMessages`. An auto-drain effect watches for `status === "ready"` and pops the next message.

### 3.3 useRpcRouter — Command Registry Pattern

**File**: [`hooks/useRpcRouter.ts`](../apps/web/src/hooks/useRpcRouter.ts)

Replaces the monolithic `switch(cmd.type)` with an extensible registry:

```typescript
interface RpcContext {
  items: ChatItem[];
  currentModel: { id: string; provider?: string } | null;
  addSystemMessage: (text, tone?) => void;
  abortStream: () => void;
  setError: (msg: string) => void;
}

interface UseRpcRouterReturn {
  rpc: (cmd: RpcCommand) => Promise<RpcResult>;
  register: (type: string, handler: RpcHandler) => void;
  refreshState: () => Promise<void>;
}
```

**Built-in commands** (registered on init):

| Command | Action |
|---------|--------|
| `get_state` | Fetch status + config from backend |
| `abort` | Call abortStream() |
| `compact` | Return system message (placeholder) |
| `set_session_name` | Update store + localStorage |
| `export_html` | Call `ExportService.toHtml()` |
| `export_markdown` | Call `ExportService.toMarkdown()` |
| `export_pdf` | Call `ExportService.toPdf()` |
| `get_session_stats` | Add system message with counts |
| `get_available_models` | Return hardcoded model list |
| `set_model` | Update store + backend config |
| `navigate_tree` | No-op return |
| `prompt` / `cycle_thinking_level` | No-op return |

**Key design decision**: Export commands delegate to `ExportService` (a pure module), eliminating the duplication that previously existed between the RPC handler and `ExportMenu.tsx`.

### 3.4 useModelPicker + useCommandBar

Both are straightforward state-management hooks:

- **useModelPicker**: Manages `model`, `models[]`, `open`, `search`, `select()`. Calls `onSetModel` callback which triggers `rpc.rpc({ type: "set_model" })`.
- **useCommandBar**: Sets up a single global `keydown` listener. Handles Cmd+K (open palette), `/` (focus input), Escape (close palette or abort if streaming). Cleans up on unmount.

---

## 4. Page-by-Page Breakdown

### 4.1 Chat / Workspace Page (`/workspace[/:id]`)

**File**: [`pages/WorkspacePage.tsx`](../apps/web/src/pages/WorkspacePage.tsx) → renders [`components/ChatWorkspace.tsx`](../apps/web/src/components/ChatWorkspace.tsx) inside ResearchTab

**What it shows**: The primary interface — full-height AI chat with streaming responses, plus workspace tabs (overview, research, decisions, journal, review).

**Component tree (v5.0)**:
```
WorkspacePage
├── WorkspaceListPage (when no :id param)
│   └── WorkspaceList (from mvp/) + Create form
│
└── WorkspaceDetail (when :id present)
    ├── Breadcrumb: Workspaces / {name}
    ├── Workspace header card (name, description, kind, date)
    ├── Tab bar (overview | research | decisions | journal | review)
    │
    ├── [OverviewTab] → WorkspaceOverview (mvp/)
    │   ├── Metrics cards (win rate, PnL, trades, decisions)
    │   ├── Active positions table
    │   ├── Recent events
    │   └── Quick actions (new decision, request review, start research)
    │
    ├── [ResearchTab] (inline in WorkspacePage)
    │   ├── Topic input + Deep Research button
    │   ├── DeepResearchProgressPanel (mvp/)
    │   ├── Report viewer (ResearchReportView)
    │   ├── Decision generator + saver
    │   └── ChatWorkspace (embedded!)
    │       └── Full chat interface (see Section 4.1.1 below)
    │
    ├── [DecisionsTab] (from workspace/components.tsx)
    │   ├── DecisionForm (mvp/)
    │   └── DecisionCard list (MvpDecisionCard)
    │
    ├── [JournalTab] (from workspace/components.tsx)
    │   ├── Entry form + notes textarea
    │   └── JournalEntryCard list (with trade details)
    │
    └── [ReviewTab] (from workspace/components.tsx)
        ├── Request Review button
        └── ReviewAccordion list
```

#### 4.1.1 ChatWorkspace (Thin Orchestrator)

**File**: [`components/ChatWorkspace.tsx`](../apps/web/src/components/ChatWorkspace.tsx) (~520 lines)

**What changed in v5.0**: Previously a 959-line God component. Now a thin orchestrator that:

1. **Reads from store**: `themeMode`, `showThinking`, `currentModelFromStore`, `subagents`, `selectedSubagentId`
2. **Calls 4 hooks**: `useSSEStream()`, `useRpcRouter(ctx)`, `useModelPicker(opts)`, `useCommandBar(opts)`
3. **Builds command actions**: Array of 7 commands for the palette (compact, export×3, stats, expand/collapse tools)
4. **Renders JSX**: Same visual layout as before — Conversation, empty state, message list, prompt input, artifact sidebar, floating overlays

**What it NO LONGER does directly**:
- ❌ Manage SSE EventTarget connections
- ❌ Parse SSE frames
- ❌ Accumulate SessionEntry objects
- ❌ Handle 12+ RPC commands in a switch statement
- ❌ Generate HTML/Markdown/PDF export markup
- ❌ Listen for keyboard events globally
- ❌ Manage model selection state
- ❌ Duplicate subagent state

---

### 4.2 Dashboard Page (`/`)

**File**: [`pages/DashboardPage.tsx`](../apps/web/src/pages/DashboardPage.tsx)

**What it shows**: System overview with live stats, agent status detail, recent trades, memory summary.

**APIs called**:
- `GET /api/status` (refetch every 5s)
- `GET /api/config` (refetch every 10s)
- `GET /api/trades` (on mount)
- `GET /api/memory` (on mount)

Uses `formatUsd()` and `formatChange()` from the new shared `lib/format-utils.ts`.

---

### 4.3 Settings Page (`/settings`)

**File**: [`pages/SettingsPage.tsx`](../apps/web/src/pages/SettingsPage.tsx)

**v5.0 change**: Previously had duplicate `useState` for `modelId`, `thinkingLevel`, `autoCompaction` that conflicted with the Zustand store. Now reads all three from `useSettingsStore()` and syncs from backend config via `useEffect`.

Trading preferences still use a local `useLocalSetting` hook (writes to localStorage keys like `tp-max-position-size`).

---

### 4.4 Other Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Market | `/markets` | Placeholder | Animated SVG chart |
| Timeline | `/timeline` | Active | Event log with filters |
| Journal | `/journal` | Active | Entry list |
| Evolution | `/evolution` | Active | Proposals + rules |
| Memory | `/memory` | Active | Domain-scoped memory browser |

All pages are lazy-loaded via `React.lazy()`.

---

## 5. Routing (Code-Split)

**File**: [`router.tsx`](../apps/web/src/router.tsx)

```typescript
// Pattern: lazy import + Suspense wrapper
const DashboardPage = lazy(() => import("./pages/DashboardPage")) as ComponentType<{}>;

function withSuspense<P>(Component: ComponentType<P>): ComponentType<P> {
  const Wrapped = (props: P) => (
    <Suspense fallback={<PageFallback />}>
      <Component {...props} />
    </Suspense>
  );
  return Wrapped;
}
```

**PageFallback** shows a spinner + "Loading..." text while the chunk downloads.

**Bundle impact**: The initial JavaScript payload no longer includes:
- ChatWorkspace (959→520 lines + all hooks)
- mvp/ components (charts, forms, accordions)
- recharts + lightweight-charts
- Research pipeline, decision forms, journal views

These load only when the user navigates to `/workspace*`.

---

## 6. Design System

### CSS Variables (in `styles.css`)

All custom properties defined under `@theme inline`:

```css
@theme inline {
  /* Brand Accent */
  --accent: oklch(0.72 0.15 195);
  --accent-hover: oklch(0.78 0.15 195);
  --accent-muted: oklch(0.55 0.10 195);

  /* Typography */
  --font-sans: "Geist Variable", "Inter", "SF Pro Display", system-ui, sans-serif;
  --font-body: "Geist Variable", "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace;

  /* Semantic Trading Colors */
  --profit: oklch(0.65 0.15 155);   /* emerald */
  --loss: oklch(0.55 0.20 25);     /* red */
  --warning: oklch(0.70 0.15 65);   /* amber */

  /* Glass Effects */
  --glass-bg: oklch(0.17 0.008 240 / 70%);
  --glass-border: oklch(0.95 0 0 / 12%);
  --glass-blur: 16px;
}
```

### Glassmorphism Patterns

```tsx
/* Standard card */
<div className="rounded-lg border bg-card/70 backdrop-blur-xl p-4 border-white/[0.08]">

/* Elevated (modals, popovers) */
<div className="rounded-lg border bg-card/80 backdrop-blur-2xl border-white/[0.12]">

/* Sidebar */
<div className="bg-background/90 backdrop-blur-sm border-r border-white/[0.06]">

/* Input */
<input className="rounded-md border bg-card/50 backdrop-blur-sm border-white/[0.08] ..." />
```

### Animation Patterns (framer-motion)

| Pattern | Code | Used In |
|---------|------|---------|
| Fade-up | `initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}` | Page transitions, panels |
| Stagger children | `variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 }}}} }` | Message lists, stat grids |
| Hover lift | `whileHover={{ scale:1.01, borderColor:"rgba(6,182,212,0.3)" }}` | Stat cards, domain cards |
| Spring press | `whileTap={{ scale:0.97 }} transition={{ type:"spring", stiffness:400 }}` | Action buttons |
| Pulse glow | `animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2, repeat:Infinity }}` | Live indicators, running dots |

Full design specification: [`apps/web/design.md`](../apps/web/design.md)

---

## 7. Settings Persistence

### What Goes Where

| Setting | localStorage Key | Backend Sync | Notes |
|---------|-----------------|--------------|-------|
| Theme mode | `pi-theme-mode` | No | Frontend-only (`dark`/`light`/`system`) |
| Thinking level | `trading-pi-thinking-level` | Yes `POST /api/config` | Dual-write: local + remote |
| Show thinking | `pi-show-thinking` | No | Frontend-only toggle for rendering |
| Auto-compaction | `trading-pi-auto-compaction` | Yes `POST /api/config` | Dual-write: local + remote |
| Session name | `trading-pi-session-name` | No | Frontend-only label |
| Current model | (Zustand memory) | Yes `POST /api/config` | v5.0: stored in Zustand, synced on selection |
| Auth enabled | — | No | Memory only (future feature) |

### Dual-Write Pattern

Settings that affect backend behavior use a **dual-write pattern**:

```
User clicks "High" in Thinking Level selector
  ↓
useSettingsStore.getState().setThinkingLevel("high")
  ↓
┌──────────────────────────┬──────────────────────────┐
│  localStorage            │  Backend (POST /api/config)│
│  ┌────────────────────┐  │  ┌────────────────────┐  │
│  │ "trading-pi-       │  │  │ { thinkingLevel:   │  │
│  │  thinking-level"   │  │  │   "high" }         │  │
│  │  → "high"          │  │  └────────────────────┘  │
│  └────────────────────┘  │                           │
└──────────────────────────┴──────────────────────────┘
```

On next page load:
1. Zustand store initializes from `localStorage`
2. `refreshState()` calls `GET /api/config` to sync backend state
3. If they differ, backend wins (for thinkingLevel, autoCompaction, modelId)

---

## 8. Known Dead Code (Cleaned in v5.0)

### Removed in v5.0

| Item | Action |
|------|--------|
| 5 dead pi-web-ui barrel exports | Removed from `pi-web-ui/index.ts`: ConnectionDot, ImagePreviewStrip, ProjectLauncher, SessionSidebar, AppSidebarContent |
| `formatUsd`/`formatChange` duplication | Extracted to `lib/format-utils.ts`; both DashboardPage and MarketPage now import from there |
| Theme resolution duplication | Extracted to `useResolvedTheme()` hook; both AppLayout and ChatWorkspace share one reactive implementation |

### Marked @deprecated (kept for type stability)

| Type | File | Why Kept |
|------|------|----------|
| `AppView` | `core/types.ts` | May be referenced indirectly through pi-web-ui types |
| `RunningInstance` | `core/types.ts` | Same reason |

### Still Present But Unused (low priority)

| Component | File | Why It's Still Here |
|-----------|------|---------------------|
| **Confirmation** | `ai-elements/confirmation.tsx` | Approval dialog — approval engine exists server-side, no frontend flow yet |
| **Sources** | `ai-elements/sources.tsx` | RAG citation cards — no RAG pipeline yet |
| **Task** | `ai-elements/task.tsx` | Task progress tracker — single-agent arch doesn't need task UI |
| **ProjectLauncher** | `pi-web-ui/project-launcher.tsx` | IDE concept — kept for potential future use |
| **ExtensionDialog** | `pi-web-ui/extension-dialog.tsx` | Reserved for extension system |

These don't significantly impact bundle size due to Vite tree-shaking.

---

## 9. Build & Dev

### Development

```bash
# Frontend only (Vite dev server :5173, proxies /api → :8787)
npm run dev -w @trading-pi/web

# Backend only (Node HTTP server :8787)
npm run server -w @trading-pi/web

# Both together
npm run dev
```

### Production Build

```bash
npm run build -w @trading-pi/web
# Output: apps/web/dist/
# Server: node apps/web/dist/server.js (or npm run start -w @trading-pi/web)
```

### Type Checking

```bash
# Per-package
npx tsc -p apps/web/tsconfig.json

# Full monorepo (verifies all packages together)
npm run check
```

### Vite Config

[`vite.config.ts`](../apps/web/vite.config.ts):
- Plugin: `react()` + `tailwindcss()`
- Alias: `@` → `./src`
- Dev server port: `TRADING_PI_WEB_PORT` (default 5173)
- Proxy: `/api` → `http://localhost:8787`
