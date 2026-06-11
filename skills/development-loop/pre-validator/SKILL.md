---
name: pre-validator
description: >
  Run lint, typecheck, and unit/integration tests. Gate before E2E — nothing passes E2E if pre-validation fails.
  Use when: "run pre-validation", "check lint and types", "pre-validate", "before E2E".
  Triggers: after dev-implementer finishes, before playwright-e2e-tester.
---

# Pre Validator

Run all pre-E2E validators. If any fail, do NOT proceed to E2E. Hand off to fix-runner.

## Workflow

1. Read `validators.md` for required validators and commands.
2. Fall back to detecting commands from `package.json` scripts:
   - `lint` → `npm run lint` or project equivalent
   - `typecheck` → `npm run typecheck` or `tsc --noEmit`
   - `unit` → `npm test` or `vitest`
   - `integration` → `npm run test:integration` if available
3. Run each validator sequentially.
4. Save full output to `.codex/artifacts/{task-id}/pre-validation.log`.
5. Update `.codex/state/verification.state.yaml`.

## Validation Matrix

```yaml
validators:
  lint:
    required: true
    command: "{lint command}"
    status: pending
  typecheck:
    required: true
    command: "{typecheck command}"
    status: pending
  unit:
    required: true
    command: "{unit test command}"
    status: pending
  integration:
    required: false
    command: "{integration test command}"
    status: skipped
```

## Failure Rule

If ANY required validator fails:

1. Record failure in `verification.state.yaml`.
2. Do NOT continue to E2E.
3. Run `fix-runner` with the failure details.
4. After fix, re-run the failed validator.
5. Only when all required validators pass, mark `status: passed` and allow E2E.

## State Relay

On success:

```yaml
phase: verification
status: passed
task_id: "{task-id}"
validators:
  lint: { status: passed }
  typecheck: { status: passed }
  unit: { status: passed }
artifacts:
  pre_validation_log: ".codex/artifacts/{task-id}/pre-validation.log"
```

On failure:

```yaml
phase: verification
status: failed
task_id: "{task-id}"
validators:
  lint: { status: failed, errors: "...", output_ref: "pre-validation.log" }
next_action: run fix-runner
```

## Rules

- All required validators MUST pass before E2E.
- Full command output must be saved (not truncated).
- If project has no lint/typecheck, note that and skip — but document why.
- Never lower validation standards.
