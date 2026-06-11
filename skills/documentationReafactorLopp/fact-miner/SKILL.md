---
name: fact-miner
description: >
  Extract ground-truth facts from source code and configuration files. Code is the single source of truth — docs are always suspect.
  Use when: "mine facts from code", "what is the real tech stack", "verify docs against code", "fact extraction",
  "extract facts", "code-to-docs verification", "fact miner", "what does the code actually use", "real dependencies".
  Triggers: any request to extract truth from code, verify documentation against source, or build a code-grounded fact base.
---

# Fact Miner

Extract facts from source code. Code > docs. Every fact is traced to a file path and line number.

## Core Principle

**Never trust a doc claim without code verification.**

```
Code → Extract Facts → Validate → Fact Memory
  ↑                              ↓
  └──── Conflict Resolution ←───┘
```

## Workflow

### Step 1: Scan Sources

Mine these source types (ordered by priority):

| Priority | Source | What to Extract |
|----------|--------|----------------|
| 1 | `package.json` / `go.mod` / `Cargo.toml` | Frameworks, libraries, versions |
| 2 | `tsconfig.json` / `build.gradle` / `Makefile` | Build config, compiler targets |
| 3 | `*.ts` / `*.js` / `*.go` | Agent classes, core logic, imports |
| 4 | `.env` / config files | Runtime settings, feature flags |
| 5 | `Dockerfile` / docker-compose | Infrastructure deps |

Exclude: `node_modules/`, `vendor/`, `dist/`, `.git/`

### Step 2: Extract Facts

For each source, extract atomic facts. Format:

```yaml
fact:
  category: "<framework|library|version|config|decision>"
  value: "<what it is>"
  trust: 5
  source: "<file>:<line>"
```

Examples from real code:

```yaml
# From: packages/core/package.json:12
fact:
  category: "library"
  value: "@earendil-works/pi-agent-core@0.79.0"
  trust: 5
  source: "packages/core/package.json:12"

# From: packages/core/src/agent/trading-pi-agent.ts:21
fact:
  category: "architecture"
  value: "Single agent class: TradingPiAgent"
  trust: 5
  source: "packages/core/src/agent/trading-pi-agent.ts:21"

# From: packages/core/src/agent/trading-pi-agent.ts:258
fact:
  category: "workflow"
  value: "Slash commands: /research /plan /review-day /backtest /browser /evolve /bootstrap-os"
  trust: 5
  source: "packages/core/src/agent/trading-pi-agent.ts:256-288"
```

### Step 3: Validate & Resolve Conflicts

When a doc claims something that conflicts with a code fact:

```yaml
conflict:
  doc_claim: "README says React 18"
  code_fact: "package.json says @heroui/react@3.1.0 (requires React 19)"
  winner: code
  source: "packages/core/package.json"
  action: "mark doc as stale"
```

Conflict resolution rules:

| Conflict | Winner |
|----------|--------|
| Doc vs `package.json` version | Code (package.json) |
| Doc vs import statement | Code (import) |
| Doc vs runtime config file | Code (config) |
| Two docs contradict each other | Either can be winner — flag both as contradictory |
| Doc says "planned" / "future" / "TODO" | Code may confirm it's still TODO |

### Step 4: Build Fact Memory

Collect all verified facts into a structured memory:

```markdown
# Fact Memory — [project name]

## Frameworks
| Value | Trust | Source |
|-------|-------|--------|
| React 19 | 5 | apps/web/package.json |
| HeroUI v3 (3.1.0) | 5 | apps/web/package.json |
| TanStack Router | 5 | apps/web/package.json |

## Libraries
| Value | Trust | Source |
|-------|-------|--------|
| @earendil-works/pi-agent-core@0.79.0 | 5 | packages/core/package.json |
| ccxt@4.5.27 | 5 | packages/core/package.json |

## Architecture Decisions
| Fact | Trust | Source |
|------|-------|--------|
| Single agent: TradingPiAgent | 5 | packages/core/src/agent/trading-pi-agent.ts:21 |
| Slash commands route to workflows | 5 | packages/core/src/agent/trading-pi-agent.ts:256 |

## Conflicts (Doc vs Code)
| Doc Claim | Code Truth | Source | Action |
|-----------|-----------|--------|--------|
| "React 18" | React 19 via HeroUI v3 | apps/web/package.json | Mark doc stale |
```

### Step 5: Feed Doc Auditor

Pass the fact memory to `doc-auditor` to verify or invalidate documentation claims.

## Rules

- Every fact MUST cite a file path and line number
- Trust is always 5 for code-sourced facts (the code is what it is)
- Never infer a fact — if it's not in the code, it doesn't exist
- If a feature is mentioned in docs but no corresponding code file exists, mark it as "unimplemented"
- Run fact-mining before any doc update — the fact memory is the source of truth
- When in doubt about a version, read the actual `package.json` / `go.mod` / etc. — never guess

## State Relay

Read `alignment/state.yaml` before starting. After extracting facts, update:

```yaml
loop: knowledge-refactor-loop
iteration: 2
phase: "Phase A"
last_action: "extracted 23 facts from package.json, imports, Dockerfile"
artifacts:
  memory/facts.md: completed
status: running
next_phase: "extract-facts"  # procedure-extractor
```

Also update `alignment/state.md` with: which sources were scanned, conflicts found between docs and code, pending items.
