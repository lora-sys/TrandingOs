# Core Package (`packages/core`)

**Status**: Canonical (reference `docs/ARCHITECTURE.md` for full system view)

## What's Here
The core runtime package containing:

- **TradingPiAgent**: Single agent class wrapping Pi Mono runtime
- **SkillRegistry**: Skill loading, conversion to Pi tools, registration
- **WorkflowEngine**: DAG-based workflow execution
- **ArtifactEngine**: Artifact storage, versioning, preview
- **ApprovalEngine**: Permission-based action gating
- **TradingPiDatabase**: SQLite database wrapper with migrations
- **Repositories**: Data access layer for all SQLite tables
- **Domain Models**: Market, risk, execution, workspace, evolution types
- **Default Skills**: 40+ skills across market, search, browser, risk, research, journal, memory, workspace, MCP, strategy, backtest, evolution, review, execution, approval, marketplace, airdrop
- **Default Workflows**: 9 DAG workflows (research, trade.plan, review.daily, strategy.backtest, evolution.propose, browser.evidence, os.bootstrap, mcp.discover, airdrop.search)

## Key Files
| File | Purpose |
|------|---------|
| `src/agent/trading-pi-agent.ts` | Agent class |
| `src/skills/default-skills.ts` | All registered skills |
| `src/workflows/default-workflows.ts` | All registered workflows |
| `src/db/database.ts` | SQLite setup + migrations |
| `src/engine/*` | ArtifactEngine, ApprovalEngine, WorkflowEngine |

## Reference
See `docs/ARCHITECTURE.md` for full system architecture.
