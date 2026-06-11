---
name: alignment-loop
description: >
  Project alignment loop — ensure a project's documentation, codebase, developer preferences, and AI agent behavior are unified before development begins. Use when: "run alignment loop", "align this project", "project alignment", "unlock development loop", "freeze standards", "alignment score". Triggers: new project connected, legacy project imported, major feature started, standards drift detected, user requests alignment, pre-development gate check, weekly review detected drift.
---

# Alignment Loop

Freeze project standards before development. Audit knowledge layer, extract facts, interrogate user, synthesize standards, validate alignment. If score < 90, repeat. Only at >= 90, freeze standards and unlock development.

## Workflow

```
1. audit-docs → 2. extract-facts → 3. interrogate-user →
4. synthesize-standards → 5. validate-alignment → 6. calculate score
```

**If score < 90 → repeat from step 3** (address gaps raised by interrogation)
**If score >= 90 → freeze standards → unlock development loop**

## Step 1: audit-docs

Run the `audit-docs` sub-skill:
- Audit all knowledge layer files: README, docs/, spec/, ADR/, memory/
- Classify each: trusted / stale / duplicate / contradictory / unknown
- Output alignment audit report

## Step 2: extract-facts

Run the `extract-facts` sub-skill:
- Extract ground-truth facts from code (package.json, config, imports, Dockerfile)
- Principle: Code > Docs > AI Guess
- Write extracted facts to `memory/facts.md`

## Step 3: interrogate-user

Run the `interrogate-user` sub-skill:
- Auto-generate questions based on discovered gaps:
  - Code says TDD required but no tests exist → ask preferred test approach
  - Git history shows no tests → ask about test strategy
  - Conflicting docs about deployment → ask actual deployment process
- Place questions in `alignment/questions.md`
- Wait for user answers
- If user modifies answers → loop back to step 4 with updated input

## Step 4: synthesize-standards

Run the `synthesize-standards` sub-skill:
- Combine: extracted facts + user answers + existing standards
- Generate project constitution files:
  - `CLAUDE.md` — project rules for AI agents
  - `AGENTS.md` — multi-agent collaboration rules
  - `validators.md` — pre-commit / pre-merge check rules
  - `spec.md` — project specification baseline
- Example outputs:
  ```yaml
  test_first: true
  coverage: 80
  e2e_required: true
  git_push: false
  ```

## Step 5: validate-alignment

Run the `validate-alignment` sub-skill:
- Generate Alignment Summary:
  ```
  Goals: maintainability first
  Testing: TDD
  AI permissions: allow commit, disallow push
  Validation: lint/e2e/coverage>80
  ```
- Present to user for confirmation
- If user modifies → return to interrogate-user (step 3)

## Step 6: calculate alignment score

Score each dimension 0-100:

| Dimension | Weight | Checked By |
|-----------|--------|-----------|
| Knowledge consistency | 25% | audit-docs classification |
| Fact accuracy | 25% | extract-facts vs docs match rate |
| User preference capture | 20% | interrogate-user answer coverage |
| Standards completeness | 15% | synthesize-standards output coverage |
| Validation readiness | 15% | validate-alignment pass rate |

**Formula:** `score = sum(dimension_score × weight)`

| Score | Action |
|-------|--------|
| < 90 | Repeat loop from step 3 |
| >= 90 | Freeze standards, unlock development |

## Standards Freeze

When score >= 90:

```
STATE: Standards Frozen
ALIGNMENT_SCORE: XX
FROZEN_AT: [timestamp]
DEVELOPMENT: UNLOCKED
```

Only Alignment Loop and user can modify frozen standards. Automations detect drift but cannot change them.

## Memory

After successful alignment, store two memory types:

**Fact Memory** (`memory/facts.md`):
- Frameworks, libraries, architecture, decisions
- Every fact cites source file:line
- Extracted by extract-facts, persisted here

**Procedural Memory** (`memory/procedures.md`):
- Workflows, rules, conventions from git/chat analysis
- Extracted by procedure-extractor (from documentationReafactorLopp)
- Stored after alignment freeze

## Integration

This loop uses skills from two directories:
- `skills/alignment-loop/skills/*` — alignment-specific sub-skills
- `skills/documentationReafactorLopp/` — knowledge extraction (doc-auditor, fact-miner, procedure-extractor, entropy-manager, canonical-docs)
- `skills/documentationReafactorLopp/knowledge-refactor-loop/` — Knowledge Refactoring Loop (Phase A/B)

Automations live in `skills/alignment-loop/automations/`:
- `weekly-alignment-review` — scheduled periodic review
- `pre-development-alignment` — gate before major feature work

## Loop Integration

The two loops (alignment + knowledge-refactor) share the same `alignment/` directory for state relay:

```
First project onboarding:
  knowledge-refactor-loop (Phase A) → audit → extract → canonicalize → archive → write alignment/state.yaml
    ↓
alignment-loop → reads state.yaml → knows what's done → runs steps 1-5 → generates CLAUDE.md → freezes

Subsequent:
  drift-detection (from alignment-loop automations) → detects drift → writes state.yaml
    ↓
alignment-loop reads state → sees drift violation → re-runs interrogation and standards update
```

## Rules

- Automations detect drift but NEVER modify standards directly
- Only Alignment Loop + user confirmation can change `CLAUDE.md`, `AGENTS.md`, `validators.md`
- Every alignment iteration logs its score and artifacts
- Drift detection triggers re-alignment but doesn't auto-apply fixes
- Alignment score is the single source of truth for development unlock

## State Relay

**The state file is the relay baton.** Every iteration reads `alignment/state.yaml` before starting and writes after finishing.

### How state works

- `alignment/state.yaml` — machine-readable, programmatic access (iteration, phase, artifacts, status)
- `alignment/state.md` — human-readable narrative (what was done, what's pending, what's next)
- `memory/fact-memory.md` — persistent code facts across loop sessions
- `memory/procedural-memory.md` — persistent workflows/rules across loop sessions

### Status values

`running` → processing | `waiting_for_user` → blocked on user input | `paused` → manual hold | `complete` → loop done | `error` → failure

### Each sub-skill MUST:

1. Read `alignment/state.yaml` → know current iteration and phase
2. Execute its step
3. Write both `alignment/state.yaml` and `alignment/state.md`
4. Set status: `running` or `waiting_for_user`

### The main loop orchestrator reads state to:

- Know which step to execute next (`next_step` or `next_phase`)
- Skip already-completed steps (`artifacts` with `completed` status)
- Identify blockers (`blocked` array)
- Resume after user input (check `status` transition from `waiting_for_user` to `running`)
