---
name: dev-implementer
description: >
  Implement code according to current-task-spec. Strict scope control: only what the spec says, nothing more, nothing less.
  Use when: "implement the spec", "write code for this task", "dev-implementer".
  Triggers: branch created, spec exists, ready to write code.
---

# Dev Implementer

Implement only what the spec requests. No scope creep. No unrelated refactors. Tests required.

## Workflow

1. Read `.codex/tasks/{task-id}/current-task-spec.md`.
2. Read `CLAUDE.md` and `validators.md` for project rules.
3. Read affected files to understand current state.
4. Implement changes matching each acceptance criterion.
5. Add or update unit/integration tests for new behavior.
6. Do NOT implement anything outside the spec scope.
7. Update `.codex/state/development.state.yaml`.

## Scope Discipline

| In Scope | Out of Scope |
|----------|-------------|
| Files listed in affected files | Any file not listed |
| Acceptance criteria listed | Features "nice to have" |
| Tests for new behavior | Tests for existing working code |
| Error handling for new code | Refactoring legacy error handling |

## Implementation Rules

- Follow project conventions from `CLAUDE.md`.
- Use existing patterns when adding to existing files.
- New files must follow project structure conventions.
- Every new public function/API must have a corresponding test.
- No `as any` outside api.ts bridge (per project rules).
- No silent dependency installs — document them if needed.

## State Relay

After implementation:

```yaml
phase: development
status: in_progress
task:
  id: "{task-id}"
  branch: "feature/{task-id}"
current_step: implement
completed_steps:
  - plan
  - branch
pending_steps:
  - pre_validation
  - playwright_e2e
  - review
  - handoff
```

## Hard Rules

- No unrelated refactor.
- No silent dependency install.
- No skipping tests.
- No changing public behavior outside spec.
- If you discover the spec is ambiguous or wrong, STOP and report — don't guess.
