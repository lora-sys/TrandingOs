# Ubiquitous Language — Trading Pi OS

## Core Actors

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **User** | The human trader who interacts with Trading Pi OS via chat | Trader, operator, end-user |
| **TradingPiAgent** | The single core agent — routes user input to workflows, manages session lifecycle, streams events | Main agent, Pi Agent, orchestrator, "the agent" |
| **Sub-Agent** | A workflow-backed execution wrapper (not an autonomous agent) — runs a known workflow with lifecycle events | Worker, child agent, background task, specialist |

## Workspace & Session

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Workspace** | A research topic container — the central organizational unit holding decisions, trades, journals, reviews, and artifacts | Project, folder, board, notebook |
| **Session** | A conversation context with message history, persisted as JSONL + SQLite metadata | Chat, conversation thread, dialog |

## Decision Lifecycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Decision** (or DecisionCard) | A structured thinking record capturing direction, position size, confidence grade (A+–F), risk level (A–D), thesis, supporting/against reasons, and invalidation criteria | Trade idea, bet, pick, prediction |
| **Paper Trade** | A simulated execution of a Decision — tracks entry/exit price, P&L, and settlement within a Workspace | Simulated trade, fake trade, virtual order, paper order |
| **Journal Entry** | A behavioral log linked to a Decision or Paper Trade — records mood, discipline score (0–100), violated rules, notes, and optional screenshot | Trade log, diary entry, reflection, post-mortem note |
| **Review** (or ReviewReport) | A 7-section post-settlement analysis (overview, trade analyses, errors, suggestions, emotion, rules, history) generated from settled Decisions, Journal Entries, and User Rules | Performance report, scorecard, retrospective,复盘 report |
| **Evolution Suggestion** | An improvement proposal generated from Review patterns — includes title, description, category, priority, and proposed Rule text | Improvement, rule proposal, optimization, insight |

## Research & Intelligence

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Deep Research** | An autonomous multi-step sub-agent workflow (7 steps: decompose → web search → academic → community → market → analyze → synthesize) producing a structured Research Report | Auto-research, AI research, autonomous study |
| **Research Bundle** | A composite of research sources (market snapshot, search results, browser evidence, memory context) assembled for a symbol/topic | Research context, intel package, info bundle |
| **Research Report** | The structured artifact output of Deep Research — contains executive summary, key findings per source, data source summary, and conclusion | Deep research output, findings document |
| **Alpha Signal** | A time-sensitive opportunity discovered by Alpha Radar — includes category (sports/politics/crypto/macro/entertainment), current value, volume, risk rating (1–4 stars), and reasoning | Opportunity, signal, pick, alpha, alert |
| **Alpha Radar** | A background-scanning workflow that cross-references Polymarket markets, news feeds, Reddit sentiment, and calendar events to produce Top5 Alpha Signals | Scanner, opportunity finder, market watcher |

## Execution Engine

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Skill** | The atomic capability unit — has id, name, risk level, permission level, TypeBox parameters, and execute() function | Tool, action, command, capability |
| **Workflow** | A DAG that orchestrates one or more Skills into a multi-step process with risk level and typed input/output | Pipeline, process, job, flow |
| **Artifact** | A persistent, versioned generated output (markdown file + DB row) — types include research-report, trade-plan, risk-report, market-snapshot, daily-review, workspace-review, backtest-report, os-bootstrap | Output, result, file, document, product |
| **Approval Gate** (or Approval) | A permission checkpoint — blocks dangerous or high-risk Skill executions until the User grants explicit approval | Permission, authorization, safety check, guard |
| **Timeline Event** | An immutable audit record of every agent/tool/workflow execution step — used for inspection and debugging | Log entry, audit trail, event record, trace |

## Persistence & Memory

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Memory Record** | A long-term knowledge entry scoped by domain (conversation/market/trade/review/skill/workspace/research/strategy/alpha/user_rules/evolution) and workspace | Fact, memory entry, knowledge item, stored fact |
| **Strategy** | A parameterized trading approach definition with name, version, parameters, status (draft/testing/verified/deprecated), and computed score (0–100) | Trading strategy, approach, system, method |
| **Evolution Proposal** | A guarded strategy improvement proposal with status tracking and optional approval gate | Strategy tweak, proposal, evolution item |

## Market Data

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Symbol** | A traded asset identifier — e.g., `ETH/USDT` (crypto spot) or a Polymarket condition ID (prediction market) | Ticker, asset, instrument, pair, market |
| **OHLCV** | Open-High-Low-Close-Volume candle data for a Symbol at a given timeframe | Candle, K-line, bar, OHLC |
| **Market Snapshot** | An Artifact combining CoinGecko quote + CCXT ticker data for a Symbol | Price data, quote, market data, ticker |

## Risk & Discipline

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Risk Level** | A 4-grade classification: low / medium / high / critical — attached to Skills, Workflows, and Decisions | Danger level, severity, risk grade |
| **Permission Level** | A 3-grade access tier: read / write / dangerous — controls what a Skill can do | Access level, privilege, capability tier |
| **Discipline Score** | A 0–100 behavioral rating recorded per Journal Entry — measures rule adherence and emotional control | Behavior score, discipline rating, compliance score |
| **User Rule** | A personal trading constraint stored in Memory (domain: user_rules) — e.g., "max position size 1% when discipline < 70" | Rule, constraint, personal rule, trading rule |
| **Invalidation Criteria** | The pre-defined condition that would prove a Decision wrong — recorded on each DecisionCard | Stop condition, exit criteria, wrongness threshold, kill zone |

## Relationships

- A **User** interacts with exactly one **TradingPiAgent** per **Session**
- A **TradingPiAgent** spawns zero or more **Sub-Agents**, each running exactly one **Workflow**
- A **Workspace** contains many **Decisions**, **Paper Trades**, **Journal Entries**, **Reviews**, **Artifacts**, and **Research Sessions**
- A **Decision** (once confirmed) produces exactly one **Paper Trade**
- A **Paper Trade** produces at most one **Journal Entry** upon settlement
- Settled **Decisions** (and their **Journal Entries**) feed into a **Review**
- A **Review** generates zero or more **Evolution Suggestions** (each may propose a **User Rule**)
- Every **Workflow** is composed of one or more **Skill** executions
- Each **Skill** execution optionally produces an **Artifact** and/or writes a **Memory Record**
- Every **Artifact** is linked to exactly one **Workspace** (optionally also a **Session**)
- **Alpha Radar** produces **Alpha Signals**; each Signal links to a **Workspace** (new or existing)
- **Deep Research** (a **Sub-Agent**) runs within a **Workspace** and produces a **Research Report** **Artifact**
- An **Approval Gate** can block any **Skill** with `riskLevel ≥ high` or `permission = dangerous`

## Status Enumerations

| Entity | Valid Statuses |
|--------|---------------|
| **Decision** | pending → executed → settled_win / settled_loss / invalidated / expired |
| **Paper Trade** | open → settled (via close/settle actions) |
| **Sub-Agent** | queued → running / background → completed / failed / cancelled |
| **Workflow Run** | running → completed / failed / blocked |
| **Skill Run** | running → completed / failed / blocked |
| **Approval** | pending → approved / denied |
| **Strategy** | draft → testing → verified → deprecated |
| **Research Session** | running → completed / failed / cancelled |

## Example Dialogue

> **Dev:** "When a **User** confirms a **DecisionCard** in the **Workspace** **Decisions tab**, does it automatically create a **Paper Trade**?"
>
> **Domain Expert:** "Not automatically. The **Decision** is saved with status `pending`. The User must explicitly click 'Execute (Paper)' to create the **Paper Trade**. This is intentional — the system is a **structured thinking framework**, not an auto-trader."
>
> **Dev:** "So the **Paper Trade** is what generates the **Journal Entry**?"
>
> **Domain Expert:** "The **Journal Entry** is created when the **Paper Trade** is **settled** (closed with an exit price). It captures mood, **discipline score**, and any **user rules** that were violated during the trade's lifetime. That **Journal Entry** then becomes input for the next **Review**."
>
> **Dev:** "And the **Review** feeds into **Evolution**?"
>
> **Domain Expert:** "Exactly. A **Review** analyzes settled **Decisions**, **Journal Entries**, and **User Rules** to produce **Evolution Suggestions**. Each suggestion can be adopted as a new **User Rule**, which future **DecisionCards** will check for compliance. That's the improvement loop."

## Flagged Ambiguities

- **"Trade" is overloaded** — it means three distinct things: (1) the act of trading (verb), (2) a `trades` table row representing a filled order (legacy), (3) the conceptual domain of trading activity. Prefer **Paper Trade** for simulated Decision executions and **filled Order** for legacy trade rows. The `trades` table appears to be a pre-MVP legacy structure; new decision-centric code uses `paper_trades` instead.
- **"Signal" has two meanings** — **Alpha Signal** (an opportunity from Alpha Radar) vs. **journal signal** (mentioned in journal.ts doc as a dimension). In practice, only **Alpha Signal** is actively used. Use **Alpha Signal** for radar output; avoid bare "signal" alone.
- **"Review" is scope-ambiguous** — `review.daily` **Workflow** produces a daily summary, while `review.workspace` **Workflow** produces the full 7-section **ReviewReport**. Always qualify: "**Daily Review**" vs. "**Workspace Review**".
- **"Agent" vs "Sub-Agent"** — **TradingPiAgent** is the real agent (has LLM, tools, streaming). **Sub-Agents** are not independent agents — they are workflow execution wrappers with lifecycle events. Never refer to sub-agents as autonomous agents.
- **Decision status divergence** — The spec (`spec.md`) uses `settled_win` / `settled_loss`, while the database schema allows free-text status. Code paths (e.g., `review.workspace` workflow) filter by `settled_win OR settled_loss`. Treat these two as the canonical settled statuses.
- **"Session" dual meaning** — Can mean a chat **Session** (messages + JSONL) OR a **Research Session** (deep-research tracking table). Qualify as "**Chat Session**" vs "**Research Session**" when context is ambiguous.
