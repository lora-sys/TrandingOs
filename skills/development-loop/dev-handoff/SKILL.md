---
name: dev-handoff
description: >
  Complete the development loop, update all state files, append development log, and hand off to Evolution Loop.
  Use when: "handoff", "complete this task", "dev handoff", "all tests passed, wrap up".
  Triggers: code-reviewer approved, ready to relay to next loop.
---

# Dev Handoff

Finalize development loop. Verify everything passed. Update state. Hand off to Evolution Loop.

## Preconditions

Before running handoff, confirm ALL of the following:

```yaml
preconditions:
  - pre_validator_passed: true
  - playwright_e2e_passed: true
  - code_review_verdict: "approved"
  - no_blockers: true
```

If any precondition is unmet, do NOT hand off. Return to the failing step.

## Workflow

1. Verify all preconditions from state files.
2. Update `.codex/state/development.state.yaml`:

   ```yaml
   phase: development
   status: completed
   task:
     id: "{task-id}"
     completed_at: "{ISO timestamp}"
   current_step: handoff
   completed_steps:
     - plan
     - branch
     - implement
     - pre_validation
     - playwright_e2e
     - review
   pending_steps: []
   blockers: []
   ```

3. Update `.codex/state/verification.state.yaml`:

   ```yaml
   phase: verification
   status: passed
   task_id: "{task-id}"
   completed_at: "{ISO timestamp}"
   ```

4. Update `.codex/state/global.state.yaml`:

   ```yaml
   current_phase: evolution
   current_task: "{task-id}"
   task_status: completed
   next_agent: evolution-loop
   next_phase_state: development
   ```

5. Append to `development.log.md`:

   ```markdown
   ## {task-id} — {date}
   - Status: completed
   - Branch: feature/{task-id}
   - Lint: passed
   - Typecheck: passed
   - Unit: passed
   - E2E: passed
   - Review: approved
   ```

6. Prepare handoff summary for Evolution Loop.

## Handoff Summary

```markdown
# Handoff: {task-id} → Evolution Loop

## What was built
{Brief description}

## Files changed
- {file1} — {what}
- {file2} — {what}

## Verification
- Lint: passed
- Typecheck: passed
- Unit: passed
- E2E: passed ({count} tests)
- Review: approved

## Branch
`feature/{task-id}`

## Notes
- {Any caveats, known limitations, follow-ups}
```

## Hard Rules

- Never hand off if any validator failed.
- Never skip state file updates.
- Never push without explicit permission.
- Handoff summary must be complete — no "etc." or vague descriptions.
