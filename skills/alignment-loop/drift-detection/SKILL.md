---
name: drift-detection
description: >
  Detect drift between current development behavior and frozen standards. Runs continuously or on trigger.
  Compares actual behavior (git history, recent commits, file changes) against CLAUDE.md rules.
  Triggers re-alignment but never modifies standards. Use when user says "check drift", "drift detection",
  "is the project still aligned", or when automation detects spec changes > 30%.
---

# Drift Detection

Compare current behavior against frozen standards. Output severity and reason. Trigger re-alignment if needed.

## Compare

Check each rule in `CLAUDE.md` against recent development behavior:

| Rule | Check Method | Example |
|------|-------------|---------|
| `test_first: true` | Check last 20 commits for test-before-impl pattern | All commits have test file created before feature file |
| `coverage_min: 80` | Run coverage report | 92% coverage |
| `git_push: false` | Check git remote push history | No pushes in last 30 days |
| `e2e_required: true` | Check new feature files for e2e | New feature has no e2e test |

## Output

Write to `alignment/drift_report.md`:

```markdown
# Drift Report — [date]

## Rules Checked
| Rule | Expected | Actual | Status |
|------|----------|--------|--------|
| test_first | test created before impl | impl written directly | FAIL |
| coverage >= 80 | 80% | 92% | PASS |
| git_push: false | no push | no push | PASS |

## Violations
| Severity | Rule | Reason |
|----------|------|--------|
| high | test_first | 15 of last 20 commits wrote impl without test |
| medium | e2e_required | 2 new features lack e2e |

## Drift Score: 72/100

## Action
Score < 90 → trigger alignment-loop
```

## Severity

| Level | Action |
|-------|--------|
| high | Trigger full alignment-loop immediately |
| medium | Log warning, flag for next weekly review |
| low | Log only, no action |

## Rules

- Drift detection detects issues but NEVER modifies standards
- Only Alignment Loop + user can change CLAUDE.md, AGENTS.md, validators.md
- Write results to `alignment/drift_report.md`
- If drift score < 90, output: "TRIGGER ALIGNMENT-LOOP"

## State Relay

After drift check, update state:

```yaml
phase: "drift-detection"
last_action: "checked 3 rules — 1 violation: test_first compliance 70%"
artifacts:
  alignment/drift_report.md: completed
status: running
drift:
  score: 78
  violations: 1
  triggers_re_alignment: true
```
