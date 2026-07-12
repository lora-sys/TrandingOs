---
name: trading-pi-agent
version: 0.1.0-draft
status: audit-pending
last_updated: 2026-07-12
audit_ref: docs/evidence/audit-2026-07-12/
---

# Agent Contract — Trading Pi Agent

> Built per `$build-agent-app` template. **agent = model + harness**.
> Implementation gaps tracked in `audit-2026-07-12.md`.

## Role

Trading Pi Agent is the single user-facing agent in a local-first personal trading operating system. It interprets user intent expressed in natural language or slash commands, routes work to domain workflows and sub-agents, and produces traceable artifacts.

## Goal

When the user is done, they have:
1. A traceable record (timeline + artifacts) of what was decided, researched, planned, traded, and learned.
2. The agent never placed or prepared a real-money trade without explicit approval.
3. Every market source claim is verifiable against observed tool results in the current run.

## Constraints (must never violate)

- **Single agent surface.** No multi-agent fan-out from chat. Sub-agents are workflow wrappers, not peers.
- **No autonomous money movement.** Live trading requires explicit user approval per action. Paper trading is the default.
- **No fabrication.** Never claim a market source, tool, workflow, or integration is online unless it succeeded in the current run. If not checked, say "available as capability, not online."
- **Trace everything.** Every prompt, tool call, sub-agent spawn, and artifact creation is recorded on the timeline.
- **Local-first.** All state persists to local SQLite; no required cloud services. External APIs are best-effort.

## Tools (skills surfaced as Pi tools)

The agent has access to ~66 registered skills, grouped by category:

| Category | Count | Examples |
|---|---|---|
| `market.*` | ~12 | `market.coingecko.quote`, `market.ccxt.ticker`, `market.polymarket.markets` |
| `search.*` | ~5 | `search.query` (Exa/Tavily/Jina) |
| `academic.*` | ~4 | `academic.semanticscholar`, `academic.crossref`, `academic.openalex`, `academic.arxiv` |
| `community.*` | ~3 | `community.reddit.search`, `community.reddit.fetch` |
| `events.*` | ~3 | `events.fred`, `events.coinmarketcal` |
| `browser.*` | ~5 | `browser.action` (AIO Sandbox) |
| `decision.*` / `journal.*` / `workspace.*` / `artifact.*` / `review.*` | ~20 | CRUD + lifecycle |
| `evolution.*` | ~3 | Rule suggestion, application |
| `paper-trade.*` | ~5 | Lifecycle actions |
| `mcp.*` | ~6 | Server management, tool routing |

Each skill declares: input schema (TypeBox), output schema, `riskLevel: low|medium|high|critical`, side-effects. Skills with `riskLevel >= high` trigger approval gate.

## Workflows (composed tasks)

13 registered workflows. Slash command → workflow mapping:

| Slash | Workflow | Required input |
|---|---|---|
| `/research <symbol>` | `research.asset` | symbol |
| `/plan <symbol> [budget] [direction]` | `trade.plan` | symbol, budgetUsd, direction |
| `/review-day` | `review.daily` | period |
| `/backtest <name> [symbol] [timeframe]` | `strategy.backtest` | name, symbol, timeframe |
| `/browser <action> [args]` | `browser.evidence` | action |
| `/evolve [focus]` | `evolution.propose` | focus |
| `/bootstrap-os` | `os.bootstrap` | — |
| _(none)_ | `chat.respond`, `market.snapshot`, `alpha.radar.scan`, `deep.research`, `paper.trade.lifecycle`, `review.workspace` | varies |

## Output (per turn)

```ts
{
  sessionId: string;
  messages: AgentMessage[];
  text: string;
  workflowResult?: { runId: string; output: unknown };
}
```

UI receives via SSE: agent events (`message_update`, `message_end`, `tool_use`, `tool_result`, `pi.*`), sub-agent events (`subagents:*`), artifact events.

## Sub-agents (workflow wrappers, not peers)

| Name | Default mode | Workflow | Description |
|---|---|---|---|
| `deep-research` | foreground | `deep.research` | 7-phase research pipeline |
| `alpha-radar` | background | `alpha.radar.scan` | Continuous opportunity scanner |
| `review` | foreground | `review.workspace` | 7-section review report |
| `evolution` | background | `evolution.propose` | Pattern → rule suggestions |
| `paper-trade` | foreground | `paper.trade.lifecycle` | Execute/monitor/close trades |

Each sub-agent loads definition from `packages/core/src/agents/<name>.md` (frontmatter overrides fallback).

## Harness Contract

See `docs/agent-spec/harness-checklist.md`.