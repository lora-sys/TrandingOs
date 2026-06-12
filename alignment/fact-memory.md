# Fact Memory — Trading Pi OS

## Project Identity

| Fact | Trust | Source |
|------|-------|--------|
| Name: `@trading-pi` (trading-pi) | 5 | package.json:2 |
| Version: 0.1.0 | 5 | package.json:3 |
| Private monorepo | 5 | package.json:4-9 |
| Node >= 22.19.0 | 5 | package.json:10-12 |
| TypeScript 5.9.3 strict mode | 5 | package.json:27 |

## Tech Stack — Frontend

| Fact | Trust | Source |
|------|-------|--------|
| React 19.2.7 (overridden) | 5 | package.json:25-34 |
| Vite 7.2.7 (dev server :5173) | 5 | package.json:28 |
| HeroUI v3 (3.1.0) + Tailwind CSS v4.3.0 | 5 | apps/web/package.json:15-17 |
| TanStack Router 1.170.15 | 5 | apps/web/package.json:32 |
| TanStack Query 5.101.0 | 5 | apps/web/package.json:31 |
| TanStack Table 8.21.3 | 5 | apps/web/package.json:34 |
| TanStack Form 1.33.0 | 5 | apps/web/package.json:30 |
| TanStack Virtual 3.14.2 | 5 | apps/web/package.json:35 |
| TanStack Start 1.168.25 | 5 | apps/web/package.json:33 |
| Radix UI primitives (collapsible, dropdown, hover-card, select, separator, tooltip) | 5 | apps/web/package.json:18-24 |
| framer-motion 12.40.0 | 5 | apps/web/package.json:41 |
| shiki 3.23.0 | 5 | apps/web/package.json:48 |
| streamdown 2.5.0 (streaming markdown) | 5 | apps/web/package.json:49 |
| lightweight-charts 5.2.0 | 5 | package.json:38 |
| recharts 3.8.1 | 5 | package.json:39 |
| lucide-react 0.468.0 | 5 | apps/web/package.json:42 |
| vaul 1.1.2 (drawer) | 5 | apps/web/package.json:54 |
| cmdk 1.1.1 (command palette) | 5 | apps/web/package.json:40 |

## Tech Stack — Backend & Core

| Fact | Trust | Source |
|------|-------|--------|
| Node HTTP server (no Express/Fastify) | 5 | apps/web/server/api.ts:1 |
| @trading-pi/core dependency | 5 | apps/web/server/api.ts:2-11 |
| SQLite via node:sqlite (TradingPiDatabase) | 5 | apps/web/server/api.ts:15-16 |
| Pi Mono runtime (pi-agent-core@0.79.0) | 5 | inferred from imports |
| Pi AI (pi-ai@0.79.0) | 5 | inferred from imports |
| Langfuse 3.38.20 (telemetry) | 5 | apps/web/server/api.ts:18 |
| AIO Sandbox (Docker sandbox :8080) | 5 | apps/web/server/api.ts:108 |

## Architecture

| Fact | Trust | Source |
|------|-------|--------|
| Single agent: TradingPiAgent | 5 | apps/web/server/api.ts:27 |
| Agent routes to WorkflowEngine | 5 | apps/web/server/api.ts:24-27 |
| Skills loaded via SkillRegistry + registerDefaultSkills | 5 | apps/web/server/api.ts:8,23-25 |
| Workflows loaded via WorkflowEngine + registerDefaultWorkflows | 5 | apps/web/server/api.ts:9,26 |
| ArtifactEngine for artifact storage/preview | 5 | apps/web/server/api.ts:21 |
| ApprovalEngine for gated actions | 5 | apps/web/server/api.ts:22 |
| SessionStore (JSONL) | 5 | apps/web/server/api.ts:19 |
| MemoryStore (domain-scoped) | 5 | apps/web/server/api.ts:20 |
| Monorepo: apps/web + packages/* | 5 | package.json:6-9 |

## API Endpoints

| Fact | Trust | Source |
|------|-------|--------|
| GET /api/health | 5 | apps/web/server/api.ts:99 |
| GET /api/status | 5 | apps/web/server/api.ts:100 |
| GET /api/skills | 5 | apps/web/server/api.ts:101 |
| GET /api/workflows | 5 | apps/web/server/api.ts:102 |
| GET /api/timeline | 5 | apps/web/server/api.ts:103 |
| GET /api/sessions | 5 | apps/web/server/api.ts:104 |
| GET /api/approvals | 5 | apps/web/server/api.ts:105 |
| GET /api/mcp/servers | 5 | apps/web/server/api.ts:107 |
| GET /api/browser/health | 5 | apps/web/server/api.ts:108 |
| POST /api/session/message | 5 | apps/web/server/api.ts:109-113 |
| POST /api/session/message/stream (SSE) | 5 | apps/web/server/api.ts:116-163 |
| GET /api/messages | 5 | apps/web/server/api.ts:164-168 |
| GET /api/artifacts | 5 | apps/web/server/api.ts:169 |
| POST /api/workflows/:name/run | 5 | apps/web/server/api.ts:171-177 |
| POST /api/paper/orders | 5 | apps/web/server/api.ts:179-184 |
| GET/POST /api/journal | 5 | apps/web/server/api.ts:185-191 |
| GET /api/market/ohlcv | 5 | apps/web/server/api.ts:192-202 |
| GET /api/portfolio | 5 | apps/web/server/api.ts:203 |
| GET /api/trades | 5 | apps/web/server/api.ts:204-211 |
| GET /api/reviews | 5 | apps/web/server/api.ts:212 |
| GET /api/strategies | 5 | apps/web/server/api.ts:213 |
| GET /api/memory | 5 | apps/web/server/api.ts:215 |
| POST /api/memory/query | 5 | apps/web/server/api.ts:216-219 |
| POST /api/memory/write | 5 | apps/web/server/api.ts:220-223 |
| API port: 8787 | 5 | apps/web/server/api.ts:232 |

## Routes (TanStack Router — 14 routes)

| Fact | Trust | Source |
|------|-------|--------|
| / -> ChatPage | 5 | apps/web/src/router.tsx:26 |
| /chat -> ChatPage | 5 | apps/web/src/router.tsx:27 |
| /workspaces -> WorkspacePage | 5 | apps/web/src/router.tsx:28 |
| /market -> MarketPage | 5 | apps/web/src/router.tsx:29 |
| /research -> ResearchPage | 5 | apps/web/src/router.tsx:30 |
| /planner -> PlannerPage | 5 | apps/web/src/router.tsx:31 |
| /portfolio -> PortfolioPage | 5 | apps/web/src/router.tsx:32 |
| /journal -> JournalPage | 5 | apps/web/src/router.tsx:33 |
| /review -> ReviewPage | 5 | apps/web/src/router.tsx:34 |
| /evolution -> EvolutionPage | 5 | apps/web/src/router.tsx:35 |
| /marketplace -> MarketplacePage | 5 | apps/web/src/router.tsx:36 |
| /journey -> BeginnerJourneyPage | 5 | apps/web/src/router.tsx:37 |
| /system -> SystemPage | 5 | apps/web/src/router.tsx:38 |
| /settings -> PlaceholderPage("Settings") | 5 | apps/web/src/router.tsx:39 |
| Layout wraps all routes | 5 | apps/web/src/router.tsx:18-22 |

## Config

| Fact | Trust | Source |
|------|-------|--------|
| TanStack Start config: node-server preset | 5 | apps/web/app.config.ts:4-6 |
| Route directory: ./src/routes | 5 | apps/web/app.config.ts:7-9 |
| Docker base: node:22-bookworm-slim | 5 | Dockerfile:1 |
| Docker includes git + ripgrep | 5 | Dockerfile:4 |
| Docker exposes port 8787 | 5 | Dockerfile:27-28 |

## Conflicts (Doc vs Code)

| Doc Claim | Code Truth | Source | Action |
|-----------|-----------|--------|--------|
| specs/architecture.md: PostgreSQL/Redis/ChromaDB/S3 | SQLite only | apps/web/server/api.ts:15-16 | Mark doc stale |
| specs/spec.md: K8s, Python code | docker-compose + TypeScript only | Dockerfile + apps/web/package.json | Mark doc stale |
| specs/design.md: "Zustand" | Zustand not in deps | apps/web/package.json | Mark doc stale |
