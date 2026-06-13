# Entropy Report — Trading Pi OS
**Date**: 2026-06-13T12:00:00Z
**Score**: 39 / Threshold: 20
**Status**: 🔴 CLEANUP MODE ACTIVE

## Breakdown
| Dimension | Count | Weight | Score |
|-----------|-------|--------|-------|
| Stale docs | 19 | ×1 | 19 |
| Duplicate docs | 8 | ×1 | 8 |
| Contradictory pairs | 6 | ×2 | 12 |
| Undocumented modules | ~0 | ×1 | ~0 |
| **TOTAL** | | | **39** |

## Cleanup Plan (6 steps)
1. Archive 19 stale docs → `archive/docs/stale/`
2. Merge 8 duplicate docs into canonical parents
3. Resolve 6 contradictory pairs (canonical wins)
4. Delete trust-0 docs (if any)
5. Re-scan for new entropy
6. Target: score ≤ 15

## Detailed File Inventory

### Stale Docs (19) — trust 1-2
All pre-refactor phase checklists, old audits, historical artifacts:

| # | File | Trust | Reason |
|---|------|-------|--------|
| 1 | `docs/archive/phase-1-local-foundation.md` | 1 | Pre-refactor checklist, completed |
| 2 | `docs/archive/phase-2-agent-session-memory.md` | 1 | Pre-refactor checklist, superseded |
| 3 | `docs/archive/phase-3-workflows-skills-market.md` | 1 | Pre-refactor checklist, skills now 40+ |
| 4 | `docs/archive/phase-4-market-research-planner.md` | 1 | Pre-refactor checklist |
| 5 | `docs/archive/phase-5-portfolio-journal-review.md` | 1 | Pre-refactor checklist |
| 6 | `docs/archive/phase-6-os-upgrade-foundation.md` | 1 | Pre-refactor checklist, HeroUI migration done |
| 7 | `docs/archive/phase-7-chat-runtime-hardening.md` | 1 | Pre-refactor checklist, superseded by ai-elements |
| 8 | `docs/archive/phase-8-agent-chat-orchestration.md` | 1 | Pre-refactor checklist, slash commands reworked |
| 9 | `docs/archive/phase1.md` | 1 | Chinese vision notes, historical brainstorm |
| 10 | `docs/archive/phase2.md` | 1 | Chinese vision notes, historical brainstorm |
| 11 | `docs/archive/phase3.md` | 1 | Chinese vision notes, historical brainstorm |
| 12 | `docs/archive/phase4.md` | 1 | Chinese vision notes, historical brainstorm |
| 13 | `docs/archive/phase5.md` | 1 | Chinese vision notes, historical brainstorm |
| 14 | `docs/archive/phase6.md` | 1 | Chinese vision notes, historical brainstorm |
| 15 | `docs/archive/phase7.md` | 1 | Chinese vision notes, historical brainstorm |
| 16 | `docs/phase-1-3-verification.md` | 1 | Old verification, stale test counts & API endpoints |
| 17 | `docs/project-status.md` | 3 | Status from 2026-06-09, partially addressed |
| 18 | `docs/knowledge-audit.md` | 2 | Previous audit (score 51), superseded |
| 19 | `archive/specs/spec.md` | 2 | Archived copy of spec with Python artifact |

### Duplicate Docs (8) — redundant content

| # | File | Duplicates | Notes |
|---|------|-----------|--------|
| 1 | `specs/spec.md` | README, core-spec, archive copy | Master spec w/ Python code artifact |
| 2 | `specs/architecture.md` | docs/ARCHITECTURE.md | Describes non-existent apps/api/, worker/ |
| 3 | `specs/design.md` | design.md, FRONTEND.md | Old UI direction (ECharts, purple, Inter) |
| 4 | `specs/core-spec.md` | CLAUDE.md, ARCHITECTURE.md, AGENT.md | Subset of canonical info |
| 5 | `alignment/procedural-memory.md` | docs/WORKFLOWS.md | ~80% identical to WORKFLOWS.md |
| 6 | `alignment/fact-memory.md` | README.md, memory/facts.md | Overlaps README stack table |
| 7 | `memory/facts.md` | alignment/fact-memory.md | Older duplicate, conflicting routes |
| 8 | `docs/chat-ui-redesign.md` | FRONTEND.md, design.md | Old Chinese MVP UI spec (hex colors, Inter font) |

### Contradictory Docs (6 pairs)

| # | File | Conflicts With | Key Contradiction |
|---|------|---------------|-------------------|
| 1 | `specs/frontend-spec.md` | FRONTEND.md | Claims 15 nav items (actual: 6); pages don't exist |
| 2 | `specs/frontend-architecture.md` | FRONTEND.md | Claims TanStack Query for all state (actual: Zustand) |
| 3 | `specs/architecture.md` | ARCHITECTURE.md | Lists PostgreSQL/Redis/K8s (actual: SQLite only) |
| 4 | `specs/spec.md` | README, ARCHITECTURE.md | Lists full infra stack; contains Python code |
| 5 | `spec.md` (root) | README, FRONTEND.md | "HeroUI for other UI" (actual: pi-web-ui base) |
| 6 | `CLAUDE.md` | (stale specs) | Listed for traceability — CLAUDE.md is CORRECT |

### Excluded from Entropy Calc
- **skills/**/*.md** (~40 files): Skill definitions, not project documentation
- **.codex/**/*.md** (15 files): Auto-generated Codex task/memory/log artifacts
