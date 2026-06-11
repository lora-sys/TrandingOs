---
name: interrogate-user
description: >
  Auto-generate targeted questions for the user based on discovered gaps between code, docs, and standards.
  Core of alignment — captures user preferences that no tool can infer. Places questions in alignment/questions.md.
  Use when alignment-loop is at interrogation step, user says "alignment questions", "clarify preferences",
  "what should our standards be". Critical: generates questions from evidence, not from scratch.
---

# Interrogate User

Auto-generate questions from discovered gaps. Place questions in `alignment/questions.md`. Wait for answers.

## Question Generation

Generate questions from evidence, not guesses. Each question MUST cite the discovery that triggered it:

| Discovery | Question |
|-----------|----------|
| Docs require TDD but no tests exist | "Future dev: TDD?" (A) TDD (B) post-test (C) core only |
| Git history shows no test files | "Test strategy?" |
| Docs contradict on deploy target | "Actual deploy target?" |
| No ADR for tech stack | "Why this stack? Any constraints?" |
| AI agent exists but no commit rules | "Allow AI to auto-commit?" |

## Question Format

Write to `alignment/questions.md`:

```markdown
# Alignment Questions — [date]

## Q1: Test Strategy
**Trigger:** docs mention TDD but zero test files found in codebase
Options:
- [ ] A) TDD (test first, always)
- [ ] B) Implement then test
- [x] C) Core modules only

## Q2: AI Permissions
**Trigger:** agent exists in code, no commit rules found
Options:
- [ ] Allow AI to commit
- [x] Allow commit, disallow push
- [ ] No AI commits

## Q3: ...
**Trigger:** ...
Options: ...
```

## Rules

- Generate 5-15 questions max — only ask about real gaps
- Every question MUST cite the discovery that triggered it
- Questions MUST have options (A/B/C) where possible — free text only when necessary
- Wait for user answers before proceeding
- If user modifies any answer → loop back to synthesize-standards (not re-ask)
- If user wants to add new questions → append and re-evaluate

## State Relay

Read `alignment/state.yaml`. After generating questions:

```yaml
iteration: 3
phase: "Step 3: interrogate-user"
last_action: "generated 8 questions based on 6 discovered gaps"
artifacts:
  alignment/questions.md: completed
  alignment/state.yaml: updated   # user must fill answers
status: waiting_for_user
next_step: 4
pending:
  - "User answers questions.md — check for completion before proceeding"
```

After user answers, update status to `running` and mark answers loaded.
