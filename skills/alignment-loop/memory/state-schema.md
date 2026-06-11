# State File Schema

This file is the relay baton between loop iterations. Every skill writes its state here so the next iteration knows:

1. What was done last
2. What's blocked or pending
3. What was confirmed by user
4. What's next

## File Format

Two files, always together:

- `alignment/state.md` — human-readable state narrative
- `alignment/state.yaml` — machine-readable state for programmatic access

## state.md Format

```markdown
# Loop State — [skill name]
Updated: [ISO timestamp]
Loop: [loop name]
Iteration: [N]

## Phase
Current phase name

## Last Action
What this iteration just did, with artifacts produced

## Pending
Items waiting on user input or next step

## Confirmed
Items user has approved (date/time)

## Blocked
Reasons why progress is halted (if any)

## Next
What happens in the next iteration

## Artifacts
| File | Status | Notes |
|------|--------|-------|
| docs/output.md | written | |
| memory/facts.md | pending | depends on extract-facts |
```

## state.yaml Format

```yaml
loop: knowledge-refactor-loop
iteration: 3
phase: Phase A
last_action: "run procedure-extractor — extracted 12 procedures"
timestamp: "2026-06-11T02:00:00Z"
artifacts:
  alignment/audit_report.md: completed
  memory/facts.md: completed
  alignment/procedures.md: completed
pending: []
confirmed:
  - item: "audit complete"
    at: "2026-06-11T01:58:00Z"
blocked: []
next_phase: "Compute Entropy"
status: running   # running | waiting_for_user | paused | complete
```

## Rules

- Every skill MUST read state.yaml before starting (find the latest)
- Every skill MUST write both state.md and state.yaml after finishing
- Status values: `running`, `waiting_for_user`, `paused`, `complete`, `error`
- Pending items MUST be specific — not "continue" but "waiting for user answer on Q3: test strategy"
- Never delete state files — append or overwrite, never trash
- The state file IS the relay baton. If it's missing, the next loop doesn't know what happened.
