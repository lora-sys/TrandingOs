---
name: canonical-docs
description: Generate a fresh set of canonical documentation for a project by auditing existing docs, extracting facts, rewriting, and archiving the old. Use when the user wants to "rebuild docs from scratch", "generate canonical docs", "canonicalize documentation", "archive old docs and rewrite", "docs overhaul", "phase 3 canonical generation", or says the docs are stale/contradictory and need a rebuild. Triggers: "canonical docs", "redocument", "docs audit and rewrite", "archive old docs", "clean slate docs".
---

# Canonical Docs

Rebuild project documentation from scratch. Do not patch old docs — audit them, extract facts, rewrite clean, archive the rest.

## Workflow

```
audit → extract facts → rewrite → archive → verify
```

## Step 1: Audit

Read all existing documentation files. Catalog every doc found:

```bash
# Find all doc files
find . \( -name "*.md" -o -name "*.rst" -o -name "*.txt" \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/archive/*' | sort
```

Build an audit map:

| File | Last Updated | Coverage | Accuracy | Staleness |
|------|-------------|----------|----------|-----------|
| README.md | ... | partial | stale | 3+ months |

Check codebase against doc claims:
- Does the README setup command actually work? (`npm install && npm run build`)
- Are architecture diagrams matching current code structure?
- Are API endpoints in docs matching actual routes?

## Step 2: Extract Facts

From the audit, extract only **verified facts** — claims that match the current codebase:

- Project name, tech stack, dependencies (from package.json / go.mod / Cargo.toml)
- Directory structure (from actual filesystem)
- Available scripts/commands (from package.json scripts)
- Config files and their purposes
- Entry points and export paths
- Published packages and their scopes

Discard or flag as "unverified" anything that doesn't match the code.

## Step 3: Rewrite — Canonical Docs

Generate these canonical docs. Create each from scratch:

```
docs/
├── README.md              — What this project is, quick start, core concepts
├── ARCHITECTURE.md        — System design, component relationships, data flow
├── SPEC.md                — Detailed feature specifications, API contracts
├── ADR/
│   ├── 0001-tech-stack.md
│   ├── 0002-sqlite-vs-pg.md
│   └── ...                — Architecture Decision Records
├── API.md                 — Public API surface, request/response contracts
├── DEPLOYMENT.md          — Build, deploy, infrastructure, env vars
└── WORKFLOWS.md           — Development workflows, CI/CD, branch strategy
```

Write each doc with:
- **Facts only** — verified against current code
- **No speculation** — if unknown, mark `TODO`
- **Cross-references** — link related docs within the set
- **Code-backed** — commands must match actual package.json scripts or config

### Doc Content Guidelines

| Doc | What it covers | Source |
|-----|---------------|--------|
| README.md | Identity, setup, core concepts | package.json + code + quick test |
| ARCHITECTURE.md | Components, data flow, boundaries | code structure + imports |
| SPEC.md | Feature specs, contracts | actual implementations |
| ADR/* | Why decisions were made | git log + commit messages |
| API.md | Endpoints, types, contracts | route files + type definitions |
| DEPLOYMENT.md | Build/pipeline/infra | config files + CI files |
| WORKFLOWS.md | Dev process, conventions | procedure-extractor output |

## Step 4: Archive

Move ALL pre-existing documentation to `archive/`:

```bash
mkdir -p archive/docs/legacy

# Move doc files one level up from root
find . -maxdepth 1 -name "*.md" -not -name "CLAUDE.md" -not -name "CONTRIBUTING.md" \
  -exec mv {} archive/docs/legacy/ \;

# Move existing docs/ if present
[ -d docs ] && mv docs/ archive/docs/old/ 2>/dev/null || true

# Move specs/ if it's doc-only
[ -d specs ] && mv specs/ archive/docs/specs/ 2>/dev/null || true
```

Preserve but isolate. Never delete — archive is reference.

## Step 5: Verify

After generating canonical docs, verify:

1. **README.md** — Quick start commands actually run without error
2. **ARCHITECTURE.md** — Every component mentioned exists in the filesystem
3. **DEPLOYMENT.md** — Build command (`npm run build`) succeeds
4. **API.md** — Every listed endpoint has a matching route file
5. **Cross-links** — No broken internal doc references

Run a full build to confirm nothing is broken.

## State Relay

Read `alignment/state.yaml` before starting. After canonicalizing, update:

```yaml
loop: knowledge-refactor-loop
iteration: 6
phase: "Phase A"
last_action: "rebuilt 7 canonical docs, archived 14 legacy docs"
artifacts:
  docs/README.md: completed
  docs/ARCHITECTURE.md: completed
  docs/SPEC.md: completed
  docs/ADR/0001-tech-stack.md: completed
  archive/docs/legacy/: 14 files
  alignment/state.md: completed
status: running
next_phase: "store-memory"
```

Also update `alignment/state.md` with: which canonical docs were created, which legacy docs archived, verification results.
