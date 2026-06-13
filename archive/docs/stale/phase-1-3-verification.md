# Phase 1-3 Verification Notes

## Completed Evidence

- `npm run check` passes.
- `npm run test` passes with 5 core tests.
- `npm run build` passes for API, web, and core packages.
- `/api/health` returns local-first health with root `.trading-pi/trading-pi.sqlite`.
- `/api/status` shows `.env` AI and Langfuse configuration loaded from the repository root.
- `/api/ai/ping` made a real OpenAI-compatible model call and returned `Trading Pi AI online.`
- `/api/workflows/market.snapshot/run` created a workflow run, skill runs, timeline events, and a market snapshot artifact.
- `/api/workflows/trade.plan/run` called real AI, created a trade plan artifact, and preserved market-source failures in the output.
- Docker final image builds and `/api/health` returns `ok: true` from the container with SQLite at `/data/trading-pi.sqlite`.
- Playwright screenshots captured:
  - `output/playwright/trading-pi-phase-1-3.png`
  - `output/playwright/trading-pi-after-market-workflow.png`
  - `output/playwright/trading-pi-after-agent-chat-complete.png`

## Network Limitation

During early local terminal checks, several public market endpoints timed out. During Docker/browser E2E, CoinGecko succeeded and Binance through CCXT returned a real restricted-location response:

- CoinGecko: succeeded for ETH/BTC quotes.
- Binance through CCXT: HTTP 451 restricted-location response.
- Coinbase/Kraken/OKX/Bybit spot checks from the terminal timed out in this environment.

The market skills are real integrations and do not fake results. Failures are recorded in skill runs, workflow outputs, timeline events, and artifacts.
