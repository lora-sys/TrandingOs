---
name: audit-docs
description: >
  Audit the knowledge layer of a project for the alignment loop. Scan README, docs/, spec/, ADR/, memory/,
  and classify each file as trusted/stale/duplicate/contradictory/unknown. Use when alignment-loop needs
  knowledge-layer auditing, or when the user says "audit docs", "knowledge layer check", "doc alignment".
---

# Audit Docs

Audit knowledge layer: classify every doc file into trust categories for the alignment loop.

## Input

Search these paths:
- `README.md` (project root)
- `docs/`
- `spec/`
- `ADR/`
- `memory/`
- Any `.md` in project root

Exclude: `node_modules/`, `.git/`, `.claude/skills/`, `archive/`

## Classify

| Category | Criteria |
|-----------|----------|
| **trusted** | Reflects current code, actively maintained, features implemented |
| **stale** | Describes past state, superseded by newer docs, outdated APIs |
| **duplicate** | Near-identical to another doc, subset of another |
| **contradictory** | Conflicts with another doc on factual point |
| **unknown** | Cannot determine reliability (notes, fragments) |

## Output

Write to `alignment/audit_report.md`:

```markdown
# Knowledge Layer Audit

## trusted
| Path | Notes |
|------|-------|
| docs/architecture.md | Matches current monorepo structure |

## stale
| Path | Notes |
|------|-------|
| docs/old-api.md | API endpoints removed in v2 |

## duplicate
| Path | Notes |
|------|-------|
| docs/quickstart.md | Subset of README.md |

## contradictory
| Path | vs | Issue |
|------|----|-------|
| docs/deploy.md | docs/ci.md | Deploy target differs (prod vs staging) |

## unknown
| Path | Notes |
|------|-------|
| notes/ideas.md | Brain dump, not actionable |
```

## State Relay

Read `alignment/state.yaml` before starting. After writing audit report, update state:

```yaml
iteration: 1
phase: "Step 1: audit-docs"
last_action: "classified 12 docs — 5 trusted, 3 stale, 2 duplicate, 1 contradictory, 1 unknown"
artifacts:
  alignment/audit_report.md: completed
status: running
next_step: 2
```
