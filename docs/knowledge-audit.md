# Knowledge Audit — Trading Pi

**Date**: 2026-06-11
**Entropy Score**: 51 (threshold 20, Cleanup Mode)

## File Inventory

| Directory | Count | Category |
|-----------|-------|----------|
| specs/phases/ | 15 | Deleted from git, stale |
| specs/ | 20 | Redundant, some contradictory |
| checklists/ | 8 | Stale, superseded |
| docs/ | 4 | Canonical (active) |
| tests/ | 8 | Stale |
| .trading-pi/artifacts/ | 12 | Runtime-generated, transient |
| skills/documentationReafactorLopp/ | 6 | Skill workflow files |
| Root | 2 | Canonical (CLAUDE.md, AGENT.md) |

## Contradictions

| # | Topic | Doc Claim | Code Truth | Severity |
|---|-------|-----------|-----------|----------|
| 1 | Database | specs/architecture.md: PostgreSQL/Redis/ChromaDB/S3 | SQLite only | High |
| 2 | Database | specs/spec.md: PostgreSQL/Redis/S3/Chromadb/K8s | docker-compose: only aio-sandbox | High |
| 3 | API Server | architecture.md: `apps/api/` module | apps/api/ deleted in git | Medium |
| 4 | State management | design.md: "Zustand" | Zustand not in deps | Low |
| 5 | K8s | specs/spec.md: "Docker/Kubernetes" | docker-compose only | Medium |
| 6 | ECharts | design.md: "ECharts" | recharts + lightweight-charts only | Low |

## Trust Scores

| File | Trust | Notes |
|------|-------|-------|
| CLAUDE.md | 5 | Live, accurate |
| docs/project-status.md | 4 | Last updated 2026-06-09 |
| docs/local-first-architecture.md | 5 | Accurate |
| docs/pi-reuse.md | 5 | Accurate |
| AGENT.md | 4 | Mostly accurate |
| specs/design.md | 4 | UI direction accurate |
| specs/architecture.md | 3 | Planned vs current confusion |
| specs/spec.md | 2 | Has Python code snippets, contradictory infra claims |
| specs/phases/* | 0 | Deleted |
| checklists/* | 1 | Stale |
| tests/* | 1 | Stale |
