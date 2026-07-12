# PR-06 — Model picker wired to backend

## What

Implements audit findings A1 and A18:

- A1: model picker no longer hardcodes an empty array (`useState<ModelInfo[]>([])`).
      On mount, the hook calls `GET /api/config/models` via `tradingPiApi.configModels()`,
      stores the returned list, syncs the current selection, and exposes `loading` for skeletons.
- A18: model picker dropdown is reachable because the list now actually populates.

## Files touched

| File | Change |
|---|---|
| `apps/web/server/api.ts` | New helper `listAvailableModels()` + endpoint `GET /api/config/models`. |
| `apps/web/src/api.ts` | New `tradingPiApi.configModels()` typed method. |
| `apps/web/src/api/types.ts` | New `ConfigModelsResponse` type. |
| `apps/web/src/hooks/useModelPicker.ts` | Fetches models on mount, exposes `loading`, falls back to `onError`. |
| `apps/web/src/hooks/useModelPicker.test.ts` | New vitest suite — verifies fetch lifecycle + contract. |
| `docs/evidence/06-model-picker/README.md` | This file. |

## API contract

```
GET /api/config/models
→ {
    models: Array<{
      id: string,
      name: string,
      reasoning?: boolean,
      contextWindow: number,
      provider: string,
    }>,
    current: string,
  }
```

The endpoint always includes `env.openaiModel` (the configured primary) and
adds `LongCat-2.0`, `gpt-4o-mini`, `gpt-4o` as defaults when `env.openaiBaseUrl`
matches an `openai-completions` style schema.

## How to verify

1. Server: `npm run server -w @trading-pi/web` (port 8787).
2. `curl http://localhost:8787/api/config/models | jq .` — should show the configured
   model as the first entry plus the openai-compatible defaults.
3. Web: `npm run dev -w @trading-pi/web`, open the picker; dropdown should
   populate after a brief skeleton state.

## Screenshot placeholder

> Real screenshot captured in the dedicated Playwright PR (later).
> Path reserved: `docs/evidence/06-model-picker/model-picker-live.png`

## Notes

- `apps/web` doesn't yet declare `@testing-library/react` as a devDep, so the
  unit suite focuses on the API contract and the conversion logic instead of
  full DOM-based hook rendering. The hook itself is straightforward and can
  be exercised manually in the UI.
- No `as any` introduced.
- Existing tests untouched.
