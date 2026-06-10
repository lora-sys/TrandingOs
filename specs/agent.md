# agent.md

# Trading Pi Agent Development Rules

## 1. Core Rule

There is only one agent:

```txt
Trading Pi Agent
```

All specialized work must be implemented as workflows, skills, engines, or services.

## 2. Development Flow

For every feature:

1. Create branch.
2. Create spec.
3. Create checklist.
4. Implement.
5. Test.
6. Browser E2E.
7. Demo screenshot/video.
8. Code review.

## 3. Required Files Per Phase

```txt
specs/phase-x-name.md
checklists/phase-x-name.md
docs/progress.md
docs/decisions.md
```

## 4. Prohibited

- hardcoded AI responses
- fake static results in production
- bypassing skill registry
- bypassing risk engine
- bypassing approval
- direct real exchange call from UI
- direct browser automation outside sandbox
- committing secrets

## 5. Required

- execution logs
- artifacts
- tests
- observable workflow runs
- approval for dangerous actions
- mock/paper mode by default
