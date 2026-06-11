---
name: fact-memory
description: >
  Persistent storage for code-grounded facts extracted during alignment.
  Schema and format for memory/facts.md. Written by extract-facts skill.
  Use when alignment-loop needs to read stored facts, or when building memory layer.
---

# Fact Memory

Persistent storage for code-grounded facts. Schema for `memory/facts.md`.

## Format

```markdown
# Fact Memory — [project name]
Last Updated: [ISO date]
Extracted By: alignment-loop / extract-facts

## Frameworks
| Value | Source | Extracted |
|-------|--------|-----------|
| React 19 | apps/web/package.json:12 | 2026-06-11 |

## Libraries
| Value | Source | Extracted |
|-------|--------|-----------|
| HeroUI v3 (3.1.0) | apps/web/package.json:15 | 2026-06-11 |

## Architecture
| Fact | Source | Extracted |
|------|--------|-----------|
| Single agent: TradingPiAgent | packages/core/src/agent/trading-pi-agent.ts:21 | 2026-06-11 |

## Conflicts (Resolved)
| Doc Claim | Code Truth | Source | Action | Resolved |
|-----------|-----------|--------|--------|----------|
| "React 18" | React 19 via HeroUI v3 | apps/web/package.json | Mark doc stale | 2026-06-11 |
```

## Rules

- Every fact cites a file path (and line number when available)
- Never modify existing facts without re-extraction
- Append new facts, don't overwrite
- Conflicts section only — resolved conflicts, not open disputes
- Last Updated date changes on every re-extraction
