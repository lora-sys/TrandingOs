---
name: dev-planner
description: >
  Read alignment standards and user goals, generate a current-task-spec for implementation.
  Use when: "plan this task", "generate task spec", "dev plan", "break down this feature".
  Triggers: user provides implementation goal, development loop needs task breakdown,
  alignment just froze, user says "implement X".
---

# Dev Planner

Read alignment standards and user goals. Produce a concrete, actionable task spec that the implementer can follow without ambiguity.

## Input

- User goal (natural language description of what to build)
- `alignment/state.yaml` — confirm alignment is approved
- `CLAUDE.md` — project rules for AI agents
- `AGENTS.md` — multi-agent collaboration rules
- `validators.md` — pre-commit / pre-merge check rules
- `spec.md` — project specification baseline
- `memory/facts.md` — extracted code facts
- `memory/procedures.md` — workflows and conventions

## Workflow

1. Read `alignment/state.yaml`. Confirm `alignment.approved` is true and `alignment.score` >= 90. If not, abort.
2. Parse user goal into concrete implementation requirements.
3. Identify affected modules and files from codebase structure.
4. Define goal (what) and non-goals (what not).
5. Define acceptance criteria (measurable, testable).
6. Define verification plan (lint, typecheck, unit, E2E).
7. Write `.codex/tasks/{task-id}/current-task-spec.md`.
8. Update `.codex/state/development.state.yaml`.

## Output: current-task-spec.md

```markdown
# Current Task Spec

## Task ID
{task-id}

## Goal
{One sentence: what this implements}

## Non-Goals
- {What this explicitly does NOT cover}

## Affected Files
- {path/to/file} — {what changes}

## Acceptance Criteria
- [ ] {User can complete core path}
- [ ] {Error states display correctly}
- [ ] {E2E covers all acceptance criteria}
- [ ] {No lint/typecheck errors}

## Verification Plan
- **Lint:** `{lint command}`
- **Typecheck:** `{typecheck command}`
- **Unit:** `{unit test command}`
- **E2E:** `npx playwright test` (mandatory for user-facing)

## Dependencies
- {Alignment Loop approved at score XX}
- {External services needed, if any}
```

## State Relay

Update `.codex/state/development.state.yaml`:

```yaml
phase: development
status: planning
task:
  id: "{task-id}"
  goal: "{goal}"
  spec: ".codex/tasks/{task-id}/current-task-spec.md"
current_step: plan
completed_steps: []
pending_steps:
  - plan
  - branch
  - implement
  - pre_validation
  - playwright_e2e
  - review
  - handoff
blockers: []
```

## Rules

- Spec must be concrete enough that an implementer doesn't need to guess.
- Every acceptance criterion must be testable.
- If alignment standards conflict with user goal, flag as blocker and ask user.
- Never expand scope without updating the spec first.
