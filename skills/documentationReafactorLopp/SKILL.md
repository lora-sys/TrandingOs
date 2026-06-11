---
name: knowledge-refactor-loop
description: >
  Run a loop to perform Knowledge Refactoring on any existing project. Phase A: one-shot rebuild
  (audit → extract facts → extract workflows → compute entropy → cleanup if needed → canonicalize → store memory).
  Phase B: scheduled entropy governance. Use when: "knowledge refactoring", "refactor project docs",
  "run doc refactor loop", "onboard this legacy project", "docs rebuild". Triggers: new project
  connected, legacy project imported, user requests docs rebuild, paseo loop run.
---

# Knowledge Refactoring Loop

Phase A: one-shot Knowledge Rehabilitation. Phase B: scheduled entropy governance.

## Workflow

```
Phase A: Audit → Extract Facts → Extract Workflows → Compute Entropy → (Cleanup) → Canonicalize → Store Memory
Phase B: Re-scan → Compare Entropy → (Cleanup if > 2x threshold)
```

## Phase A: Knowledge Rehabilitation

### Iteration 1 — Audit

Run `doc-auditor` skill → discover `.md`, classify Canonical/Stale/Duplicate/Contradictory/Unknown, assign Trust 0-5.

### Iteration 2 — Extract Facts

Run `fact-miner` skill → scan package.json, config, imports → extract atomic facts with file:line citations → build fact memory.

### Iteration 3 — Extract Workflows

Run `procedure-extractor` skill → git log patterns, chat logs, file structure → Development Playbook.

### Iteration 4 — Compute Entropy

Run `entropy-manager` skill → score = (duplicates×1) + (stale×1) + (conflicts×2) + (undocumented×1). If > 20, enter Cleanup Mode.

### Iteration 5 — Cleanup (only if Cleanup Mode)

Delete trust-0 → merge duplicates → archive stale → resolve contradictions → re-scan entropy until <= threshold.

### Iteration 6 — Canonicalize

Run `canonical-docs` skill → rebuild docs/ (README, ARCHITECTURE, SPEC, ADR/, API, DEPLOYMENT, WORKFLOWS) → move legacy to archive/ → verify build.

### Iteration 7 — Store Memory

Write Fact Memory to `alignment/fact-memory.md` and Procedural Memory to `alignment/procedural-memory.md`.

### Exit Condition

- All docs classified and scored
- Fact + procedural memory stored
- Entropy score computed
- Canonical docs generated (archive/ created)
- If entropy > threshold: cleanup completed until <= threshold

## Phase B: Entropy Governance

Trigger: "check doc entropy", "entropy governance", or scheduled after dev cycle.

1. Re-run doc-auditor + fact-miner
2. Recompute entropy score
3. Compare with previous: decreased/stable → log, increased → warn, > 2x threshold → Cleanup Mode + Phase A re-run

## Loop Design

| Parameter | Value |
|-----------|-------|
| max-iterations | 10 |
| max-time | 30m |
| sleep | 0 |
| archive | true |

Worker: run iteration based on current phase.
Verifier: "Return done=true only if artifacts were written and memory stored. Cite files."
