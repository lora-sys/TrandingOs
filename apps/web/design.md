# Trading Pi — UI/UX Design System

> Version 1.0 | Last updated: 2026-06-12
> Style: **Dark Glassmorphism** | Accent: **Cyan #06b6d4**
> Stack: React 19 + Tailwind v4 + shadcn/ui + framer-motion + Lucide

---

## 1. Design Identity

### Vision
Trading Pi is an **AI-powered trading terminal** — not a dashboard, not a chat app, but a professional-grade terminal that happens to have AI capabilities. The UI should feel like Bloomberg Terminal met modern AI tools.

### Keywords
`dark` `glassmorphism` `terminal` `cyan-accent` `data-dense` `animated` `professional`

### Anti-Patterns (NEVER do these)
- No emoji as icons (use Lucide SVG only)
- No light-mode-first design (default dark, support light)
- No rounded-xl on data cards (max rounded-lg for terminal feel)
- No pastel colors in dark mode (use saturated, luminous colors)
- No heavy shadows (use border + backdrop-blur instead)
- No gradient text on body copy (reserve for brand moments)

---

## 2. Color System

### Accent Palette (Cyan-Based)

| Token | OKLCH Value | Hex Equivalent | Usage |
|-------|-------------|-----------------|-------|
| `--accent` | `oklch(0.72 0.15 195)` | `#06b6d4` | Primary accent, active states, links |
| `--accent-hover` | `oklch(0.78 0.15 195)` | `#22d3ee` | Hover state, highlighted |
| `--accent-muted` | `oklch(0.55 0.10 195)` | `#0891b2` | Subtle accents, borders |
| `--accent-glow` | `oklch(0.72 0.18 195 / 25%)` | `rgba(6,182,212,0.25)` | Glow effects, shadows |

### Semantic Colors (Trading)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--profit` | `#059669` (emerald-600) | `#34d399` (emerald-400) | Positive PnL, buy, up |
| `--loss` | `#dc2626` (red-600) | `#f87171` (red-400) | Negative PnL, sell, down |
| `--warning` | `#d97706` (amber-600) | `#fbbf24` (amber-400) | Warnings, pending |

### Domain Colors (Memory Page)

| Domain | Color | Tailwind |
|--------|-------|----------|
| conversation | Blue | `text-cyan-400` (shifted to accent) |
| market | Emerald | `text-emerald-400` |
| trade | Amber | `text-amber-400` |
| review | Purple | `text-purple-400` |
| skill | Sky/Cyan | `text-cyan-400` |
| workspace | Pink | `text-pink-400` |
| research | Orange | `text-orange-400` |
| strategy | Indigo | `text-indigo-400` |

### Dark Mode Base (Primary)

```
--background:    oklch(0.13  0.005 240)   /* near-black with blue tint */
--foreground:    oklch(0.96  0      0)     /* near-white */
--card:          oklch(0.17  0.008 240 / 80%)  /* glass: semi-transparent */
--card-border:   oklch(0.95  0      0 / 12%) /* subtle glass border */
--muted:         oklch(0.22  0.008 240)
--muted-fg:      oklch(0.65  0.01  240)
--input:         oklch(0.95  0      0 / 10%)
--ring:          oklch(0.72  0.15 195)       /* cyan ring for focus */
```

### Glass Effects

```css
/* Standard glass card */
.glass-card {
  background: oklch(0.17 0.008 240 / 70%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid oklch(0.95 0 0 / 10%);
}

/* Elevated glass (modals, popovers) */
.glass-elevated {
  background: oklch(0.20 0.008 240 / 85%);
  backdrop-filter: blur(24px);
  border: 1px solid oklch(0.95 0 0 / 14%);
}

/* Sidebar glass */
.glass-sidebar {
  background: oklch(0.15 0.006 240 / 90%);
  backdrop-filter: blur(12px);
  border-right: 1px solid oklch(0.95 0 0 / 8%);
}
```

---

## 3. Typography

### Font Stack

```css
/* Headings, UI labels, navigation, buttons */
--font-sans: "Geist Variable", "Inter", "SF Pro Display", system-ui, sans-serif;

/* Data, code, chat content, numbers, input */
--font-mono: "JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace;

/* Body text (descriptions, memory content) */
--font-body: "Geist Variable", "Inter", system-ui, sans-serif;
```

### Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|------------|
| Page H1 | Sans | 24px (text-2xl) | 700 (bold) | 1.2 |
| Section Header | Sans | 16px (text-base) | 600 (semibold) | 1.3 |
| Card Title | Sans | 14px (text-sm) | 500 (medium) | 1.4 |
| Body Text | Sans/Mono* | 14px (text-sm) | 400 | 1.6 |
| Data/Numbers | Mono | 14px (text-sm) | 500 | 1.4 |
| Labels/Captions | Sans | 12px (text-xs) | 500 | 1.4 |
| Badges/Tiny | Mono | 10px (text-[10px]) | 600 | 1.2 |
| Chat Content | Mono | 14px (text-sm) | 400 | 1.7 |
| Code Blocks | Mono | 13px | 400 | 1.6 |

*Body text uses Sans; inline data within body uses Mono

### Rules
- All page titles → `font-sans`
- All navigation/sidebar → `font-sans`
- All stat values/numbers → `font-mono`
- All chat messages → `font-mono`
- All memory record values → `font-mono` (in `<pre>`)
- All descriptions/subtitles → `font-sans`
- Input placeholder → `font-mono`

---

## 4. Layout System

### Grid

| Property | Value |
|----------|-------|
| Sidebar width (expanded) | 280px (down from 320) |
| Sidebar width (collapsed) | 48px |
| Content max-width | 1200px (up from 1024) |
| Content padding | 24px (p-6) |
| Section spacing | 32px (space-y-8, up from 24) |
| Card padding | 16px (p-4) |
| Card gap | 16px (gap-4) |
| Card radius | 8px (rounded-lg) |
| **Header** | **REMOVED** (content goes edge-to-edge) |

### Responsive Breakpoints

| Breakpoint | Width | Sidebar State | Grid Cols | Card Size | Padding |
|-----------|-------|---------------|-----------|-----------|--------|
| Mobile   | < 640px     | Hidden (hamburger menu + bottom tab bar) | 1 col     | Full width    | p-4 (16px) |
| Tablet   | 640–1024px  | Overlay mode (pushes content, semi-transparent backdrop) | 2 col     | Full width    | p-5 (20px) |
| Desktop  | > 1024px    | Visible (280px expanded / 48px collapsed) | 3–5 cols | Constrained   | p-6 (24px) |
| Wide     | > 1440px    | Visible | 5 cols    | Centered      | p-6 (24px) |

### Responsive Behavior Notes
- **Sidebar**: Auto-hides below `lg` breakpoint; replaced by a fixed hamburger button (`lg:hidden`) and a **bottom tab bar** on mobile (fixed position, `h-14`, `backdrop-blur-xl`)
- **Bottom Tab Bar** (mobile only): Fixed at viewport bottom, shows primary nav links (Dashboard, Chat, Market, Portfolio, Memory, Timeline), uses glass background matching sidebar
- **Content area**: Shifts left to fill space when sidebar hidden; add `pb-16` on mobile when bottom nav is present for safe scroll
- **Header**: Removed — this is especially beneficial on mobile where screen real estate is limited

### Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Page content |
| Sidebar | 10 | AppSidebar |
| Header | 20 | (removed) |
| Dropdown | 30 | Popovers, menus |
| Modal overlay | 40 | Settings modal |
| Modal content | 50 | Settings panel |
| Toast/float | 60 | WorkspaceStatusFloat |
| Tooltip | 70 | TooltipProvider |

---

## 5. Animation System (framer-motion)

### Duration Scale

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover/focus) | 150ms | ease-out |
| Small (toggle/open) | 200ms | ease-in-out [0.4, 0, 0.2, 1] |
| Medium (page transition) | 300ms | ease-in-out [0.4, 0, 0.2, 1] |
| Large (modal enter) | 400ms | spring { damping: 25, stiffness: 300 } |
| Loading loop | 1500ms+ | linear, infinite loop |

### Standard Animations

```tsx
// Fade in (default for cards appearing)
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}>

// Stagger children (for lists/grids)
<motion.div initial="hidden" animate="show" variants={{
  hidden: {}, show: { transition: { staggerChildren: 0.05 } }
}}>

// Glass card hover
whileHover={{ scale: 1.01, borderColor: "rgba(6,182,212,0.3)" }}
transition={{ duration: 0.15 }}

// Pulse glow (for live/active indicators)
animate={{ opacity: [0.5, 1, 0.5] }}
transition={{ duration: 2, repeat: Infinity, ease: "linear" }}

// Number counter (for stats)
<motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
  key={value}>{value}</motion.span>
```

### Where to Animate
- **Always**: Page transitions, modal open/close, sidebar expand/collapse
- **Cards**: Staggered entrance on mount, subtle hover lift
- **Stats**: Number change transitions
- **Loading**: Skeleton shimmer or pulse
- **Chat**: Message appear animation (slide up + fade)
- **Timeline**: Event dots pulse for running status
- **Empty states**: Icon float animation

### Reduced Motion
```tsx
const shouldReduceMotion = useReducedMotion();
// Pass to all motion components: animate={shouldReduceMotion ? {} : target}
```

---

## 6. Component Patterns

### Glass Card (primary container)
```tsx
<div className="rounded-lg border bg-card/70 backdrop-blur-xl p-4
            border-white/[0.08] shadow-none">
  {/* content */}
</div>
```

### Stat Card (Dashboard)
```tsx
<motion.div whileHover={{ scale: 1.01 }}
  className="rounded-lg border bg-card/70 backdrop-blur-xl p-4
             border-white/[0.08] transition-colors">
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground text-xs font-sans">Label</span>
    <Icon className="size-4 text-cyan-500" />
  </div>
  <div className="mt-1 text-xl font-semibold font-mono">Value</div>
</motion.div>
```

### Status Dot (Timeline)
```tsx
<span className={`size-2 rounded-full ${
  status === 'completed' ? 'bg-emerald-400' :
  status === 'running' ? 'bg-amber-400 animate-pulse' :
  'bg-red-400'
}`} />
```

### Button Primary
```tsx
<button className="inline-flex items-center gap-2 rounded-md bg-cyan-500/90
                       px-3 py-1.5 text-sm font-medium text-white
                       backdrop-blur-sm hover:bg-cyan-400
                       transition-colors duration-150">
  Label
</button>
```

### Button Ghost
```tsx
<button className="inline-flex items-center gap-2 rounded-md px-3 py-1.5
                       text-sm text-muted-foreground
                       hover:bg-white/5 hover:text-foreground
                       transition-colors duration-150">
  Label
</button>
```

---

## 7. Page Specifications

### Dashboard (`/dashboard`)
- 5-column stat grid (responsive), glass cards with cyan icon tint
- Agent status + Config detail panels side by side
- Recent trades table (when data exists)
- Memory summary pre block (monospace)
- Stats animate numbers on data refresh

### Chat (`/`)
- Full-height conversation, no header waste
- Empty state: animated icon + 4 action cards with hover glow
- Input: glass style with cyan focus ring
- Messages: slide-up entrance animation
- Tool calls: expandable glass cards

### Market (`/market`) — Coming Soon
- Animated chart placeholder (SVG lines drawing in)
- Feature list with icons: K线图, 订单簿, 深度数据, 实时行情
- "Building..." progress indicator
- Cyan glow accents on feature icons

### Portfolio (`/portfolio`) — Coming Soon
- Animated pie chart placeholder
- Feature list: 持仓列表, 盈亏统计, 风险指标, 资产配置
- Same visual language as Market page

### Memory (`/memory`)
- Search bar with glass style
- Domain cards: colored icon + count, glass background
- Record list: glass rows with monospace value display
- Importance dots: cyan-tinted
- Filter breadcrumb with smooth transitions

### Timeline (`/timeline`)
- Event list with glass row styling
- Status dots with animations (pulse for running)
- Time-based grouping (optional future enhancement)
- Color-coded event types

---

## 8. Sidebar Specification

### Structure (top to bottom)
1. **Brand area**: Logo/icon + "Trading Pi" + "AI Terminal"
2. **Navigation**: 6 links with active cyan underline/glow
3. **Sessions**: Collapsible list, max 10, delete on hover
4. **Footer**: Version + collapse button

### Visual
- Glass sidebar background (`backdrop-blur-sm`)
- Active nav item: cyan text + left border accent + subtle glow
- Hover: bg-white/5
- Session items: compact, truncate, mono font for names
- Delete button: appears on hover, red tint

---

## 9. Settings Panel

### Sections (in order)
1. **Appearance** — Theme (system/light/dark), Show thinking toggle
2. **Session** — Name input, Auto-compaction toggle
3. **Agent** — Thinking level selector, Model info (read-only)
4. **Auth** — Toggle (future)

### Visual
- Glass elevated background
- Section headers: sans-serif, medium weight, muted color
- Toggles: cyan when active
- Select dropdown: glass style matching theme

---

## 10. Design Token Reference (CSS Variables)

All custom properties go in `src/styles.css` under `@theme inline`. New tokens:

```css
/* Brand Accent */
--accent: oklch(0.72 0.15 195);
--accent-hover: oklch(0.78 0.15 195);
--accent-muted: oklch(0.55 0.10 195);

/* Typography */
--font-sans: "Geist Variable", ...;
--font-body: "Geist Variable", ...;
--font-mono: "JetBrains Mono", ...;

/* Semantic */
--profit: oklch(...);
--loss: oklch(...);

/* Glass */
--glass-bg: oklch(0.17 0.008 240 / 70%);
--glass-border: oklch(0.95 0 0 / 12%);
--glass-blur: 16px;
```

Tailwind utility classes to add via `@theme`:
- `bg-glass-card` → standard glass card background
- `border-glass` → glass border
- `text-accent` / `text-accent-hover` / `text-accent-muted`
- `font-sans` / `font-body` / `font-mono`
- `text-profit` / `text-loss`
- `animate-glow-pulse` → keyframe for pulsing glow

---

## 11. File Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-06-12 | Initial design system established | styles.css, AppLayout.tsx, all pages |
| 2026-06-12 | Dark glassmorphism + cyan accent | styles.css (major rewrite) |
| 2026-06-12 | Mixed font system | styles.css, all .tsx files |
| 2026-06-12 | Header removed | AppLayout.tsx |
| 2026-06-12 | framer-motion animations added | all pages |
| 2026-06-12 | Placeholder pages redesigned | MarketPage.tsx, PortfolioPage.tsx |

---

## 13. Responsive Design System

> Based on code audit of current implementation (2026-06-12). Covers mobile/tablet breakpoints for the Trading Pi dark glassmorphism UI.

### 13.1 Breakpoint System

| Name     | Width       | Sidebar | Grid Cols | Card Size | Padding |
|----------|-------------|---------|-----------|-----------|--------|
| Mobile   | < 640px     | Hidden  | 1 col     | Full      | p-4    |
| Tablet   | 640–1024px  | Overlay | 2 col     | Full      | p-5    |
| Desktop  | > 1024px    | Visible | 3–5 col   | Constrained| p-6    |
| Wide     | > 1440px    | Visible | 5 col     | Centered  | p-6    |

**Current state from audit:**
- Sidebar: 280px expanded / 48px collapsed — **no breakpoint-based auto-collapse**
- Content max-width: 1200px (`max-w-5xl`), padding `p-6` (24px)
- Dashboard stat grid: uses `lg:grid-cols-N` but **no sm/md/xl variants**
- Chat: `max-w-3xl` (768px), good for centering
- Memory domain grid: `grid-cols-2 lg:grid-cols-4` — has lg breakpoint only
- Market/Portfolio placeholder grids: similar patterns
- Timeline: single column list, naturally responsive
- Header: **removed** (good for mobile space)
- Font sizes: `text-xs` through `text-2xl`, no explicit mobile adjustments
- Touch targets: some buttons may be too small on mobile

### 13.2 Mobile-Specific Rules

- **Sidebar**: Auto-hide below `lg`; show hamburger menu button in its place (fixed top-left, `z-50`)
- **Navigation**: Bottom tab bar on mobile — fixed position, `h-14` (56px), `backdrop-blur-xl`, glass background, shows primary nav links (Dashboard, Chat, Market, Portfolio, Memory, Timeline)
- **Stat cards**: Stack vertically (1 col grid), full width, larger touch targets (`min-h-16`)
- **Chat**: Full-width messages (remove or reduce `max-w-3xl` on mobile), larger input area (`min-h-28`), bigger send button
- **Tables (trades)**: Horizontal scroll on overflow (`overflow-x-auto`), sticky first column (`sticky left-0`)
- **Quick action cards**: 2×2 grid stays same (already good at `grid-cols-2`)
- **Fonts**: Body text minimum 16px on mobile (`sm:text-base` base, ensure readability); headings can stay same scale
- **Touch targets**: Minimum 44×44px per Apple HIG — apply `min-h-[44px] min-w-[44px]` to all interactive elements
- **Modals**: Full-screen on mobile (`inset-0 rounded-none`), centered sheet on tablet+ (`max-w-lg mx-auto rounded-lg`)
- **Settings**: Bottom sheet on mobile (slides up from bottom), side panel on desktop (right drawer)

### 13.3 Tablet Adaptations

- **Sidebar**: Overlay mode — slides in from left, pushes content right with semi-transparent backdrop (`bg-black/40`), dismissible by tapping backdrop or pressing Escape
- **Grids**: 2 columns standard (`sm:grid-cols-2`) across dashboard stats, memory domains, and placeholder pages
- **Cards**: Slightly more padding than mobile (`p-5` vs `p-4`), full-width within the 2-col grid
- **Typography**: Same scale as desktop (tablet screens are large enough)
- **Bottom nav**: Hidden on tablet+ (sidebar overlay handles navigation)

### 13.4 Responsive Patterns (Code Examples)

```tsx
// Responsive stat grid (Dashboard)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
  {/* stat cards */}
</div>

// Responsive sidebar toggle (hamburger visible only below lg)
<button className="lg:hidden fixed top-4 left-4 z-50 ...">
  <Menu className="size-5" />
</button>
<aside className="hidden lg:flex w-[280px] ...">
  {/* sidebar content */}
</aside>

// Responsive card padding (progressive increase)
<div className="p-4 sm:p-5 lg:p-6 rounded-lg border bg-card/70 backdrop-blur-xl ...">

// Responsive text sizing (headings scale up with viewport)
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-sans">

// Responsive touch targets (Apple HIG compliant)
<button className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center ...">

// Responsive chat container
<div className="mx-auto w-full max-w-3xl px-4 sm:px-6">

// Responsive memory domain grid
<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

// Responsive table wrapper
<div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
  <table className="w-full min-w-[600px]"> {/* min-w prevents collapse */}

// Responsive bottom tab bar (mobile only)
<nav className="fixed bottom-0 left-0 right-0 h-14 lg:hidden
                bg-background/80 backdrop-blur-xl border-t border-white/[0.08]
                flex items-center justify-around px-2
                pb-[env(safe-area-inset-bottom)]">
  {/* nav items */}
</nav>
```

### 13.5 Safe Areas

Mobile devices with notches (iPhone X+, modern Android) require safe area insets:

```css
/* Fixed header / hamburger button */
.fixed-top-element {
  top: env(safe-area-inset-top);
}

/* Bottom tab bar */
.bottom-nav {
  bottom: env(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Main content when bottom nav is present */
.main-with-bottom-nav {
  padding-bottom: calc(3.5rem + env(safe-area-inset-bottom));
}
```

- Use `env(safe-area-inset-top)` for any fixed/absolute positioned element at the top of the viewport
- Use `env(safe-area-inset-bottom)` for the bottom tab bar and main content offset
- Tailwind v4 supports `env()` in arbitrary values: `pb-[calc(3.5rem+env(safe-area-inset-bottom))]`
- Always provide fallback padding for browsers that don't support safe area insets

### 13.6 Dark Mode on Mobile

```css
/* Ensure dark color scheme is declared */
html {
  color-scheme: dark;
}

/* Remove WebKit tap highlight on interactive elements (iOS Safari) */
button, a, [role="button"] {
  -webkit-tap-highlight-color: transparent;
}

/* Style scrollbars for mobile Chrome/Safari (subtle, non-intrusive) */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: oklch(0.95 0 0 / 15%);
  border-radius: 9999px;
}

/* Prevent overscroll bounce on scrollable containers */
.scroll-container {
  overscroll-behavior: contain;
}
```

- `color-scheme: dark` on `<html>` — already done in current styles.css
- `-webkit-tap-highlight-color: transparent` — removes the gray flash on tap (iOS)
- `overscroll-behavior: contain` — prevents pull-to-refresh interference in app-like contexts
- Keep scrollbars thin and low-contrast to match the glassmorphism aesthetic

### 13.7 Performance on Mobile

- **Content visibility**: Use `content-visibility: auto` on off-screen sections (e.g., timeline events below the fold) so the browser can skip rendering them until scrolled into view
- **Lazy mounting**: Heavy components like charts, large trade tables, and memory record lists should use `React.lazy()` or conditional rendering based on viewport proximity
- **Animation reduction**: Check `window.innerWidth < 640` (or use a media query hook) to:
  - Disable stagger animations on grid children
  - Skip `whileHover` scale transforms (no hover on touch)
  - Reduce motion duration or skip entirely if `prefers-reduced-motion: reduce`
- **Skeleton screens**: Prefer skeleton shimmer placeholders over spinners for loading states on mobile (perceived performance is better)
- **Image/asset sizing**: Serve appropriately sized assets; avoid rendering large SVG illustrations at full desktop resolution on mobile viewports

---

## 12. Future Enhancements (Out of Scope for v1)

- [ ] K线图组件 (lightweight chart library integration)
- [ ] Order book depth visualization
- [ ] Real-time price tickers with sparklines
- [ ] Drag-and-drop panel resizing
- [ ] Keyboard shortcut overlay (Cmd+?)
- [ ] i18n (English/Chinese toggle)
- [ ] Custom theme builder (user picks accent color)
- [ ] Notification center (toast system)
