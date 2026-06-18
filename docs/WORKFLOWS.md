# Trading Pi — Workflows & Development Playbook

**Version**: 1.1 | **Post-Architecture-Review v5.0**
**Last verified**: 2026-06-14
**Source**: Git history analysis + code structure

## Workflows

### 1. Phase-Driven Feature Development
**Confidence**: High (15 phases documented, sequential git commits)

Process:
1. Write spec doc at `specs/<feature>.md`
2. Write checklist at `checklists/<feature>.md` (when applicable)
3. Implement on feature branch `codex/<description>`
4. Merge via PR to main

### 2. Chat Command Execution
**Confidence**: High (trading-pi-agent.ts:256-288)

Flow:
1. User sends message or slash command via chat
2. TradingPiAgent parses command
3. Routes to registered workflow
4. Workflow engine executes DAG nodes
5. Each node calls skill from registry
6. Skill writes audit record, optional memory write
7. Results stored as artifact
8. Summary returned to user

### 3. Spec → Checklist → Implementation
**Confidence**: High (checklists/phase-*.md pattern)

Rule: New features get spec doc + checklist before implementation.

### 4. Skill Execution Pattern
**Confidence**: High (all 40+ skills follow same pattern)

Each skill:
1. Validates input via TypeBox schema
2. Performs action (market data, browser, journal, etc.)
3. Writes audit record to SQLite
4. Optionally writes to domain memory
5. Optionally creates artifact
6. Returns result

## Post-Refactor Development Workflow (v5.0)

### Architecture Review Process
Run the `improve-codebase-architecture` skill to identify refactoring candidates across the codebase. The skill analyzes domain language in CONTEXT.md, documented decisions in docs/adr/, and coupling patterns to produce a prioritized list of improvement opportunities.

### Frontend Module Extraction Pattern
When extracting logic from God components, follow the hook/service pattern established in ADR-010:

| Logic Type | Target Location | Example |
|---|---|---|
| React stateful logic | `hooks/useXxx.ts` custom hook | `hooks/useTradingView.ts` |
| Pure logic without React | `lib/xxxService.ts` or `lib/xxx-utils.ts` | `lib/marketDataService.ts` |
| Shared sub-components | `pages/feature/components.tsx` | `pages/trading/components.tsx` |
| Domain utilities | `pages/feature/feature-utils.ts` | `pages/trading/trading-utils.ts` |

### Code-Splitting Convention
New route pages must use `React.lazy()` + `withSuspense()` wrapper for code splitting. Reference implementation: `apps/web/src/router.tsx`. This ensures route-level bundles are loaded on demand rather than in the initial payload.

### State Management Rule
- **Shared UI state** (across components) → Zustand store (e.g., `settingsStore.ts`)
- **Local-only state** (single component) → `useState` / `useReducer`
- Avoid prop-drilling for state that is used in 3+ components

### Documentation Sync Rule
When code structure changes (new modules, moved files, renamed exports), update all three documents in sync:
1. `docs/ARCHITECTURE.md` — module dependency graph & layer boundaries
2. `docs/FRONTEND.md` — component tree & routing structure
3. `docs/WORKFLOWS.md` — this document (development conventions)

## Conventions

### Commit Style
- Conventional commits: `feat:`, `docs:`, `Merge pull request`
- PR merges include source branch name

### Branch Naming
- `codex/<description>` (Codex workflow)
- Example: `codex/trading-pi-phase-1-5`

### Monorepo Structure
- `apps/*` — web frontend + API server
- `packages/*` — shared libraries (@trading-pi/*)
- Root package.json with workspaces config

### TypeScript
- ES2024 target, NodeNext modules, strict mode
- Per-package tsconfig extending tsconfig.base.json

### Code Style
- `as any` allowed only in api.ts bridge (external boundary)
- Prohibited in core domain models
- TypeBox for runtime type validation

### Git Workflow
- Clean working directory required for codemods
- PR merges from feature branches
- No force pushes documented

## Rules

### Always
- Every skill execution writes audit records
- Every artifact is traceable to its source
- Agent actions are visible in UI (Inspector panel)
- Memory writes include domain, workspace, sourceType, sourceId
- Cache uses namespace/key/ttlMs pattern

### Never
- Hardcode AI providers (use OpenAI-compatible via pi-ai)
- Bypass risk engine
- Place real orders without approval
- Trade with withdrawal-enabled API keys
- Use leverage by default
- Execute untrusted code on host machine

### Approval Gates
- `riskLevel: "high"` → requires explicit approval
- `permission: "dangerous"` → highest gate (real orders, MCP permission)
- Paper trading and sandbox enabled by default
- Live trading disabled by default

## Decisions

### Pi Mono Reuse
Direct dependency on `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai`.
Rationale: Leverage existing Pi runtime, focus on trading domain logic.
Documented in: `docs/pi-reuse.md`

### AIO Sandbox
Browser automation runs in Docker container (sandbox at :8080), not direct Playwright.
Rationale: Safe execution of untrusted browser operations.

### Market Data Dual-Source
CoinGecko (public, no key needed) + CCXT (exchange-facing).
Rationale: Fallback resilience. Network failures recorded as skill run errors.

### Search Providers
Exa/Jina/Tavily with 15-minute cache TTL.
Rationale: Redundant search with cost optimization.

### Local-First
SQLite + JSONL sessions + file artifacts.
Rationale: Personal OS, no cloud dependencies required.

## Skill Categories

| Category | Count | Risk Level |
|----------|-------|------------|
| Market | 7 | Low |
| Search | 3 | Low |
| Browser | 6 | Low-Medium |
| Risk | 4 | Low-Medium |
| Research | 2 | Low |
| Journal | 4 | Low |
| Memory | 2 | Low |
| Workspace | 2 | Low |
| MCP | 4 | Low-High |
| Strategy | 2 | Medium |
| Backtest | 2 | Low-Medium |
| Evolution | 1 | Medium |
| Review | 1 | Low |
| Execution | 3 | Medium-High |
| Approval | 1 | High |
| Marketplace | 1 | Low |
| Airdrop | 2 | Medium |
