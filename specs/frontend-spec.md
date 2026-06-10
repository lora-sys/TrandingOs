# frontend-spec.md

# Trading Pi Frontend Spec v4.1

## 1. Frontend Direction

Reuse Pi Web core interaction patterns where possible.

Enhance with:

- Hero UI
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- TanStack Virtual
- Tailwind CSS
- TradingView / lightweight-charts / ECharts

## 2. Main Layout

```txt
Top Bar: Workspace / Symbol / Risk / Mode / User

Left Sidebar:
- Dashboard
- AI Assistant
- Market
- Research
- Trade Planner
- Portfolio
- Orders
- Positions
- Journal
- Review
- Evolution
- Airdrop Tutor
- Skill Factory
- MCP Hub
- Marketplace
- Settings

Center Workspace:
- Chat Thread
- Artifact Preview
- Browser Preview
- Tables / Charts

Right Inspector:
- Execution Timeline
- Active Skills
- Active MCP
- Sandbox Status
- Risk Status
- Memory Status
```

## 3. Core Pages

### Chat Workspace

Primary agent interaction page.

Must include:

- message stream
- input composer
- slash command suggestions
- tool call blocks
- execution status snippets
- artifact cards
- approval cards

### Artifact Preview Panel

Claude-like preview panel.

Supports:

- Markdown
- HTML
- PDF
- screenshot
- JSON
- table
- chart

Actions:

- copy
- export markdown
- export PDF
- open full screen
- view source
- view execution log

### Browser Preview Panel

Shows AIO Sandbox browser state.

Supports:

- current page screenshot
- URL bar
- extraction result
- page title
- generated PDF preview
- security warning

Browser preview is read-only by default.

### Execution Timeline

Shows all workflow / skill / MCP / browser events.

Event states:

- queued
- running
- success
- failed
- skipped
- approval_required

### Approval Center

Used for:

- real order execution
- skill installation
- MCP enablement
- strategy patch apply
- API key changes
- sandbox export

### Workspace Manager

Workspace = context + memory + artifacts + workflows.

Examples:

- ETH Workspace
- BTC Workspace
- Airdrop Workspace
- Macro Workspace
- Meme Workspace

### Skill Factory Page

Shows:

- proposed skills
- draft skills
- generated tests
- validation results
- approval state

## 4. UI Acceptance Criteria

- Chat works.
- Execution timeline streams events.
- Artifacts can be previewed.
- Browser output can be previewed.
- Approval actions are visible.
- No fake static data in production mode.
- Paper/mock mode labels must be visible.
