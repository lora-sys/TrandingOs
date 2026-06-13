# Fact Memory — Trading Pi OS

## Frameworks
| Value | Source |
|-------|--------|
| React 19.2.7 | apps/web/package.json:43 |
| HeroUI v3.1.0 | apps/web/package.json:15 |
| Tailwind CSS v4.3.0 | apps/web/package.json:28 |
| shadcn/ui (tailwind.css) | apps/web/src/styles.css:4 |
| ai-elements (ai SDK v6.0.201) | apps/web/package.json:36 |

## Core Libraries
| Value | Source |
|-------|--------|
| @earendil-works/pi-agent-core@0.79.0 | packages/core/package.json:12 |
| @earendil-works/pi-ai@0.79.0 | packages/core/package.json:13 |
| TanStack React Router v1.170.15 | apps/web/package.json:31 |
| TanStack React Query v5.101.0 | apps/web/package.json:30 |
| TanStack React Virtual v3.14.2 | apps/web/package.json:34 |
| TanStack React Table v8.21.3 | apps/web/package.json:33 |
| CCXT 4.5.27 | packages/core/package.json:22 |
| node:sqlite (built-in) | apps/web/server/api.ts:1 |

## Architecture
| Fact | Source |
|------|--------|
| Single agent: TradingPiAgent | packages/core/src/agent/trading-pi-agent.ts:21 |
| HTTP API server on port 8787 | apps/web/server/api.ts:110 |
| OpenAI-compatible model (deepseek-v4-flash) | packages/core/src/ai/model.ts:6 |
| Agent uses Pi Mono Agent runtime | trading-pi-agent.ts:10-11 |
| DAG Workflow engine | packages/core/src/workflows/workflow-engine.ts |
| Skill registry with 52 built-in skills | packages/core/src/skills/default-skills.ts |
| Approval engine for risk gating | packages/core/src/approvals/approval-engine.ts |
| SQLite persistence via node:sqlite | apps/web/server/api.ts:15-16 |
| AIO Sandbox Docker for browser automation | (env config) |
| MCP Hub for Exa Search | (mcp-hub package) |

## Frontend Implementation Status
| Fact | Source |
|------|--------|
| ChatWorkspace uses manual HeroUI + TanStack Virtual (NOT ai-elements) | apps/web/src/components/ChatWorkspace.tsx:1-130 |
| ai-elements components ARE installed at components/ai-elements/ | apps/web/src/components/ai-elements/ |
| ai-elements: Conversation, Message, MessageResponse (Streamdown), Tool, Artifact, Confirmation, PromptInput available | ai-elements/*.tsx |
| ArtifactPreviewPanel uses HeroUI Tabs (NOT ai-elements Artifact) | ArtifactPreviewPanel.tsx |
| Inspector shows Timeline + Skills + Risk + Runtime | Inspector.tsx |
| Layout has sideNav with 13 routes + Inspector | Layout.tsx |
| ChatPage layout: ChatWorkspace + ArtifactPreviewPanel side by side | routes/ChatPage.tsx |
| API client bridges to localhost:8787 | apps/web/src/api.ts |

## Backend Implementation Status
| Fact | Source |
|------|--------|
| API routes: health, status, session/message, messages, skills, workflows, timeline, artifacts, approvals, journal, portfolio, trades, reviews | apps/web/server/api.ts:55-108 |
| agent.prompt() creates Pi Agent with model + tools | trading-pi-agent.ts:57-59 |
| Slash commands: /research, /plan, /review-day, /backtest, /browser, /evolve, /bootstrap-os | trading-pi-agent.ts:257-289 |
| Workflows: research, trade plan, review, backtest, browser, evolution, bootstrap | default-workflows.ts |
| Skills: market (ccxt, coingecko), research (exa, browser), risk, execution, journal, airdrop, paper trading | default-skills.ts |

## Conflicts (Doc vs Code)
| Doc Claim | Code Truth | Source |
|-----------|-----------|--------|
| "ai-elements chat UI" (frontend-spec.md) | Manual HeroUI + Virtual — NOT ai-elements | ChatWorkspace.tsx |
| "Rich artifact preview with ai-elements" (frontend-spec.md) | HeroUI Tabs — NOT ai-elements Artifact | ArtifactPreviewPanel.tsx |
| "Full conversation with tool calls, approvals" (userstory.md) | Flat feed — no tool call visualization, no approval UI | ChatWorkspace.tsx |