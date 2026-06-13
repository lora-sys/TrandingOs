# Trading Pi OS — Frontend Architecture

> **Version**: 0.1.0 | **Last Updated**: 2026-06-13 | **Branch**: `refactor/frontend`
>
> Complete reference for `apps/web/src/` — React 19 frontend with Vite, Tailwind v4, TanStack Router, and SSE streaming.

---

## 1. Tech Stack Details

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.7 | UI framework (concurrent features, hooks) |
| **Vite** | 7.2.7 | Dev server + bundler (:5173) |
| **TypeScript** | 5.9.3 | Type safety, strict mode |
| **Tailwind CSS** | 4.3.0 | Utility-first CSS (v4 with `@theme inline`) |
| **@tailwindcss/vite** | 4.3.1 | Vite plugin for Tailwind v4 |
| **@tanstack/react-router** | 1.170.15 | File-based routing, type-safe links |
| **@tanstack/react-query** | 5.101.0 | Server state management, caching, refetch intervals |
| **@tanstack/react-virtual** | 3.14.2 | Virtual scrolling (available, not yet used for chat) |
| **framer-motion** | 12.40.0 | Animation library (stagger, spring, layout) |
| **Zustand** | 5.0.14 | Client-side state (settings store) |
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

## 2. Directory Map

```
apps/web/src/
├── api.ts                        # API client: fetch wrapper, health check, SSE stream parser
├── api/
│   ├── client.ts                 # Re-export shim → imports from ../api.ts
│   └── types.ts                  # API response types (TimelineEvent, etc.)
├── app.tsx                       # App root: RouterProvider + <Router />
├── main.tsx                      # Entry: ReactDOM.createRoot + <App />
├── router.tsx                    # TanStack Router: 6 routes under AppLayout
├── styles.css                    # Design system: CSS variables, @theme, glass tokens
│
├── components/
│   ├── ai-elements/              # Custom chat UI components (14 files)
│   │   ├── conversation.tsx      # Scrollable chat container
│   │   ├── message.tsx           # Message bubble component
│   │   ├── prompt-input.tsx      # Multi-line input + attachments + submit
│   │   ├── tool.tsx              # Expandable tool call card
│   │   ├── artifact.tsx          # Artifact display card
│   │   ├── reasoning.tsx         # Thinking/reasoning block
│   │   ├── code-block.tsx        # Shiki syntax highlighter
│   │   ├── chain-of-thought.tsx  # CoT display
│   │   ├── plan.tsx              # Plan card component
│   │   ├── confirmation.tsx      # Approval dialog (dead code)
│   │   ├── sources.tsx           # Source refs (dead code)
│   │   ├── suggestion.tsx        # Quick-reply chips
│   │   ├── shimmer.tsx           # Loading skeleton
│   │   └── task.tsx              # Task progress (dead code)
│   │
│   ├── pi-web-ui/                # Inherited base components (20 files)
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
│   │   ├── project-launcher.tsx  # (dead code)
│   │   ├── image-preview-strip.tsx
│   │   ├── prompt-attachments.tsx
│   │   └── ... (modal, connection-dot, etc.)
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
│   ├── ChatWorkspace.tsx         # Main chat interface (~960 lines)
│   ├── ArtifactPanel.tsx         # Artifact sidebar panel
│   └── ExportMenu.tsx            # Export dropdown (HTML/MD/PDF)
│
├── core/                         # Business logic & types
│   ├── types.ts                  # All TypeScript types (ChatItem, SessionEntry, etc.)
│   ├── chat-conversion.ts        # syncToItems(): SessionEntry[] → ChatItem[]
│   ├── format.ts                 # copyText(), isEditableTarget()
│   ├── tool-summary.ts           # isToolExpandable(): which tools can expand
│   └── subagents.ts              # subagentList(): SubagentStateMap helpers
│
├── lib/                          # Utilities
│   ├── settingsStore.ts          # Zustand store (global settings state)
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│
└── pages/                        # Route page components (6 files)
    ├── ChatPage.tsx              # → re-exports ChatWorkspace as default
    ├── DashboardPage.tsx         # Stats grid + agent status + trades + memory
    ├── MarketPage.tsx            # Placeholder (animated SVG + feature grid)
    ├── PortfolioPage.tsx         # Placeholder (animated donut + feature grid)
    ├── MemoryPage.tsx            # Domain cards + record list + search + filter
    └── TimelinePage.tsx          # Event log + status filters + text search
```

---

## 3. Page-by-Page Breakdown

### 3.1 Chat Page (`/`)

**File**: [`pages/ChatPage.tsx`](../apps/web/src/pages/ChatPage.tsx) → [`components/ChatWorkspace.tsx`](../apps/web/src/components/ChatWorkspace.tsx)

**What it shows**: The primary interface — full-height AI chat with streaming responses.

**APIs called**:
- `POST /api/session/message/stream` (SSE) — send messages, receive streamed responses
- `GET /api/config` — load thinking level, model, compaction settings
- `GET /api/status` — agent status, skill/workflow counts
- `GET /api/artifacts` — artifact list (via ArtifactPanel)
- `POST /api/config` — sync settings changes to backend

**Component tree**:
```
ChatWorkspace
├── TooltipProvider
│   ├── [Main Area]
│   │   ├── Conversation (ai-elements)
│   │   │   ├── ConversationContent
│   │   │   │   ├── [Empty State]
│   │   │   │   │   ├── ConversationEmptyState ("Trading Pi")
│   │   │   │   │   └── 2×2 Action Cards (市场分析, 交易计划, 模拟交易, 复盘总结)
│   │   │   │   └── [Message List]
│   │   │   │       └── items.map → motion.div stagger
│   │   │   │           ├── UserMessageView (role === "user")
│   │   │   │           └── ChatItemView (assistant/tools/system/artifacts/plans)
│   │   │   ├── ConversationScrollButton
│   │   │   ├── ContextPopover (when open)
│   │   │   └── WorkspaceStatusFloat
│   │   ├── Queued Messages bar
│   │   ├── Error banner
│   │   └── [Prompt Footer]
│   │       ├── ExportMenu
│   │       ├── Artifacts toggle button
│   │       └── PromptInput (ai-elements)
│   │           ├── PromptAttachmentPreview
│   │           ├── PromptInputBody → PromptInputTextarea
│   │           └── PromptInputFooter
│   │               ├── PromptInputTools → PromptAttachmentButton
│   │               └── PromptInputSubmit (with abort)
│   │
│   ├── [Artifact Sidebar] (conditional)
│   │   └── ArtifactPanel (motion.div slide-in)
│   │
│   └── [Floating Overlays] (portals)
│       ├── SubagentDetailSidebar (conditional)
│       ├── ModelPicker (conditional)
│       ├── CommandPalette (Cmd+K, conditional)
│       └── ExtensionDialogView (conditional)
```

**Key behaviors**:
- Message queuing: if user sends while streaming, messages queue and execute sequentially
- Auto-session naming: first message becomes session name (truncated to 40 chars)
- Keyboard shortcuts: `/` focus input, `Esc` abort/close, `Cmd+K` command palette
- Tab-to-focus safety: `isEditableTarget()` prevents shortcuts in input fields

---

### 3.2 Dashboard Page (`/dashboard`)

**File**: [`pages/DashboardPage.tsx`](../apps/web/src/pages/DashboardPage.tsx)

**What it shows**: System overview with live stats, agent status detail, recent trades, memory summary.

**APIs called**:
- `GET /api/status` (refetch every 5s)
- `GET /api/config` (refetch every 10s)
- `GET /api/trades` (on mount)
- `GET /api/memory` (on mount)

**Component tree**:
```
DashboardPage
├── Page Header (h1 + subtitle)
├── Stat Cards Grid (grid-cols-2 lg:grid-cols-5)
│   ├── StatCard: Agent 状态 (ActivityIcon)
│   ├── StatCard: 今日盈亏 (DollarSignIcon, trend)
│   ├── StatCard: 今日交易 (ZapIcon)
│   ├── StatCard: 模型 (CpuIcon)
│   └── StatCard: 思考等级 (BrainIcon, trend)
├── Two-Column Detail (grid-cols-2)
│   ├── Agent Status Panel
│   │   ├── Status / Model / Thinking / Compaction / Session
│   └── Recent Trades Panel
│       └── Last 5 trades (symbol, side, PnL)
└── Memory Summary Panel
    └── Raw JSON/memory data in <pre> block
```

**Error handling**: Shows "Failed to connect to backend server" if both status and config queries fail.

---

### 3.3 Market Page (`/market`)

**File**: [`pages/MarketPage.tsx`](../apps/web/src/pages/MarketPage.tsx)

**What it shows**: **Placeholder page** — animated SVG chart drawing in, feature grid, "Coming Soon" text.

**APIs called**: None

**Component tree**:
```
MarketPage
├── Hero Section (animated icon + title + "Coming Soon")
├── Animated SVG Chart (pathLength animation + dot pop-in)
├── Feature Grid (2×2)
│   ├── K线图 (Candlestick Charts)
│   ├── 订单簿 (Order Book)
│   ├── 深度数据 (Depth Data)
│   └── 实时行情 (Real-time Quotes)
└── "Building..." footer text
```

**Animation details**: Icon bobs up/down (y: [0,-8,0], 3s loop), chart path draws in (1.5s), dots scale in with stagger (0.15s delay each).

---

### 3.4 Portfolio Page (`/portfolio`)

**File**: [`pages/PortfolioPage.tsx`](../apps/web/src/pages/PortfolioPage.tsx)

**What it shows**: **Placeholder page** — animated donut/ring chart, feature grid, "Coming Soon" text.

**APIs called**: None

**Component tree**:
```
PortfolioPage
├── Hero Section (animated violet icon + title + "Coming Soon")
├── Animated Donut/Ring SVG (strokeDashoffset animation)
├── Feature Grid (2×2)
│   ├── 持仓列表 (Holdings)
│   ├── 盈亏统计 (PnL Analytics)
│   ├── 资产配置 (Allocation)
│   └── 风险指标 (Risk Metrics)
└── "Building..." footer text
```

**Color theme**: Violet accent (`#a78bfa`, `#c084fc`) vs cyan on other pages.

---

### 3.5 Memory Page (`/memory`)

**File**: [`pages/MemoryPage.tsx`](../apps/web/src/pages/MemoryPage.tsx)

**What it shows**: Domain-scoped memory browser with cards, record list, search, filtering, and JSON export.

**APIs called**:
- `GET /api/memory` (refetch every 10s)
- `POST /api/memory/write` (delete action)

**Component tree**:
```
MemoryPage
├── Header (h1 + gradient underline + description)
├── Search Bar (glass style, SearchIcon prefix)
├── Domain Summary Cards (grid-cols-2 lg:grid-cols-4)
│   ├── 对话记忆 (conversation, blue)
│   ├── 市场数据 (market, emerald)
│   ├── 交易记录 (trade, amber)
│   ├── 复盘分析 (review, purple)
│   ├── 技能执行 (skill, cyan)
│   ├── 工作空间 (workspace, pink)
│   ├── 研究成果 (research, orange)
│   └── 策略引擎 (strategy, indigo)
├── Domain Filter Breadcrumb (when domain selected)
├── Records List (glass card container)
│   └── record.map → motion.div stagger
│       ├── Domain icon (colored)
│       ├── Key name + value (<pre> block)
│       ├── Importance dots (0–5 filled circles)
│       ├── Timestamp
│       └── Delete button (hover-visible)
└── Stats Footer (total count + domains + refresh + Export JSON)
```

**8 Domains** with color coding matching design system spec.

---

### 3.6 Timeline Page (`/timeline`)

**File**: [`pages/TimelinePage.tsx`](../apps/web/src/pages/TimelinePage.tsx)

**What it shows**: Chronological event log from all agent activities with status filters and text search.

**APIs called**:
- `GET /api/timeline` (refetch every 10s)

**Component tree**:
```
TimelinePage
├── Header (h1 + gradient line + description)
├── Filter Bar
│   ├── Status Pills: All / Completed (green) / Running (amber) / Error (red)
│   └── Search Input (text search across titles + types)
└── Events Container (glass card)
    ├── Loading Skeleton (5 shimmer rows)
    ├── Empty State ("暂无时间线事件")
    └── Event List (staggered entrance)
        └── event.map → motion.div
            ├── Status Dot (pulse for running, solid for completed/error)
            ├── Title + Timestamp
            └── Hover effect (slide right + bg change)
```

---

## 4. Component Architecture

### pi-web-ui Base Components (Inherited)

These come from `@earendil-works/pi-web-ui@0.75.3` and are copied/customized in `components/pi-web-ui/`. They provide the structural shell that Trading Pi customizes:

| Component | Origin | Customization Level |
|-----------|--------|-------------------|
| `AppSidebar` | pi-web-ui | ✅ Heavily customized: brand area, nav links, sessions list, footer |
| `SettingsPanel` | pi-web-ui | ✅ Props-driven: receives all values from Zustand store |
| `ChatItemView` | pi-web-ui | ✅ Used as-is: renders any ChatItem variant |
| `UserMessageView` | pi-web-ui | ✅ Used as-is: renders user bubbles |
| `CommandPalette` | pi-web-ui | ✅ Actions injected from ChatWorkspace |
| `ModelPicker` | pi-web-ui | ⚠️ Basic: hardcoded model list in rpc() |
| `ProjectLauncher` | pi-web-ui | 🔴 Dead: IDE concept, not applicable |

### Custom Components (Trading Pi Specific)

| Component | File | Purpose |
|-----------|------|---------|
| `AppLayout` | `components/AppLayout.tsx` | Root layout wrapping all pages; manages sidebar, settings modal, sessions, nav |
| `ChatWorkspace` | `components/ChatWorkspace.tsx` | The most complex component (~960 lines); entire chat UX |
| `ArtifactPanel` | `components/ArtifactPanel.tsx` | Slide-in sidebar showing generated artifacts |
| `ExportMenu` | `components/ExportMenu.tsx` | Dropdown for HTML/Markdown/PDF export |

### UI Primitives (`components/ui/`)

Standard shadcn/ui-style components built with Radix primitives + Tailwind:
- `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Textarea`
- `Tooltip`, `ScrollArea`, `Collapsible`, `Command`, `Badge`, `Spinner`
- `Separator`, `Alert`, `HoverCard`, `InputGroup`, `ButtonGroup`

---

## 5. Chat Data Flow (Critical Path)

This is the most important architectural diagram for understanding how the frontend works.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTION                                  │
│  Types message in PromptInputTextarea → presses Enter / clicks Send │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  submitMessage({ text, files })                                      │
│  ├─ processPromptFiles(files) → base64 images                       │
│  ├─ Build PromptCommand { id, message, images }                     │
│  ├─ If streaming: queue message (setQueuedMessages)                 │
│  └─ Call sendPrompt(command)                                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  sendPrompt(command)                                                 │
│  1. setChatStatus("submitted")                                       │
│  2. Create user SessionEntry:                                        │
│     { type: "message", id, message: { role: "user", content } }      │
│  3. entriesRef.current.push(userEntry)  ← mutable ref!              │
│  4. tradingPiApi.sendMessageStream(message)                          │
│     → Returns EventTarget (SSE emitter)                              │
│  5. sseRef.current = sse                                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SSE Event Handlers Registered on EventTarget                        │
│                                                                      │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║ "message_update"                                               ║  │
│  ║   → Extract message.content (PiContentBlock[])                 ║  │
│  ║   → Build assistant SessionEntry                               ║  │
│  ║   → Append/update entriesRef.current                           ║  │
│  ║   → syncToItems(entriesRef) → ChatItem[] (streaming=true)      ║  │
│  ║   → setItems(newItems) → RENDER                                ║  │
│  ╠═══════════════════════════════════════════════════════════════╣  │
│  ║ "tool_execution_start"                                         ║  │
│  ║   → Build { type: "tool_call", toolName, args } entry          ║  │
│  ║   → entriesRef.push → syncToItems → setItems                   ║  │
│  ╠═══════════════════════════════════════════════════════════════╣  │
│  ║ "tool_execution_end"                                           ║  │
│  ║   → Build { type: "tool_result", result, isError } entry       ║  │
│  ║   → entriesRef.push → syncToItems → setItems                   ║  │
│  ╠═══════════════════════════════════════════════════════════════╣  │
│  ║ "artifact_update"                                              ║  │
│  ║   → window.dispatchEvent("pi:artifact_update", { detail })      ║  │
│  ║   → ArtifactPanel auto-opens                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════╣  │
│  ║ "done"                                                         ║  │
│  ║   → Final syncToItems (streaming=false on all)                 ║  │
│  ║   → queryClient.invalidateQueries([messages,timeline,...])     ║  │
│  ║   → setChatStatus("ready")                                      ║  │
│  ╠═══════════════════════════════════════════════════════════════╣  │
│  ║ "error"                                                        ║  │
│  ║   → setChatStatus("error") + setError(message)                  ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RENDER: ChatItem[] → React Elements                                 │
│                                                                      │
│  For each item:                                                      │
│  ├─ kind === "message" && role === "user"                            │
│  │   → <UserMessageView item={item} />                               │
│  │                                                                  │
│  └─ kind !== "user"                                                  │
│      → <ChatItemView                                                │
│          item={item}                                                │
│          showThinking={showThinking}  ← from Zustand                │
│          onToggleTool={...}                                          │
│        />                                                            │
│                                                                      │
│  ChatItemView dispatches based on item.kind:                         │
│  - "message" → <Message> with optional <Reasoning> + <Artifact>      │
│  - "tool"   → <Tool> (expandable, shows input/output/error)         │
│  - "system" → System message banner                                  │
│  - "artifact" → <Artifact> card                                     │
│  - "plan" → <Plan> card                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Data Structures

**SessionEntry** (raw wire format from SSE):
```typescript
type SessionEntry = {
  type: "message" | "pi_message" | "tool_call" | "tool_result" | ...
  id: string
  message?: PiMessage  // { role, content (PiContentBlock[]), usage, ... }
  customType?: string
  data?: unknown
  // ... flexible shape
}
```

**ChatItem** (render-ready format):
```typescript
type ChatItem =
  | { kind: "message"; id; role: "user"|"assistant"; text; reasoning?; streaming?; }
  | { kind: "tool"; id; name; input; output?; errorText?; state: ToolState; open?; }
  | { kind: "system"; id; text; tone?: "info"|"success"|"error"; }
  | { kind: "artifact"; id; artifactId; title; summary; type; ... }
  | { kind: "plan"; id; planId; title; description; status; steps?; ... }
```

**syncToItems()** ([`core/chat-conversion.ts`](../apps/web/src/core/chat-conversion.ts)): Transforms `SessionEntry[]` → `ChatItem[]` by:
1. Iterating entries in order
2. Merging consecutive assistant `message_update`s into one
3. Pairing `tool_call` + `tool_result` into a single `tool` ChatItem
4. Extracting text from `PiContentBlock[]` (filtering `type: "text"` blocks)
5. Stripping JSON artifacts that leak from tool-using models
6. Assigning unique IDs via `nextId()` counter

---

## 6. Design System

### CSS Variables (in `styles.css`)

All custom properties are defined under `@theme inline` in [`styles.css`](../apps/web/src/styles.css):

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
/* Standard card (used everywhere) */
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
| Path draw | `animate={{ pathLength:1 }} transition={{ duration:1.5 }}` | Market chart SVG, Portfolio donut |

Full design specification: [`apps/web/design.md`](../apps/web/design.md)

---

## 7. Settings Persistence

### What Goes Where

| Setting | localStorage Key | Backend Sync | Notes |
|---------|-----------------|--------------|-------|
| Theme mode | `pi-theme-mode` | ❌ No | Frontend-only (`dark`/`light`/`system`) |
| Thinking level | `trading-pi-thinking-level` | ✅ POST `/api/config` | Dual-write: local + remote |
| Show thinking | `pi-show-thinking` | ❌ No | Frontend-only toggle for rendering |
| Auto-compaction | `trading-pi-auto-compaction` | ✅ POST `/api/config` | Dual-write: local + remote |
| Session name | `trading-pi-session-name` | ❌ No | Frontend-only label |
| Auth enabled | — | ❌ No | Memory only (future feature) |

### Dual-Write Pattern

Settings that affect backend behavior use a **dual-write pattern**:

```
User clicks "High" in Thinking Level selector
  ↓
SettingsPanel.onSetThinking("high")
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
3. If they differ, backend wins (for thinkingLevel, autoCompaction)

---

## 8. Known Dead Code

The following components exist in the codebase but are **not wired into active user flows**:

| Component | File | Why It's Dead |
|-----------|------|---------------|
| **Sources** | `ai-elements/sources.tsx` | Source reference cards for RAG citations. No RAG pipeline exists yet. |
| **Task** | `ai-elements/task.tsx` | Task progress tracker with queued/running/done states. Single-agent arch doesn't need task tracking UI. |
| **Confirmation** | `ai-elements/confirmation.tsx` | Approval confirmation dialog. Approval engine exists server-side, but no frontend approval flow is built. |
| **ProjectLauncher** | `pi-web-ui/project-launcher.tsx` | IDE project launcher concept from pi-web-ui. Not applicable for a trading terminal. |
| **SubagentDetailSidebar** | `pi-web-ui/subagent-detail-sidebar.tsx` | Subagent detail view. Single-agent architecture means this is rarely used. |
| **ExtensionDialog** | `pi-web-ui/extension-dialog.tsx` | Extension interaction (select/confirm/input/editor/notify). Reserved for future extension system. |

These components are **not harmful** — they're just unused imports that could be cleaned up in a future pass. They don't add to bundle size significantly because Vite tree-shakes unused exports.

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

### Vite Config

[`vite.config.ts`](../apps/web/vite.config.ts):
- Plugin: `react()` + `tailwindcss()`
- Alias: `@` → `./src`
- Dev server port: `TRADING_PI_WEB_PORT` (default 5173)
- Proxy: `/api` → `http://localhost:8787`

### Type Checking

```bash
npx tsc -p apps/web/tsconfig.json
```
