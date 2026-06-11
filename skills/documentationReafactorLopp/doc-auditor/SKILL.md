---
name: doc-auditor
description: >
  Audit, classify, and score all project documentation. Classifies docs into Canonical, Stale, Duplicate, Contradictory, Unknown categories and assigns Trust Scores (0-5).
  Use when: "audit the docs", "classify documentation", "doc audit", "check documentation quality", "trust score", "documentation review",
  "cleanup old docs", "which docs are reliable", "doc status", or "documentation inventory".
  Triggers: any request to evaluate, inventory, clean up, or score project documentation quality and reliability.
---

# Doc Auditor

Audit every `.md` in the project root, classify, and score.

## Workflow

### Step 1: Discover

List all `.md` under project root (agent must exclude `node_modules/`, `.git/`, `.trading-pi/`, `.claude/skills/`):

```bash
find . -name "*.md" -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.trading-pi/*" \
  -not -path "*/.claude/skills/*" \
  -not -path "*/.claude/settings*" \
  -not -name "*.skill"
```

### Step 2: Read & Classify

Read each file and assign ONE category:

| Category | Criteria |
|----------|----------|
| **Canonical** | Reflects current code state, actively maintained, references working features |
| **Stale** | Describes past state, superseded by newer docs, contains outdated APIs |
| **Duplicate** | Near-identical content to another doc, subset of another doc |
| **Contradictory** | Conflicts with another doc on a factual point (architecture, decisions) |
| **Unknown** | Cannot determine reliability from content alone (notes, fragments, ephemeral) |

### Step 3: Score Trust

Assign Trust Score 0-5:

```
5: code-verified — matches source code exactly, features are implemented
4: recently-maintained — updated within last 2 weeks, likely accurate
3: human-confirmed — reviewed by developer, not auto-generated
2: ai-generated — looks structured but not verified against code
1: historical — describes past state, may still be useful reference
0: deprecated — marked obsolete, superseded, or known broken
```

### Step 4: Detect Contradictions

Cross-reference docs covering the same topic. Flag factual conflicts:

- Architecture description differs (single-agent vs multi-agent)
- Tech stack differs (React 18 vs 19, HeroUI v2 vs v3)
- Project structure differs (monorepo layout)
- Decision differs (paper trading default vs live)

### Step 5: Output Report

Exact output format:

```markdown
# Documentation Audit

## Canonical (trust >= 4 and matches code)

| Path | Trust | Notes |
|------|-------|-------|
| docs/path.md | 5 | Verified against code |

## Stale (superseded or outdated)

| Path | Trust | Notes |
|------|-------|-------|
| docs/path.md | 2 | Replaced by docs/new.md |

## Duplicate (redundant content)

| Path | Trust | Notes |
|------|-------|-------|
| docs/path.md | 3 | Subset of docs/other.md |

## Contradictory (conflicts with canonical)

| Path | Trust | Conflicts With | Notes |
|------|-------|----------------|-------|
| docs/a.md | 2 | docs/b.md | Architecture differs |

## Unknown (cannot determine)

| Path | Trust | Notes |
|------|-------|-------|
| docs/path.md | ? | Fragments/notes |

## Action Items

1. Delete: docs/old.md (trust 0)
2. Merge: docs/fragment.md into docs/guide.md (duplicate)
3. Update: docs/stale.md (trust 2 -> 4 or delete)
4. Resolve: docs/a.md vs docs/b.md (contradictory)

## Trust Policy

Documents with trust <= 1 are ignored unless explicitly requested.
```

## Rules

- Do NOT delete or modify any docs — only classify and report
- Be conservative: prefer "Unknown" over wrong classification
- One doc gets ONE primary category (can have secondary tags)
- Trust scores must be justified with a specific reason
- If a doc is clearly canonical but has minor outdated details, score 4 not 5

## State Relay

Every skill writes state to `alignment/state.yaml` and `alignment/state.md` after finishing.

Read state before starting:
```yaml
# alignment/state.yaml
loop: knowledge-refactor-loop
iteration: 1
phase: "Phase A"
last_action: ""   # what the previous skill did
artifacts:
  alignment/audit_report.md: pending
status: running
```

After finishing, update:
```yaml
loop: knowledge-refactor-loop
iteration: 1
phase: "Phase A"
last_action: "classified 17 docs: 3 trusted, 5 stale, 2 duplicate, 1 contradictory, 6 unknown"
artifacts:
  alignment/audit_report.md: completed
status: running
next_phase: "extract-facts"
```

Always update `alignment/state.md` with human-readable narrative of what was done and what's next.
