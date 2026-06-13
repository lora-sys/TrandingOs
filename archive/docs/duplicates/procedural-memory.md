# Development Playbook — Trading Pi OS
**Extracted**: 2026-06-13
**Source**: Git history (19 commits, 9 branches) + codebase structure analysis (100+ files in latest commit)
**Confidence**: HIGH — All procedures grounded in actual file evidence

---

## Workflows

### W1: Add New Page
**Confidence**: HIGH
**Evidence**: 6 pages created following identical pattern (`ChatPage`, `DashboardPage`, `MarketPage`, `PortfolioPage`, `MemoryPage`, `TimelinePage`)

Steps:
1. Create page component at `apps/web/src/pages/<Name>Page.tsx`
   - Export as named export: `export function NamePage() { ... }`
   - Wrap outer container in `<motion.div>` with entrance animation (`initial={{ opacity: 0 }} animate={{ opacity: 1 }}`)
   - Use glassmorphism card styling: `bg-card/70 backdrop-blur-xl border-white/[0.08]`
   - Use cyan accent for highlights: `text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/20`
   - User-facing strings in Chinese; code/comments in English
2. Import page in `apps/web/src/router.tsx` (line 3–8 area)
3. Add route definition using TanStack Router pattern:
   ```ts
   const nameRoute = createRoute({
     getParentRoute: () => rootRoute,
     path: "/<path>",
     component: NamePage,
   });
   ```
4. Add route to `routeTree` array (line 57–64): `rootRoute.addChildren([..., nameRoute])`
5. Add navItem in `apps/web/src/components/AppLayout.tsx` `navItems` array (line 24–31):
   ```ts
   { label: "Label", icon: IconFromLucide, to: "/<path>" as const },
   ```
   - Import icon from `lucide-react` (e.g., `TrendingUpIcon`, `WalletIcon`, `BrainIcon`)
   - Place in logical order: Dashboard → Chat → Market → Portfolio → Memory → Timeline

**File touch points**: `pages/<Name>.tsx`, `router.tsx`, `AppLayout.tsx`

---

### W2: Add Backend API Endpoint
**Confidence**: HIGH
**Evidence**: 30+ endpoints in single-file server at `apps/web/server/api.ts` (305 lines)

Steps:
1. Add handler block in `apps/web/server/api.ts` inside the `createServer` callback (after line 126, before the catch-all 404 at line 294)
2. Match URL pattern:
   ```ts
   if (url.pathname === "/api/endpoint" && req.method === "GET") {
     return sendJson(res, data);
   }
   if (url.pathname === "/api/endpoint" && req.method === "POST") {
     const body = await readBody(req);
     // business logic
     return sendJson(res, result);
   }
   ```
3. For dynamic segments: `url.pathname.startsWith("/api/resource/")` + regex extract or `url.pathname.match(/^\/api\/resource\/([^/]+)$/)`
4. Use helpers:
   - `readBody(req)` — parse JSON body (defined line 34)
   - `sendJson(res, data, status?)` — JSON response (defined line 29)
5. For DB operations: use `repos.method()` from `Repositories` class instance (instantiated line 17)
6. For session-aware endpoints: `sessions.ensureSession(body.sessionId)` to get/create session
7. For skill execution: `skills.get("skill.name").execute(input, { env, repos, artifacts, approvals, memory, sessionId })`
8. For workflow execution: `workflows.run(workflowId, input, { env, repos, artifacts, approvals, memory, skills, sessionId })`
9. If modifying runtime config: update `agentConfig` object (line 47–51) for GET/POST /api/config pattern

**File touch point**: `apps/web/server/api.ts`
**Rebuild required if**: changing `@trading-pi/core` imports → `cd packages/core && npm run build`

---

### W3: Frontend-Backend Integration (Add API Client Method)
**Confidence**: HIGH
**Evidence**: 35+ methods in `tradingPiApi` object at `apps/web/src/api.ts`; compatibility shim at `apps/web/src/api/client.ts`

Steps:
1. Add method in `apps/web/src/api.ts` inside `tradingPiApi` object (line 49–173):
   ```ts
   methodName: (params?: Type) => rpc("/api/endpoint", params),
   // or for DELETE:
   deleteMethod: (id: string) => rpc(`/api/resource/${id}`, undefined, "DELETE"),
   // or for GET with query params:
   listMethod: () => rpc("/api/resource?param=value"),
   ```
2. If new response shape needed: add type in `apps/web/src/api/types.ts`
3. Consume in component via TanStack Query:
   ```ts
   const { data } = useQuery({
     queryKey: ["uniqueKey"],
     queryFn: () => tradingPiApi.methodName().catch(() => null),
     refetchInterval: interval_ms,
   });
   ```
4. For mutations: call in event handler, handle loading/error states, invalidate related queries:
   ```ts
   await tradingPiApi.mutateMethod(params);
   queryClient.invalidateQueries({ queryKey: ["relatedKey"] });
   ```
5. The `rpc()` helper (line 31) handles: fetch, JSON parse, error throwing, online status tracking
6. Health check is automatic (10s interval, line 26–29); use `isApiOnline()` or `onApiStatusChange()` for reactive status

**File touch points**: `apps/web/src/api.ts`, `apps/web/src/api/types.ts`, consuming component

---

### W4: Extend Chat Rendering (New ChatItem Kind)
**Confidence**: HIGH
**Evidence**: 5 kinds implemented (message, tool, system, artifact, plan) across 3 files

Steps:
1. **Add variant to ChatItem union type** in `apps/web/src/core/types.ts` (line 31–82):
   ```ts
   | {
       kind: "newkind";
       id: string;
       // kind-specific fields...
     }
   ```
2. **Add conversion logic** in `apps/web/src/core/chat-conversion.ts` `syncToItems()` (line 4–106):
   - Scan entries loop (line 71–103 area) for custom type detection
   - Pattern: check `(entry as any).customType === "newkind"`, deduplicate with `items.find()`, push shaped object
3. **Add render case** in `apps/web/src/components/pi-web-ui/chat-item-view.tsx` (line 35–224):
   - Add `if (item.kind === "newkind")` branch before the final message fallback (before line 183)
   - Import ai-element component from `@/components/ai-elements/` if applicable (Plan, Artifact, Tool, Message, Reasoning available)
4. If creating a new ai-element primitive: add to `apps/web/src/components/ai-elements/<name>.tsx` following existing patterns (compound component with Header/Content/Action sub-components)

**File touch points**: `core/types.ts`, `core/chat-conversion.ts`, `pi-web-ui/chat-item-view.tsx`, optionally `ai-elements/<new>.tsx`

---

### W5: Settings Persistence (Dual-Write Pattern)
**Confidence**: HIGH
**Evidence**: 6 settings persisted identically (themeMode, thinkingLevel, showThinking, autoCompaction, sessionName, authEnabled)

Steps:
1. **Add field to state interface** in `apps/web/src/lib/settingsStore.ts` (line 4–33):
   - Add property to `SettingsState` interface
   - Add corresponding setter action signature
2. **Add localStorage read** in initial state (line 36–51):
   ```ts
   fieldName: (typeof localStorage !== 'undefined' ? localStorage.getItem("trading-pi-field-name") : null) ?? defaultValue,
   ```
   - Key convention: `trading-pi-<kebab-case-name>` or `pi-<kebab-case-name>`
3. **Add localStorage write in setter** (line 58–77 pattern):
   ```ts
   setFieldName: (value) => {
     try { localStorage.setItem("trading-pi-field-name", String(value)); } catch {}
     set({ fieldName: value });
   },
   ```
4. **Add remote sync** in `apps/web/src/components/AppLayout.tsx` (line 230–238 pattern):
   - Wire callback prop on SettingsPanel to call both store setter and API:
     ```tsx
     onSetField={async (value) => {
       useSettingsStore.getState().setFieldName(value);
       try { await tradingPiApi.setConfig({ fieldName: value }); } catch { /* non-critical */ }
     }}
     ```
5. **Add server-side config field** in `apps/web/server/api.ts` `agentConfig` (line 47–51) if it affects agent behavior
6. **Pass through agent prompt chain** if it affects AI behavior: `agent.prompt(body, callback, { fieldName: agentConfig.fieldName, ... })`

**File touch points**: `lib/settingsStore.ts`, `AppLayout.tsx`, `server/api.ts` (if agent-affecting)

---

### W6: Add New UI Primitive Component
**Confidence**: MEDIUM
**Evidence**: 20 primitives in `components/ui/` following base-ui/react + CVA pattern

Steps:
1. Create at `apps/web/src/components/ui/<name>.tsx`
2. Use `@base-ui/react` as underlying primitive (not Radix UI — project migrated away)
3. Use `class-variance-authority` for variant styling (already installed)
4. Use `cn()` utility from `@/lib/utils` (merges clsx + tailwind-merge)
5. Follow existing patterns: forwardRef, compound components where applicable
6. Export for use in pi-web-ui or page components

**File touch point**: `components/ui/<name>.tsx`

---

## Conventions

### Branch Naming (from git branch -a)
| Prefix | Usage | Examples |
|--------|-------|----------|
| `codex/` | AI-assisted feature development | `codex/trading-pi-phase-1-5`, `codex/trading-pi-os-v4-1-upgrade-foundation` |
| `feature/` | UI/UX feature branches | `feature/mvp-chat-ui` |
| `refactor/` | Structural refactoring | `refactor/frontend` |
| `main` | Stable production branch | — |

### Commit Style (from git log --format)
- **Conventional commits**: `feat:`, `docs:`, `fix:`, `refactor:`
- **Author pattern**: `lora-sys` does development work; `lora` merges PRs
- **Merge commits**: GitHub merge pull request format
- **Non-conventional accepted for**: simple updates (`update docs`, `update mvp`, `refactor frontend`)

### Component Location Convention
| What | Where | Example |
|------|-------|---------|
| Page components | `apps/web/src/pages/` | `DashboardPage.tsx`, `MarketPage.tsx` |
| Shared layout | `apps/web/src/components/` | `AppLayout.tsx`, `ChatWorkspace.tsx` |
| AI element primitives | `apps/web/src/components/ai-elements/` | `plan.tsx`, `artifact.tsx`, `tool.tsx` |
| pi-web-ui components | `apps/web/src/components/pi-web-ui/` | `chat-item-view.tsx`, `settings-panel.tsx` |
| UI primitives | `apps/web/src/components/ui/` | `button.tsx`, `card.tsx`, `input.tsx` |
| Core types/logic | `apps/web/src/core/` | `types.ts`, `chat-conversion.ts` |
| State management | `apps/web/src/lib/` | `settingsStore.ts` |
| API client | `apps/web/src/api.ts` | `tradingPiApi` object |
| API types | `apps/web/src/api/types.ts` | Response/request types |
| Server handlers | `apps/web/server/api.ts` | Single-file HTTP server |

### State Management
- **Library**: Zustand v5 (`zustand`: ^5.0.14)
- **Store location**: `apps/web/src/lib/settingsStore.ts`
- **Pattern**: Single store, `create<SettingsState>()` hook, selector-based reads (`useSettingsStore((s) => s.field)`)
- **Direct access for callbacks**: `useSettingsStore.getState().setMethod()` (avoids re-render issues in event handlers)

### Styling Conventions
- **Framework**: Tailwind CSS v4 (no CSS modules, no styled-components)
- **Global CSS variables**: `apps/web/src/styles.css` — oklch color space, light + dark theme tokens
- **Design system**: Glassmorphism dark theme
  - Card background: `bg-card/70 backdrop-blur-xl`
  - Border: `border-white/[0.08]` or `border-white/10`
  - Accent color: Cyan (`#22d3ee` / `text-cyan-400` / `bg-cyan-500/10`)
  - Status colors: emerald (success), red (destructive), muted-foreground (secondary text)
- **Animation**: Framer Motion (`framer-motion`: ^12.40.0)
  - Page entrance: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}`
  - Hover: `whileHover={{ scale: 1.01 }}` or `whileHover={{ y: -3 }}`
  - Stagger children: `variants` + `staggerChildren`
- **Font system**:
  - UI text: Geist Variable (`--font-sans`)
  - Code/data: JetBrains Mono (`--font-mono`) — applied globally via AppLayout `font-[family-name:var(--font-mono)]`
- **Icons**: `lucide-react` (^0.468.0) — all icons follow `{Name}Icon` naming

### Routing
- **Library**: TanStack Router v1 (`@tanstack/react-router`: ^1.170.15)
- **Pattern**: File-based route definitions in `router.tsx` (not file-system routing)
- **Layout**: Root route wraps `<AppLayout><Outlet /></AppLayout>`; all child routes nest inside
- **Navigation**: `Link` from `@tanstack/react-router` + `useLocation()` for active state detection
- **Type safety**: Module declaration for router (line 69–73 of router.tsx)

### Data Fetching
- **Library**: TanStack Query v5 (`@tanstack/react-query`: ^5.101.0)
- **Pattern**: `useQuery({ queryKey: [...], queryFn: () => api.method().catch(() => null) })`
- **Error handling**: `.catch(() => null)` default pattern; conditional rendering for error states
- **Polling**: `refetchInterval` for real-time data (health: 10s, sessions: 15s, status: 5s)
- **Invalidation**: `queryClient.invalidateQueries({ queryKey: [...] })` after mutations

## Rules

### Always
- Rebuild `packages/core` after changing agent code (`cd packages/core && npm run build`)
- Test API endpoints with curl before integrating frontend
- Run TypeScript check after changes: `npx tsc --noEmit` (or `npm run check`)
- Keep `server/api.ts` as single-file (no framework, no Express/Koa/Fastify)
- Use `rpc()` helper for all API calls (don't raw fetch)
- Use `cn()` for conditional class merging
- Use `as any` only at api.ts boundary (external API layer); never in core domain models

### Never
- Add HeroUI or Radix UI dependencies (migrated to @base-ui/react)
- Create CSS module files (`.module.css`)
- Bypass the settingsStore for user-preference state
- Hardcode API port (use `import.meta.env.TRADING_PI_API_PORT ?? 8787`)
- Commit `.env` files or secrets
- Push directly to main (user handles deployment per AGENTS.md)

### Language
- **User-facing strings**: Chinese (项目语言)
- **Code identifiers**: English camelCase/PascalCase
- **Comments**: English
- **Commit messages**: English (conventional commits)
- **Documentation**: English (md files)

## Architectural Decisions

| Decision | Rationale | Date | Evidence |
|----------|-----------|------|----------|
| Single-file server (api.ts) | Zero framework overhead, full control over SSE streaming | 2026-06 | `server/api.ts` — 305 lines, raw node:http |
| @base-ui/react over Radix UI | Future-proof, maintained by Manticore team | 2026-06 | `package.json`: `@base-ui/react: ^1.5.0` |
| SSE over WebSocket for chat | Simpler implementation, sufficient for unidirectional agent→client streaming | 2026-06 | `server/api.ts` lines 166–218 (SSE endpoint) |
| SQLite over PostgreSQL | Local-first architecture, zero infra dependency, node:sqlite built-in | 2026-06 | `server/api.ts` line 15–16 |
| Zustand over Redux/Context | Lightweight boilerplate, perfect for app-level settings state | 2026-06 | `settingsStore.ts` — single create() call |
| TanStack Router over React Router | Type-safe routing, coexists with TanStack Query ecosystem | 2026-06 | `router.tsx` — createRoute pattern |
| Dark glassmorphism theme | Trading terminal aesthetic, reduces eye strain for long sessions | 2026-06 | `styles.css` dark theme tokens |
| oklch color space | Perceptually uniform, better gradient control than HSL | 2026-06 | `styles.css` — all colors in oklch() |
| Lucide React icons | Tree-shakable, consistent style, 1000+ icons | 2026-06 | Used across all components |
| Framer Motion animations | Declarative, performant, layout animations | 2026-06 | Every page uses motion.div |

## Co-Changing File Groups (from git log --name-only analysis)

| When changing... | Also update... | Risk if missed |
|-------------------|----------------|---------------|
| `router.tsx` (add route) | `AppLayout.tsx` (add navItem) | Nav link broken or 404 |
| `core/types.ts` (ChatItem kind) | `chat-conversion.ts` (syncToItems) + `chat-item-view.tsx` (render) | Runtime error or invisible item |
| `server/api.ts` (new endpoint) | `src/api.ts` (client method) + `api/types.ts` (types) | Frontend can't call endpoint |
| `settingsStore.ts` (new setting) | `AppLayout.tsx` (callback wiring) + `server/api.ts` (config field) | Setting not persisted/synced |
| `packages/core/` (agent/skill/workflow) | Run `npm run build` in packages/core | Import errors at runtime |
| `styles.css` (theme tokens) | Check both `:root` and `.dark` blocks | Theme mismatch |

## Development Commands

| Command | Purpose | Location |
|---------|---------|----------|
| `npm run dev` | Start Vite dev server (port 5173) | `apps/web/` |
| `npm run server` | Start API server (port 8787) | `apps/web/` |
| `npm run build` | TypeScript + Vite production build | `apps/web/` |
| `npm run check` | TypeScript type-check all packages | Root |
| `npm run test` | Run Vitest unit tests | Root |
| `cd packages/core && npm run build` | Rebuild core package | `packages/core/` |

## Package Dependency Map (key packages)

```
apps/web/
├── @base-ui/react          — UI primitives (replaces Radix)
├── @tanstack/react-router  — Type-safe routing
├── @tanstack/react-query   — Data fetching / caching
├── framer-motion           — Animations
├── lucide-react            — Icon library
├── zustand                 — State management
├── tailwindcss v4          — Utility-first CSS
├── react ^19.2             — UI framework
├── ai                      — AI SDK (types, utilities)
└── streamdown              — Markdown streaming renderer

packages/core/
└── @trading-pi/core        — Agent runtime (consumed by server/api.ts)
    ├── TradingPiAgent      — Main agent orchestrator
    ├── SkillRegistry       — 52 built-in skills
    ├── WorkflowEngine      — DAG workflow executor
    ├── Repositories        — SQLite CRUD operations
    ├── SessionStore        — Session lifecycle
    ├── MemoryStore         — Vector/memory storage
    └── ArtifactEngine      — Artifact generation/retrieval
```
