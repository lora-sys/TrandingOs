---
name: fix-runner
description: >
  Diagnose and fix validation/E2E failures. Smallest possible fix, re-run validator, loop until pass or 3 attempts.
  Use when: "fix this failure", "validator failed", "E2E broke", "pre-validation failed".
  Triggers: any validator or E2E reports failure.
---

# Fix Runner

Diagnose failures from pre-validator or E2E. Apply smallest possible fix. Re-run. Repeat or escalate.

## Workflow

1. Read `.codex/state/verification.state.yaml` → identify failing validator.
2. Inspect logs, screenshots, traces from `.codex/artifacts/{task-id}/`.
3. Identify root cause — not just symptom.
4. Apply the smallest possible fix.
5. Re-run the failed validator only (not all validators).
6. Update `.codex/state/development.state.yaml`.
7. If fixed → continue loop (next step in development flow).
8. If not fixed and fix_count >= 3 → mark blocked, ask user.

## Fix Strategy

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Lint error | Wrong format/style | Fix formatting, add to ignore if justified |
| Typecheck error | Wrong types, missing imports | Fix types, add type guards |
| Unit test fails | Bug in implementation or test | Fix implementation; if test is wrong, fix test |
| E2E fails | Browser renders wrong state | Fix component/state/routing; add debugging screenshot |

## State Relay

After each fix attempt:

```yaml
phase: development
status: fixing
task:
  id: "{task-id}"
current_step: fix
fix_count: 1
blockers: []
```

After 3rd failure:

```yaml
phase: development
status: blocked
task:
  id: "{task-id}"
current_step: fix
fix_count: 3
blockers:
  - "E2E test/core-path.spec.ts failed after 3 fix attempts — needs human review"
```

## Hard Rules

- Do not rewrite unrelated modules.
- Do not lower validation standards without Alignment Loop approval.
- Do not delete failing tests unless proven invalid and user confirms.
- Fix the smallest possible cause — not the entire module.
- Log each fix attempt in development state.
