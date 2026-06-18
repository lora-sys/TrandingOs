# Trading Pi OS — Project Documentation

> **Project**: Trading Pi OS — Local-First Personal Trading Operating System
> **Architecture Version**: 5.0 (Post-Frontend-Refactor, 2026-06-14)
> **Last Updated**: 2026-06-14

---

## Quick Start

| I want to... | Read this |
|--------------|-----------|
| Understand the full system | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Work on the frontend | [FRONTEND.md](./FRONTEND.md) |
| Work on the backend/API server | [BACKEND.md](./BACKEND.md) |
| Call API endpoints | [API.md](./API.md) |
| Deploy or run locally | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Follow development workflow | [WORKFLOWS.md](./WORKFLOWS.md) |

---

## Documentation Map

### Core Architecture

| Document | Version | Description |
|----------|---------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **v5.0** | Canonical system architecture. Covers: runtime stack, module boundaries, domain directories, frontend hooks layer, state management, routing, data flow, database schema (30 tables), integration points. **Start here.** |
| [BACKEND.md](./BACKEND.md) | v0.2.0 | Backend deep-dive: single-file HTTP server, agent system (TradingPiAgent), SSE protocol, config API, skill system (40+ skills), artifact/plan engines, auto-compaction, session management, environment variables. |
| [FRONTEND.md](./FRONTEND.md) | **v5.0** | Frontend deep-dive: React 19 + Vite + TanStack Router, custom hooks architecture (useSSEStream, useRpcRouter, useModelPicker, useCommandBar), code-split routing, design system (glassmorphism), settings persistence, dead code inventory. |
| [API.md](./API.md) | v1.1 | REST API reference: all endpoints (30+), request/response shapes, SSE event types with data structures, frontend client usage notes. |

### Operations & Development

| Document | Version | Description |
|----------|---------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Updated | Prerequisites, local development, build, production deployment (Docker + manual), complete environment variables reference (20+ vars), data storage layout, verification steps. |
| [WORKFLOWS.md](./WORKFLOWS.md) | v1.1 | Development playbook: phase-driven feature process, chat command execution flow, spec→checklist→implementation pattern, skill execution pattern, commit style, branch naming, **post-refactor development workflow (v5.0)**, rules (always/never), approval gates. |

### Design Decisions & Rationale

| Document | Description |
|----------|-------------|
| [local-first-architecture.md](./local-first-architecture.md) | Local-first design philosophy: data architecture (SQLite + JSONL + files), no cloud dependency breakdown, full data flow diagram, privacy & security principles. |
| [pi-reuse.md](./pi-reuse.md) | Pi Mono reuse strategy: what we borrow from `@earendil-works/pi-*`, what Trading Pi adds, what we must not add. |

### Architecture Decision Records (ADRs)

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [001](./adr/001-single-agent.md) | Single Agent Architecture | 2026-06-11 | Accepted |
| [002](./adr/001-single-agent.md#adr-002-local-first-persistence) | Local-First Persistence | 2026-06-11 | Accepted |
| [003](./adr/001-single-agent.md#adr-003-aio-sandbox-for-browser-automation) | AIO Sandbox for Browser Automation | 2026-06-11 | Accepted |
| [004](./adr/001-single-agent.md#adr-004-pi-mono-reuse) | Pi Mono Reuse | 2026-06-11 | Accepted |
| [005](./adr/001-single-agent.md#adr-005-approval-gates-for-dangerous-actions) | Approval Gates for Dangerous Actions | 2026-06-11 | Accepted |
| [006](./adr/001-single-agent.md#adr-006-skill-schema-validation-with-typebox) | Skill Schema Validation with TypeBox | 2026-06-11 | Accepted |
| [007](./adr/001-single-agent.md#adr-007-monorepo-with-workspace-packages) | Monorepo with Workspace Packages | 2026-06-11 | Accepted |
| [008](./adr/001-single-agent.md#adr-008-market-data-dual-source) | Market Data Dual-Source | 2026-06-11 | Accepted |
| [009](./adr/001-single-agent.md#adr-009-search-provider-redundancy) | Search Provider Redundancy | 2026-06-11 | Accepted |
| [010](./adr/010-frontend-refactoring.md) | **Frontend Architecture Refactoring** | 2026-06-14 | Accepted |

> **ADR-010** is the most recent and significant — documents the v5.0 frontend refactoring (God component decomposition, code-splitting, deduplication, shallow package consolidation).

### Package Documentation

| Package | Status | Description |
|---------|--------|-------------|
| [core](./packages/core.md) | **Active** | Main runtime: agent, skills (40+), workflows (9 DAGs), DB, repositories, engines |
| [browser-layer](./packages/browser-layer.md) | **Active** | AIO Sandbox browser action contract (2 adapters: AIO + Playwright) |
| [mcp-hub](./packages/mcp-hub.md) | **Active** | MCP registry, discovery, health, permissions (~691 lines) |
| [search-hub](./packages/search-hub.md) | **Active** | Exa/Jina/Tavily search with caching |
| [journal](./packages/journal.md) | ~~Deprecated~~ | Consolidated into `core/src/journal.ts` (v5.0) |
| [memory-engine](./packages/memory-engine.md) | ~~Deprecated~~ | Consolidated into `core/src/memory/types.ts` (v5.0) |
| [strategy-engine](./packages/strategy-engine.md) | ~~Deprecated~~ | Consolidated into `core/src/strategy.ts` (v5.0) |
| [research-hub](./packages/research-hub.md) | ~~Deprecated~~ | Consolidated into `core/src/research/bundle.ts` (v5.0) |

---

## Architecture Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Trading Pi OS v5.0                          │
│                     (Local-First Personal OS)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    HTTP/SSE     ┌──────────────────────────┐  │
│  │   Frontend (React) │ ◄────────────► │   Backend (Node.js)       │  │
│  │   :5173 / :build   │   :8787        │   apps/web/server/api.ts  │  │
│  │                    │                │                           │  │
│  │  ┌──────────────┐  │                │  ┌─────────────────────┐  │  │
│  │  │ ChatWorkspace │  │                │  │  TradingPiAgent      │  │  │
│  │  │  (~520 lines) │  │                │  │  (Pi Mono wrapper)   │  │  │
│  │  └──────┬───────┘  │                │  └──────────┬──────────┘  │  │
│  │  ┌──────┴───────┐  │                │             │              │  │
│  │  │ Custom Hooks  │  │                │  ┌──────────▼──────────┐  │  │
│  │  │ ·SSEStream    │  │                │  │  Workflow Engine     │  │  │
│  │  │ ·RpcRouter    │  │                │  │  (9 DAGs)            │  │  │
│  │  │ ·ModelPicker  │  │                │  └──────────┬──────────┘  │  │
│  │  │ ·CommandBar   │  │                │             │              │  │
│  │  └──────────────┘  │                │  ┌──────────▼──────────┐  │  │
│  │                    │                │  │  Skill Registry      │  │  │
│  │  ┌──────────────┐  │                │  │  (40+ skills)        │  │  │
│  │  │ Zustand Store │  │                │  └──────────┬──────────┘  │  │
│  │  └──────────────┘  │                │             │              │  │
│  └──────────────────┘                │  ┌──────────▼──────────┐  │  │
│                                       │  │  SQLite + JSONL      │  │  │
│                                       │  │  Files + Artifacts   │  │  │
│                                       │  └─────────────────────┘  │  │
│                                       └──────────────────────────┘  │
│                                                                     │
│  External Services (optional/network):                               │
│  ├── OpenAI-compatible AI Provider                                   │
│  ├── Search: Exa / Jina / Tavily                                    │
│  ├── Market: CoinGecko / CCXT (Binance, OKX, Bybit...)              │
│  ├── Telemetry: Langfuse (opt-in)                                    │
│  └── Browser Sandbox: AIO Docker (:8080)                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Language** | TypeScript | 5.9.3 (ES2024, strict, NodeNext) |
| **Runtime** | Node.js | >=22.19.0 |
| **Frontend Framework** | React | 19.2.7 |
| **Build Tool** | Vite | 7.2.7 |
| **CSS** | Tailwind CSS | v4.3.0 |
| **Router** | TanStack Router | 1.170.15 (code-split) |
| **State (Server)** | SQLite (node:sqlite) | Built-in |
| **State (Client UI)** | Zustand | 5.0.14 |
| **Server State** | TanStack Query | 5.101.0 |
| **AI Framework** | @earendil-works/pi-agent-core | 0.79.0 |
| **UI Base** | @earendil-works/pi-web-ui | 0.75.3 |
| **Charts** | lightweight-charts + recharts | 5.2.0 + 3.8.1 |
| **Animation** | framer-motion | 12.40.0 |

---

## Key File Index

### Entry Points

| File | Purpose |
|------|---------|
| `apps/web/src/main.tsx` | Frontend entry (ReactDOM.createRoot) |
| `apps/web/src/app.tsx` | App root (RouterProvider) |
| `apps/web/src/router.tsx` | 9 lazy-loaded routes |
| `apps/web/server/api.ts` | Backend HTTP server (single file, ~305 lines) |
| `packages/core/src/index.ts` | Core package barrel exports |

### Frontend: Custom Hooks (v5.0)

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/useSSEStream.ts` | Full SSE streaming lifecycle (~231 lines) |
| `apps/web/src/hooks/useRpcRouter.ts` | Command registry pattern (~230 lines) |
| `apps/web/src/hooks/useModelPicker.ts` | Model selection state (~82 lines) |
| `apps/web/src/hooks/useCommandBar.ts` | Keyboard shortcuts + command palette (~98 lines) |

### Frontend: Shared Services (v5.0)

| File | Purpose |
|------|---------|
| `apps/web/src/lib/exportService.ts` | HTML/Markdown/PDF export (pure functions) |
| `apps/web/src/lib/format-utils.ts` | Shared currency formatting |
| `apps/web/src/lib/useResolvedTheme.ts` | Reactive theme resolution hook |
| `apps/web/src/lib/settingsStore.ts` | Zustand store (settings + model + subagents) |

### Backend: Core Domain

| File | Purpose |
|------|---------|
| `packages/core/src/agent/trading-pi-agent.ts` | Agent class (session, slash commands, compaction) |
| `packages/core/src/skills/default-skills.ts` | 40+ skill registrations |
| `packages/core/src/workflows/default-workflows.ts` | 9 DAG workflow definitions |
| `packages/core/src/db/database.ts` | SQLite setup + 30 table migrations |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-14 | **v5.0** | **Major frontend refactoring** (ADR-010): ChatWorkspace decomposition (959→520L), route code-splitting (9 lazy routes), command registry pattern, logic deduplication (7 patterns), shallow package consolidation (4 packages → core), dead code cleanup. New: useSSEStream, useRpcRouter, useModelPicker, useCommandBar hooks; ExportService, FormatUtils services. |
| 2026-06-13 | v4.1 | Baseline before refactoring. ARCHITECTURE.md, FRONTEND.md established. |
| 2026-06-11 | v4.0 | Initial documentation set: ADRs 001-009, BACKEND.md, API.md, DEPLOYMENT.md, WORKFLOWS.md, package docs. |

---

## Future Roadmap (from ADR-010 deferred items)

| Priority | Item | Impact | Status |
|----------|------|--------|--------|
| **HIGH** | Typed API Client (`rpc()` generic signatures) | Touches 60+ method signatures, 33 call sites | Deferred — recommended next refactor |
| MEDIUM | Delete deprecated package shims | Clean up journal/memory-engine/strategy-engine/research-hub packages | Blocked on consumer audit |
| MEDIUM | WorkspacePage ResearchTab extraction | Extract from WorkspacePage inline to workspace/components.tsx | Blocked by circular dependency with ChatWorkspace |
| LOW | Virtual scrolling for chat | Use `@tanstack/react-virtual` (already installed) for long conversations | Not started |
