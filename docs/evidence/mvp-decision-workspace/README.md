# MVP Closed-Loop Evidence Pack

> Evidence that the 7-page MVP (Dashboard / Markets / Workspace / Journal / Timeline / Settings / Evolution) works end-to-end.

## Contents

| File | Purpose |
|------|---------|
| `spec-compliance.md` | Per-requirement status matrix for all `REQ-MVP-*` requirements |
| `../../apps/web/playwright.config.ts` | Playwright E2E config |
| `../../apps/web/e2e/mvp-smoke.spec.ts` | Smoke tests covering all 7 routes |

## How to Reproduce

```bash
npm install
npm run build
cd apps/web
npx playwright install chromium
npx playwright test
```

The Playwright config auto-starts `npm run dev` (API on 8787 + Vite on 5173) before running tests.

## Spec Reference

- **MVP Spec**: [`specs/specs/mvp-decision-workspace/spec.md`](../../../specs/specs/mvp-decision-workspace/spec.md)
- **Compliance Matrix**: [`spec-compliance.md`](./spec-compliance.md)

## What's Verified

The Playwright smoke spec verifies:
1. Dashboard page loads with title `/Trading Pi/`
2. All 7 routes (`/`, `/markets`, `/workspace`, `/journal`, `/timeline`, `/settings`, `/evolution`) render a visible `<main>` element
3. Zero console errors during navigation across all routes

The compliance matrix provides file:line references for every `REQ-MVP-*` requirement, marking status as implemented/tested, implemented/untested, or incomplete.