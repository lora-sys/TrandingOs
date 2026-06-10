# workflow-spec.md

# Workflow Spec v4.1

## 1. Definition

Workflow is a structured DAG of steps.

It is not an agent.

Each workflow step may call:

- skill
- sub-workflow
- artifact creation
- approval request
- condition/check

## 2. Workflow Manifest

```yaml
id: trading.trade_plan
name: Trade Planner
version: 1.0.0
inputs:
  symbol:
    type: string
  budget:
    type: number
steps:
  - id: market
    type: skill
    uses: market.fetch_ohlcv
  - id: research
    type: workflow
    uses: research.investment_committee
  - id: risk
    type: skill
    uses: risk.trade_permission
  - id: artifact
    type: artifact
    uses: artifact.create_trade_plan
outputs:
  - trade_plan
approvals:
  - live_order
```

## 3. Built-in Workflows

### research.investment_committee

Stages:

- bull case
- bear case
- technical case
- risk case
- debate
- final report

### trading.trade_plan

Stages:

- market snapshot
- research summary
- strategy signal
- risk validation
- trade plan artifact
- approval card

### review.daily

Stages:

- load trades
- load journal
- compute metrics
- detect mistakes
- generate review artifact

### evolution.strategy_patch

Stages:

- read review
- propose patch
- backtest patch
- compare metrics
- approval
- apply or rollback

### airdrop.learning

Stages:

- search airdrop
- verify official source
- scam risk check
- eligibility checklist
- step-by-step guide artifact

## 4. Workflow Acceptance Criteria

- Workflow emits events.
- Workflow calls only registered skills.
- Workflow outputs artifacts.
- Failed node is visible.
- Dangerous node requires approval.
