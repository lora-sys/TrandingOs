---
name: pre-development-alignment
description: >
  Gate automation — runs before major feature development. Checks spec changes > 30% or new modules.
  Triggers alignment-loop. Only on approved alignment can development-loop start.
  Trigger: "pre-dev gate", "before major feature", "spec changed significantly", "new module added".
---

# Pre-Development Alignment Gate

Run before major feature work. Detects spec drift > 30% or new modules. Triggers alignment-loop.

## Trigger

One of:
- Spec changes > 30% (compare current spec.md against baseline)
- New major module added (new directory in src/packages/apps)
- User requests "start major feature" or "begin new domain"

## Run

1. Load `drift-detection` skill → compare current state to CLAUDE.md
2. Compute drift score
3. If score >= 90 → approve, unlock development
4. If score < 90 → trigger full alignment-loop

## Output

Write to `alignment/gate_decision.md`:

```markdown
# Development Gate Decision — [date]

Trigger: spec changed 45%, new module: apps/web/src/routes/NewPage.tsx

Drift Score: 78/100
Action: BLOCK — run alignment-loop before development

Violation Details:
- test_first compliance: 70% (below 90%)
- no e2e tests for new domain

Approval: PENDING alignment-loop completion
```

## Rules

- Never auto-approve if drift score < 90
- Only this gate can unlock development-loop
- Once approved, log approval timestamp and score
- If alignment-loop runs and score >= 90, update gate to APPROVED
