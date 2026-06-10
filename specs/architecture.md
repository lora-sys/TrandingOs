# architecture.md

# Trading Pi Architecture v4.1

## 1. System Overview

```txt
Clients
  - Trading Pi Web
  - CLI
  - Webhook/API

Backend
  - API Gateway
  - Trading Pi Agent Service
  - Workflow Engine
  - Skill Registry
  - Execution Engine
  - Artifact Engine
  - MCP Hub
  - AIO Sandbox Gateway
  - Memory Engine
  - Research Hub
  - Strategy Engine
  - Review Engine
  - Evolution Engine
  - Adaptive Skill Factory

Infrastructure
  - PostgreSQL / SQLite
  - Redis
  - ChromaDB
  - S3 / MinIO
  - Docker
```

## 2. Runtime Layers

### User Layer

- Chat input
- Slash commands
- Workspace navigation
- Approval actions
- Artifact preview

### Agent Layer

- Single Trading Pi Agent
- Intent parsing
- Planning
- Workflow routing
- Summary generation

### Workflow Layer

- Investment Committee Workflow
- Trade Planner Workflow
- Daily Review Workflow
- Evolution Workflow
- Airdrop Learning Workflow
- Skill Creator Workflow

### Skill Layer

- Market skills
- Research skills
- Browser skills
- Risk skills
- Journal skills
- Trading skills
- Backtest skills
- Onchain skills

### Tool / MCP Layer

- Exa MCP
- Jina Reader
- Tavily
- CCXT
- DefiLlama
- DexScreener
- GeckoTerminal
- AIO Sandbox Browser

### Engine Layer

- Artifact Engine
- Memory Engine
- Review Engine
- Evolution Engine
- Strategy Engine
- Permission Engine
- Config Engine

## 3. Module Boundaries

Trading Pi Agent does not contain business logic directly. It routes to workflows and summarizes.

Workflow Engine runs workflow DAGs and emits events.

Skill Registry loads skill manifests and validates permissions.

AIO Sandbox runs untrusted browser/code/backtest operations.

MCP Hub manages external MCP tools, health checks, permissions, and discovery.

Artifact Engine stores, versions, previews, and exports generated outputs.

## 4. Recommended Monorepo

```txt
apps/
  web/
  api/
  worker/
  sandbox-gateway/

packages/
  pi-core/
  workflow-engine/
  skill-sdk/
  skill-registry/
  execution-engine/
  artifact-engine/
  mcp-hub/
  browser-layer/
  search-hub/
  memory-engine/
  research-hub/
  strategy-engine/
  review-engine/
  evolution-engine/
  adaptive-skill-factory/
  permission-engine/
  config-engine/
  shared/

skills/
  market/
  research/
  browser/
  indicators/
  risk/
  execution/
  journal/
  review/
  evolution/
  onchain/
  airdrop/

workflows/
  research/
  trading/
  review/
  evolution/
  learning/
  airdrop/

docs/
  specs/
  decisions/
  progress/
```
