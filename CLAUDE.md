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

## Development

```bash
npm run dev         # Start API (8787) + Vite (5173)
npm run check       # TypeScript check (zero errors target)
npm run test        # Vitest (10 core tests)
npm run build       # Build all packages
playwright-cli open http://localhost:5173/   # E2E browser testing
```

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
