# core-spec.md

# Trading Pi Core Spec v4.1

## 1. Product Definition

Trading Pi is a personal trading operating system for beginner-to-intermediate Web3 traders.

It helps users:

- observe markets
- research assets and airdrops
- generate trade plans
- run paper trades
- manage risk
- journal decisions
- review mistakes
- evolve strategies
- create reusable skills over time

Trading Pi is not a profit-guarantee bot.

Trading Pi is a decision-support, education, execution-visibility, and review system.

## 2. Architecture Rule

The system must use Single Agent Architecture.

Only one agent exists:

```txt
Trading Pi Agent
```

All specialized capabilities must be implemented as:

- Workflows
- Skills
- Engines
- Services
- Artifacts

Do not implement a multi-agent swarm.

## 3. Trading Pi Agent Responsibilities

Trading Pi Agent is responsible for:

1. Understanding user intent.
2. Selecting the correct workflow.
3. Calling the workflow engine.
4. Passing context and user preferences.
5. Receiving execution events.
6. Generating user-facing summaries.
7. Requesting approval for risky actions.
8. Creating or linking artifacts.
9. Updating memory and journal.
10. Triggering review/evolution workflows.

## 4. Core Data Flow

```txt
User Message
  ↓
Trading Pi Agent
  ↓
Intent Parser
  ↓
Planner
  ↓
Workflow Engine
  ↓
Skill Registry
  ↓
Skill Execution / MCP / Sandbox
  ↓
Artifact Engine
  ↓
Execution Timeline
  ↓
Frontend Preview
  ↓
Journal / Memory / Review
```

## 5. Default Trading Modes

```yaml
trading_modes:
  mock:
    description: fake local data and fake orders
    default_for_dev: true
  paper:
    description: simulated trading using real market data
    default_for_user: true
  live_guarded:
    description: real exchange order after risk check and explicit approval
    default_enabled: false
```

Live trading must never be enabled by default.

## 6. Hard Constraints

- No hardcoded AI responses.
- No direct exchange calls from UI.
- No direct browser automation outside AIO Sandbox.
- No real order without Risk Engine approval.
- No real order without user approval.
- No API key in logs or artifacts.
- Every workflow run must produce execution events.
- Every key result must produce an artifact.
