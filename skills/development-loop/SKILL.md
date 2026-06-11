---
name: development-loop
description: >
  Development loop — implement features to alignment standards, verify with lint/typecheck/unit tests, validate with Playwright E2E, review code, and hand off. Use when: "run development loop", "implement this feature", "start development", "build the spec", "dev loop". Triggers: alignment score >= 90, alignment approved, new task spec ready, user requests implementation, pre-development gate passed.
---

# Development Loop

Implement features according to frozen standards. Every loop: plan → branch → implement → validate → E2E → review → handoff. No shortcuts. No skipping Playwright E2E for user-facing features. No pushing without explicit permission.

## Workflow

```
1. dev-planner → 2. branch-manager → 3. dev-implementer →
4. pre-validator → 5. playwright-e2e-tester → (if fail → fix-runner → repeat) →
6. code-reviewer → 7. dev-handoff
```

## Preconditions

```yaml
precondition:
  alignment.approved: true
  alignment.score: ">=90"
  alignment.state: "skills/alignment-loop/memory/state.yaml"
  claude_md: "CLAUDE.md or .claude/CLAUDE.md"
  agents_md: "AGENTS.md"
  validators_md: "validators.md"
  no_blockers: true
```

If any precondition is unmet, abort and report what's missing. Do NOT proceed.

## State Files

| File | Purpose |
|------|---------|
| `.codex/state/development.state.yaml` | Task progress, current step, blockers |
| `.codex/state/verification.state.yaml` | Validator results (lint/typecheck/unit/e2e) |
| `.codex/state/global.state.yaml` | Cross-loop relay (phase, next agent) |
| `.codex/tasks/{task-id}/current-task-spec.md` | Task goals, acceptance criteria, verification plan |

Every sub-skill MUST read and update the relevant state files.

## Hard Rules

- Never skip Playwright E2E for user-facing features.
- Never mark task complete without passing all verification.
- Never push without explicit permission.
- Every loop must update state files.
- Every loop must append development logs.
- No unrelated refactor. No silent dependency installs. No scope expansion beyond spec.

## Sub-Skills

| Skill | Directory | Purpose |
|-------|-----------|---------|
| dev-planner | `skills/development-loop/dev-planner/` | Generate task spec from alignment standards |
| branch-manager | `skills/development-loop/branch-manager/` | Create/confirm feature branch |
| dev-implementer | `skills/development-loop/dev-implementer/` | Implement code per spec |
| pre-validator | `skills/development-loop/pre-validator/` | Run lint, typecheck, unit tests |
| playwright-e2e-tester | `skills/development-loop/playwright-e2e-tester/` | Browser E2E validation via Playwright |
| fix-runner | `skills/development-loop/fix-runner/` | Repair failures, re-run validators |
| code-reviewer | `skills/development-loop/code-reviewer/` | Architecture, security, coverage review |
| dev-handoff | `skills/development-loop/dev-handoff/` | Complete task, relay to evolution loop |

## Loop Integration

```
Alignment Loop (Layer 1)
  ↓ alignment.state.yaml (approved, score >= 90)
Development Loop (Layer 2) ← you are here
  ↓ development.state.yaml (completed)
Evolution Loop (Layer 3)
```

The development loop reads `alignment/state.yaml` to confirm standards are frozen.
After completion, it writes `development/state.yaml` which the evolution loop consumes.

## Automations

Automations live in `skills/development-loop/automations/`:
- `pre-merge-development-check` — gate before merging
- `daily-dev-state-review` — daily status check for blocked tasks
