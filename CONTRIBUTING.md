# Contributing

Thanks for your interest in contributing to Trading Pi! This document
covers the workflow and conventions for issues, branches, commits, and
pull requests.

## Setup

```bash
nvm use            # or: use node 22 (see .nvmrc)
npm install --legacy-peer-deps
```

The repo uses npm workspaces. `--legacy-peer-deps` is required for the
mixed `@vitejs/plugin-react@5` (vite 7) + `ccxt` peer dep ranges.

## Development

```bash
npm run dev        # API on :8787 + Vite on :5173
npm run check      # tsc -b, 0 errors required
npm run test       # vitest, 99 passing
npm run build      # all workspaces
```

## Branches

- `main` is the release branch, protected.
- Feature branches: `feature/<scope>-<short-desc>`
- Bug fixes: `fix/<short-desc>`
- Chores/docs: `chore/<short-desc>`

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

## Pull Requests

1. Open a PR against `main`.
2. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. CI must pass: `npm run check` + `npm run test` + `npm run build`.
4. At least one approving review before merge.

For non-trivial changes, also open an issue first describing the
problem and the proposed approach.

## Code Style

- TypeScript everywhere; no `any` outside `as any` in the api bridge.
- Match existing patterns; prefer editing over rewriting.
- Tests required for any new behavior. Run `npm run test` before pushing.

## Code Owners

`@lora-sys` owns all source under `apps/` and `packages/`. All PRs
require their review.

## Local CI Verification

Before pushing, run the same checks CI will run:

```bash
npm ci --legacy-peer-deps --ignore-scripts
npm run check
npm run test
npm run build
```

If all three pass, the PR is ready.

## Reporting Issues

Use the [bug report template](.github/ISSUE_TEMPLATE/bug.md) for bugs
and the [feature request template](.github/ISSUE_TEMPLATE/feature.md)
for new ideas. Include reproduction steps, expected vs actual behavior,
and environment details.

## License

By contributing, you agree that your contributions will be licensed
under the project's license (see [LICENSE](LICENSE) if present).
