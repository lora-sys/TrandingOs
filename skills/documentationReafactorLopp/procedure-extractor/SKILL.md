---
name: procedure-extractor
description: Extract team development workflows and practices from a project's git history, chat logs, and files. Use when the user wants to understand "how a team works" rather than "what a project is", extract recurring procedures from development behavior, analyze git history for patterns, discover informal team conventions, or produce a structured "playbook" of how development is actually done. Triggers: "extract procedures", "what's our workflow", "how do we work here", "extract development patterns", "analyze our git history for practices", "discovery", "team conventions". Integrates with entropy-manager to detect undocumented modules as a source of entropy.
---

# Procedure Extractor

Extract how a team actually works from git history, chat logs, and codebase structure — not what the project does, but the recurring procedures, conventions, and workflows embedded in its development behavior.

## Workflow

```
1. git log analysis  →  2. Chat/conversation analysis  →  3. File structure analysis  →  4. Synthesize procedures  →  5. Present playbook
```

## Step 1: Git History Analysis

Run targeted `git log` queries to find recurring patterns:

```bash
# Recent commit messages (last 200 commits)
git log --oneline -n 200

# Commit message patterns (categorize by type)
git log --oneline --grep="feat\|fix\|refactor\|docs\|style\|test\|chore\|ci\|build\|perf\|revert" -n 200

# Branch creation patterns (what kinds of branches exist)
git branch -a | sed 's/^[* ]*//' | sed 's/origin\///' | sort | uniq -c | sort -rn | head -40

# File change patterns (which files get touched together)
git log --oneline --name-only -n 100 | grep -E '^\w|^  ' | paste - - | sort | uniq -c | sort -rn | head -20

# Author contribution patterns (who changes what)
git log --oneline --author="." --format="%an | %s" -n 100
```

Look for:
- **Commit message conventions**: prefixes, description style, linking patterns
- **Branch naming**: feature/release/hotfix patterns
- **Co-changes**: files that always change together (suggests workflows)
- **Revert frequency**: areas of instability
- **File ownership**: who touches what

## Step 2: Chat/Log Analysis

Parse conversation logs for procedural signals:

```bash
# Search for imperative patterns in conversation logs
grep -riE "always|never|don't|must|should|preferr|avoid|note|important|rule" logs/ --include="*.md" --include="*.txt" -i
```

Look for:
- **Explicit rules**: "always use X", "don't do Y"
- **Correction patterns**: "no, use Z instead" (shows preferred approach)
- **Review feedback**: recurring critique topics
- **Decision rationales**: "we chose X because Y"

## Step 3: File Structure Analysis

Examine project structure for implicit conventions:

```bash
# Directory tree (top 3 levels)
find . -type d -name 'node_modules' -prune -o -type d -print | head -50

# Config files
find . -maxdepth 2 -name "*.config.*" -o -name ".eslintrc*" -o -name ".prettierrc*" -o -name "tsconfig*" | sort

# Test file patterns
find . -name "*.test.*" -o -name "*.spec.*" | head -20
```

Look for:
- **Test co-location**: tests next to source vs. separate directories
- **Config organization**: shared vs. per-package config
- **Naming conventions**: file/folder naming patterns
- **Structure hints**: folders with `_test`, `_spec`, `__tests__` reveal testing conventions

## Step 4: Synthesize Procedures

Classify each discovered pattern into a procedure:

| Category | Trigger | Example |
|----------|---------|---------|
| **Workflow** | Sequential recurring steps | test → implement → review |
| **Convention** | Naming/formatting consistency | feature/branch pattern |
| **Rule** | Explicit do/don't | "don't mock the database" |
| **Decision** | Chosen approach + rationale | "use MCP instead of curl" |
| **Pattern** | Co-occurring changes | api.ts + types.ts always updated together |

Format each procedure as:

```
Procedure: <name>
Category: workflow | convention | rule | decision | pattern
Confidence: high | medium | low
Evidence: <git commits, log entries, file patterns>

Steps/Description:
1. ...
```

## Step 5: Output Playbook

Present findings as a structured development playbook:

```markdown
# Development Playbook for <project>

## Workflows
1. API Development: test → implement → review
2. Release Process: ...

## Conventions
- Branch naming: ...
- Commit style: ...

## Rules
- Always: ...
- Never: ...

## Decisions
- ...

## Patterns
- ...
```

## Confidence Scoring

Rate each procedure:
- **high**: observed 5+ times across diverse files/authors
- **medium**: observed 2-4 times
- **low**: observed once or inferred from structure alone

Only present high-confidence procedures as firm rules. Label medium/low as "tentative" with evidence count.

## State Relay

Read `alignment/state.yaml` before starting. After synthesizing procedures, update:

```yaml
loop: knowledge-refactor-loop
iteration: 3
phase: "Phase A"
last_action: "extracted 12 procedures from 200 commits, 3 contributor patterns"
artifacts:
  alignment/procedures.md: completed
status: running
next_phase: "entropy-manager"
```

Also update `alignment/state.md` with procedure summary, confidence breakdown, pending confirmations.
