# Procedural Memory — Trading Pi OS

**Date**: 2026-06-11
**Source**: Git history analysis + file structure

---

## Workflows

### 1. Phase-Driven Feature Development
**Confidence**: High (15 phases across ~200 commits)

Process:
1. Write spec doc at `specs/<feature>.md`
2. Create branch: `codex/<description>` or `feature/<description>`
3. Implement on branch with conventional commits
4. Merge via PR to main
5. Update docs and mark phase complete

Evidence:
- Branches: `codex/trading-pi-phase-1-5`, `codex/trading-pi-os-v4-1-upgrade-foundation`, `feature/mvp-chat-ui`
- Commits: `feat:`, `docs:`, conventional commit style
- Merges: PR merges from feature branches

### 2. Chat Command Execution
**Confidence**: High

Flow:
1. User sends message via chat (ai-elements Conversation)
2. Frontend sends POST /api/session/message/stream (SSE)
3. TradingPiAgent parses intent
4. Routes to WorkflowEngine
5. Workflow executes DAG nodes, each calling skills
6. Results streamed back via SSE events
7. Artifacts rendered in ArtifactPreviewPanel

Evidence: `apps/web/server/api.ts` SSE streaming implementation

### 3. Spec → Checklist → Implementation
**Confidence**: High

Pattern: New features get spec doc + checklist before implementation.
Evidence: `specs/` directory with structured spec files

### 4. Architecture Decision Documentation
**Confidence**: High

Process: Key decisions documented as ADR entries in `docs/adr/`.
Evidence: 9 ADRs in `docs/adr/001-single-agent.md`

## Conventions

### Commit Style
- Conventional commits: `feat:`, `docs:`, `fix:`, `refactor:`, `test:`, `chore:`
- PR merges include source branch name
- Evidence: git log shows consistent conventional commits

### Branch Naming
- `codex/<description>` — feature branches (AI-assisted development)
- `feature/<description>` — UI/UX feature branches
- `main` — stable/production
- Evidence: `git branch -a` output

### File Organization
- `apps/web/` — frontend + API server
- `packages/core/` — agent runtime, skills, workflows
- `packages/*` — domain libraries (browser-layer, journal, mcp-hub, etc.)
- `specs/` — spec documents
- `docs/` — canonical documentation
- `alignment/` — alignment loop artifacts

### TypeScript Conventions
- ES2024 target, NodeNext modules, strict mode
- `as any` allowed in api.ts bridge (external boundary), prohibited in core domain models
- Per-package tsconfig extending tsconfig.base.json

## Rules

### Always
- Every skill execution writes audit records
- Every artifact is traceable to its source
- Agent actions visible in UI (Inspector panel)
- Memory writes include domain, workspace, sourceType, sourceId
- Record project process in project status docs after each phase

### Never
- Hardcode AI providers (use OpenAI-compatible via pi-ai)
- Bypass risk engine
- Place real orders without approval
- Trade with withdrawal-enabled API keys
- Use leverage by default
- Execute untrusted code on host machine

### Approval Gates
- `riskLevel: "high"` → explicit approval required
- `permission: "dangerous"` → highest gate (real orders, MCP permission)
- Paper trading and sandbox enabled by default
- Live trading disabled by default

## Decisions

| Decision | Rationale | Evidence |
|----------|-----------|----------|
| Pi Mono reuse | Leverage existing Pi runtime | docs/pi-reuse.md |
| AIO Sandbox | Safe browser automation | ADR-003 |
| Market data dual-source | Fallback resilience | ADR-008 |
| Search provider redundancy | Redundant search with cost optimization | ADR-009 |
| Local-first | Personal OS, no cloud dependencies | ADR-002 |
| Single agent | Simpler debugging, clear ownership | ADR-001 |

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API (8787) + Vite (5173) concurrently |
| `npm run check` | TypeScript type check across all packages |
| `npm run test` | Run Vitest unit tests |
| `npm run build` | Build all packages |

## Infrastructure

| Component | Details |
|-----------|---------|
| API Server | Node HTTP, port 8787 |
| Vite Dev | Port 5173, proxy /api → :8787 |
| AIO Sandbox | Docker, port 8080 |
| Database | SQLite via node:sqlite |
| Telemetry | Langfuse (optional) |
