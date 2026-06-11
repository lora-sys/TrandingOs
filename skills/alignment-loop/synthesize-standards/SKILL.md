---
name: synthesize-standards
description: >
  Combine extracted facts + user answers + existing standards to generate project constitution files.
  Writes CLAUDE.md, AGENTS.md, validators.md, spec.md. Use when alignment-loop is at standards synthesis step,
  user says "generate standards", "write claude.md", "create project constitution".
---

# Synthesize Standards

Combine facts + user answers + existing standards → generate project constitution files.

## Input

Read these files in order:
1. `memory/facts.md` — from extract-facts
2. `alignment/questions.md` — from interrogate-user (with user answers)
3. Any existing `CLAUDE.md`, `AGENTS.md`, or standards files

## Output Files

Generate these in project root:

### CLAUDE.md — AI Agent Rules

```markdown
# Project Name — AI Agent Rules

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| UI | HeroUI v3 |
| DB | SQLite |

## Rules
- test_first: true
- coverage_min: 80
- e2e_required: true
- git_push: false
- always_use: find/grep/Read/Edit before Bash
- forbidden: no modifying CLAUDE.md without user approval
```

### AGENTS.md — Multi-Agent Rules

```markdown
# Agent Collaboration Rules

## Agent Roles
- main: ...
- reviewer: ...

## Conflict Resolution
1. CLAUDE.md wins
2. spec.md second
3. User decision final
```

### validators.md — Pre-Commit / Pre-Merge Checks

```markdown
# Validators

## Required Pre-Commit
- [ ] lint passes
- [ ] typecheck passes
- [ ] unit tests pass (coverage >= 80%)
- [ ] no test-first violation

## Required Pre-Merge
- [ ] e2e tests pass
- [ ] alignment score checked (>= 90)
```

### spec.md — Project Specification Baseline

```markdown
# Project Spec — [date]

## Scope
From memory/facts.md + user answers

## Constraints
From interrogate-user answers

## Architecture
From extracted code facts
```

## Rules

- Every rule in CLAUDE.md must trace to a fact or user answer
- Never invent rules — if no evidence, omit, don't guess
- Mark uncertain rules with `TODO: confirm`
- Write all 4 files even if some sections are minimal
- If existing CLAUDE.md found, merge — don't overwrite blindly

## State Relay

After generating standards, update:

```yaml
iteration: 4
phase: "Step 4: synthesize-standards"
last_action: "generated CLAUDE.md (8 rules), AGENTS.md, validators.md, spec.md"
artifacts:
  CLAUDE.md: completed
  AGENTS.md: completed
  validators.md: completed
  spec.md: completed
status: running
next_step: 5
```
