---
name: playwright-e2e-tester
description: >
  Mandatory browser-based E2E testing via Playwright CLI. Never fake E2E with component tests. Covers all acceptance criteria with real browser flows.
  Use when: "run E2E", "playwright test", "validate in browser", "after pre-validation".
  Triggers: pre-validator passed, task has user-facing behavior, or validators.md requires E2E.
---

# Playwright E2E Tester

Run real browser E2E tests via Playwright. This is the gate between implementation and approval.

## Preconditions

- Pre-validator passed (lint, typecheck, unit).
- App can start locally (dev server running or startable).
- Task has user-facing behavior OR `validators.md` requires E2E.

## Workflow

1. Read `.codex/tasks/{task-id}/current-task-spec.md` → extract acceptance criteria.
2. Locate Playwright config (`playwright.config.ts` or `playwright.config.js`).
3. Check for existing E2E tests covering the task scope.
4. If no E2E exists for the acceptance criteria, create minimal Playwright tests.
5. Start the app with the project's dev/start command.
6. Run Playwright E2E:

   ```bash
   npx playwright test
   ```

7. For debugging failed flows:

   ```bash
   npx playwright test --headed
   ```

8. Collect artifacts:
   - Test results (pass/fail per test)
   - Screenshots on failure
   - Videos if enabled
   - Console errors captured during test
   - Network failures (5xx, timeouts)
9. Write E2E report to `.codex/artifacts/{task-id}/e2e-report.md`.
10. Update `.codex/state/verification.state.yaml`.

## E2E Report Format

```markdown
# E2E Report — {task-id}

## Acceptance Criteria Coverage
| Criterion | Test | Status |
|-----------|------|--------|
| User completes core path | test/core-path.spec.ts | PASS |
| Error state displays | test/error-handling.spec.ts | PASS |

## Test Results
- Total: X
- Passed: Y
- Failed: Z

## Console Errors
{None / list any console.error/console.warn}

## Network Issues
{None / list any 5xx or failed requests}

## Screenshots
{Paths to failure screenshots, or "None — all passed"}
```

## State Relay

On success:

```yaml
phase: verification
status: passed
task_id: "{task-id}"
validators:
  e2e:
    required: true
    tool: playwright
    status: passed
    artifacts:
      e2e_report: ".codex/artifacts/{task-id}/e2e-report.md"
```

On failure:

```yaml
phase: verification
status: failed
task_id: "{task-id}"
validators:
  e2e:
    required: true
    tool: playwright
    status: failed
    failures:
      - test/core-path.spec.ts: {reason, screenshot_ref}
next_action: run fix-runner
```

## Hard Rules

- Must test real browser flow (not component/unit mocks).
- Must cover ALL acceptance criteria.
- Must not fake E2E by only checking React components.
- Must not mark complete if Playwright fails.
- If login/auth/payment/external service is involved, use safe mocks or test accounts only.
- If E2E fails 3+ times on the same test, mark blocked and ask user.
