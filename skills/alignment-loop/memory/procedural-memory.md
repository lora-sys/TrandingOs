---
name: procedural-memory
description: >
  Persistent storage for team development workflows, rules, and conventions extracted during alignment.
  Schema and format for memory/procedures.md. Written by procedure-extractor (from documentationReafactorLopp).
  Use when alignment-loop needs to read stored procedural memory, or when building memory layer.
---

# Procedural Memory

Persistent storage for development workflows, rules, and conventions. Schema for `memory/procedures.md`.

## Format

```markdown
# Procedural Memory — [project name]
Last Updated: [ISO date]
Extracted By: alignment-loop / procedure-extractor

## Workflows
### API Development
1. Write test
2. Implement feature
3. Review
Confidence: high
Evidence: 20 commits, 3 contributors

## Rules
### Always
- Use Read tool before Edit
- Cite file:line for facts
- Never delete docs without archive

### Never
- Modify CLAUDE.md without user approval
- Push without review

## Conventions
### Branch Naming
- feature/<name> for features
- fix/<name> for bugfixes
- docs/<name> for doc changes

## Decisions
### SQLite over PostgreSQL
- Chose SQLite for local-first dev
- Reason: no external deps required for development
- Source: git commit abc123, chat log 2026-05-01
```

## Rules

- Only write after alignment freeze
- Do not modify frozen procedural memory without re-alignment
- Confidence scores must be present (high/medium/low)
- Evidence must be cited
