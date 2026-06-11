---
name: weekly-alignment-review
description: >
  Scheduled automation — runs weekly alignment review. Re-runs audit-docs, extract-facts, drift-detection.
  Generates alignment_report.md. If score < 90, generates pending questions for user.
  Does NOT modify standards. Only detects drift and initiates alignment-loop.
  Trigger: scheduled cron or "weekly review", "alignment report".
---

# Weekly Alignment Review

Run weekly. Re-scan, compare, report. If score < 90 → generate questions.

## Run

1. Load `audit-docs` skill → re-audit knowledge layer
2. Load `extract-facts` skill → re-extract code facts
3. Load `drift-detection` skill → compare against CLAUDE.md
4. Compute new alignment score

## Output

Write to `alignment/alignment_report.md`:

```markdown
# Alignment Report — [date]
Previous Score: 93
Current Score: 87
Delta: -6
Status: WARNING

Violations:
- test_first: 85% compliance (was 100%)
- coverage dropped 80% → 76%

Pending Questions:
1. "Coverage dropped below 80%. Accept lower threshold?" (A) Keep 80% (B) Lower to 75%
2. "TDD compliance dropped. Reduce requirement?" (A) Keep TDD (B) Core modules only

Action: User response required. If questions answered, run alignment-loop.
```

## Rules

- Never modify CLAUDE.md, AGENTS.md, validators.md
- Never auto-approve drift
- Generate questions for user confirmation
- If score < 80, recommend running full alignment-loop
