# Trading Pi — Documentation Index

> Master entry point. New contributors start here.

## Project Source of Truth

- [../CLAUDE.md](../CLAUDE.md) — Project facts, stack, dev commands, key decisions
- [../AGENTS.md](../AGENTS.md) — Same as CLAUDE.md for non-Claude agents
- [../README.md](../README.md) — Public-facing project intro
- [../UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) — Domain glossary

## Agent Architecture (per `$build-agent-app`)

- [agent-spec/trading-pi-agent.md](agent-spec/trading-pi-agent.md) — Agent Contract (Role / Goal / Constraints / Tools / Output)
- [agent-spec/harness-checklist.md](agent-spec/harness-checklist.md) — Harness Contract (State / Memory / Eval / Observe / Failure / Approval)

## Architecture

- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview (backend / frontend / DB / agent)
- [API.md](API.md) — REST + SSE endpoint reference
- [BACKEND.md](BACKEND.md) — Server architecture, deployment
- [FRONTEND.md](FRONTEND.md) — UI architecture, routes, components
- [WORKFLOWS.md](WORKFLOWS.md) — 13 workflows: input/output, steps, side-effects
- [local-first-architecture.md](local-first-architecture.md) — SQLite + files rationale
- [pi-reuse.md](pi-reuse.md) — `@earendil-works/pi-agent-core` integration

## Packages

- [packages/core.md](packages/core.md) — `packages/core` (agent, skills, workflows, repos)
- [packages/memory-engine.md](packages/memory-engine.md) — `packages/memory-engine`
- [packages/strategy-engine.md](packages/strategy-engine.md) — `packages/strategy-engine`
- [packages/mcp-hub.md](packages/mcp-hub.md) — `packages/mcp-hub`
- [packages/research-hub.md](packages/research-hub.md) — `packages/research-hub`
- [packages/search-hub.md](packages/search-hub.md) — `packages/search-hub`
- [packages/journal.md](packages/journal.md) — `packages/journal`
- [packages/browser-layer.md](packages/browser-layer.md) — `packages/browser-layer` (AIO sandbox)

## ADRs

- [adr/001-single-agent.md](adr/001-single-agent.md) — Single-agent architecture
- [adr/010-frontend-refactoring.md](adr/010-frontend-refactoring.md) — Frontend refactor

## MVP Spec

- [../specs/specs/mvp-decision-workspace/spec.md](../specs/specs/mvp-decision-workspace/spec.md) — MVP spec
- [../specs/specs/mvp-decision-workspace/checklist.md](../specs/specs/mvp-decision-workspace/checklist.md) — MVP checklist
- [../specs/specs/mvp-decision-workspace/project-status.md](../specs/specs/mvp-decision-workspace/project-status.md) — MVP progress
- [../specs/specs/mvp-decision-workspace/tasks.md](../specs/specs/mvp-decision-workspace/tasks.md) — MVP tasks

## Evidence

- [evidence/audit-2026-07-12/findings.md](evidence/audit-2026-07-12/findings.md) — 130-issue audit, 4 clusters
- [evidence/audit-2026-07-12/pr-roadmap.md](evidence/audit-2026-07-12/pr-roadmap.md) — 18-PR roadmap, dependency-ordered
- [evidence/mvp-decision-workspace/spec-compliance.md](evidence/mvp-decision-workspace/spec-compliance.md) — REQ-MVP status matrix
- [evidence/mvp-decision-workspace/README.md](evidence/mvp-decision-workspace/README.md) — How to reproduce MVP evidence

## Recent Improvements (2026-07)

See the audit + PR roadmap in `evidence/audit-2026-07-12/`:
- 53 PRs shipped across 5 sprints (UI visibility, runtime correctness, workflow hardening, process, incremental)
- 130-issue audit closed: 16/16 critical + 23+ medium
- 62+ unit tests, GitHub Actions CI, 9 standalone ADRs

## Endpoints Added in This Wave

Agent:
- `GET /api/agent/health` — config check
- `GET /api/agent/health?ping=1` — live provider round-trip
- `GET /api/agent/system-prompt` — current system prompt
- `GET /api/agent/prompts?limit=N` — recent user messages
- `POST /api/agent/approvals/:id/respond` — approve/deny pending
- `GET /api/metrics/agent` — session/prompt/approval counts
- `GET /api/util/rate-limits` — bucket visibility

Sessions:
- `GET /api/sessions/:id/export` — JSON transcript
- `DELETE /api/sessions/:id` — delete session

Evolution:
- `POST /api/evolution/suggestions/:id/apply` — adopt suggestion
- `POST /api/evolution/suggestions/:id/reject` — dismiss suggestion

## Process

- [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) — PR format
- [../.github/ISSUE_TEMPLATE/bug.md](../.github/ISSUE_TEMPLATE/bug.md) — Bug report
- [../.github/ISSUE_TEMPLATE/feature.md](../.github/ISSUE_TEMPLATE/feature.md) — Feature request
- [../.github/ISSUE_TEMPLATE/refactor.md](../.github/ISSUE_TEMPLATE/refactor.md) — Refactor request