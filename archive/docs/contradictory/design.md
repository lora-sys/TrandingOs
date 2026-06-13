# design.md

# Trading Pi UI & Agent Design Spec

Version: v1.0  
Scope: UI Design + Agent Capability Boundary  
Product: Trading Pi — Personal Trading Operating System

---

## 1. Product Positioning

Trading Pi is not a pure chat assistant.

Trading Pi is an executable agent system for personal trading research, planning, review, and controlled execution.

The chat interface is only the entry point.

The real system includes:

- Agent runtime
- Skills
- Workflow Library
- Execution Timeline
- Artifact System
- Risk Engine
- Review Engine
- Evolution Engine
- Paper Trading / Guarded Real Trading

---

## 2. UI Design Direction

### 2.1 Overall Style

Use a dark, technical, professional trading interface.

Keywords:

- Dark mode first
- High information density
- Trading cockpit
- Agent execution visibility
- Neon accent but not noisy
- Professional, not toy-like

The UI should feel like:

- Pi Web chat
- TradingView dashboard
- Cursor / Claude Code execution UI
- Modern crypto trading terminal

---

## 3. Frontend Stack

Core reuse:

- Pi Web core chat experience
- Pi runtime integration

Frontend enhancement:

- React
- TypeScript
- Tailwind CSS
- Hero UI
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- TanStack Virtual
- Zustand if local UI state is needed
- Framer Motion for subtle interaction
- TradingView Widget / lightweight-charts / Recharts / ECharts

---

## 4. Font System

### Recommended Fonts

Primary UI font:

- Inter

Chinese fallback:

- Noto Sans SC
- PingFang SC
- Microsoft YaHei

Monospace / code / command font:

- JetBrains Mono
- Fira Code

### Font Usage

| Area | Font | Size |
|---|---|---|
| Page Title | Inter / Noto Sans SC Bold | 24–32px |
| Section Title | Inter / Noto Sans SC SemiBold | 18–22px |
| Body Text | Inter / Noto Sans SC Regular | 14–16px |
| Small Labels | Inter / Noto Sans SC Medium | 12–13px |
| Code / Command | JetBrains Mono | 13–14px |
| Table Numbers | JetBrains Mono | 13–14px |

### Font Rule

Numbers in trading panels should use monospace font for alignment.

Examples:

- price
- PnL
- position size
- order quantity
- percentage
- timestamps

---

## 5. Color System

### Base Colors

```txt
background.primary:   #070B14
background.secondary: #0B1020
background.card:      #111827
background.panel:     #0F172A
border.default:       #1E293B
text.primary:         #F8FAFC
text.secondary:       #CBD5E1
text.muted:           #64748B
```

### Accent Colors

```txt
accent.primary:   #7C3AED  // purple
accent.secondary: #06B6D4  // cyan
accent.success:   #22C55E
accent.warning:   #F59E0B
accent.danger:    #EF4444
accent.info:      #3B82F6
```

### Trading Colors

```txt
price.up:     #22C55E
price.down:   #EF4444
price.flat:   #94A3B8
risk.low:     #22C55E
risk.medium:  #F59E0B
risk.high:    #EF4444
```

---

## 6. Layout

### 6.1 Main Trading Workspace

```txt
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: Workspace / Market Status / Risk / User            │
├───────────────┬───────────────────────────┬─────────────────┤
│ Left Sidebar  │ Center Area               │ Right Inspector │
│               │                           │                 │
│ Workspaces    │ Chat / Artifacts          │ Execution       │
│ Market        │ Reports / Charts          │ Active Skills   │
│ Research      │ Trade Plan                │ MCP Status      │
│ Portfolio     │ Review / Evolution        │ Sandbox Status  │
│ Journal       │                           │ Risk Status     │
│ Review        │                           │ Memory Status   │
│ Evolution     │                           │                 │
├───────────────┴───────────────────────────┴─────────────────┤
│ Composer: Natural Language + Slash Commands + Attachments    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Core Pages

### 7.1 Chat Workspace

Purpose:

Main interaction surface with Trading Pi.

Must include:

- message stream
- natural language input
- slash command suggestions
- artifact cards
- skill execution blocks
- approval cards
- inline charts/tables
- execution timeline binding

Example commands:

```txt
/plan ETH/USDT 100 spot
/research BTC ETF
/backtest ma_pullback ETH 1h
/review-day
/evolve strategy
```

---

### 7.2 Market Page

Purpose:

Market overview.

Components:

- watchlist
- quote cards
- K-line chart
- volume chart
- market heatmap
- exchange status
- trending tokens
- news/event feed

---

### 7.3 Trade Planner

Purpose:

Generate and inspect trade plans.

Components:

- symbol selector
- budget input
- direction selector
- risk panel
- entry/stop/take-profit fields
- AI generated trade plan
- approval card
- paper trading button
- real execution button disabled by default

---

### 7.4 Portfolio Page

Purpose:

Show current holdings and performance.

Components:

- portfolio summary
- positions table
- orders table
- PnL curve
- allocation chart
- risk exposure
- trade history

Use:

- TanStack Table
- Hero UI cards/tabs/modals
- monospace numeric columns

---

### 7.5 Research Workspace

Purpose:

Research assets, projects, narratives, and catalysts.

Components:

- research chat
- source list
- Exa/Tavily/Jina results
- onchain panels
- bull case artifact
- bear case artifact
- final investment memo

---

### 7.6 Journal Page

Purpose:

Record trade decisions and user behavior.

Components:

- trade journal
- screenshots
- notes
- emotion tags
- rule violation tags
- plan vs execution comparison

---

### 7.7 Review Center

Purpose:

Daily/weekly/monthly review.

Components:

- performance metrics
- win rate
- average R
- max drawdown
- mistake finder
- discipline score
- repeated pattern detection
- improvement suggestions

---

### 7.8 Evolution Center

Purpose:

Strategy improvement workflow.

Components:

- proposed config patches
- backtest result
- before/after metrics
- approval card
- rollback option
- strategy version timeline

---

### 7.9 Marketplace

Purpose:

Manage skills and MCP integrations.

Components:

- installed skills
- available skills
- MCP servers
- permission level
- health check
- install/update/remove actions

---

## 8. Hero UI Usage

Use Hero UI to reduce custom UI work.

Recommended Hero UI components:

- Card
- Table
- Tabs
- Modal
- Drawer
- Button
- Chip
- Badge
- Progress
- Tooltip
- Dropdown
- Input
- Textarea
- Select
- Switch
- Avatar
- Divider
- Skeleton

Trading-specific usage:

| Feature | Hero UI Component |
|---|---|
| Portfolio cards | Card |
| Orders / Trades | Table |
| Risk status | Chip / Badge |
| Approval | Modal / Card |
| Skill status | Progress / Chip |
| Workspace tabs | Tabs |
| Config forms | Input / Select / Switch |
| Marketplace | Card / Table |

---

## 9. TanStack Usage

### TanStack Router

Use for:

- nested workspace routes
- page-level routing
- route loaders
- code splitting

Example routes:

```txt
/
 /workspace/:workspaceId/chat
 /workspace/:workspaceId/market
 /workspace/:workspaceId/research
 /workspace/:workspaceId/planner
 /workspace/:workspaceId/portfolio
 /workspace/:workspaceId/journal
 /workspace/:workspaceId/review
 /workspace/:workspaceId/evolution
 /marketplace
 /settings
```

### TanStack Query

Use for:

- portfolio data
- market data
- artifact loading
- review reports
- skill run status
- workflow run status

### TanStack Table

Use for:

- orders
- trades
- positions
- signals
- reviews
- skill registry
- marketplace skills

### TanStack Form

Use for:

- trade plan form
- risk config form
- strategy patch approval
- API key config
- skill install config

### TanStack Virtual

Use for:

- long chat history
- long execution timeline
- large trade history
- large research result list

---

## 10. Core Agent Capability

Trading Pi Agent must not be a simple Q&A bot.

It must be able to:

1. Understand user intent
2. Select workflow
3. Call skills
4. Stream execution status
5. Create artifacts
6. Ask for approval when required
7. Record results
8. Review historical behavior
9. Propose improvements
10. Trigger paper trading or guarded real trading

---

## 11. Agent Capability Levels

### Level 1: Chat Assistant

Can answer questions and explain concepts.

Status:

- allowed
- lowest value

### Level 2: Tool-Using Assistant

Can call market/research/risk skills.

Examples:

- fetch ETH market data
- search news
- calculate position size

### Level 3: Workflow Agent

Can run structured workflows.

Examples:

- investment committee workflow
- trade plan workflow
- daily review workflow
- evolution workflow

### Level 4: Execution Agent

Can create paper trades and guarded real orders.

Rules:

- paper trading allowed by default
- real trading requires approval
- risk engine must approve first

### Level 5: Self-Improving Trading OS

Can review, detect mistakes, propose patches, backtest, and request approval to apply improvements.

This is the target state.

---

## 12. What The Agent Can Do

### Research

- Search news
- Search project docs
- Read web pages
- Analyze onchain data
- Compare bull and bear case
- Generate investment memo

### Market Analysis

- Fetch ticker
- Fetch OHLCV
- Analyze indicators
- Detect trend
- Identify support/resistance
- Generate signal candidate

### Risk

- Calculate position size
- Calculate stop loss
- Calculate take profit
- Check daily loss
- Check exposure
- Deny unsafe trades

### Trading

- Generate trade plan
- Paper trade
- Prepare guarded real order
- Cancel order
- Close position

### Journal

- Log trade
- Log signal
- Log emotion
- Attach screenshot
- Compare plan vs actual

### Review

- Daily review
- Weekly review
- Mistake detection
- Discipline scoring
- Pattern detection

### Evolution

- Propose strategy patch
- Backtest patch
- Compare metrics
- Ask approval
- Apply or rollback config

---

## 13. What The Agent Must NOT Do

The agent must not:

- promise profits
- bypass risk engine
- place real orders without approval
- trade with withdrawal-enabled API keys
- use leverage by default
- hide execution steps
- make untraceable decisions
- hardcode fake intelligence
- execute untrusted code on host machine

---

## 14. Agent UI Principles

Every meaningful agent action must be visible.

The UI must show:

- what skill is running
- why it is running
- input used
- output generated
- evidence source
- risk result
- final artifact

No silent magic.

No black-box trading.

---

## 15. Artifact Types

Artifacts should be displayed in a dedicated viewer.

Types:

- Trade Plan
- Research Report
- Bull Case
- Bear Case
- Technical Case
- Risk Report
- Debate Report
- Final Investment Memo
- Backtest Report
- Daily Review
- Evolution Proposal
- Strategy Patch

---

## 16. Approval Design

Any high-risk action creates an ApprovalCard.

ApprovalCard must show:

- action name
- risk level
- input parameters
- expected result
- possible loss
- required permissions
- approve button
- reject button
- simulate first button

High-risk actions:

- real order
- strategy patch apply
- API key update
- skill installation
- MCP enable
- sandbox export

---

## 17. Design Rules

1. Dark mode first.
2. No cluttered rainbow UI.
3. Trading numbers must be aligned.
4. Every agent action must be observable.
5. Every artifact must be traceable.
6. Risk status must always be visible.
7. Approval must be explicit.
8. UI must work well on desktop first.
9. Mobile is secondary.
10. Avoid hardcoded fake states.

---

## 18. Development Notes

For every new UI feature:

1. Create `specs/<feature>.md`
2. Create `checklists/<feature>.md`
3. Define acceptance criteria
4. Implement on feature branch
5. Add tests
6. Run browser E2E test
7. Record demo video
8. Submit code review

---

## 19. Success Criteria

UI is successful if:

- user can chat with Trading Pi naturally
- user can see execution timeline clearly
- user can inspect artifacts
- user can approve or reject dangerous actions
- user can understand risk before trading
- user can review and improve over time

Agent system is successful if:

- it can perform real workflows
- it calls real skills
- it produces auditable artifacts
- it improves user discipline
- it avoids unsafe trading behavior
