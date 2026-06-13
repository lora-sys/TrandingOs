# Documentation Audit — Trading Pi OS
**Date**: 2026-06-13
**Total Docs**: 113
**Auditor**: Knowledge Refactor Loop v1 — Iteration 1 (Doc Auditor)

## Canonical (trust >= 4, matches current code)

| Path | Trust | Notes |
|------|-------|-------|
| README.md | 5 | Just created, comprehensive, matches codebase exactly. React 19, Vite 7, Tailwind v4, pi-web-ui base, @base-ui/react |
| docs/FRONTEND.md | 5 | Created from actual code audit. Complete reference for apps/web/src/ — 648 lines covering all pages, components, data flow, SSE protocol, settings, dead code |
| docs/BACKEND.md | 5 | Created from actual code audit. Complete reference for api.ts + packages/core/ — 867 lines covering server init, agent system, DB schema (30 tables), skills, artifacts, compaction, env vars |
| CLAUDE.md | 5 | Live project rules. Accurate tech stack: Pi Mono, HeroUI v3 + shadcn, ai-elements. Single-agent architecture |
| AGENTS.md | 5 | Agent collaboration rules. Single agent (TradingPiAgent) + Claude Code assistant |
| apps/web/design.md | 5 | Design system spec v1.0 (2026-06-12). Dark glassmorphism, cyan accent, oklch tokens, framer-motion patterns, responsive breakpoints, component patterns |
| docs/pi-reuse.md | 5 | Pi Mono reuse decision. pi-agent-core + pi-ai + pi-web-ui compatibility analysis |
| docs/local-first-architecture.md | 5 | Local-first storage layout (.trading-pi/), runtime flow, market data sources |
| docs/ARCHITECTURE.md | 4 | Comprehensive architecture v4.1. Mostly accurate; minor: still references "HeroUI v3" as primary UI (now pi-web-ui base), lists "Zustand" in target design as "not installed" (it IS installed) |
| docs/API.md | 4 | API reference (2026-06-11). All endpoints accurate. Minor: references `POST /api/workflows/:name/run` but code uses `:id/run` |
| docs/DEPLOYMENT.md | 4 | Deployment guide. Accurate for local dev + Docker. Minor: uses `AI_API_KEY` not `OPENAI_API_KEY` for env var name |
| AGENT.md | 4 | Agent spec. Core responsibilities accurate. Module list matches implementation |
| validators.md | 4 | Validation checklist. Pre/post-implementation checks defined |
| docs/adr/001-single-agent.md | 4 | 9 ADRs (001-009). All accepted decisions match current code state |
| docs/packages/core.md | 4 | Core package reference. Lists 40+ skills, 9 workflows, key files accurately |
| docs/packages/research-hub.md | 4 | Research hub package doc. Accurate integration description |
| docs/packages/journal.md | 4 | Journal package doc |
| docs/packages/strategy-engine.md | 4 | Strategy engine package doc |
| docs/packages/memory-engine.md | 4 | Memory engine package doc |
| docs/packages/search-hub.md | 4 | Search hub package doc |
| docs/packages/mcp-hub.md | 4 | MCP hub package doc |
| docs/packages/browser-layer.md | 4 | Browser layer package doc |
| docs/WORKFLOWS.md | 4 | Workflows & development playbook. Phase-driven process, conventions, skill categories accurate |
| specs/version.md | 5 | Trading Pi vision document. Single-agent principle, product positioning, five core capabilities — all still relevant |
| specs/agent.md | 4 | Agent development rules. Single-agent rule, prohibited actions, required files — all accurate |

## Stale (superseded or outdated)

| Path | Trust | Notes |
|------|-------|-------|
| docs/archive/phase-1-local-foundation.md | 1 | Pre-refactor phase 1 checklist. All items completed long ago |
| docs/archive/phase-2-agent-session-memory.md | 1 | Pre-refactor phase 2 checklist. Superseded by current implementation |
| docs/archive/phase-3-workflows-skills-market.md | 1 | Pre-refactor phase 3 checklist. Skills now at 40+ (not 10) |
| docs/archive/phase-4-market-research-planner.md | 1 | Pre-refactor phase 4 checklist |
| docs/archive/phase-5-portfolio-journal-review.md | 1 | Pre-refactor phase 5 checklist |
| docs/archive/phase-6-os-upgrade-foundation.md | 1 | Pre-refactor phase 6 checklist. References HeroUI v3 migration (done) |
| docs/archive/phase-7-chat-runtime-hardening.md | 1 | Pre-refactor phase 7 checklist. HeroUI chat review (superseded by ai-elements migration) |
| docs/archive/phase-8-agent-chat-orchestration.md | 1 | Pre-refactor phase 8 checklist. Slash command routing (now implemented differently) |
| docs/archive/phase1.md | 1 | Chinese vision notes for Phase 1 (Workspace concept). Historical brainstorm |
| docs/archive/phase2.md | 1 | Chinese vision notes for Phase 2 (Growth system/Journal). Historical brainstorm |
| docs/archive/phase3.md | 1 | Chinese vision notes for Phase 3 (Advice-based evolution). Historical brainstorm |
| docs/archive/phase4.md | 1 | Chinese vision notes for Phase 4 (Paper evolution). Historical brainstorm |
| docs/archive/phase5.md | 1 | Chinese vision notes for Phase 5 (Evolution Governor). Historical brainstorm |
| docs/archive/phase6.md | 1 | Chinese vision notes for Phase 6 (Adaptive Skill Factory). Historical brainstorm |
| docs/archive/phase7.md | 1 | Chinese vision notes for Phase 7 (Personal Alpha OS final form). Historical brainstorm |
| docs/phase-1-3-verification.md | 1 | Verification notes for phases 1-3. References old test counts (5 tests), old API endpoints (/api/ai/ping removed) |
| docs/project-status.md | 3 | Project status from 2026-06-09. Gap analysis partially addressed (frontend refactor done). Some gaps still valid, some stale |
| docs/knowledge-audit.md | 2 | Previous knowledge audit from 2026-06-11. Entropy score 51. Superseded by this audit |
| archive/specs/spec.md | 2 | Archived copy of specs/spec.md. Contains Python code snippet and contradictory infra claims (PostgreSQL/Redis/K8s) |

## Duplicate (redundant content)

| Path | Trust | Duplicates | Notes |
|------|-------|-----------|-------|
| specs/spec.md | 2 | archive/specs/spec.md, README.md, specs/core-spec.md | Master spec with Python code snippet at end (!), contradictory infra claims (PostgreSQL/Redis/S3/K8s/ChromaDB). Content overlaps with archive version + core-spec + README |
| specs/architecture.md | 3 | docs/ARCHITECTURE.md | Describes planned monorepo structure with separate apps/api/, worker/, sandbox-gateway/. Current code has single apps/web/server/api.ts. Has PostgreSQL/Redis/ChromaDB/S3 in infrastructure list |
| specs/design.md | 3 | apps/web/design.md, docs/FRONTEND.md | UI design direction. Accurate on dark theme direction but lists ECharts (not used), purple primary accent (changed to cyan), Inter font (changed to Geist). Superseded by design.md + FRONTEND.md |
| specs/core-spec.md | 3 | CLAUDE.md, docs/ARCHITECTURE.md, AGENT.md | Core spec v4.1. Product definition + architecture rule + data flow. Subset of info already in canonical docs |
| alignment/procedural-memory.md | 3 | docs/WORKFLOWS.md | Development procedures. ~80% identical content to WORKFLOWS.md (same workflow descriptions, conventions, rules, decisions). Written 2026-06-11 |
| alignment/fact-memory.md | 4 | README.md, memory/facts.md | Tech stack facts from code. More detailed than README stack table but overlaps significantly. Lists 14 routes (some don't exist in current router — /workspaces, /research, /planner, /journal, /review, /evolution, /marketplace, /journey, /system, /settings) |
| memory/facts.md | 3 | alignment/fact-memory.md | Older/duplicate fact memory. Contains conflicting route info (13 vs 14 routes). Some stale frontend status claims ("ChatWorkspace uses manual HeroUI" — now uses ai-elements) |
| docs/chat-ui-redesign.md | 2 | docs/FRONTEND.md, apps/web/design.md | Old MVP UI/UX design spec in Chinese. Color system uses hex values (not oklch), font uses Inter (not Geist). Superseded by design.md + FRONTEND.md |
| alignment/entropy_report.md | 3 | (self-reference) | Post-cleanup entropy report. Score 3. Historical artifact of previous cleanup cycle |

## Contradictory (conflicts with canonical)

| Path | Trust | Conflicts With | Notes |
|------|-------|----------------|-------|
| specs/frontend-spec.md | 2 | docs/FRONTEND.md, apps/web/src/** | Claims ai-elements chat UI with Conversation+Message+Tool+Confirmation+PromptInput. The PREVIOUS build used manual HeroUI; current refactor/frontend branch HAS migrated to ai-elements so this is now partially resolved. Still describes 15 navigation items (current: 6) and pages that don't exist (Orders, Positions, Skill Factory, Airdrop Tutor) |
| specs/frontend-architecture.md | 2 | docs/FRONTEND.md | One-line file: "UI分区: 左导航,中心聊天,右侧Timeline/Artifact/Skill状态,页面路由:TanStack Router,状态管理:TanStack Query". Missing detail, inaccurate state management (uses Zustand not TanStack Query for client state) |
| specs/architecture.md | 3 | docs/ARCHITECTURE.md, README.md | Infrastructure section lists PostgreSQL, Redis, ChromaDB, S3, K8s, Kafka — none of which are used (SQLite only, Docker only for aio-sandbox). Also lists separate apps/api/ module which was deleted |
| specs/spec.md | 2 | README.md, docs/ARCHITECTURE.md | Tech stack section lists PostgreSQL/Redis/S3/MinIO/Chromadb/Docker/Kubernetes/Kafka. Contains embedded Python file-writing code (not a real spec — appears to be AI-generated artifact). Claims "HeroUI for other UI components" but current stack uses pi-web-ui base + shadcn |
| CLAUDE.md | 5 | specs/architecture.md, specs/spec.md | CLAUDE.md is correct; it contradicts the OLD specs that claim PostgreSQL/Redis/K8s. Listed here for traceability — the contradiction is in the stale specs, not CLAUDE.md |
| spec.md (root) | 2 | README.md, docs/FRONTEND.md | Root spec mentions "HeroUI for other UI components" and "ai-elements for chat UI, HeroUI for other UI components". Current implementation uses pi-web-ui base + ai-elements + shadcn. Also has MVP constraints that are partially outdated |

## Unknown (cannot determine reliability)

| Path | Trust | Notes |
|------|-------|-------|
| skills/**/*.md (~40 files) | ? | Skill definitions (SKILL.md files). Not project documentation — skill runtime definitions for evolution/alignment/dev loops. Exclude from project doc audit |
| .codex/tasks/mvp-chat-ui/*.md (6 files) | ? | Auto-generated Codex task artifacts: handoff.md, review.md, evolution-report.md, current-task-spec.md. Ephemeral task records |
| .codex/tasks/mvp-chat-ui-fixes/*.md (3 files) | ? | Auto-generated Codex task artifacts. Ephemeral |
| .codex/memory/*.md (3 files) | ? | Codex memory: decisions.md, facts.md, procedures.md. Auto-generated agent memory |
| .codex/logs/*.md (3 files) | ? | Codex logs: development.log.md, evolution.log.md, verification.log.md. Auto-generated run logs |
| plan/frontend-refactor.md | 3 | Frontend refactor implementation plan. Detailed code samples for Layout.tsx, TopBar.tsx, etc. using old CSS class names (.appShell, .topBar, .sidebar). Partially executed (refactor happened but approach differed). Historical implementation plan |
| tests/datasource.md | 2 | Data source catalog (MVP). Aspirational — lists Polymarket, Kalshi, CoinMarketCal, Football API, Reddit, Hacker News as sources. Most not yet implemented. P0 sources (CoinGecko, Exa, Jina) ARE implemented |
| tests/mvp.md | 2 | MVP test plan (Chinese). Core E2E scenarios accurate but UI section references old HeroUI-based chat (superseded by ai-elements migration). "MVP 不做" section still largely accurate |
| alignment/questions.md | 3 | 6 alignment questions from 2026-06-11 about frontend Chat UI redesign. Q1-Q6 all address issues that have been resolved by the frontend refactor |
| alignment/implementation-plan.md | 2 | Old MVP frontend implementation plan. Proposes full ChatWorkspace rewrite to ai-elements. Largely executed but contains old code samples |
| alignment/alignment_report.md | 3 | Alignment report (score 91). Pre-refactor assessment. Key finding "ai-elements installed but not used" is now RESOLVED |
| specs/userstory.md | 3 | 17 user stories (Chinese + English). Stories US01-US17 describe intended functionality. Some reference UI components not yet built (Approval Card, rich tool visualization). Foundational but partially aspirational |
| specs/codex-upgrade-prompt.md | 2 | Historical Codex upgrade prompt for v4.1→v4.1 incremental upgrade. References adding MCP Hub, Exa Search, AIO Sandbox — all now implemented |
| specs/codex-prompt-pack.md | 2 | Historical agent prompt template pack. Reference material for AI-assisted development |
| specs/adaptive-skill-factory.md | 2 | Future feature spec. Adaptive Skill Factory not yet implemented (Phase 5-6 in roadmap) |
| specs/evolution-engine-spec.md | 2 | Future feature spec. Evolution Engine partial (propose only, no auto-apply) |
| specs/artifact-engine-spec.md | 2 | Future feature spec. Artifact engine exists but preview enhancements pending |
| specs/execution-engine-spec.md | 2 | Future feature spec. Execution engine partial (paper orders work, live guarded not) |
| specs/review-engine-spec.md | 2 | Future feature spec. Review engine exists (daily metrics + summary) |
| specs/workflow-library-spec.md | 2 | Future feature spec. 9 workflows registered, more planned |
| specs/skill-sdk-spec.md | 2 | Future feature spec. Skill SDK defined, 40+ skills registered |
| specs/research-airdrop-spec.md | 2 | Future feature spec. Airdrop skills exist, research bundles exist |
| specs/artifact-preview-spec.md | 2 | Future feature spec. Markdown preview works, HTML/PDF/browser preview partial |
| specs/mcp-exa-sandbox-spec.md | 2 | Future feature spec. MCP hub + Exa + AIO Sandbox all integrated |
| specs/trading-pi-os-addendum-v1.md | 2 | Unknown purpose. Short addendum document |
| specs/database-spec.md | 3 | Database v4.1 spec. Lists table names. Less detailed than BACKEND.md schema section. Missing some current tables (market_prices, search_cache, data_cache, browser_sessions, marketplace_items, workspace_links) |
| specs/spec-a-infrastructure-foundation.md | 2 | Phase spec for infra layer. References deleting 7 dist-only packages (now done). Historical implementation plan |
| specs/spec-b-engines-layer.md | 2 | Phase spec for engines layer. Memory/Search/Research/Workspace rebuild plans (mostly done) |
| specs/spec-c-trading-loop-layer.md | 2 | Phase spec for trading loop. Strategy/Backtest/Journal/Evolution plans (partially done) |
| specs/spec-d-frontend-complete-layer.md | 2 | Phase spec for frontend completion. 15-page plan (current router has 6 routes, not 15). Dated |

## Summary Statistics
- **Canonical**: 28
- **Stale**: 19
- **Duplicate**: 8
- **Contradictory**: 6
- **Unknown**: 52 (40 skill defs + 12 other)
- **Entropy precursors**: (stale + duplicate + contradictory*2) = 19 + 8 + 12 = **39**

## Key Contradictions Detail

### 1. Technology Stack — UI Framework
- **Canonical says**: React 19 + pi-web-ui base (@earendil-works/pi-web-ui@0.75.3) + ai-elements + shadcn/ui primitives
- **Stale specs say**: HeroUI v3 for all UI components (specs/design.md, specs/spec.md, spec.md root, CLAUDE.md old version)
- **Resolution**: Canonical is correct. The refactor/frontend branch migrated from HeroUI-first to pi-web-ui-base + ai-elements

### 2. Infrastructure — Database & Services
- **Canonical says**: SQLite only (node:sqlite), no Redis/PostgreSQL/ChromaDB/S3/K8s/Kafka
- **Stale specs say**: PostgreSQL + Redis + ChromaDB + S3 + K8s + Kafka (specs/architecture.md, specs/spec.md, archive/specs/spec.md)
- **Resolution**: Canonical correct. These were planned targets that were explicitly deprioritized

### 3. Route Count
- **Canonical says** (docs/FRONTEND.md): 6 routes (/, /dashboard, /market, /portfolio, /memory, /timeline)
- **Stale fact-memory says**: 14 routes including /workspaces, /research, /planner, /journal, /review, /evolution, /marketplace, /journey, /system, /settings
- **Resolution**: Canonical correct (6 routes). The 14-route list was from a previous router version

### 4. State Management
- **Canonical says**: Zustand (settingsStore.ts) for client-side state + TanStack Query for server state
- **Stale specs say**: "Zustand if local UI state is needed" (as optional), "TanStack Query" for everything (specs/frontend-architecture.md)
- **Resolution**: Canonical correct. Zustand IS installed and used

## Action Items
1. [ ] Archive stale docs (docs/archive/ already done for phase docs; move docs/phase-1-3-verification.md, docs/project-status.md, docs/knowledge-audit.md to archive/)
2. [ ] Merge duplicates into canonical (specs/architecture.md → merge useful notes into docs/ARCHITECTURE.md then delete; specs/design.md → superseded by apps/web/design.md; alignment/procedural-memory.md → delete in favor of docs/WORKFLOWS.md)
3. [ ] Resolve contradictions (add header to specs/architecture.md, specs/spec.md marking them as historical; update specs/frontend-spec.md with current state or mark stale)
4. [ ] Update low-trust docs or delete (specs/spec.md has Python code embedded — clean up or archive; root spec.md update or archive)
5. [ ] Decide fate of Unknown-category future-feature specs (keep in specs/ as reference but mark with status header; they're useful for planning even if not yet implemented)
6. [ ] Clean up .codex/ auto-generated files (consider adding to .gitignore or archiving after each milestone)
