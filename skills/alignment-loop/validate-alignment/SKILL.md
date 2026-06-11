---
name: validate-alignment
description: >
  Generate Alignment Summary and validate that all standards are consistent, complete, and user-approved.
  Present summary for user confirmation. If user modifies, loop back to interrogate-user.
  Use when alignment-loop is at validation step, user says "validate alignment", "show alignment summary".
---

# Validate Alignment

Generate Alignment Summary and validate consistency. Present for user confirmation.

## Generate Summary

```markdown
# Alignment Summary

## Goals
- Maintainability first
- Test coverage >= 80%

## Testing
- Strategy: TDD
- Coverage target: 80%
- E2E: required

## AI Permissions
- Commit: allowed
- Push: forbidden

## Validation
- lint/e2e/coverage >= 80
- Alignment score: 93

## Standards Frozen
- CLAUDE.md: generated
- AGENTS.md: generated
- validators.md: generated
- spec.md: generated

## Pending
- [ ] User confirms
```

## Validate Consistency

Check for internal contradictions:

| Check | Example Pass | Example Fail |
|-------|-------------|-------------|
| Coverage target ≥ 0 | 80% | -1% |
| test_first + coverage target | both present | test_first but no target |
| push rule matches git workflow | git_push: false | push required for PR |
| e2e_required + test strategy | TDD + e2e_required | TDD only, no e2e mentioned |

## Present for Confirmation

Show the Alignment Summary to the user. Ask:

> Confirm alignment? (yes / modify)

If **yes** → alignment score = 100, freeze standards, unlock development.
If **modify** → return to `interrogate-user` (step 3) with updated questions.

## Write Final State

On confirmation, write:

```yaml
# alignment/state.yaml
aligned: true
score: 93
frozen_at: "2026-06-11T01:55:00Z"
developer: UNLOCKED
files:
  CLAUDE.md: generated
  AGENTS.md: generated
  validators.md: generated
  spec.md: generated
```

## State Relay

After validation (user confirmed or modified), write final alignment state:

```yaml
iteration: 5
phase: "Step 5: validate-alignment"
last_action: "alignment score 93 — user confirmed, standards frozen"
artifacts:
  alignment/alignment_report.md: completed
  alignment/state.yaml: finalized
status: complete
alignment:
  score: 93
  frozen: true
  frozen_at: "2026-06-11T02:00:00Z"
  development: UNLOCKED
```

If user modified → set `status: running`, `next_step: 3` (back to interrogate-user).