# Knowledge Layer Audit

## trusted
| Path | Notes |
|------|-------|
| CLAUDE.md | Accurate tech stack, architecture, project structure |
| tests/mvp.md | Core MVP definition — user intent, success criteria |
| specs/userstory.md | 17 detailed user stories for E2E validation |
| docs/ARCHITECTURE.md | Single agent + workflow + skills + artifact architecture |
| apps/web/server/api.ts | Backend API server — functional, routes match client calls |
| packages/core/src/agent/trading-pi-agent.ts | Core agent — slash commands, workflow routing, AI calls |
| packages/core/src/ai/model.ts | OpenAI-compatible model config (deepseek-v4-flash) |

## stale
| Path | Notes |
|------|-------|
| docs/phase-1-3-verification.md | Verification of old phases, superseded by current state |
| docs/knowledge-audit.md | Previous audit, likely outdated |
| docs/adr/001-single-agent.md | ADR is valid but superseded by CLAUDE.md |
| specs/spec-a-infrastructure-foundation.md | Phase spec, superseded by current implementation |
| specs/spec-b-engines-layer.md | Phase spec, not all features implemented |
| specs/spec-c-trading-loop-layer.md | Phase spec, not all features implemented |
| specs/spec-d-frontend-complete-layer.md | Phase spec — frontend NOT complete (key gap) |
| specs/codex-prompt-pack.md | Historical agent prompt, not current |

## duplicate
| Path | Notes |
|------|-------|
| specs/core-spec.md | Subset of CLAUDE.md + ARCHITECTURE.md |
| specs/architecture.md | Duplicates docs/ARCHITECTURE.md |
| specs/spec.md | Duplicate of multiple other specs |

## contradictory
| Path | vs | Issue |
|------|----|-------|
| specs/frontend-spec.md | actual ChatWorkspace.tsx | Spec says ai-elements chat UI; actual uses manual HeroUI + TanStack Virtual |
| specs/frontend-architecture.md | actual ChatWorkspace.tsx | Spec describes ai-elements integration; code has custom rendering |
| specs/userstory.md (US01, US08) | actual ChatWorkspace.tsx | User stories describe rich chat with artifacts/tools/approvals; actual has flat message feed |
| tests/mvp.md (UI section) | actual ChatWorkspace.tsx | MVP says "Chat", "Artifact Preview", "Approval Card", "Execution Timeline" — chat is basic HeroUI, no ai-elements |

## unknown
| Path | Notes |
|------|-------|
| skills/alignment-loop/ | Development meta-skill tool, not project doc |
| skills/development-loop/ | Development meta-skill tool, not project doc |
| specs/codex-upgrade-prompt.md | Agent prompt template, not spec |
| specs/adaptive-skill-factory.md | Future feature, not implemented |
| specs/evolution-engine-spec.md | Future feature, not implemented |