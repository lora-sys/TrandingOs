---
name: entropy-manager
description: >
  Monitor documentation entropy, compute a score, and auto-trigger documentation cleanup when the score exceeds a threshold.
  Use when: "check doc entropy", "documentation health", "entropy score", "doc cleanup mode",
  "documentation governance", "entropy management", "doc threshold exceeded", "cleanup mode".
  Triggers: any request to measure documentation health, compute entropy, enable auto-cleanup,
  or pause feature development for documentation governance.
---

# Entropy Manager

Measure documentation disorder. When entropy exceeds threshold, pause feature work and enter Documentation Cleanup Mode until the score drops below threshold.

## Entropy Score

Compute a weighted score from four dimensions:

| Dimension | Metric | Weight | Source |
|-----------|--------|--------|--------|
| **Duplicate** | Docs with >80% content overlap | 1 pt each | doc-auditor |
| **Stale** | Docs describing past state, trust <= 2 | 1 pt each | doc-auditor |
| **Contradictory** | Doc pairs with factual conflicts | 2 pts per pair | doc-auditor |
| **Undocumented** | Source files/modules with no doc coverage | 1 pt each | fact-miner + file scan |

```yaml
entropy:
  duplicated_docs: 12
  stale_docs: 7
  conflicting_docs: 3
  undocumented_modules: 5
  score: 33   # 12*1 + 7*1 + 3*2 + 5*1 = 33
```

## Threshold Policy

Default threshold: **20**. Configurable per project.

```yaml
entropy_config:
  threshold: 20
  stale_weight: 1
  duplicate_weight: 1
  conflict_weight: 2
  undocumented_weight: 1
  cleanup_mode: auto   # auto | manual
```

| Score Range | State | Action |
|-------------|-------|--------|
| 0 - threshold | **Healthy** | Continue normal development |
| threshold+1 - 2x | **Warning** | Warn before accepting new feature PRs |
| > 2x threshold | **Cleanup Mode** | Block feature work, enter Documentation Cleanup Mode |

## Workflow

```
scan codebase → run doc-auditor → run fact-miner → compute score → decide
```

### Step 1: Scan

Identify undocumented source modules:

```bash
# List all source files (adjust extensions per project)
find . \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
  -not -path '*/build/*' -not -name "*.test.*" -not -name "*.spec.*" | sort
```

```bash
# List source directories (potential modules)
find ./src ./packages ./apps -maxdepth 2 -type d \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
  -not -path '*/build/*' | sort
```

### Step 2: Run Auditor & Miner

```
Load: doc-auditor skill → run full audit → get classification table
Load: fact-miner skill   → extract fact memory → get module inventory
```

### Step 3: Compute Score

Cross-reference fact-miner's module inventory against existing docs.
Count how many source modules have zero doc coverage.

```
score = (duplicated × 1) + (stale × 1) + (conflicting × 2) + (undocumented × 1)
```

### Step 4: Decide

**Score <= threshold** → log score, continue normal work. No action needed.

**Score > threshold** → enter Documentation Cleanup Mode:

```
STATE: Documentation Cleanup Mode ACTIVE
BLOCK: Feature development paused until score <= threshold
PLAN:  Cleanup sequence (see Cleanup Strategy below)
```

## Cleanup Strategy

When entering cleanup mode, execute this sequence:

```
1. Delete: trust 0 docs (deprecated, known broken)
2. Merge:  duplicates into canonical parent
3. Archive: stale docs → archive/
4. Resolve: contradictory pairs (pick winner based on trust score)
5. Rewrite: add docs for highest-priority undocumented modules
6. Re-scan: compute new entropy score
```

Stop when score <= threshold. Then:

```
STATE: Documentation Cleanup Mode ENDED
RESUME: Normal feature development
```

## Integration with Other Skills

| Skill | Role in Entropy Management |
|-------|---------------------------|
| **doc-auditor** | Source of duplicated/stale/contradictory counts |
| **fact-miner** | Source of module inventory for undocumented detection |
| **procedure-extractor** | Discovers team workflows — feeds undocumented detection |
| **canonical-docs** | The cleanup tool — rebuilds docs when entropy is too high |

## Rules

- Never ignore entropy — always compute and log it
- Never delete docs with trust >= 3 without explicit approval
- Archive, don't trash. Every removed doc goes to `archive/`
- Log every entropy scan with timestamp and score
- When in cleanup mode, only doc-related work is allowed — no feature development
- Re-scan after each cleanup phase to track progress

## State Relay

Read `alignment/state.yaml` before starting. After computing entropy, update:

```yaml
loop: knowledge-refactor-loop
iteration: 4
phase: "Phase A"
last_action: "entropy score: 33 (12 dup, 7 stale, 3 conflict, 5 undocumented)"
entropy:
  score: 33
  threshold: 20
  cleanup_mode: true   # exceeds threshold
artifacts:
  alignment/entropy_report.md: completed
status: running
next_phase: "cleanup"
```

If cleanup completes, update to:

```yaml
last_action: "cleanup done — entropy dropped to 12"
entropy:
  score: 12
  cleanup_mode: false
status: running
next_phase: "canonical-docs"
```

Always update `alignment/state.md` with entropy trend, cleanup actions taken, pending decisions.
