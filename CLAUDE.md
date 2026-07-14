# Trading Pi — Personal Trading Operating System

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Agent Runtime** | Pi Mono (`@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`) |
| **UI Framework** | HeroUI v3 (Tailwind CSS v4 + React Aria) + shadcn/ui |
| **AI Chat UI** | ai-elements (Conversation, Message, PromptInput, Tool, Artifact, Confirmation) |
| **Charts** | lightweight-charts (K线), recharts (PnL/趋势) |
| **Frontend** | React 19, TanStack Router, TanStack Query, TanStack Table, TanStack Virtual |
| **Backend** | Node HTTP (apps/web/server/api.ts), direct @trading-pi/core import |
| **Database** | SQLite via node:sqlite |
| **AI Model** | OpenAI-compatible (deepseek-v4-flash via token.sensenova.cn) |
| **Testing** | Playwright CLI (E2E), Vitest (unit) |
| **E2E** | playwright-cli skill, user stories at specs/userstory.md |

## Project Structure

```
trandingos/
  apps/web/             # Web frontend + API server
    server/api.ts       # HTTP API (8787) — imports @trading-pi/core
    src/
      api.ts            # Fetch-based API client (bridges to API server)
      components/       # React components
        ai-elements/    # ai-elements components (installed by CLI)
        ArtifactPreviewPanel.tsx
        ChatWorkspace.tsx
        Inspector.tsx
        Layout.tsx
        DataTable.tsx
      routes/           # TanStack Router pages (13 routes)
      server/           # serverFn files (TanStack Start, when compatible)
  packages/core/        # Core runtime: agent, skills, workflows, db
  specs/                # Spec docs: architecture, design, user stories
  images/               # Concept diagrams
```

## Core Architecture

```
User → Chat (ai-elements Conversation + Message + PromptInput)
  → api.ts (fetch bridge)
    → API Server (apps/web/server/api.ts, port 8787)
      → @trading-pi/core
        → Pi Mono (Agent Runtime)
        → Skills (69 built-in, organized by category: market/research/browser/risk/execution/journal/airdrop)
        → Workflows (9 DAG workflows)
        → SQLite (persistence)

Side panels:
  → Inspector: Timeline + Skills + Risk + Runtime status
  → ArtifactPreviewPanel: Preview artifacts (Tabs: Markdown/HTML/Data/Meta)
```

## Environment

Copy `.env.example` to `.env` and fill in:

| Var | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | LLM provider key (required for live chat) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model id passed to the provider |
| `OPENAI_REASONING` | `false` | Enable reasoning for capable models (LongCat, o1, o3) |
| `TRADING_PI_THINKING_LEVEL` | `medium` | `off` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` |
| `TRADING_PI_TRADING_MODE` | `paper` | `mock` \| `paper` \| `live_guarded` |
| `TRADING_PI_DATA_DIR` | `.trading-pi` | Local SQLite + artifacts path |
| `TRADING_PI_API_PORT` | `8787` | API server port |
| `TRADING_PI_WEB_PORT` | `5173` | Vite dev server port |

Optional integrations (leave blank to disable): `EXA_API_KEY`, `TAVILY_API_KEY`, `JINA_API_KEY`, `COINMARKETCAP_API_KEY`, `FRED_API_KEY`, `COINMARKETCAL_API_KEY`, `AIO_SANDBOX_BASE_URL`. Telemetry: `LANGFUSE_*`.

## Development

```bash
npm run dev         # Start API (8787) + Vite (5173)
npm run check       # TypeScript check (zero errors target)
npm run test        # Vitest (10 core tests)
npm run build       # Build all packages
playwright-cli open http://localhost:5173/   # E2E browser testing
```

- PRs require CI green (vitest + tsc + build) before merge
- See .github/PULL_REQUEST_TEMPLATE.md for PR format

## Key Decisions

- **Single Agent Architecture** — Only TradingPiAgent, no multi-agent
- **Local-first** — SQLite + files, no cloud dependencies
- **Paper trading default** — Live requires explicit approval
- **AIO Sandbox** — Docker container for safe browser automation
- **MCP Hub** — stdio/SSE MCP client for Exa Search, etc.
- **Font system** — Inter (UI) + JetBrains Mono (code/numbers) per design.md
- **as any** — Allowed in api.ts bridge (external boundary), prohibited in core domain models

## Recording

Always record project process and results in project status documentation after each phase/session.
