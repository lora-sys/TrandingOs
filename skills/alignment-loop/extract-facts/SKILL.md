---
name: extract-facts
description: >
  Extract ground-truth facts from source code for the alignment loop. Code > Docs > AI Guess.
  Writes facts to memory/facts.md. Use when alignment-loop needs code facts, or user says
  "extract facts", "what does the code actually use", "code-grounded facts".
---

# Extract Facts

Extract facts from source code. Write results to `memory/facts.md`.

## Principle

**Code is the single source of truth. Docs are always suspect.**

## Scan Sources

Priority order — extract from these files first:

| Priority | Source | What |
|----------|--------|------|
| 1 | `package.json` / `go.mod` / `Cargo.toml` | Frameworks, libs, versions |
| 2 | `tsconfig.json` / `Makefile` / `Dockerfile` | Build config, compiler targets |
| 3 | `*.ts` / `*.js` / `*.go` | Core logic, imports, classes |
| 4 | `.env` / config files | Runtime settings, feature flags |
| 5 | `docker-compose.yml` | Infrastructure deps |

Exclude: `node_modules/`, `vendor/`, `dist/`, `.git/`

## Format

Each fact cited to exact file and line:

```markdown
# Fact Memory — [project name]

## Frameworks
| Value | Source |
|-------|--------|
| React 19 | apps/web/package.json:12 |
| HeroUI v3 (3.1.0) | apps/web/package.json:15 |

## Libraries
| Value | Source |
|-------|--------|
| @earendil-works/pi-agent-core@0.79.0 | packages/core/package.json:8 |
| TanStack Router | apps/web/package.json:22 |

## Architecture
| Fact | Source |
|------|--------|
| Single agent: TradingPiAgent | packages/core/src/agent/trading-pi-agent.ts:21 |
| SQLite via node:sqlite | apps/web/server/api.ts:5 |

## Conflicts (Doc vs Code)
| Doc Claim | Code Truth | Source |
|-----------|-----------|--------|
| "React 18" | React 19 via HeroUI v3 | apps/web/package.json |
```

## Rules

- Every fact MUST cite a file path and line number
- Never infer a fact — if it's not in the code, it doesn't exist
- If a feature exists in docs but no code file → mark as "unimplemented"
- Write results to `memory/facts.md` (create memory/ if needed)

## State Relay

Read `alignment/state.yaml`. After extracting, update:

```yaml
iteration: 2
phase: "Step 2: extract-facts"
last_action: "extracted 23 facts — React 19, HeroUI v3, single agent architecture"
artifacts:
  memory/facts.md: completed
status: running
next_step: 3
```
