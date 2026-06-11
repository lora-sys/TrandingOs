---
name: code-reviewer
description: >
  Post-validation code review: architecture, security, functionality completeness, test coverage.
  Use when: "review this code", "code review", "all tests passed, review", "pre-merge review".
  Triggers: all validators and E2E passed, before dev-handoff.
---

# Code Reviewer

After all tests pass, review the implementation against spec, architecture, security, and quality.

## Workflow

1. Read `.codex/tasks/{task-id}/current-task-spec.md` → know what was supposed to be built.
2. Run `git diff` to get the full implementation diff.
3. Compare implementation against the spec:
   - Did every acceptance criterion get implemented?
   - Are there features outside the spec scope?
4. Check architecture constraints from `CLAUDE.md`:
   - File organization follows project conventions
   - No circular dependencies
   - Proper separation of concerns
5. Check security:
   - No hardcoded secrets or credentials
   - No `eval()`, `innerHTML`, or injection vectors
   - Input validation at boundaries
   - No `as any` in core domain models (allowed in api.ts bridge only)
6. Check UI/UX acceptance criteria (if user-facing):
   - Error states visible and correct
   - Loading states present
   - Accessible (keyboard navigation, ARIA where needed)
7. Check test coverage:
   - New code has corresponding tests
   - Edge cases covered
   - E2E covers core user paths
8. Write review to `.codex/tasks/{task-id}/review.md`.

## Review Report Format

```markdown
# Code Review — {task-id}

## Spec Compliance
- [x] All acceptance criteria implemented
- [x] No scope creep

## Architecture
{assessment}

## Security
{assessment}

## Test Coverage
{assessment}

## UI/UX
{assessment}

## Issues Found
| Severity | File | Issue | Fix |
|----------|------|-------|-----|
| High | ... | ... | ... |
| Medium | ... | ... | ... |
| Low | ... | ... | ... |

## Verdict
- [ ] **approved** — no blocking issues
- [ ] **needs_changes** — non-blocking issues to fix
- [ ] **blocked** — critical issue requiring re-implementation
```

## Verdict Actions

| Verdict | Action |
|---------|--------|
| **approved** | Continue to dev-handoff |
| **needs_changes** | Return to dev-implementer with specific issues |
| **blocked** | Block flow, ask user for direction |

## Hard Rules

- Must compare actual diff against spec — not just assume.
- Must check security even if not explicitly requested.
- Must flag scope creep even if it seems minor.
- Never approve without reading the full diff.
