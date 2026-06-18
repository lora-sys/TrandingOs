# Agent Collaboration Rules

## Project
Trading Pi OS — Single Agent Architecture

## Roles
- main: TradingPiAgent — the only agent, handles all user interaction
- assistant: Claude Code (AI assistant) — implements features, runs alignment loop

## Conflict Resolution
1. CLAUDE.md wins
2. spec.md second
3. User decision final

## AI Permissions
- Commit: allowed (with user approval)
- Push: forbidden (user handles deployment)
- npm install/test: allowed
- File editing: allowed
- Branch management: allowed (with user approval)

---

# Module Documentation Index

> Each core module has a `MODULE.md` in its source directory with detailed interface-level documentation.
> **Read the relevant MODULE.md before modifying any module's code.**
>
> **Domain terminology is defined in [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md).** All agents MUST use canonical terms from this glossary — no synonyms, no ambiguity.

## Living Documentation (增量更新契约)

> 本项目的文档是**活文档**：代码变更时必须同步更新对应文档。以下是变更→更新的映射表。

### 变更类型 → 需更新的文件

| 你改了什么 | 必须更新 | 可选更新 |
|-----------|---------|---------|
| **新增/修改/删除 Type/Interface** | 对应模块的 `MODULE.md`（Core Types 段） | UBIQUITOUS_LANGUAGE.md（如果涉及新领域术语） |
| **新增/修改/删除 类方法或函数签名** | 对应模块的 `MODULE.md`（Key Classes / API Methods 段） | — |
| **新增 Skill** | `skills/MODULE.md`（Default Skills 清单 + How to Add 指南如有通用模式变化） | AGENTS.md（如影响架构分层图） |
| **新增 Workflow** | `workflows/MODULE.md`（Default Workflows 清单） | AGENTS.md（Data Flow 段，如影响主链路） |
| **新增 Sub-Agent** | `agent/MODULE.md`（Agent Definitions 段 + Extension Points） | — |
| **新增 DB 表或列** | `infrastructure/MODULE.md`（Schema 段）+ 对应模块 MODULE.md（如该模块拥有新表） | docs/ARCHITECTURE.md（§10 Database Schema） |
| **修改模块间依赖关系** | 两个模块的 `MODULE.md`（Dependencies In/Out 段） | AGENTS.md（Module Quick Reference 表 / Data Flow 图） |
| **引入新的外部集成** | `integrations/MODULE.md` | — |
| **修改领域概念或命名** | **UBIQUITOUS_LANGUAGE.md**（首要！）+ 所有引用该术语的 MODULE.md | CLAUDE.md（如影响全局决策） |
| **修改 File Conventions** | AGENTS.md（File Conventions 表） | — |

### 增量更新原则

1. **最小改动** — 只更新变更涉及的段落，不重写整个文件
2. **保持同步** — 如果 MODULE.md 里的接口签名和代码不一致，以代码为准，但必须在同一 commit 内修正 MODULE.md
3. **术语一致性** — 任何新引入的领域名词，先查 UBIQUITOUS_LANGUAGE.md；如果没有，先添加到 glossary 再使用
4. **Commit 时自检** — commit message 中涉及的模块，其 MODULE.md 必须已同步更新

## Architecture Layers (top → bottom)

```
┌─────────────────────────────────────────────────────┐
│  User Interface (apps/web/)                         │
│  → See docs/FRONTEND.md + apps/web/design.md       │
├─────────────────────────────────────────────────────┤
│  Agent System          → agent/MODULE.md            │
│  ├─ TradingPiAgent    (core entry point)            │
│  └─ Sub-Agents        (5 workflow wrappers)         │
├─────────────────────────────────────────────────────┤
│  Execution Engine                                       │
│  ├─ Skills System      → skills/MODULE.md           │
│  ├─ Workflow Engine    → workflows/MODULE.md         │
│  └─ Guardrails         → guardrails/MODULE.md       │
│     (Approval Engine + Artifact Engine)               │
├─────────────────────────────────────────────────────┤
│  Domain Modules                                         │
│  ├─ Memory             → memory/MODULE.md            │
│  ├─ Journal+Strategy   → src/MODULE.md              │
│  ├─ Research           → research/MODULE.md          │
│  ├─ Alpha Radar        → alpha/MODULE.md             │
│  ├─ Market Data        → market/MODULE.md            │
│  └─ (Decision/PaperTrade/Review/Evolution)          │
│     → embedded in workflows/ + repos                │
├─────────────────────────────────────────────────────┤
│  Infrastructure                                        │
│  ├─ DB+Sessions+Events → infrastructure/MODULE.md    │
│  └─ Config+AI+Telemetry→ runtime/MODULE.md           │
├─────────────────────────────────────────────────────┤
│  External Integrations → integrations/MODULE.md      │
│  Browser / MCP / Search / Academic / Community / Reach│
└─────────────────────────────────────────────────────┘
```

## Module Quick Reference

| # | Module | Path | Key Exports | Primary Consumer |
|---|--------|------|-------------|------------------|
| 1 | **Agent System** | [agent/MODULE.md](packages/core/src/agent/MODULE.md) | `TradingPiAgent`, `SubAgentSession`, `AgentDefinition` | API Server (`api.ts`) |
| 2 | **Skills System** | [skills/MODULE.md](packages/core/src/skills/MODULE.md) | `TradingSkill`, `SkillRegistry`, `toPiTool()` | Workflow Engine, Agent |
| 3 | **Workflow Engine** | [workflows/MODULE.md](packages/core/src/workflows/MODULE.md) | `WorkflowEngine`, `TradingWorkflow`, 13 default workflows | Agent, Sub-Agents |
| 4 | **Memory** | [memory/MODULE.md](packages/core/src/memory/MODULE.md) | `MemoryStore`, `MemoryRecord`, `MemoryDomain` | Agent (prompt injection), Workflows |
| 5 | **Journal + Strategy** | [src/MODULE.md](packages/core/src/MODULE.md) | `JournalEntryInput`, `StrategyDefinition`, `scoreStrategy()` | paper.trade.lifecycle, review.* |
| 6 | **Research** | [research/MODULE.md](packages/core/src/research/MODULE.md) | `runDeepResearch()`, `ResearchReport`, `ResearchBundle` | deep.research workflow, research.asset |
| 7 | **Alpha Radar** | [alpha/MODULE.md](packages/core/src/alpha/MODULE.md) | `AlphaSignal`, `alphaCategory()`, `formatUsd()` | alpha.radar.scan workflow, Dashboard |
| 8 | **Market Data** | [market/MODULE.md](packages/core/src/market/MODULE.md) | CCXT/CoinGecko/Polymarket fetchers | market.*, trade.plan, research workflows |
| 9 | **Guardrails** (Approval + Artifacts) | [guardrails/MODULE.md](packages/core/src/guardrails/MODULE.md) | `ApprovalEngine`, `ArtifactEngine` | Agent.beforeToolCall(), all workflows |
| 10 | **Infrastructure** (DB/Sessions/Events) | [infrastructure/MODULE.md](packages/core/src/infrastructure/MODULE.md) | `TradingPiDatabase`, `Repositories`, `SessionStore`, PubSub | All modules |
| 11 | **Runtime** (Config/AI/Telemetry) | [runtime/MODULE.md](packages/core/src/runtime/MODULE.md) | `TradingPiEnv`, `createTradingPiModel()`, Langfuse | Agent init, API server |
| 12 | **External Integrations** | [integrations/MODULE.md](packages/integrations/MODULE.md) | Browser Layer, MCP Hub, Search Hub, Academic, Reddit, Xueqiu | Various skills |

## Cross-Module Data Flow (Key Paths)

### Decision Lifecycle Path
```
Workspace → Decision (repos.createDecision)
  → Paper Trade (repos.createPaperTrade)     [trade.plan → paper.trade.lifecycle]
  → Journal Entry (on settlement)              [auto-generated]
  → Review (review.workspace/review.daily)     [aggregates settled decisions + journals]
  → Evolution Suggestion                      [generated by review, proposes user rules]
```

### Research Path
```
User triggers Deep Research
  → deep.research workflow spawns Sub-Agent
  → runDeepResearch(): 7-step pipeline
    1. Decompose topic
    2. Web search (search-hub)
    3. Academic search (academic/)
    4. Community sentiment (community/reddit)
    5. Market data (market/polymarket + coingecko)
    6. Cross-reference analysis
    7. Synthesize report (AI or builtin)
  → Artifact created (research-report type)
  → Linked to Workspace
  → Memory written (domain: research)
```

### Alpha Radar Path
```
Dashboard mount / timer trigger
  → alpha.radar.scan workflow (background)
  → Polymarket markets + News + Reddit + FRED/CoinMarketCal events
  → Score & rank Top5 Alpha Signals
  → Cache (5min TTL) + Memory write (domain: alpha)
  → SSE → Frontend AlphaRadarCard components
```

---

# Development Guidelines for Agents

## Before You Code

1. **Check [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md) first** — identify all domain terms you'll use; if a term is missing, add it before coding
2. **Read the relevant MODULE.md(s)** for every module you will modify
3. **Read CLAUDE.md** for tech stack, project structure, and key decisions
4. **Check docs/ARCHITECTURE.md** for system-wide context if changing boundaries
5. **确认增量更新范围** — 对照上方的「变更类型 → 需更新的文件」表，列出本次要同步更新的文档

## When Adding a New Feature

1. Determine which module(s) own the feature domain
2. If new Skill needed: follow `skills/MODULE.md` "How to Add a New Skill" guide
3. If new Workflow needed: follow `workflows/MODULE.md` "How to Add a New Workflow" guide
4. If new Sub-Agent needed: follow `agent/MODULE.md` "Extension Points" guide
5. If new DB table needed: add to `database.ts` migrate() + update Repositories
6. Update relevant MODULE.md after implementation

## When Modifying Existing Code

1. Read the target module's MODULE.md first
2. Check what depends on the code you're changing (use `Dependencies In/Out` section)
3. Run `npm run check` (TypeScript) before and after
4. Run `npm run test` (Vitest) to verify no regressions
5. Update the module's MODULE.md if interfaces change

## File Conventions

| Convention | Rule |
|-----------|------|
| Type definitions | Export from `types.ts` or inline in module file |
| Barrel exports | `index.ts` re-exports public API |
| Module docs | `MODULE.md` co-located with source |
| Error handling | Try/catch at skill boundary; return error objects, don't crash |
| DB migrations | Use `addColumnIfMissing()` for backward compatibility |
| Memory writes | Always include domain, workspaceId, sourceType, importance |
| Timeline events | Create for every skill/workflow execution step |
| Artifacts | Create via ArtifactEngine.create() — never write files directly |

## Canonical References (优先级顺序)

> **术语权威**：所有文档和代码中的领域名词以 [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md) 为准。发现歧义时先更新此文件。

1. **[UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md)** — 领域统一语言词汇表（术语权威，变更代码前必查）
2. **CLAUDE.md** — Project-level rules and architecture summary
3. **docs/ARCHITECTURE.md** — Full system architecture (v5.0)
4. **specs/specs/mvp-decision-workspace/spec.md** — Current MVP spec
5. **Module MODULE.md files** — Per-module detailed reference (见上方 Module Quick Reference)
6. **docs/WORKFLOWS.md** — Development workflow conventions
7. **docs/adr/** — Architecture Decision Records
