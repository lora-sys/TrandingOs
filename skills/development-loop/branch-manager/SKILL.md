---
name: branch-manager
description: >
  Create or confirm the feature branch for the current task. Safe branch operations with uncommitted-change protection.
  Use when: "create branch", "switch to feature branch", "branch management", "dev-planner output".
  Triggers: after dev-planner writes spec, before dev-implementer starts.
---

# Branch Manager

Safely create or confirm the feature branch for the current task. Never force-checkout with uncommitted changes.

## Workflow

1. Read `.codex/state/development.state.yaml` → get `task.id`.
2. Run `git branch --show-current` to check current branch.
3. Determine expected branch name: `feature/{task-id}`.
4. If on main/master:
   - Run `git status` — if uncommitted changes exist, abort and ask user to commit/stash.
   - Run `git fetch origin`.
   - Run `git checkout -b feature/{task-id}`.
5. If already on a branch:
   - If it matches `feature/{task-id}`, confirm and continue.
   - If it's another `feature/...` branch, ask user whether to switch or stay.
   - If not a feature branch, ask user to confirm switch.
6. Update `.codex/state/development.state.yaml` with branch name.

## State Relay

Update `.codex/state/development.state.yaml`:

```yaml
phase: development
status: in_progress
task:
  id: "{task-id}"
  branch: "feature/{task-id}"
current_step: branch
completed_steps:
  - plan
pending_steps:
  - implement
  - pre_validation
  - playwright_e2e
  - review
  - handoff
```

## Hard Rules

- Never force-checkout if `git status` shows uncommitted changes.
- Never delete branches.
- Never push without explicit permission.
- If branch already exists locally, abort and ask user.
