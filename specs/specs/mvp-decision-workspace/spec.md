# Trading Pi MVP — Prediction Decision Workspace Spec v2

## Why

Trading Pi 需要从「AI 聊天终端」转型为 **Prediction Decision Workspace**。核心价值不是 AI 替你做交易决策，而是 AI 帮你成为更好的决策者 —— 通过「发现机会 → 深度研究 → 整理证据 → 形成判断 → 人工决策 → 记录过程 → 赛后复盘 → 持续进化」的闭环。

当前系统已有 40 Skills、9 Workflows、14 页面路由、完整的 Journal/Review/Risk 引擎。但存在关键缺口：(1) 缺 Polymarket 集成 (2) 缺 Alpha Radar Workflow (3) 缺结构化 Decision Engine (4) 缺 Deep Research 自主研究能力 (5) 页面需要从 14 精简重组为 6。

**v2 新增**: Deep Research Agent — 受 Alibaba [DeepResearch](https://github.com/Alibaba-NLP/DeepResearch) 和 [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) 启发，基于现有工具链构建自主深度研究工作流，可在 Workspace 中手动触发或从 Alpha Radar 自动启动，最终输出结构化研究报告（双栏文档式 UI）。

## What Changes

### 页面重构 (14 → 6)
- **BREAKING**: 删除独立 Chat/Research/Planner/Portfolio/Review/Evolution/Marketplace/Journey/System 页面路由
- Dashboard: 重构为 Alpha Radar 首页 + 系统状态 + 最近复盘
- Markets: 双源 Tab (Crypto Spot | Prediction Markets)，接入 Polymarket
- Workspace: MVP 核心页面，5 子标签 (Overview/Research/Decisions/Journal/Review)，多 Workspace 支持
- **Research Tab 升级**: 集成 Deep Research Agent — 支持普通聊天 + 自主深度研究双模式
- Journal: 全局交易日志时间线
- Timeline: 全局事件流（Agent 执行记录）
- Settings: 从 stub 升级为完整配置 UI

### 新增后端能力
- Polymarket Gamma API + CLOB API 集成 (`market.polymarket.*` skills)
- Reddit 数据源 skill (`community.reddit.*`)
- Alpha Radar Workflow (`alpha.radar.scan`)
- Decision Engine (`decision.record` + `decision.analyze`)
- **Deep Research Agent** (`deep.research`) — 自主多步研究循环
- Workspace CRUD API (`/api/workspaces`)
- Paper Trade Lifecycle Workflow (`paper.trade.lifecycle`)

### 前端重构
- router.tsx 从 14 路由精简为 6
- ChatWorkspace 能力迁移到 WorkspacePage/Research 标签
- **新增 Deep Research 触发 UI**: "Deep Research" 按钮 + 研究进度面板 + 报告渲染
- 新增 WorkspacePage (5子标签) + Alpha Radar 组件 + Decision Card 组件
- MarketsPage 重构为双源 Tab
- DashboardPage 重构为 Alpha Radar 首页
- ArtifactPanel 升级为 Workspace-aware
- **所有页面严格遵循 `apps/web/design.md` 设计规范**

## Impact

- Affected specs: frontend-architecture, backend-api, database-schema, workflow-library, design-system
- Affected code:
  - `apps/web/src/router.tsx` — 路由重写
  - `apps/web/src/components/AppLayout.tsx` — 导航项改为 6 个
  - `apps/web/src/pages/*` — 删 8 页，重写 4 页，新增 1 页(Workspace)
  - `apps/web/server/api.ts` — 新增 workspace/polymarket/decision/alpha-radar/deep-research 端点
  - `packages/core/src/market/` — 新增 polymarket.ts
  - `packages/core/src/skills/default-skills.ts` — 新增 reddit/polymarket/decision/deep-research skills
  - `packages/core/src/workflows/default-workflows.ts` — 新增 alpha-radar + deep-research + paper-lifecycle workflows
  - `packages/core/src/db/database.ts` — 新增 workspaces/decisions 表
  - `packages/core/src/db/repositories.ts` — 新增 workspace/decision CRUD
  - `apps/web/.env.example` — 新增 API key 配置项

---

## ADDED Requirements

### REQ-MVP-1: 7 Page Architecture

The system SHALL provide exactly 7 top-level pages:

| # | Route | Page | Purpose |
|---|-------|------|---------|
| 1 | `/` | Dashboard | Alpha Radar Top5 + System Status + Recent Reviews |
| 2 | `/markets` | Markets | Dual-source: Crypto Spot \| Prediction Markets |
| 3 | `/workspace/:id?` | Workspace | Multi-workspace: Overview/Research/Decisions/Journal/Review |
| 4 | `/journal` | Journal | Global trade journal timeline (4-dimension records) |
| 5 | `/timeline` | Timeline | Global agent execution event log (4 event types) |
| 6 | `/settings` | Settings | Full configuration UI + User Rules |
| 7 | `/evolution` | Evolution | Improvement aggregation + rule suggestions + progress tracking |

Sidebar navigation SHALL show these 7 items. All other routes SHALL be removed.

#### Scenario: User navigates to Evolution page
- **WHEN** user clicks "Evolution" in sidebar
- **THEN** Evolution page renders with:
  - **Improvement Feed**: Chronological list of improvement suggestions from past Reviews
  - **Rule Suggestions**: AI-generated rule proposals based on review patterns (user can adopt → User Rules)
  - **Progress Metrics**: Win rate trend over time, P&L curve, emotion distribution, rule compliance rate
  - **Pattern Highlights**: "You've had 3 consecutive losses on FOMO trades" type insights
  - **Action buttons**: "Run Review" (triggers review for active workspace), "Suggest Rules" (AI analyzes patterns)

#### Scenario: User navigates to Markets page
- **WHEN** user clicks "Markets" in sidebar
- **THEN** Markets page renders with two tabs: "Crypto Spot" (default) and "Prediction Markets"
- **AND** Crypto tab shows CoinGecko data (existing `market.snapshot` data)
- **AND** Prediction tab shows Polymarket markets with odds/volume/settlement-time

#### Scenario: User navigates to Workspace
- **WHEN** user clicks "Workspace" in sidebar
- **THEN** Workspace page renders showing list of user's workspaces (or empty state with "Create Workspace" CTA)
- **AND** clicking a workspace opens its 5-tab view: Overview, Research, Decisions, Journal, Review

### REQ-MVP-2: Dashboard with Alpha Radar

The Dashboard SHALL be the first screen users see. It MUST contain:

1. **Alpha Radar Section**: Auto-scanned Top5 opportunity cards
   - Each card shows: event/market name, current probability/odds, volume, 24h change, risk rating (stars), source tag
   - Cards are clickable → navigate to Workspace (new or existing) pre-filled with context
   - Data sources: Polymarket (prediction odds) + **Exa MCP** (news signals) + Reddit (community buzz)
   - Auto-refresh every 5 minutes
   - Styling: glassmorphism cards per design.md (bg-card/70, backdrop-blur-xl, border-white/[0.08])

2. **Today's Reminders**: Upcoming events (FOMC, settlements, matches) from Calendar data sources

3. **Recent Reviews**: Last 7 review results summary (win rate, best/worst trade)

4. **System Status**: Agent status, model info, active connections (existing dashboard stats, preserved)

#### Scenario: Alpha Radar auto-scan on Dashboard load
- **WHEN** Dashboard mounts
- **THEN** system triggers `alpha.radar.scan` workflow in background
- **AND** within 10s, Top5 opportunity cards render with real data
- **AND** if scan fails, show cached last-known results with "stale" badge
- **AND** each card has hover effect (scale + glow) matching design.md glassmorphism tokens

#### Scenario: User clicks Alpha Radar opportunity card
- **WHEN** user clicks an opportunity card (e.g., "France vs Brazil YES 62%")
- **THEN** navigate to `/workspace/new?topic=france-vs-brazil&source=polymarket`
- **AND** Workspace auto-initializes with:
  - Topic name from card title
  - Overview tab pre-populated with market data snapshot artifact
  - Research tab ready for AI conversation about this topic

### REQ-MVP-3: Markets Dual-Source Page

The Markets page SHALL provide dual-market data:

**Tab A: Crypto Spot** (preserving existing functionality):
- CoinGecko price data (existing `market.coingecko.quote`)
- Trending coins list
- Search/filter by symbol or name
- Favorite/watchlist toggle
- Click → open Workspace with that asset as research topic

**Tab B: Prediction Markets** (NEW — Polymarket):
- Top Markets by volume
- Trending markets (24h volume change)
- Market categories: Sports / Politics / Crypto / Macro / Entertainment
- Each market card shows: question, YES/NO odds, volume, 24h change, settlement date/time
- Search markets
- Favorite/watchlist toggle
- Click → open Workspace with that prediction market as research topic

#### Scenario: User browses Prediction Markets
- **WHEN** user switches to "Prediction Markets" tab
- **THEN** loading shimmer displays while fetching from Polymarket Gamma API
- **AND** grid of market cards renders with glassmorphism styling per design.md
- **AND** each card shows: question text, YES % / NO %, volume ($), settlement countdown
- **AND** user can search by keyword (filters client-side)
- **AND** user can favorite a market (star icon, persists to localStorage)

### REQ-MVP-4: Workspace (Core Page — Most Important)

Workspace is THE central concept of Trading Pi MVP. It represents a **research topic container**.

#### 4a: Multi-Workspace Support

The system SHALL support multiple workspaces per user:
- Each workspace has a unique ID, name, description, created_at timestamp
- Workspaces are stored in SQLite `workspaces` table
- CRUD via `/api/workspaces` REST API
- Sidebar "Workspace" nav item shows recent workspaces as sub-items
- Default workspace "General" exists for uncategorized research

#### 4b: Five Sub-Tabs

Each Workspace contains 5 views:

**Tab 1: Overview**
- Workspace metadata (name, created date, topic)
- Linked market data snapshot (if crypto/prediction topic)
- Key metrics summary (decisions count, win rate, P&L)
- Recent activity feed (last 10 actions across all tabs)
- Quick actions: "Start Research", "Start Deep Research", "Record Decision", "View Journal"

**Tab 2: Research** (migrated from ChatWorkspace + Deep Research integration)
- **Mode A: Chat** — Full AI chat interface (SSE streaming, preserved from current ChatWorkspace)
  - All existing capabilities: Tool calls display, Thinking/Reasoning, Plan cards, Artifact panel
  - Pre-populated context: when opened from Alpha Radar card, topic context auto-injected
  - Research artifacts generated here are linked to this workspace
  - Export menu (HTML/Markdown/PDF) exports this workspace's research only
- **Mode B: Deep Research** (NEW — see REQ-MVP-11 for full spec)
  - Autonomous multi-step research agent triggered by "Deep Research" button
  - Runs ReAct loop: Question → **Search(Exa MCP)** → Read(Jina) → Analyze(Reddit+Polymarket) → Synthesize → Report
  - Real-time progress panel showing which step is running
  - Output: structured Research Report artifact saved to workspace
  - Report includes: Executive Summary, Key Findings, Data Sources, Supporting Evidence, Counter-arguments, Risk Factors, Conclusion

**Tab 3: Decisions**
- List of recorded decisions for this workspace
- Each decision shows: date, direction (YES/NO/LONG/SHORT), position size, confidence (A+-F), thesis (supporting reasons), risk level (A-D)
- Two ways to create decisions:
  1. **AI-generated**: User asks "should I bet on France?" → AI generates structured Decision Card → User confirms → Recorded
  2. **Manual**: User fills form manually
- Decision status: pending / executed / settled / invalidated
- Post-settlement: outcome linked back (win/loss, actual P&L)

**Tab 4: Journal**
- Trade journal entries for this workspace
- Auto-generated when a decision is executed (paper trade)
- Fields: entry time, exit time (if closed), direction, size, entry price, exit price, P&L, notes, emotion at entry, discipline score
- Manual entry support
- Link to related decision and research artifacts

**Tab 5: Review**
- Review reports for this workspace
- Auto-generated after settlement or on-demand ("帮我复盘")
- Content: what happened, P&L breakdown, what went right, what went wrong, lessons learned, improvement suggestions
- Historical reviews list with dates and outcomes

#### Scenario: Complete Workspace lifecycle with Deep Research
- **WHEN** user creates workspace "世界杯2026"
- **AND** clicks "Start Deep Research" button in Overview tab
- **THEN** Deep Research Agent launches autonomous research session:
  - Step 1: Searches **Exa MCP** for "World Cup 2026 betting odds predictions"
  - Step 2: Reads top 5 articles via Jina Reader
  - Step 3: Scans Reddit r/soccer for community sentiment
  - Step 4: Fetches Polymarket World Cup markets data
  - Step 5: Synthesizes findings into structured report
- **AND** real-time progress shown in Research tab (step-by-step progress bar)
- **AND** final report saved as research-report artifact in workspace
- **AND** user reviews report, asks follow-up in Chat mode
- **AND** user asks "给我决策建议" → AI generates Decision Card
- **AND** user confirms → Decision recorded → Paper Trade → Journal → Review
- **AND** full cycle visible across all 5 tabs

### REQ-MVP-5: Decision Engine (Structured Decision Cards)

The Decision Engine is the core differentiator. It is NOT an auto-trader. It is a **structured thinking framework**.

#### Decision Card Schema
```typescript
interface DecisionRecord {
  id: string;
  workspaceId: string;
  topic: string;              // e.g., "France vs Brazil YES"
  direction: "YES" | "NO" | "LONG" | "SHORT" | "HOLD";
  positionSize: number;       // in U (units)
  confidence: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
  riskLevel: "A" | "B" | "C" | "D";  // A=lowest risk
  supportingReasons: string[]; // AI-generated: why this might work
  againstReasons: string[];    // AI-generated: risks and counter-arguments
  thesis: string;             // One-line core thesis
  invalidationCriteria: string; // What would prove this wrong
  status: "pending" | "executed" | "settled_win" | "settled_loss" | "invalidated" | "expired";
  createdAt: string;
  executedAt?: string;
  settledAt?: string;
  resultPnL?: number;
  reviewId?: string;          // Link to post-settlement review
}
```

#### AI Decision Generation Flow
1. User asks in Research tab: "应该买法国吗？" or "give me a decision on ETH"
2. Agent calls `decision.analyze` tool internally:
   - Fetches current market data (Polymarket odds or CoinGecko price)
   - Searches **Exa MCP** for recent news about the topic
   - Scans Reddit for community sentiment
   - Evaluates risk factors
3. Agent outputs structured Decision Card using new `DecisionCard` component (renders in chat)
4. User reviews card, can adjust parameters (position size, etc.)
5. User clicks "Confirm Decision" → saved to DB → appears in Decisions tab
6. Optionally: user clicks "Execute (Paper)" → creates paper trade + journal entry

#### Scenario: AI generates Decision Card
- **WHEN** user requests decision analysis in Workspace Research tab
- **THEN** Agent gathers data from 3+ sources (market + news + community)
- **AND** renders a structured DecisionCard component in chat with:
  - Colored confidence badge (A+=green, F=red)
  - Star-based risk rating (A=1 star safe, D=4 stars risky)
  - Supporting reasons as bullet points with green checkmarks
  - Against reasons as bullet points with red warnings
  - Suggested position size and one-line thesis
  - Invalidation criteria in italic
  - "Confirm" and "Edit" action buttons
- **AND** user can click Confirm to record, or Edit to modify before recording

### REQ-MVP-6: Alpha Radar Workflow (New Backend Workflow)

A new workflow `alpha.radar.scan` SHALL be implemented:

**Input**: None (auto-triggered) or optional `{category?: string}` filter

**Process**:
1. Scan Polymarket trending markets (volume > $50K, settling < 7 days)
2. Scan **Exa MCP** for breaking news (crypto/prediction/politics keywords, last 24h)
3. Scan Reddit r/CryptoCurrency + r/PredictionMarkets hot posts (last 24h)
4. Cross-reference: match news/events to relevant markets
5. Score each opportunity: (volume_weight * 0.4 + novelty_weight * 0.3 + sentiment_weight * 0.3)
6. Return Top5 as structured `AlphaSignal[]`

**Output**: Array of AlphaSignal artifacts, each containing:
```typescript
interface AlphaSignal {
  id: string;
  title: string;           // e.g., "France vs Brazil — World Cup QF"
  category: "sports" | "politics" | "crypto" | "macro" | "entertainment";
  source: "polymarket" | "news" | "community" | "composite";
  currentValue: string;   // e.g., "YES 62%" or "$45,230"
  change24h: string;      // e.g., "+5%" or "+$2.1K"
  volume: string;         // e.g., "$2.1M"
  riskRating: 1 | 2 | 3 | 4; // stars
  reasoning: string;      // 1-sentence why this is interesting
  marketId?: string;      // Polymarket condition ID (if applicable)
  newsUrls?: string[];    // Relevant news article URLs
  redditUrls?: string[];  // Relevant Reddit thread URLs
  expiresAt?: string;     // Settlement/deadline time
}
```

**Storage**: Results cached in memory_records (domain="alpha") with 5-min TTL

### REQ-MVP-7: Polymarket Integration (New Data Source)

#### 7a: Polymarket Client (`packages/core/src/market/polymarket.ts`)

New module providing:
- `getMarkets(options?)` — List markets with filtering (active/closed, category, limit, offset)
- `getMarket(conditionId)` — Single market detail with orderbook
- `getPrice(conditionId)` — Current YES/NO prices
- `getOrderbook(conditionId)` — Orderbook (bids/asks)
- `searchMarkets(query)` — Text search across markets

API endpoints used:
- **Gamma API** (free, no auth): `https://gamma-api.polymarket.com/markets`
- **CLOB API** (free tier): `https://clob.polymarket.com` for orderbook/prices

#### 7b: Polymarket Skills

New skills registered in default-skills.ts:
- `market.polymarket.markets` — List/filter markets
- `market.polymarket.detail` — Get single market with orderbook
- `market.polymarket.price` — Get current price for a condition
- `market.polymarket.search` — Search markets by text

### REQ-MVP-8: Reddit Data Source (New Skill)

#### 8a: Reddit Skill (`community.reddit`)

New skill providing:
- `community.reddit.hot(subreddit, limit?)` — Hot posts from a subreddit
- `community.reddit.search(query, subreddit?, sort?, limit?)` — Search posts
- `community.reddit.comments(postId)` — Get comments for a post (sentiment analysis input)

Implementation approach:
- Use public JSON API (no auth needed): `https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}`
- Rate limiting: 60 req/min (Reddit standard)
- Parse: title, selftext, score, num_comments, url, created_utc

Supported subreddits (MVP):
- r/CryptoCurrency, r/PredictionMarkets, r/soccer, r/politics, r/wallstreetbets

### REQ-MVP-9: Journal Page (Global)

The Journal page SHALL show a global timeline of ALL journal entries across all workspaces:
- Chronological list (newest first) of all journal entries
- Filter by: workspace, date range, outcome (win/loss/open), asset/topic
- Each entry shows: timestamp, topic/workspace, direction, size, P&L (if closed), emotion tag
- Click entry → expand to full detail (notes, screenshots, linked decision)
- "Add Entry" button for manual journaling
- Summary stats at top: total entries, win rate, total P&L, best/worst trade
- Export (CSV/Markdown) for external analysis

### REQ-MVP-10: Settings Page (Full Implementation)

Settings page SHALL upgrade from PlaceholderStub to functional configuration UI:

**Sections**:
1. **AI Model**: Model selector (from /api/config), Thinking Level slider, Show Thinking toggle
2. **Data Sources**: API key inputs (OpenAI, **Exa MCP** (optional — free mode available), Jina, Reddit client-id, Polymarket [optional], OpenRouter [for Deep Research])
3. **Trading**: Default position size, max positions, daily loss limit, auto-compaction toggle
4. **Appearance**: Theme (dark/light), Font size, Sidebar collapsed default
5. **User Rules**: Custom rules editor (text area, one rule per line)
6. **Deep Research**: Toggle enable/disable, Max research steps (3-10), Model selection (default LLM vs DeepResearch via OpenRouter)
7. **About**: Version, build info, links to docs

All settings persist via dual-write (localStorage + POST /api/config where applicable).

### REQ-MVP-11: Deep Research Agent (NEW in v2)

> Inspired by [Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch) and [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) — agentic deep information-seeking systems.
> We implement our own **trading-domain-specific** Deep Research using existing tools + new academic search skills.
> **Design decisions finalized via grill-me session**: Workspace embedded, dual-pane document report, DeepResearch-step-flow progress, full-auto input, toolbar+follow-up interaction, report→decision one-click.

#### 11a: Architecture Overview

Deep Research is a **sub-agent workflow** that runs autonomously within a Workspace's Research tab (dual-mode with Chat):

```
User triggers "Deep Research" (input topic only — fully automatic)
  ↓
Agent receives research topic + workspace context
  ↓
ReAct Loop (autonomous, default 5 iterations, max 10):
  ┌─ Iteration N:
  │   ├─ THINK: What do I need to know next?
  │   ├─ ACT: Call tool(s):
  │   │   ├─ mcp.exa.web_search — Web articles/news (via Exa MCP)
  │   │   ├─ jina.read() — Full content of discovered URLs
  │   │   ├─ reddit.hot/search() — Community sentiment
  │   │   ├─ semantic_scholar.search() — Academic papers [NEW]
  │   │   ├─ crossref.search() — Academic metadata [NEW]
  │   │   ├─ polymarket.markets/detail() — Market odds & data
  │   │   └─ coingecko.quote() — Price data (if crypto topic)
  │   ├─ OBSERVE: Parse tool results, identify gaps
  │   └─ DECIDE: Enough info? If yes → synthesize. If no → next iteration
  ↓
Synthesize findings into structured Research Report (align w/ DeepResearch format)
  ↓
Save as artifact in workspace → Render dual-pane document view in Research tab
  ↓
Toolbar: [Return to Chat] [Ask Follow-up] [Generate Decision] [Export] [Copy Link]
```

#### 11b: Operation Mode (MVP: Built-in Only)

**Built-in ReAct Loop (Default & Only mode for MVP)**:
- Uses current configured LLM (OpenAI-compatible API, e.g., GPT-4o)
- Leverages existing 40+ skills + 3 new academic search skills as tools
- No additional cost beyond existing API usage
- Default 5 iterations (configurable 3-10 in Settings, but auto by default)
- User only inputs **research topic** — everything else is autonomous

> **Phase 2**: OpenRouter mode (`alibaba/tongyi-deepresearch-30b-a3b`) as premium option.
> Settings UI reserves the config toggle but does not implement the OpenRouter backend in MVP.

#### 11c: Available Tools in ReAct Loop

| Tool | Skill | Data Source | Purpose |
|------|-------|-------------|---------|
| `mcp.exa.web_search` | search.exa | **Exa MCP Server** (free tier: 1K/mo, no key needed for basic mode) | Web news, analysis, opinions, code search, contents extraction |
| `jina.read()` | reader.jina | Jina API | Full page content extraction |
| `reddit.hot/search()` | community.reddit | Reddit JSON API | Community sentiment, discussions |
| `semantic_scholar.search()` | academic.semanticscholar | Semantic Scholar API | Academic papers, TLDR summaries, citations [NEW] |
| `crossref.search()` | academic.crossref | Crossref API | DOI metadata, journal/conference papers [NEW] |
| `polymarket.*` | market.polymarket.* | Gamma/CLOB API | Prediction market odds, volume |
| `coingecko.*` | market.coingecko.* | CoinGecko API | Crypto price data |

#### 11d: Deep Research Workflow (`deep.research`)

**Input** (simplified — fully auto):
```typescript
interface DeepResearchInput {
  topic: string;              // ONLY required field — e.g., "ETH price outlook after Fed"
  workspaceId: string;        // Which workspace to save results to
  // All other fields optional with sensible defaults:
  maxIterations?: number;     // Default: 5 (auto, user doesn't set)
  context?: string;           // Auto-populated from workspace topic
}
```

**Process** (Built-in Mode — fully autonomous):
1. **Decompose**: Agent breaks research question into 3-5 sub-questions
2. **Search Phase** (parallel where possible):
   - Exa **MCP** search for each sub-question (news, analysis, opinions)
   - Semantic Scholar search for academic papers on topic
   - Crossref search for recent publications
   - Reddit search for community discussions
   - Polymarket/CoinGecko for market data (if applicable)
3. **Read Phase**: For top discovered URLs/papers, use Jina Reader to get full content
4. **Analyze Phase**: Cross-reference findings, identify patterns, note contradictions
5. **Synthesize Phase**: Generate structured report (aligned w/ DeepResearch output format)

**Output** — ResearchReport Artifact (aligned with DeepResearch structure):
```typescript
interface ResearchReport {
  id: string;
  workspaceId: string;
  topic: string;
  generatedAt: string;
  mode: "builtin";            // MVP: only builtin
  iterationsUsed: number;

  // === Report Sections (aligned w/ DeepResearch) ===
  executionSummary: string;   // What was done: tools used, steps taken, sources consulted
  keyFindings: Finding[];     // Top 5-8 findings with evidence & source links
  dataSourceSummary: DataSourceCitation[];  // All sources used, with key insights
  conclusion: string;         // Final assessment & recommendations

  // Metadata
  toolsUsed: string[];
  urlsAccessed: string[];
  tokenUsage: { input: number; output: number };
}

interface Finding {
  title: string;              // e.g., "Fed rate cut historically bullish for risk assets"
  description: string;        // Detailed explanation
  evidence: string;           // Source quote or data point
  source: string;             // URL or data source name
  relevance: "high" | "medium" | "low";
}
```

#### 11e: Frontend Integration — Deep Research UI (Grill-me Finalized)

**Placement**: Embedded inside Workspace → Research tab (NOT a separate page).
Research tab has two modes: **Chat** (default) | **Deep Research** (toggle switch).

**Trigger Points** (3 entry points):
1. **Workspace Overview tab**: "Start Deep Research" quick action button
2. **Workspace Research tab**: "Deep Research" mode toggle/button next to chat input
3. **Alpha Radar card**: "Research this" secondary button on each opportunity card

**Launch Flow** (fully automatic):
1. User clicks any trigger → topic pre-filled from context (workspace name / card title)
2. **No configuration modal** — just a single text input (editable topic) + "Start" button
3. Click Start → Research tab switches to Deep Research progress view

**Progress Panel** (during execution — DeepResearch-style step flow):
```
┌─ Deep Research ──────────────────────────────────────┐
│ 📡 ETH price outlook after Fed rate decision          │
│ Mode: Built-in ReAct    Elapsed: 1m 23s               │
│                                                      │
│ ┌─ Step 1: Decompose research question ............✓ │
│ │   Generated 4 sub-questions                         │
│ ├─ Step 2: Search **Exa MCP** for news & analysis ..........✓ │
│ │   Found 15 articles, selected top 8                │
│ ├─ Step 3: Search Semantic Scholar ..................✓ │
│ │   Found 12 relevant papers (AI TLDRs loaded)       │
│ ├─ Step 4: Search Reddit community sentiment ........✓ │
│ │   r/CryptoCurrency: 8 threads, r/wallstreetbets: 5 │
│ ├─ Step 5: Read top sources (Jina Reader) ..........◉ │  ← CURRENT (spinner)
│ │   Reading: CoinDesk "Fed Rate Decision Impact"...  │
│ │   3 of 10 URLs remaining                          │
│ ├─ Step 6: Analyze cross-references ................□ │
│ ├─ Step 7: Synthesize report ........................□ │
│                                                      │
│ Progress: ████████░░░░ 5/7 steps ~1min remaining      │
│                                      [Cancel]         │
└──────────────────────────────────────────────────────┘
```
- Each completed step shows: checkmark + step name + one-line detail
- Current step shows: spinner animation + step name + live detail
- Pending steps show: gray muted text
- Progress bar at bottom: visual fill based on completed/total
- Cancel button available at all times

**Report View** (after completion — dual-pane document style):
```
┌─ Research Report ───────────┬─ Content Area ────────────────┐
│ 📑 ETH Price Outlook         │                               │
│                             │  # Execution Summary           │
│ ▼ Executive Summary         │  This report analyzed...       │
│   ▼ Key Findings            │  Tools: **Exa MCP**, Semantic Scholar, │
│     ✓ Finding 1             │  Reddit, Jina, Polymarket      │
│     ✓ Finding 2             │  Steps: 7 | Sources: 23 URLs   │
│     ✓ Finding 3             │                               │
│     ○ Finding 4             │  ---                          │
│   ▼ Data Sources            │  ## Key Findings              │
│     **Exa MCP** (8 articles)        │                               │
│     Semantic Scholar (12)   │  ### 1. Fed Rate Cut = Bullish │
│     Reddit (13 threads)     │  **Evidence**: "Historically..."│
│     Polymarket (3 markets)  │  **Source**: [CoinDesk](url)   │
│   ▶ Conclusion             │  **Relevance**: High ★★★       │
│                             │                               │
│                             │  ### 2. Institutional Flow... │
│                             │  ...                          │
│                             │                               │
│                             │  ---                          │
│                             │  ## Conclusion                │
│                             │  Based on 7 findings across   │
│                             │  23 sources, ETH likely to... │
│                             │                               │
│                             │  [⚠ View Counter-arguments]   │
├─────────────────────────────┴───────────────────────────────┤
│ [← Chat] [Ask Follow-up] [Decision] [↓ Export .md] [🔗 Copy]│
└─────────────────────────────────────────────────────────────┘
```
- **Left pane**: Collapsible table-of-contents navigation (click to scroll/jump)
- **Right pane**: Markdown-rendered content area (Streamdown, same as chat messages)
- **Executive Summary**: Always expanded on load
- **Key Findings**: Each finding has title, evidence quote, source link (clickable), relevance badge
- **Data Sources**: Grouped by tool/source type with counts
- **Conclusion**: Highlighted box at bottom
- **Bottom toolbar** (fixed):
  - **← Return to Chat**: Switch back to Chat mode (report saved as artifact, accessible anytime)
  - **Ask Follow-up**: Auto-injects report context into Chat, user types question about the report
  - **Generate Decision**: Triggers `decision.analyze` with report as context → outputs Decision Card
  - **↓ Export .md**: Downloads full report as Markdown file
  - **🔗 Copy Link**: Copies workspace/report URL to clipboard

#### 11f: Report → Decision One-Click (Closed Loop)

After report completion, clicking **"Generate Decision"** in toolbar:
1. AI receives the full Research Report as context
2. AI calls `decision.analyze` internally:
   - Extracts key findings from report
   - Fetches real-time market data (Polymarket odds / CoinGecko price)
   - Generates structured DecisionCard (confidence A+-F, risk level A-D, thesis)
3. DecisionCard renders inline (same component as Chat-mode decisions)
4. User reviews → Confirm → Saved to Decisions tab
5. **Complete loop**: Discover (Alpha Radar) → Research (Deep Research) → Decide (Decision Card) → Act (Paper Trade) → Record (Journal) → Review

#### 11g: API Endpoint

```
POST /api/research/deep
Body: { topic, workspaceId }  // Only 2 required fields — fully auto
Response: SSE stream of research progress events:
  - research:started { topic, mode, estimatedSteps }
  - research:step { stepName, stepNumber, totalSteps, detail, toolName?, inputPreview?, outputPreview? }
  - research:complete { report data (full ResearchReport object) }
  - research:error { message }

GET /api/research/sessions          // List past research sessions
GET /api/research/sessions/:id       // Single session status + report
```

#### Scenario: Complete Deep Research Lifecycle (Grill-me Finalized)
- **WHEN** user opens Dashboard → sees Alpha Radar "France vs Brazil" card
- **AND** clicks "Research this" on card
- **THEN** system navigates to Workspace (creates if needed) → Research tab → Deep Research mode
- **AND** topic pre-filled as "France vs Brazil World Cup betting analysis"
- **AND** user clicks "Start" (no config needed)
- **THEN** progress panel shows DeepResearch-style step flow:
  - Step 1✓ Decompose into sub-questions
  - Step 2✓ Search **Exa MCP** (news, odds analysis)
  - Step 3✓ Search Semantic Scholar (academic sports prediction models)
  - Step 4✓ Search Reddit (r/soccer community sentiment)
  - Step 5○ Reading URLs via Jina (current, with live preview)
  - Step 6□ Analyze cross-references
  - Step 7□ Synthesize report
- **AND** after ~3 minutes, dual-pane report renders:
  - Left nav: Executive Summary / Findings (4 items) / Data Sources / Conclusion
  - Right content: full markdown with evidence, source links, relevance badges
- **AND** bottom toolbar shows: [← Chat] [Follow-up] [Decision] [Export] [Copy Link]
- **AND** user clicks "Generate Decision" → AI outputs DecisionCard (confidence B+, risk B, thesis, reasons)
- **AND** user confirms → Decision saved → appears in Decisions tab
- **AND** full closed-loop verified: Alpha Radar → Deep Research → Decision

---

### REQ-MVP-12: Academic Search Skills (NEW in v2)

> Three free academic search APIs integrated to power Deep Research's literature discovery capability.

#### 12a: Semantic Scholar (P0 — Primary Academic Source)

**Provider**: Allen Institute for AI (Ai2) — Paul Allen's nonprofit
**API**: `https://api.semanticscholar.org/graph/v1`
**Coverage**: 214M+ papers, AI-generated TLDR summaries, citation analysis
**Cost**: Completely free. No API key required (1000 req/sec shared). Optional free key = 1 req/sec dedicated.
**Why P0**: Best free academic search. AI TLDRs are perfect for report summaries. Citation context (supportive vs contradicting) unique feature.

**Skill**: `academic.semanticscholar`
```typescript
// Methods:
semanticscholar.search(query, limit?, year?)  // Paper search with relevance ranking
semanticscholar.details(paperId)              // Full paper metadata + abstract + TLDR
semanticscholar.citations(paperId)            // Papers that cite this one
semanticscholar.references(paperId)           // Papers referenced by this one
// Returns: Paper[] { paperId, title, authors[], year, abstract, tldr, citationCount, url, openAccessPdf, venue }
```

#### 12b: Crossref (P1 — Supplementary Metadata)

**Provider**: Crossref — DOI registration agency (20,000+ publisher members)
**API**: `https://api.crossref.org/works`
**Coverage**: 88M+ works (journal articles, books, conference proceedings, datasets)
**Cost**: Free. No API key required (50 req/sec anonymous). Email in User-Agent header recommended.
**Why P1**: Broadest coverage of published works. DOI resolution. Good complement to Semantic Scholar for recent publications that may not yet be indexed there.

**Skill**: `academic.crossref`
```typescript
// Methods:
crossref.search(query, rows?, filter?)  // Free-text search across all works
crossref.byDOI(doi)                    // Get metadata for specific DOI
// Returns: Work[] { DOI, title[], author[], published, container-title, ISSN, type, link[] }
```

#### 12c: OpenAlex (P2 — Backup/Extended Coverage)

**Provider**: OpenAlex — open scholarly infrastructure
**API**: `https://api.openalex.org/works`
**Coverage**: 250M+ works, citation networks, concept tags
**Cost**: Completely free and open. No API key needed.
**Why P2**: Largest coverage of the three. Good fallback when Semantic Scholar/Crossref miss niche topics. Concept tagging useful for categorizing research areas.

**Skill**: `academic.openalex`
```typescript
// Methods:
openalex.search(query, per_page?, filter?)  // Search works
openalex.work(workId)                       // Get work by ID
// Returns: Work[] { id, title, publication_year, cited_by_count, primary_location, concepts[], open_access, ids }
```

#### Usage in Deep Research ReAct Loop

When Deep Research agent needs academic context:
1. **Primary**: Call `semantic_scholar.search(topic)` — get relevant papers with AI TLDRs
2. **Supplement**: Call `crossref.search(topic)` — find recent publications, DOI links
3. **Fallback**: If both return sparse results, call `openalex.search(topic)` — broader net
4. For high-relevance papers: call `semanticscholar.details(paperId)` — get full abstract + TLDR for synthesis
5. All findings tagged with `[Academic]` source badge in final report

#### Scenario: Academic search in Deep Research
- **WHEN** Deep Research topic is "ETH ETF approval impact analysis"
- **AND** agent determines academic context would strengthen findings
- **THEN** agent calls `semantic_scholar.search("ETH ETF approval impact")` → returns 15 papers
- **AND** picks top 5 by relevance + citation count
- **AND** calls `semanticscholar.details(paperId)` for each → gets TLDR + abstract
- **AND** includes academic findings in report with `[Semantic Scholar]` source tag
- **AND** report's Data Sources section lists: "Semantic Scholar: 5 papers, Crossref: 3 works"

- **AND** includes academic findings in report with `[Semantic Scholar]` source tag
- **AND** report's Data Sources section lists: "Semantic Scholar: 5 papers, Crossref: 3 works"

---

### REQ-MVP-13: Review Workflow (Detailed — Grill-me Finalized)

> The Review system is the **growth loop** of Trading Pi. It turns experience into wisdom.

#### 13a: Review Report Schema (7-Section Enhanced)

```typescript
interface ReviewReport {
  id: string;
  workspaceId: string;
  generatedAt: string;
  periodStart: string;     // Review period start
  periodEnd: string;       // Review period end

  // === Section 1: Overview ===
  overview: {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;           // e.g., 0.65
    totalPnL: number;          // e.g., +2.35
    totalPnLPercent: number;   // e.g., +12.5
    avgTradePnL: number;
    bestTrade: { topic: string; pnl: number };
    worstTrade: { topic: string; pnl: number };
    longestWinStreak: number;
    longestLossStreak: number;
  };

  // === Section 2: Per-Trade Analysis ===
  tradeAnalyses: TradeAnalysis[];
  // Each: decisionId, topic, direction, result(win/loss), pnl,
  //        reasoningAtTime (what I thought then),
  //        actualOutcome (what actually happened),
  //        reasoningAccuracy (did my reasoning match outcome? true/partial/false)

  // === Section 3: Error Summary ===
  errorSummary: {
    commonMistakes: string[];       // e.g., ["FOMO entry", "ignored stop-loss", "overleveraged"]
    mistakeFrequency: Record<string, number>;  // { "FOMO entry": 3, "ignored stop-loss": 2 }
    lossConcentration: string;      // where are losses concentrated? e.g., "60% of losses from prediction markets"
    biggestContributorToLoss: string;  // single largest cause
  };

  // === Section 4: Improvement Suggestions ===
  suggestions: ImprovementSuggestion[];
  // Each: title, description, category(behavioral/technical/emotional), priority(high/medium/low), actionable(true), difficulty(easy/medium/hard)

  // === Section 5: Emotion Analysis ===
  emotionAnalysis: {
    emotionDistribution: Record<string, number>;  // { "calm": 5, "fomo": 3, "fear": 2 }
    emotionVsResult: { emotion: string; avgPnL: number; winRate: number }[];
    problematicEmotions: string[];  // emotions correlated with losses
    recommendedAdjustment: string;  // e.g., "You tend to FOMO on volatile days. Consider a 30-min cooldown rule."
  };

  // === Section 6: Rule Compliance Check ===
  ruleCompliance: {
    userRules: string[];          // active User Rules from Settings
    complianceRate: number;       // e.g., 0.85 = 85% of trades followed rules
    violations: RuleViolation[];  // each: ruleText, violatedAt(tradeId), consequence(pnl impact)
    mostViolatedRule: string;
    suggestion: string;            // e.g., "Rule '单笔≤1U' was violated 2 times. Consider stricter enforcement."
  };

  // === Section 7: Historical Comparison ===
  historicalComparison: {
    previousPeriodOverview?: Partial<ReviewReport['overview']>;  // null if first review
    trendDirection: 'improving' | 'declining' | 'stable';
    keyChanges: string[];          // e.g., ["Win rate up 10%", "FOMO trades down 50%"]
    streakStatus: string;          // e.g., "Current: 3-win streak (best: 5)"
    nextTarget: string;            // e.g., "Target: 70% win rate (current: 65%)"
  };

  // Metadata
  aiModel: string;
  tokenUsage: { input: number; output: number };
}
```

#### 13b: Review Trigger

**Manual trigger only** (MVP):
- Workspace → Review tab → "Request Review" button
- Evolution page → "Run Review" button
- Chat mode: user types "帮我复盘" or "review this workspace"

**NOT auto-triggered** on settlement (to avoid noise). Optional daily reminder can be added in Phase 2.

#### 13c: Review Workflow (`review.workspace`)

**Input**: `{ workspaceId, period? }` (period defaults to "all time" or last N days)

**Process**:
1. Fetch all Decisions for workspace with status `settled_win` or `settled_loss`
2. Fetch all Journal entries for workspace
3. Fetch User Rules from Settings
4. For each settled decision:
   - Compare reasoning (supporting_reasons + thesis) vs actual outcome
   - Classify reasoning accuracy: correct / partially correct / incorrect
   - Tag emotion if available from journal
5. Aggregate statistics for Overview section
6. Identify common mistake patterns (cluster analysis)
7. Generate improvement suggestions based on patterns
8. Analyze emotion distribution and correlation with results
9. Check User Rules compliance per trade
10. Compare with previous review (if exists) for historical trends
11. Output structured ReviewReport (7 sections)

#### Scenario: Complete Review generation
- **WHEN** user opens Workspace "世界杯2026" → Review tab → clicks "Request Review"
- **THEN** agent gathers all decisions + journals + rules for that workspace
- **AND** generates 7-section Review Report:
  - Overview: "5 trades, 3W/2L, 60% win rate, +$1.20 total P&L"
  - Per-trade: Each decision with reasoning vs outcome comparison
  - Errors: "Most common mistake: FOMO entry after news (occurred 2 times)"
  - Suggestions: [1] "Add cooldown rule after big news events" [2] "Reduce position size on high-volatility days"
  - Emotions: "Calm trades: 80% win rate. FOMO trades: 25% win rate."
  - Rules: "Rule '单笔≤1U': 100% compliant. Rule '不追高': 40% compliant (2 violations)"
  - History: "vs previous review: Win rate improved +10%, FOMO trades reduced by half"
- **AND** report renders in Review tab with collapsible sections
- **AND** improvement suggestions feed into Evolution page

---

### REQ-MVP-14: Journal Entry Schema (4-Dimension Recording)

> Journal is the behavioral memory layer. Every action is recorded.

```typescript
interface JournalEntry {
  id: string;
  workspaceId: string;
  decisionId?: string;         // Link to parent Decision (if from Paper Trade)
  reviewId?: string;           // Link to post-review reflection (if reviewed)

  // === Dimension 1: Trade Data (P0) ===
  tradeData: {
    direction: "LONG" | "SHORT" | "YES" | "NO";
    asset: string;             // e.g., "ETH", "France vs Brazil YES"
    entryPrice: number;
    exitPrice?: number;        // null if still open
    positionSize: number;      // in U (units)
    entryTime: string;         // ISO timestamp
    exitTime?: string;         // ISO timestamp (null if open)
    pnl?: number;              // realized P&L (null if open)
    pnlPercent?: number;       // P&L as percentage
    holdingDuration?: string;  // e.g., "2h 15m" or "3d"
    settlementReason?: string; // e.g., "target_hit", "stop_loss", "manual", "market_settled"
  };

  // === Dimension 2: Decision Reasoning (P0) ===
  reasoning: {
    whyEntered: string;        // Why did I make this trade? (free text)
    evidenceCited: string[];   // What sources did I rely on? (e.g., ["Deep Research report", "Polymarket odds 62%", "Reddit sentiment bullish"])
    confidenceAtEntry: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
    riskPerceptionAtEntry: "low" | "medium" | "high";  // How risky did I think it was?
    expectedOutcome: string;   // What did I expect to happen?
    thesis: string;            // One-line core thesis at entry time
  };

  // === Dimension 3: Emotion Tag (P1) ===
  emotion?: {
    tag: "calm" | "confident" | "fomo" | "fear" | "greedy" | "frustrated" | "neutral" | "uncertain";
    intensity: 1 | 2 | 3 | 4 | 5;  // 1=mild, 5=extreme
    note?: string;             // Optional free-text about emotional state
  };

  // === Dimension 4: Post-Review Reflection (P0) ===
  reflection?: {
    actualReason: string;      // What was the REAL reason it worked/didn't work? (filled after settlement/review)
    wouldDoDifferently: string; // If I could do it again, what would I change?
    lessonLearned: string;     // One-sentence takeaway
    ruleCreated?: string;      // New personal rule derived from this experience (can be proposed to User Rules)
  };

  createdAt: string;
  updatedAt: string;
}
```

**Auto-population**:
- When Paper Trade executes: Dimensions 1+2 auto-filled from Decision record
- Emotion (Dimension 3): User can tag manually OR AI infers from chat context during decision
- Reflection (Dimension 4): Auto-filled when Review runs (agent analyzes outcome vs expectation)

---

### REQ-MVP-15: Timeline Event Types (4 Categories)

> Timeline records everything the Agent does AND everything the User does. It's the complete audit trail.

```typescript
type TimelineEvent = {
  id: string;
  workspaceId?: string;
  timestamp: string;

  // === Common fields ===
  type: EventType;
  category: EventCategory;
  title: string;           // Short description
  detail?: string;         // Longer detail / payload preview
  status: "running" | "success" | "failed" | "cancelled";
  durationMs?: number;     // How long it took
  metadata?: Record<string, unknown>;
};

type EventCategory =
  | "tool_call"       // Category 1: Tool Execution (P0)
  | "user_action"     // Category 2: User Actions (P0)
  | "system_event"    // Category 3: System Events (P0)
  | "milestone";      // Category 4: Milestones (P2)

// --- Category 1: Tool Calls ---
type ToolCallEvent = TimelineEvent & {
  category: "tool_call";
  toolName: string;         // e.g., "mcp.exa.web_search", "jina.read", "polymarket.detail"
  inputSummary: string;     // Truncated input (e.g., 'query="ETH price"')
  outputSummary: string;    // Truncated output (e.g., 'found 12 results')
  tokenCost?: number;
  triggeredBy: "agent" | "workflow" | "user";
};

// --- Category 2: User Actions ---
type UserActionEvent = TimelineEvent & {
  category: "user_action";
  actionType:
    | "workspace_created" | "workspace_deleted" | "workspace_renamed"
    | "deep_research_started" | "deep_research_cancelled"
    | "decision_confirmed" | "decision_edited"
    | "paper_trade_executed" | "paper_trade_closed"
    | "review_requested"
    | "journal_entry_created"
    | "settings_changed"
    | "rule_added" | "rule_removed"
    | "message_sent"
    | "artifact_exported"
    | "favorite_toggled";
  targetId?: string;        // ID of affected resource
};

// --- Category 3: System Events ---
type SystemEvent = TimelineEvent & {
  category: "system_event";
  eventType:
    | "alpha_radar_scan_complete"    // Alpha Radar finished scanning
    | "paper_trade_settled"          // A paper trade reached settlement
    | "review_generated"             // A review report was created
    | "warning"                      // System warning (rate limit, API error)
    | "error"                        // System error (failed workflow)
    | "session_started" | "session_ended"
    | "data_refreshed"               // Cache invalidated, data refreshed
    | "scheduled_reminder";           // Time-based reminder fired
  severity?: "info" | "warning" | "error" | "critical";
};

// --- Category 4: Milestones (P2) ---
type MilestoneEvent = TimelineEvent & {
  category: "milestone";
  milestoneType:
    | "first_deep_research"
    | "first_decision"
    | "first_paper_trade"
    | "first_review"
    | "first_profit"                // First winning trade
    | "consecutive_wins_3"          // 3+ win streak
    | "consecutive_losses_3"        // 3+ loss streak (warning)
    | "total_trades_10"             // 10 trades milestone
    | "pnl_milestone_positive"      // First time total P&L went positive
    | "rule_created_from_review"    // User adopted AI-suggested rule
    | "streak_broken";              // Notable pattern change
  badge?: string;           // Emoji or icon for the milestone
};
```

**Timeline Page Display**:
- Chronological feed (newest first) with event cards
- Filter by: category (all/tool/user/system/milestone), workspace, date range, status
- Each card shows: icon (by category), title, detail preview, timestamp, status badge
- Click → expand full detail (full input/output for tool calls, etc.)
- Summary stats at top: total events today, tool calls count, user actions count, errors count

---

### REQ-MVP-16: Paper Trade Lifecycle Workflow (`paper.trade.lifecycle`)

> Fully automatic lifecycle: Decision → Execute → Journal → Settlement → P&L → Review trigger.

**Trigger**: User confirms a Decision Card (clicks "Confirm" button).

**Process**:

```
Decision Confirmed by User
  ↓
Step 1: Create Paper Trade Record
  ├─ Copy decision data → paper_trade record
  ├─ Set status: "open"
  ├─ Record entry_time = now()
  ├─ Record entry_price = current market price (from Polymarket/CoinGecko)
  └─ Create Journal Entry (Dimensions 1+2 auto-filled)

  ↓
Step 2: Active Monitoring (background)
  ├─ For Prediction Markets: poll settlement status periodically
  │   └─ When market settles → resolve to Step 3
  ├─ For Crypto: wait for manual close OR target/stop hit
  │   └─ User clicks "Close Position" → resolve to Step 3
  └─ Status displayed: "OPEN · +$0.00 · entered 2h ago"

  ↓
Step 3: Settlement / Close
  ├─ Record exit_price = current price (or settlement price)
  ├─ Calculate P&L = (exit_price - entry_price) × position_size
  ├─ Update paper_trade status: "closed"
  ├─ Update decision status: "settled_win" or "settled_loss"
  │   └─ Set result_pnl on decision record
  ├─ Update Journal Entry: fill exit data + P&L
  └─ Create Timeline Event: "paper_trade_settled"

  ↓
Step 4: Review Suggestion (optional notification)
  └─ Show toast/badge: "Paper Trade settled (+$0.32). Run Review?"
```

**Database**: `paper_trades` table
```sql
CREATE TABLE IF NOT EXISTS paper_trades (
    id TEXT PRIMARY KEY,
    decision_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    asset TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    position_size REAL NOT NULL,
    pnl REAL,
    pnl_percent REAL,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    status TEXT NOT NULL DEFAULT 'open',  -- open/closed/cancelled
    settlement_reason TEXT,
    FOREIGN KEY (decision_id) REFERENCES decisions(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

**UI Integration**:
- Decision Card "Confirm" button → auto-executes Paper Trade
- Workspace/Decisions tab shows live P&L for open positions (updates via polling)
- Workspace/Journal tab shows new entry immediately after confirmation
- After settlement: Decision card updates with green/red result badge + P&L

---

### REQ-MVP-17: Evolution Page (Standalone 7th Route)

> Evolution aggregates learning from Reviews and presents actionable improvement paths.
> **This is NOT automatic evolution** — it's advice-based. The human decides.

**Route**: `/evolution`
**Nav item**: "Evolution" (with DNA/spiral icon)

**Page Sections**:

**Section 1: Progress Dashboard**
- Win rate over time (line chart or simple stat trend)
- Total P&L curve
- Trade frequency (trades per week)
- Current streak (win/loss)
- Best performing workspace/topic
- Key metric: "You've improved X% since starting"

**Section 2: Improvement Feed**
- Chronological list of ALL improvement suggestions from past Reviews
- Each suggestion card: title, source review date, category tag, adoption status (pending/adopted/dismissed)
- Click "Adopt" → converts to User Rule in Settings
- Click "Dismiss" → marks as read but not adopted
- Filter by: category (behavioral/technical/emotional), status, workspace

**Section 3: Pattern Highlights** (AI-generated insights)
- "Your strongest pattern: Crypto trades on calm days (75% win rate)"
- "Your weakest pattern: Prediction market bets within 24h of news (20% win rate)"
- "Emotion insight: Your confident trades outperform fearful ones 3:1"
- "Rule gap: You set 'no FOMO' but violated it 3 times this month"

**Section 4: Rule Workshop**
- Current User Rules list (from Settings)
- AI-suggested rules (from Review patterns) pending adoption
- "Suggest New Rules" button → AI analyzes all reviews → proposes 3-5 candidate rules
- Adopt/Reject per rule

**Section 5: Quick Actions**
- "Run Review" → triggers review for most active workspace
- "Export Evolution Report" → downloads summary of all learnings
- "Reset Statistics" (with confirmation) — start fresh

**Backend Support**:
- `GET /api/evolution/summary` — progress metrics + pattern highlights
- `GET /api/evolution/suggestions` — all improvement suggestions with adoption status
- `POST /api/evolution/suggest-rules` — AI analyzes reviews → proposes rules
- `POST /api/evolution/rules/:id/adopt` — adopt suggested rule → writes to User Rules
- `evolution.propose` workflow — generates improvement suggestions from review history

---

### REQ-MVP-18: User Rules Decision Integration

> User Rules are checked at every decision point. They are your personal trading constitution.

**Settings UI** (existing):
- Text area: one rule per line (e.g., "max position size: 1U", "no trades within 1h of major news")
- Rules stored in memory domain "user_rules"
- CRUD: add/remove/edit rules

**NEW: Decision-Time Rule Check**

When user requests a Decision (via "should I buy?" or Deep Research → Generate Decision):

```
Agent generates DecisionCard
  ↓
BEFORE showing to user, run Rule Compliance Check:
  ├─ Load active User Rules from Settings
  ├─ Evaluate each rule against proposed decision
  │   ├─ Rule: "max position size: 1U" → proposed 2U → ⚠️ VIOLATION
  │   ├─ Rule: "no FOMO trades" → decision made 10min after news → ⚠️ WARNING
  │   └─ Rule: "only prediction markets" → crypto trade → ❌ BLOCK (hard rule?)
  └─ Append Rule Compliance section to DecisionCard:
      ├── ✅ Compliant: 3 rules passed
      ├── ⚠️ Warnings: 1 rule soft-violated ("position > 1U")
      └── Suggestions: "Consider reducing to 1U per your max position rule"
```

**DecisionCard Enhancement**:
```typescript
// Add to existing DecisionCard interface:
ruleCompliance?: {
  totalRules: number;
  passed: number;
  warnings: { rule: string; detail: string }[];
  blocked: boolean;          // If true, suggest NOT proceeding
  message: string;           // Human-readable summary
};
```

**User Experience**:
- DecisionCard always shows rule compliance summary (even if all pass → "All 5 rules ✓")
- Warnings shown in amber/yellow styling
- Blocking violations shown in red with strong warning
- User can STILL confirm decision even with warnings (Human in the loop principle)
- But warnings are prominently displayed — cannot be missed

---

### REQ-MVP-19: Event Feed (Today's Reminders - **FRED + CoinMarketCal, 100% FREE**)

> Dashboard "Today's Reminders" section needs real event data. **All data sources are 100% FREE and OPEN. No paid services required.**

#### 19a: FRED API Skill (`events.fred`) - **100% FREE (Federal Reserve Official Database)**

**Provider**: Federal Reserve Bank of St. Louis (FRED) - Official US Federal Reserve database
**API**: `https://api.stlouisfed.org/fred/`
**Coverage**: **840K+ time series**, 118+ data source agencies, **completely free - no paid plans exist**
**Cost**: **100% FREE**. API key required (free to generate in 30 seconds). Rate limit: 120 req/min.
**Why FRED over TradingEconomics**: TradingEconomics costs $149-199/month after trial. FRED is the gold standard for free macroeconomic data with zero cost.

**Methods**:
```typescript
fred.calendar(releaseDate?, realtimeStart?, realtimeEnd?, limit?)  // Economic release calendar
fred.series(seriesId, ...args)    // Time series data for a specific indicator
fred.search(searchText, limit?)   // Search across all 840K+ series
```

**Returns**: FredEvent[] { id, title, date, importance, category(cpi/unemployment/gdp/rate_decision/etc), source, release_time }

**Key Series IDs for Trading Pi**:
| Indicator | FRED Series ID |
|-----------|---------------|
| Fed Funds Target | `FEDFUNDS` / `DFEDTARU` |
| CPI | `CPIAUCSL` |
| Core PCE | `PCEPILFE` |
| Non-Farm Payrolls | `PAYEMS` |
| Unemployment Rate | `UNRATE` |
| GDP | `GDP` |

**Skill Registration**: `events.fred` in default-skills.ts

**FRED API Key Setup (one-time, 30 seconds)**:
1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Click "Request API Key" -> fill email -> key delivered instantly
3. Paste into `.env`: `FRED_API_KEY=your_key_here`
4. Done. No payment, no trial expiration, no limits beyond 120 req/min

#### 19b: CoinMarketCal Skill (`events.coinmarketcal`) - **FREE via RapidAPI**

**Provider**: CoinMarketCal (via RapidAPI)
**Coverage**: Crypto-native events: token listings, unlocks, airdrops, upgrades, exchange listings
**Cost**: Free tier on RapidAPI (no credit card needed)
**Use case**: Crypto-native events for Alpha Radar discovery

**Methods**:
```typescript
coinmarketcal.events(days?, coins?, types?)  // Upcoming crypto events
coinmarketcal.today()                          // Events happening today
```

**Returns**: CryptoEvent[] { title, date, coins[], type(listing/unlock/airdrop/etc), description, source_url }

**Skill Registration**: `events.coinmarketcal` in default-skills.ts

#### 19c: Dashboard Integration

**"Today's Reminders" section** on Dashboard (ALL FREE data sources):
- Macro events from **FRED API** (Federal Reserve, free) + Crypto events from **CoinMarketCal** (free via RapidAPI)
- Macro events shown with importance color coding ([RED] high / [YEL] medium / [GRN] low)
- Crypto events shown with type icons
- Events cached 30min, refreshes on Dashboard mount
- "View Full Calendar" links to external source or expands inline
- Events also feed into Alpha Radar as context ("upcoming FOMC may impact odds")

#### Scenario: Dashboard shows real events (ALL FREE)
- **WHEN** user opens Dashboard
- **THEN** "Today's Reminders" shows real events from **FRED (macro, free)** + **CoinMarketCal (crypto, free)**
- **AND** ALL data sources are 100% free and open
- **AND** macro events show importance level and time
- **AND** crypto events show affected tokens
- **AND** clicking event shows detail tooltip or expand
- **AND** Alpha Radar can cross-reference upcoming events when scoring opportunities

---

### REQ-MVP-20: Sub-Agent Architecture (Workflow-as-SubAgent + pi-subagents Compatible)

> **Core Principle**: All complex agents (Deep Research, Alpha Radar, Review, Evolution, Paper Trade) run as **Sub-Agents** of the main TradingPiAgent. The system follows the `pi-subagents` ecosystem conventions so that existing frontend UI components (WorkspaceStatusFloat, SubagentDetailSidebar, subagents.ts state machine) work out-of-the-box.

#### 20a: Architecture Decision — Path A: Workflow-as-SubAgent

**Why not a full multi-agent system?**
- AGENTS.md explicitly states "Single Agent Architecture"
- pi-agent-core has no native sub-agent support
- MVP needs sub-agents for UX (progress tracking, non-blocking execution), NOT for true parallel autonomy

**How it works**:
1. Register an `"Agent"` tool in SkillRegistry (same name as pi-subagents convention)
2. When main agent calls `Agent({ agent_type: "deep-research", prompt: "...", background: false })`, the tool:
   - Looks up the agent type definition from `.pi/agents/*.md`
   - Creates a SubAgentSession with its own lifecycle
   - Executes the corresponding WorkflowEngine.run() internally
   - Emits `subagents:*` SSE events at each lifecycle stage
   - Returns the result (foreground) or returns ID immediately (background)
3. Frontend's existing `subagents.ts` receives events → updates state → renders UI

**Borrowed from `@yzlin/pi-subagents`** (source code reference):
- Agent type definition format (YAML frontmatter in `.md` files)
- Tool naming convention (`Agent`, `StopAgent`, `AgentStatus`)
- SSE event protocol (`subagents:created/started/step/completed/failed/cancelled`)
- Foreground vs background execution model
- Context inheritance option (fork parent conversation into sub-agent)

**NOT borrowed** (we implement ourselves):
- Pi CLI extension loading mechanism (we load from our own directory)
- TUI/widget rendering (our frontend already has this)
- Git worktree isolation / tmux interactive sessions (not needed for web app)

#### 20b: 5 Built-in Sub-Agent Types (.md definitions)

| Agent | File | Default Mode | Tools | Icon | Trigger |
|-------|------|-------------|-------|------|---------|
| **Deep Research** | `deep-research.md` | Foreground | search, academic×3, reddit, polymarket, coingecko | 🔬 | User in Workspace/Research |
| **Alpha Radar** | `alpha-radar.md` | Background | polymarket, **exa-mcp**, reddit, fred, coinmarketcal, coingecko | 📡 | Dashboard auto on mount |
| **Review** | `review.md` | Foreground | decisions repo, journal repo, user-rules memory | 📊 | User clicks "Request Review" |
| **Evolution** | `evolution.md` | Background | review history, rule suggestions, patterns | 🧬 | Evolution page or post-Review |
| **Paper Trade** | `paper-trade.md` | Foreground | decision record, market price API, journal repo | 📝 | Auto on Decision confirm |

Each `.md` file contains YAML frontmatter with: `name`, `display_name`, `description`, `system_prompt`, `tools[]`, `model?`, `thinking_level?`, `max_turns?`, `background_capable`, `default_mode`, `icon`, `color`.

Stored in: `packages/core/src/agents/`

#### 20c: Sub-Agent Lifecycle & SSE Event Protocol

**6 Events** (compatible with frontend `subagents.ts`):
1. `subagents:created` — { id, agentType, description, source: "foreground"|"background" }
2. `subagents:started` — { id, agentType, prompt }
3. `subagents:step` — { id, stepName, stepNumber, totalSteps, detail?, tokenUsage? } (emitted per workflow step)
4. `subagents:completed` — { id, finalResponse, resultPreview, toolUses, durationMs, tokens }
5. `subagents:failed` — { id, error, durationMs }
6. `subagents:cancelled` — { id, reason }

**3 Tools registered in SkillRegistry**:
- `Agent({ agent_type, prompt, background?, workspace_id?, decision_id? })` — spawn sub-agent
- `StopAgent({ agent_id })` — cancel running sub-agent
- `AgentStatus({ agent_id? })` — list active or get specific status

**Backend**: `SubAgentManager` class handles spawn/stop/list/status + event emission.

#### 20d: Frontend Integration

**Already exists** (zero new code for base):
- `SubagentViewState` type, `applySubagentEvent()` state machine, `WorkspaceStatusFloat` float panel, `SubagentDetailSidebar` detail sidebar

**Wiring added**:
- Workspace/Research tab: inline progress bar for Deep Research steps (1-7)
- Dashboard: mini spinner for background Alpha Radar
- Workspace/Review tab: progress bar for Review sections (1-7)
- Global: WorkspaceStatusFloat visible when ANY sub-agent active

#### Scenario: Full Sub-Agent E2E
- **WHEN** user triggers Deep Research in Workspace → main agent calls `Agent({ agent_type: "deep-research", ... })`
- **THEN** `subagents:created` → float appears "🔬 Deep Research"
- **AND** 7 × `subagents:step` events → progress bar fills (1/7 → 7/7)
- **AND** `subagents:completed` → report renders, float shows "✓ Complete · 23s"
- **AND** clicking float → SubagentDetailSidebar opens with full log
- **WHEN** Dashboard loads simultaneously → Alpha Radar runs as background sub-agent
- **AND** BOTH agents visible together in WorkspaceStatusFloat

---

### REQ-MVP-21: UI Detail Supplement (Page-Level Visual Specifications)

> **Purpose**: This requirement supplements all page-level UI gaps identified during the Round 3 grill-me session. It provides component-level visual specifications for pages that previously had only concept-level or schema-level descriptions.

#### 21a: Markets Page — List + Detail Sidebar (Enhanced from REQ-MVP-3)

**Layout**: Split-pane view. Left 60% = market list. Right 40% = detail sidebar (collapsible, slides in on card click).

**Left Pane — Market List**:
```
┌─ Markets ────────────────────────────────────────┐
│ [🔍 Search markets...]     [★ Favorites] [⚙️]    │
│                                                    │
│ [Crypto Spot]  [Prediction Markets]   ← tabs      │
│                                                    │
│ ┌─ Card ─────┐ ┌─ Card ─────┐ ┌─ Card ─────┐     │
│ │ ETH        │ │ BTC        │ │ SOL        │     │
│ │ $3,421.50  │ │ $67,234    │ │ $142.30    │     │
│ │ △+2.3%     │ │ ▽-0.8%     │ │ △+5.1%     │     │
│ │ ~~~~~~~~   │ │ ~~~~~~~~   │ │ ~~~~~~~~   │ ← sparkline |
│ │ Vol: $2.1B │ │ Vol: $8.9B │ │ Vol: $890M │     │
│ │ ★          │ │            │ │ ★          │     │
│ └────────────┘ └────────────┘ └────────────┘     │
│ ... (responsive grid, 2-3 cols)                   │
└────────────────────────────────────────────────────┘
```

**Card fields per tab**:

| Field | Crypto Spot Tab | Prediction Markets Tab |
|-------|----------------|----------------------|
| Name | Coin symbol + name | Question text (truncated) |
| Price / Odds | Current price (USD) | YES% / NO% probabilities |
| 24h Change | % change + color | 24h odds shift |
| Sparkline | 7d mini price chart | 7d mini odds trend |
| Volume | 24h volume | 24h volume ($USD) |
| Favorite | Star toggle (persisted) | Star toggle (persisted) |

**Right Pane — Detail Sidebar** (slides in on card click, glassmorphism panel):

```
┌─ Market Detail ────────── [✕] ───────────┐
│                                             │
│  Ethereum (ETH)              [★ Favorite]  │
│  $3,421.50  △+2.3% (24h)                  │
│                                             │
│  ═══ Price Chart (7d/30d/90d) ═══         │
│  ┌──────────────────────────────────┐      │
│  │     ╱╲    candlestick chart      │      │
│  │   ╱  ╲  ╱╲   (lightweight-       │      │
│  │  ╱    ╲╱  ╲   charts)            │      │
│  │ ╱          ╲                     │      │
│  └──────────────────────────────────┘      │
│  Volume bar below candles                   │
│                                             │
│  ═══ Quick Actions ═══                      │
│  [🔬 Research]  [📝 Decision]  [📰 News]   │
│                                             │
│  ═══ Paper Trade Position ═══ (P1)         │
│  ┌─ OPEN · LONG · 1U ──────────────────┐   │
│  │ Entry: $3,380  Now: $3,421.50       │   │
│  │ P&L: +$41.50 (+1.2%) 🟢             │   │
│  │ Entered: 2h ago                     │   │
│  │ [Close Position]                    │   │
│  └─────────────────────────────────────┘   │
│  (hidden if no active position)             │
│                                             │
│  ═══ Order Book (P1) ═══                   │
│  BID           ASK                         │
│  3,421.00  12.5  │  3,421.50  8.3         │
│  3,420.50  24.1  │  3,422.00  15.7        │
│  3,420.00  18.9  │  3,422.50  6.2         │
│  (read-only depth display)                 │
│                                             │
│  ═══ Key Metrics ═══                       │
│  MCap: $412B  Rank: #2                     │
│  7d High: $3,510  Low: $3,200             │
│  ATH: $4,891                              │
└─────────────────────────────────────────────┘
```

**Chart Library**: `lightweight-charts` by TradingView (open source)
- npm: `lightweight-charts` (~300KB gzipped)
- MVP usage: CandlestickSeries + HistogramSeries (volume) only
- Time range selector: 7D / 30D / 90D buttons above chart
- Crosshair enabled (shows price/date on hover)
- Zoom/pan supported (mouse wheel + drag)
- Theme: dark mode matching design.md (bg-card, cyan accent for up, red for down)

**Quick Action Buttons**:
- "Research" → opens Workspace with this asset pre-loaded, triggers Deep Research
- "Create Decision" → opens DecisionForm pre-filled with this asset
- "News" → searches **Exa MCP**/Jina for latest news about this asset

**Prediction Markets variant**: Replace price chart with odds trend line. Replace order book with Polymarket order book (if CLOB data available). Add settlement countdown timer.

**Dependencies**: `npm install lightweight-charts`

#### 21b: Workspace/Overview — Dashboard Card Style (Enhanced from REQ-MVP-4b Tab1)

**Layout**: Dashboard-style grid of info cards + activity feed.

```
┌─ Overview: World Cup 2026 ─────────────────────┐
│                                                   │
│ ┌─ Workspace Info ──────────────────────────┐   │
│ │ 🏆 World Cup 2026  ·  Created Jun 10      │   │
│ │ Prediction Markets · 5 decisions · 3 wins  │   │
│ │ Linked: France vs Brazil (Polymarket)      │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Win Rate ──┐ ┌─ Total P&L ──┐ ┌─ Trades ───┐ │
│ │    60%      │ │   +$12.40   │ │     5      │ │
│ │  △+5% vs   │ │  🟢 profit  │ │  3W / 2L   │ │
│ │  last week  │ │             │ │            │ │
│ └─────────────┘ └─────────────┘ └────────────┘ │
│                                                   │
│ ┌─ Active Positions ─────────────────────────┐   │
│ │ 🟢 FRA YES · +$0.32 (entered yesterday)    │   │
│ │ 🔴 BTC SHORT · -$0.15 (entered 3d ago)    │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Recent Activity ──────────────────────────┐   │
│ │ 10:30  ✅ Decision: FRA YES 1U  [B+]       │   │
│ │ 09:15  🔬 Research completed: ETH analysis │   │
│ │ Yesterday  📊 Review: Week 23 results       │   │
│ │ 2d ago  💰 Settled: FRA vs BRAZ +$0.32    │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ [📝 New Decision]  [🔬 Start Research]  [📋 Request Review] │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Components**:
1. **Workspace Header Card**: Glassmorphism card with workspace metadata (name, description, creation date, linked markets, tag badges)
2. **Metric Cards (×3)**: Mini stat cards using `bg-card/70` style
   - Win Rate: number + trend arrow vs previous period
   - Total P&L: number + color (green/red)
   - Trade Count: W/L breakdown
3. **Active Positions List**: Compact cards for open paper trades (direction badge, P&L, entry time). Click → expands to full position detail.
4. **Activity Feed**: Chronological list (last 10 events), each with icon + timestamp + description. Same event types as Timeline but workspace-scoped.
5. **Quick Actions Row**: 3 primary action buttons at bottom

**Data sources**: Workspace metadata (from GET /api/workspaces/:id), Decisions summary (GET /api/decisions?workspace_id=), Paper Trades (GET /api/paper-trades?workspace_id=), recent timeline events (GET /api/timeline/events?workspace_id=&limit=10).

#### 21c: Journal Global Page — Stats Bar + Timeline Cards (Enhanced from REQ-MVP-9)

**Layout**: Top stats bar + filter bar + card timeline.

```
┌─ Journal ─────────────────────────────────────────┐
│                                                     │
│ ┌─ Summary ────────────────────────────────────┐   │
│ │  Total: 47    Win Rate: 60%    P&L: +$12.40 │   │
│ │  Best: FRA YES (+$2.10)  Worst: BTC (-$1.80)│   │
│ │  Streak: W2  Avg Confidence: B+              │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Filter: [All Workspaces ▾] [Date Range ▾]          │
│         [Outcome: All ▾] [Asset: All ▾]            │
│                                    [+ Add Entry]   │
│                                                     │
│ ┌─ Journal Entry Card ─────────────────────────┐   │
│ │ 14:32  Jun 13  [World Cup 2026]               │   │
│ │                                             │   │
│ │ LONG  FRA YES  1U                            │   │
│ │ Entry: $0.62  Exit: $0.94  P&L: +$0.32 🟢  │   │
│ │                                             │   │
│ │ Reasoning: Odds undervalued, community...   │   │
│ │ Emotion: 😤 FOMO-driven  Confidence: B+     │   │
│ │ Reflection: Should have waited for...       │   │
│ │                                             │   │
│ │ [Expand Full Detail ▾]  [Linked: Decision#12│   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Journal Entry Card ─────────────────────────┐   │
│ │ 09:15  Jun 12  [General]                     │   │
│ │                                             │   │
│ │ SHORT BTC  0.5U                             │   │
│ │ Entry: $67,500  Status: OPEN · -0.3%        │   │
│ │                                             │   │
│ │ Emotion: 😐 Neutral  Confidence: B-         │   │
│ │                                             │   │
│ │ [Expand Full Detail ▾]  [Linked: Decision#08│   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Export: [CSV] [Markdown]                           │
└─────────────────────────────────────────────────────┘
```

**Card Design** (per JournalEntry):
- **Header row**: Timestamp + Workspace badge (colored pill) + outcome dot (green win / red loss / gray open)
- **Trade Data row**: Direction badge (LONG=green / SHORT=red) + Asset + Size + Entry/Exit prices + P&L (color-coded)
- **Reasoning preview**: Truncated text (max 2 lines), shows decision reasoning snippet
- **Emotion Tag**: Colored chip/badge (😤 FOMO = orange, 😐 Neutral = gray, 🤑 Greedy = yellow, 😨 Fear = blue, 😴 Bored = purple — see REQ-MVP-14 emotion taxonomy)
- **Confidence badge**: A+/A/B+/B/C+/C/D/F with color gradient
- **Reflection preview**: If reviewed, show 1-line reflection snippet
- **Footer**: "Expand Full Detail" accordion link + linked Decision ID
- **Collapsed state**: Shows header + trade data + emotion only (compact)
- **Expanded state**: Shows all 4 dimensions (Trade Data / Reasoning / Emotion / Reflection) in structured sections

**Stats Bar Components** (top):
- 5 inline stat pills: Total Entries | Win Rate | Total P&L | Best Trade | Worst Trade
- Each stat is a mini `bg-card/70` rounded pill with number + label
- Win rate and P&L use color coding (green positive, red negative)

**Filter Bar**:
- Workspace dropdown (multi-select)
- Date range picker (preset: today/week/month/all + custom)
- Outcome filter: All / Wins / Losses / Open
- Asset search (freetext)
- "+ Add Entry" button for manual journaling

**Export**: CSV and Markdown download buttons (reuse existing ExportMenu pattern)

#### 21d: Evolution Page — recharts Visualizations (Enhanced from REQ-MVP-17)

**Chart Library**: `recharts` (React declarative charts, ~50KB)

**Section 1 — Progress Dashboard**:
```
┌─ Progress Dashboard ─────────────────────────────┐
│                                                    │
│ ┌─ Win Rate Trend ────────────┐ ┌─ P&L Curve ──┐ │
│ │  ╱~~╲  recharts LineChart    │ │  ╱╲  AreaChart│ │
│ │ ╱    ╲  (win_rate over time) │ │╱  ╲  (cumul.)│ │
│ │╱      ╲                     │ │    ╲  (P&L)   │ │
│ └──────────────────────────────┘ └──────────────┘ │
│                                                    │
│ ┌─ Trade Frequency ─────────────┐ ┌─ Quick Stats ─┐│
│ │ █ █ █   recharts BarChart     │ │ Streak: W2   ││
│ │ █   █ █  (trades per week)    │ │ Best WS: WC  ││
│ │     █ █                      │ │ Conf avg: B+ ││
│ └───────────────────────────────┘ └──────────────┘│
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Win Rate Trend**: `<LineChart>` with rolling 10-trade win rate, x-axis = date, y-axis = 0-100%, stroke = cyan (#06b6d4), dot on each data point
- **P&L Curve**: `<AreaChart>` cumulative P&L over time, fill = gradient green-to-transparent when positive, red when negative
- **Trade Frequency**: `<BarChart>` trades per week, bars colored by net result that week (green if positive week, red if negative)
- **Quick Stats**: Static metric cards (current streak, best performing workspace, average confidence)

**recharts theme integration**:
- All charts use dark background (`bg-card/50`)
- Grid lines: `stroke: rgba(255,255,255,0.06)`
- Text/labels: `fill: rgba(255,255,255,0.6)` (Geist Sans)
- Tooltip: glassmorphism style matching design.md
- Responsive: container width 100%, aspect ratio preserved

**Dependencies**: `npm install recharts`

**Section 2-5** (Improvement Feed / Pattern Highlights / Rule Workshop / Quick Actions): Keep existing functional spec from REQ-MVP-17, add visual notes:
- Improvement Feed: Card list with adoption status badges (Adopted=green, Dismissed=gray, Pending=yellow)
- Pattern Highlights: Text blocks with highlight background (`bg-cyan/10`)
- Rule Workshop: Toggle-switch style rule cards (similar to Settings User Rules section)

#### 21e: Timeline Page — Color-Coded Event Cards (Enhanced from REQ-MVP-15)

**Event Type Visual Differentiation**:

| Event Type | Left Border Color | Icon | Background Tint |
|-----------|-----------------|------|---------------|
| **ToolCall** | Cyan `border-l-cyan-500` | ⚡ | Very subtle cyan tint `bg-cyan/[0.03]` |
| **UserAction** | Green `border-l-emerald-500` | 👤 | Subtle green tint `bg-emerald/[0.03]` |
| **System** | Gray `border-l-gray-500` | ⚙️ | Neutral `bg-gray-[0.02]` |
| **Milestone** | Gold `border-l-amber-400` | 🏆 | Subtle gold tint `bg-amber/[0.05]` |

**Card Layout** (all types share same structure, differentiated by border/icon/color):

```
┌─ Timeline Event Card ───────────────────────────┐
│ ⚡  Tool Call: market.coingecko.quote            │ ← icon + type label
│    Fetching ETH price data...                    │ ← detail preview
│                                               │
│ 14:32:15  Jun 13  ·  230ms  ·  150 tokens    │ ← timestamp + duration + tokens
└───────────────────────────────────────────────┘
     ↑
  colored left border (4px)
```

**Click to expand**: Shows full event payload in a code-style block (monospace font, syntax-highlighted JSON for tool calls, plain text for user actions).

**Milestone cards are visually emphasized**: Slightly larger, gold-tinted background, subtle glow effect (`shadow-lg shadow-amber-500/10`). Milestones act as "chapter breaks" in the timeline feed.

**Filter bar** (top of page): Category checkboxes (ToolCall/UserAction/System/Milestone) + Workspace dropdown + Date range + Status filter (success/error/pending).

#### 21f: Workspace/Review — Accordion Report Rendering (Enhanced from REQ-MVP-13)

**Report Layout**: 7-section collapsible accordion (only one expanded at a time, default=all collapsed except Overview which starts expanded).

```
┌─ Review Report: Week of Jun 7-13 ─────────────┐
│                                                 │
│ ▼ 1. Overview                    ✓ Complete    │ ← expanded by default
│ ┌───────────────────────────────────────────┐  │
│ │ Period: Jun 7-13  Trades: 5  Win: 3  Loss:2│  │
│ │ Total P&L: +$12.40  Win Rate: 60%          │  │
│ │ Key Finding: Best performance on prediction │  │
│ │ markets; crypto spot needs improvement      │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ▶ 2. Per-Trade Analysis                         │ ← collapsible
│ ▶ 3. Error Summary                              │
│ ▶ 4. Improvement Suggestions                    │
│ ▶ 5. Emotion Analysis                           │
│ ▶ 6. Rule Compliance                            │
│ ▶ 7. Historical Comparison                      │
│                                                 │
│ Generated: Jun 13 14:30  ·  AI Model: gpt-4o   │
└─────────────────────────────────────────────────┘
```

**Each Section**:
- **Header**: Number + Title + status icon (✓ if has content, ○ if empty) + expand/collapse chevron
- **Expanded Content**: Structured rendering based on ReviewReport schema fields
  - *Per-Trade*: Table-like rows (one per trade) with direction/P&L/confidence/error tags
  - *Error Summary*: Error cards with frequency count + severity badge + example context
  - *Improvement Suggestions*: Suggestion cards with category tag + adopt/dismiss buttons
  - *Emotion Analysis*: Emotion distribution bar (most common emotions as chips) + insight text
  - *Rule Compliance*: Per-rule pass/fail indicators + violation examples
  - *Historical Comparison**: Mini comparison metrics (this week vs last week vs all-time)
- **Styling**: Each section uses `bg-card/30` with subtle inner borders, consistent with glassmorphism theme

**Accordion behavior**:
- Click header → toggle expand/collapse with framer-motion animation (height auto)
- "Expand All" / "Collapse All" button at top-right of report header
- Section headers always visible (sticky within report container on scroll)

#### 21g: Workspace/Journal Tab — Emotion Chip Cards (Enhanced from REQ-MVP-14)

**Journal Entry Card** (within a Workspace context, filtered to this workspace only):

```
┌─ Journal Entry ─────────────────────────────────┐
│ 14:32  Jun 13                                   │
│                                                  │
│ ┌─ Trade Data ────────────────────────────────┐ │
│ │ LONG  FRA YES  1U  Entry:$0.62  Exit:$0.94  │ │
│ │ P&L: +$0.32 🟢  Duration: 4h                │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ Reasoning ─────────────────────────────────┐ │
│ │ Polymarket odds showed 62% YES but my       │ │
│ │ research suggested 70%+ probability...      │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ Emotion ───────────────────────────────────┐ │
│ │ 😤 FOMO-driven  Pressure: Medium (6/10)     │ │
│ │ Trigger: Saw odds moving fast, felt urgency  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─ Reflection ────────────────────────────────┐ │
│ │ Post-settlement: The odds were indeed        │ │
│ │ undervalued. Next time I should wait for...  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Confidence: B+  Tags: [prediction-market] [fomo] │
└──────────────────────────────────────────────────┘
```

**Emotion Tag Chips** (visual design):
- Rounded pill shape: `rounded-full px-2 py-0.5 text-xs`
- Color mapping (per REQ-MVP-14 emotion taxonomy):
  - 😤 FOMO/Greed/Fear → `bg-orange-500/20 text-orange-300`
  - 😐 Neutral/Calm → `bg-gray-500/20 text-gray-300`
  - 🤑 Overconfident → `bg-yellow-500/20 text-yellow-300`
  - 😨 Fear/Panic → `bg-blue-500/20 text-blue-300`
  - 😴 Bored/Apathetic → `bg-purple-500/20 text-purple-300`
  - 🧠 Analytical → `bg-cyan-500/20 text-cyan-300`
- Pressure level shown as a mini progress bar (0-10) next to emotion chip

**Auto-generated vs Manual indicator**:
- Auto-generated (from decision execution): Small robot icon 🤖 badge
- Manually added: Small pencil icon ✏️ badge

**New Dependencies Summary** (from this entire REQ-MVP-21):
| Package | Purpose | Size | Used In |
|---------|---------|------|---------|
| `lightweight-charts` | K-line/candlestick charts (Markets detail sidebar) | ~300KB | Markets page |
| `recharts` | Statistical charts (Evolution dashboard) | ~50KB | Evolution page |

#### Scenario: All pages have sufficient UI specifications for development
- **WHEN** developer reads the complete spec (REQ-MVP-1 through REQ-MVP-21)
- **THEN** every one of the 7 pages has component-level visual specifications
- **AND** Markets page includes: list layout, detail sidebar, K-line chart (lightweight-charts), quick actions, paper trade position card, order book (P1)
- **AND** Workspace/Overview includes: dashboard card layout (metric cards, activity feed, quick actions)
- **AND** Journal global page includes: stats bar, filter bar, timeline card design with emotion chips, expandable 4-dimension detail
- **AND** Evolution page includes: recharts chart specs (LineChart/AreaChart/BarCard), styling theme integration
- **AND** Timeline page includes: 4-type color-coded event card differentiation (border color + icon + background tint)
- **AND** Workspace/Review includes: 7-section accordion report rendering with expand/collapse behavior
- **AND** Workspace/Journal tab includes: emotion chip card design with color mapping, pressure level bar, auto/manual indicator
- **AND** all new components follow design.md glassmorphism dark theme conventions

---

### REQ-MVP-22: External Data Source Integration (Agent-Reach + Exa MCP)

**Status**: DRAFT | **Priority**: P0 | **Phase**: 1

**Motivation**: Trading Pi OS needs reliable external data sources for Chinese market intelligence (Xueqiu), news aggregation (RSS/Atom), crypto project research (GitHub), and AI-native web search (Exa). This requirement integrates two external toolkits as built-in data source layers and adds a unified doctor/health check system.

**Source**:
- [Agent-Reach](https://github.com/Panniantong/Agent-Reach) (MIT) — ported from Python to TypeScript, pure HTTP only
- [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server) (Apache 2.0) — official MCP server, free tier available

---

#### 22a: reach.xueqiu — 雪球股票数据 (Post-MVP)

> **Status**: Spec complete, implementation deferred to post-MVP

Pure HTTP API for A-share / US-stock / HK-stock quotes, search, community sentiment, and hot rankings via Xueqiu public API. Cookie-based auth (`xq_a_token`). Skills: `reach.xueqiu.quote`, `reach.xueqiu.search`, `reach.xueqiu.hot_posts`, `reach.xueqiu.hot_stocks`, `reach.xueqiu.health`.

**File**: `packages/core/src/reach/xueqiu.ts` (already created)

---

#### 22b: reach.rss — RSS/Atom Feed 解析 (Post-MVP)

> **Status**: Spec complete, implementation deferred to post-MVP

Pure XML parsing in TypeScript for RSS/Atom news feeds. Zero npm dependencies. Skills: `reach.rss.parse`, `reach.rss.entries`, `reach.rss.health`. Cached in SQLite (TTL: 15min).

---

#### 22c: reach.github — GitHub REST API (Post-MVP)

> **Status**: Spec complete, implementation deferred to post-MVP

Direct `api.github.com` REST API calls via `fetch()`. Zero CLI dependencies. Optional `GITHUB_TOKEN` raises rate limit (60→5000 req/h). Skills: `reach.github.search_repos`, `reach.github.get_repo`, `reach.github.readme`, `reach.github.list_issues`, `reach.github.trending`, `reach.github.health`.

---

#### 22d: 现有数据源稳定性修复 ✅ COMPLETED

**Problem**: Multiple data sources fail silently or timeout too aggressively.

| Data Source | Issue | Fix |
|-------------|-------|-----|
| **Polymarket** | `DEFAULT_TIMEOUT_MS = 10_000` too short; DNS fails in CN | → **30_000ms** + retry with exponential backoff |
| **CoinGecko** | Bare `fetch()` with no timeout protection | → AbortController + **15s timeout** |
| **CoinMarketCap** | Same as CoinGecko | → Same fix |
| **DefiLlama** | Same as CoinGecko | → Same fix |

**Centralized timeouts**: `packages/core/src/config/timeouts.ts` — single source of truth for all data source timeout values.

---

#### 22e: reach.doctor — 聚合数据源健康检查 ✅ COMPLETED

Single-entry-point health check for ALL data sources. Returns unified `DoctorReport` JSON consumable by frontend status light panel.

Skill: `reach.doctor` → checks CoinGecko / DefiLlama / FRED / Reddit / CoinMarketCap / Polymarket (parallel). Returns `{ overall: "healthy"|"degraded"|"critical", sources: DataSourceStatus[] }`.

**File**: `packages/core/src/reach/doctor.ts` (already created)

---

#### 22f: Exa MCP Integration (via mcp-hub) — NEW

**Purpose**: Replace direct Exa REST API calls (`search-hub` fetch) with official [Exa MCP Server](https://mcp.exa.ai/mcp) integration through the existing `mcp-hub` package. This provides:
- **Free mode**: No API key required for basic search (hosted at `https://mcp.exa.ai/mcp`)
- **Enhanced mode**: With `EXA_API_KEY`, unlocks code search, contents extraction, deep research
- **More tools**: `web_search_exa`, `web_fetch_exa`, `get_code_context_exa`, `web_search_advanced_exa`
- **Official maintenance**: Exa Labs maintains the MCP server; we don't need to maintain search logic

**Architecture Change**:

```
BEFORE (current):
  search.query skill → SearchHub.exa() → fetch("https://api.exa.ai/search", { x-api-key })

AFTER (target):
  search.query skill → mcp-hub → Exa MCP Server (https://mcp.exa.ai/mcp)
                                    ↓
                          mcp.exa.web_search / mcp.exa.web_fetch /
                          mcp.exa.get_code_context / mcp.exa.web_search_advanced
```

**MCP Server Config**:

```typescript
// In mcp-hub discovery catalog or runtime config:
{
  id: "exa-mcp",
  name: "Exa Search MCP",
  type: "remote",
  url: "https://mcp.exa.ai/mcp",       // Hosted (free, no install)
  // OR for self-hosted:
  // command: "npx", args: ["-y", "exa-mcp-server"],
  env: {
    EXA_API_KEY: process.env.EXA_API_KEY || "",  // Optional — free mode if empty
  },
  tools: [
    "web_search_exa",        // Semantic web search (default on)
    "web_fetch_exa",         // URL → clean markdown content (default on)
    "get_code_context_exa",  // Code-specific search (enable manually)
    "web_search_advanced_exa", // Full filter control (enable manually)
  ],
}
```

**Provider Priority Update** (SearchHub):

```
1. exa-mcp      (if mcp-hub connected → best quality, AI-native)
2. jina         (URL reading, always available)
3. tavily       (backup search, if key configured)
4. free         (fallback: return empty + unavailable message)
```

**Free Tier Limits** (from Exa official docs):
| Mode | Requires Key? | Monthly Limit | Features |
|------|--------------|---------------|----------|
| Free (no key) | No | ~100 requests (undocumented, rate-limited) | Basic web search |
| Free (with key) | Yes | 1,000 searches + $10 credits | All default tools |
| Pro | Pay-as-you-go | Unlimited | $5-7/1K requests |

**Migration Path**:
1. Add Exa MCP server config to `mcp-hub` discovery catalog (replace empty shell entry)
2. Wire `mcp-hub.callTool("exa-mcp", "web_search_exa", {...})` into SearchHub provider chain
3. Keep direct `fetch()` fallback if MCP connection fails (graceful degradation)
4. Update `.env.example`: mark `EXA_API_KEY= # optional — free mode works without key`
5. Register new MCP-based skills: `mcp.exa.search`, `mcp.exa.fetch`, `mcp.exa.code_search`
6. Remove old `search-hub/exa()` direct fetch method (or keep as fallback)

**Env Vars**:
```
EXA_API_KEY=    # Optional. Get from https://dashboard.exa.ai/api-keys
                # Without key: free mode (basic search, rate limited)
                # With key: 1K req/mo + advanced features
```

---

#### 22g: academic.arxiv — arXiv API (AI / Quant / Crypto Papers)

**Purpose**: Search and retrieve academic papers from arXiv preprint server. Covers AI/ML (`cs.AI`, `cs.LG`), Quantitative Finance (`q-fin.*`), Cryptography (`cs.CR`), and more. **100% free, no API key required.**

**API Endpoint** (single REST endpoint):
```
GET http://export.arxiv.org/api/query?search_query={query}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending
```

**Response Format**: Atom 1.0 XML (parse with same XML parser as RSS in 22b).

**Rate Limits**: No hard limit; recommended **3s between requests**, max 30,000 results per query, paginated in slices of 2,000.

**Category Map for Trading Pi OS Domains**:
| Domain | arXiv Categories | Example Query |
|--------|-----------------|---------------|
| AI / ML | `cs.AI`, `cs.LG`, `cs.CL`, `stat.ML` | `cat:cs.LG AND ti:transformer` |
| Quant Finance | `q-fin.*` (all quant-finance subcategories) | `cat:q-fin AND ti:momentum` |
| Crypto / Blockchain | `cs.CR` (cryptography) | `cat:cs.CR AND ti:zero-knowledge` |
| General | `*` (all categories) | `all:deep reinforcement learning trading` |

**Skill Registrations**:
```
academic.arxiv.search     → { query, category?, maxResults?, sortBy? } → ArxivPaper[]
academic.arxiv.detail     → { arxivId }                              → ArxivPaperDetail
academic.arxiv.recent     → { category?, days?, maxResults? }          → ArxivPaper[]
academic.arxiv.trending   → { category?, maxResults? }               → ArxivPaper[]  (sorted by citation proxy)
academic.arxiv.health     → {}                                       → { status, message }
```

**TypeScript Types**:
```typescript
interface ArxivPaper {
  id: string;              // e.g. "2405.12345"
  title: string;
  authors: string[];       // author names
  summary: string;         // abstract text (truncated to 500 chars)
  categories: string[];    // e.g. ["cs.LG", "cs.AI"]
  published: string;       // ISO date
  updated: string;
  pdfUrl: string;         // direct PDF link
  primaryCategory: string; // main category
}

interface ArxivPaperDetail extends ArxivPaper {
  doi?: string;
  comment?: string;        // author comments (journal ref, etc.)
  journalRef?: string;
  relatedDois?: string[];  // from Crossref lookup (optional enrichment)
}
```

**Implementation Notes**:
- Pure HTTP `fetch()` + XML parser (same pattern as RSS in 22b). Zero npm dependencies.
- Use `DATA_SOURCE_TIMEOUTS.arxiv = 15_000`.
- XML namespace-aware parsing required (`{http://www.w3.org/2005/Atom}`).
- Cache results in SQLite cache table (namespace: `arxiv`, TTL: 30min for search, 1h for detail).
- `trending` implementation: sort by `submittedDate descending` as proxy for trending (arXiv doesn't expose citation counts via public API). For true citation data, cross-reference with Semantic Scholar.

---

#### 22h: community.hackernews — Hacker News API

**Purpose**: Fetch top stories, item details, and comment threads from Hacker News for tech trend detection and community sentiment analysis. **100% free, Firebase public REST API, no auth needed.**

**API Endpoints** (Firebase REST, returns JSON):
| Method | Endpoint | Description |
|--------|----------|-------------|
| `getTopStories()` | `https://hacker-news.firebaseio.com/v0/topstories.json` | Top 500 story IDs |
| `getItem(id)` | `https://hacker-news.firebaseio.com/v0/item/{id}.json` | Story or comment by ID |
| `getMaxItem()` | `https://hacker-news.firebaseio.com/v0/maxitem.json` | Latest item ID (for pagination) |

**Comment Tree**: Each HN item has `kids[]` (child IDs). Recursively fetch to build full comment tree. Limit depth to **3 levels** to avoid excessive requests.

**Skill Registrations**:
```
community.hn.top           → { limit? }                    → HNStory[]
community.hn.item           → { id }                         → HNItem (story + comments depth 3)
community.hn.comments       → { itemId, maxDepth? }         -> HNComment[]
community.hn.search        → { query, limit? }             → HNStory[]  (client-side filter by title/url)
community.hn.health         → {}                            → { status, message }
```

**TypeScript Types**:
```typescript
interface HNStory {
  id: number;
  title: string;
  url: string | null;       // external link (may be null for Ask HN)
  by: string;              // username
  score: number;
  time: number;            // Unix timestamp
  descendants: number;     // comment count
  text?: string;           // text posts (Ask HN, Show HN)
  kids?: number[];         // child comment IDs
}

interface HNComment extends Omit<HNStory, 'url' | 'score' | 'descendants'> {
  parent: number;
  level: number;           // tree depth (0 = root)
  replies: HNComment[];    // nested children
}
```

**Implementation Notes**:
- Pure HTTP `fetch()` to Firebase REST API. Zero dependencies.
- Rate limiting: HN has no official limit but be respectful — **max 1 req/sec**, batch with concurrency of 2.
- Comment tree: recursive fetch with `AbortSignal` support, max depth default 3.
- Cache: Top stories cached 5min (namespace: `hn`, TTL: 300_000). Items cached 10min.
- `search` is client-side: fetch top stories → filter titles by keyword match.

---

#### 22i: content.medium-substack — Blog Content Layer

**Purpose**: Retrieve long-form blog articles from Medium and Substack for deep research context. These platforms don't offer free REST APIs, so we use a **multi-strategy approach**:

**Strategy Priority**:
```
1. Exa MCP web_fetch_exa   → fetch article URL directly (clean markdown output)
2. RSS Feed parsing        → medium.com/@user/feed / substack.com/@user/feed
3. Jina Reader fallback    → jina.ai/api/read?url=... (full page extraction)
4. Browser AIO Sandbox     → last resort (Phase 2 only)
```

**Medium Access**:
- Medium's public API was deprecated. Two viable paths:
  - **RSS**: Every Medium user/feed has an RSS endpoint at `medium.com/feed/{username}`
  - **Exa MCP**: `web_fetch_exa` can extract content from any medium.com URL
- No API key needed for either approach

**Substack Access**:
- Every Substack newsletter has an RSS feed at `{newsletter}.substack.com/feed`
- Substack also exposes a simple HTML structure that Jina Reader can parse
- No API key needed

**Skill Registrations**:
```
content.medium.fetch       → { url }                        → { title, text, author, publishedAt }
content.medium.search      → { query, source?, limit? }     → ContentArticle[]  (via Exa MCP web_search_exa with domain filter)
content.substack.fetch     → { url }                        → { title, text, author, publishedAt }
content.substack.search    → { query, newsletter?, limit? } → ContentArticle[]  (via Exa MCP or RSS)
content.rss.feed           → { feedUrl, limit? }            → RssEntry[]  (reuses reach.rss parser from 22b)
content.rss.health         → { testUrl? }                   → { status, message }
```

**TypeScript Types**:
```typescript
interface ContentArticle {
  title: string;
  url: string;
  author: string;
  source: "medium" | "substack" | "rss" | "other";
  publishedAt: string;
  text: string;            // clean markdown/plain text (truncated to 2000 chars for storage)
  summary: string;         // AI-generated TLDR (populated on demand)
  tags?: string[];
}
```

**Implementation Notes**:
- This layer is primarily a **routing/orchestration layer** — it delegates to Exa MCP, RSS parser, or Jina Reader depending on URL/source.
- Domain detection: `url.includes('medium.com')` → Medium path; `url.includes('substack.com')` → Substack path.
- For search queries, use Exa MCP `web_search_exa` with `category: "blogPost"` filter.
- Cache articles in SQLite (namespace: `content`, TTL: 1h — blog content changes infrequently).
- **MVP scope**: Implement `fetch` (single URL) and `search` (via Exa MCP domain filter). RSS feed parsing reuses 22b's RSS parser.

---

#### 22j: code.github-strategies — GitHub Strategy & Code Search

**Purpose**: Search GitHub repositories and code for quantitative trading strategies, crypto tools, and research implementations. Extends Agent-Reach 22c (post-MVP) with strategy-specific search patterns.

**API**: GitHub REST API v3 (`api.github.com`). Same module as Agent-Reach 22c but with **strategy-focused preset queries**.

**Strategy Preset Queries** (used internally, exposed as convenience methods):
| Preset | GitHub Search Query | Use Case |
|--------|---------------------|----------|
| `crypto-trading` | `topic:trading-bot language:python stars:>50` | Crypto trading bots |
| `quant-strategy` | `quantitative+trading+strategy stars:>30` | Quant finance strategies |
| `defi-tool` | `topic:defi topic:ethereum stars:>20` | DeFi tools & protocols |
| `onchain-analytics` | `onchain+analytics OR blockchain+dashboard` | On-chain analytics dashboards |
| `ml-trading` | `machine+learning+trading stars:>40` | ML-based trading systems |

**Skill Registrations** (extends 22c):
```
reach.github.search_repos    → { query, language?, sort?, limit? }              → GitHubRepo[]       (from 22c)
reach.github.get_repo        → { owner, repo }                                   → GitHubRepoDetail    (from 22c)
reach.github.readme          → { owner, repo }                                   → { content, sha }    (from 22c)
reach.github.list_issues    → { owner, repo, state?, labels? }                 → GitHubIssue[]      (from 22c)
reach.github.trending        → { since?, language? }                             → GitHubRepo[]       (from 22c)
reach.github.health          → {}                                                → DataSourceStatus  (from 22c)
── NEW strategy-focused skills ──
reach.github.strategies      → { preset?, customQuery?, language?, limit? }      → GitHubRepo[]       (search with preset queries)
reach.github.strategy_detail → { owner, repo }                                   → StrategyAnalysis    (readme + issues + recent commits + topics)
```

**TypeScript Types** (new additions):
```typescript
type StrategyPreset =
  | "crypto-trading"
  | "quant-strategy"
  | "defi-tool"
  | "onchain-analytics"
  | "ml-trading";

interface StrategyAnalysis extends GitHubRepoDetail {
  readmeSummary: string;       // AI-extracted key points from README (first 500 chars)
  recentCommits: number;       // commits in last 30 days
  openIssues: number;
  topics: string[];
  license: string | null;
  languageBreakdown?: Record<string, number>;  // % by language
  riskScore: "low" | "medium" | "high";        // heuristic: stars/fork ratio + activity
}
```

**Implementation Notes**:
- Reuses the pure HTTP `api.github.com` client from 22c.
- `strategies` skill maps preset names to optimized search queries.
- `strategy_detail` aggregates multiple GitHub API calls into one response (repo + readme + issues + commits).
- `riskScore` heuristic: high stars/low forks + recent activity = low risk; low stars/high forks + stale = high risk.
- Optional `GITHUB_TOKEN` raises rate limits from 60→5000/h (recommended for heavy usage).

---

#### 22k: Web Research Layer — Unified Architecture Summary

**Complete Data Source Matrix for REQ-MVP-22**:

| # | Layer | Data Source | Skill Namespace | Auth Required | Free Tier | Status |
|---|------|-----------|----------------|---------------|-----------|--------|
| **🔍 Search** | Semantic Search | **Exa MCP Server** | `mcp.exa.*` | Optional (free mode works) | 1K+/mo | 22f — Designed |
| **📚 Academic** | Preprint Papers | **arXiv API** | `academic.arxiv.*` | None (public API) | Unlimited | 🆕 22g |
| **📚 Academic** | Citations/Papers | **Semantic Scholar** | `academic.semanticscholar.*` | Optional (throttled without key) | Shared pool | Existing |
| **📚 Academic** | DOI Metadata | **Crossref** | `academic.crossref.*` | None (use email) | Unlimited | Existing |
| **💬 Community** | Tech Community | **Hacker News** | `community.hn.*` | None (Firebase public) | Unlimited | 🆕 22h |
| **💬 Community** | Social Discussions | **Reddit** | `community.reddit.*` | None (public JSON) | Throttled | Existing |
| **📰 Content** | Long-form Blogs | **Medium/Substack** | `content.medium-*` / `content.substack-*` | Via Exa MCP or RSS | Varies | 🆕 22i |
| **📰 Content** | URL Extraction | **Jina Reader** | `reader.jina` | JINA_API_KEY | 1M free | Existing |
| **🛠️ Code** | Strategies/Repos | **GitHub REST** | `reach.github.*` | Optional GITHUB_TOKEN | 60/h (unauth) | 🆕 22j |
| **📊 Market** | Prediction Markets | **Polymarket** | `market.polymarket.*` | None | Unlimited | Existing (fixed) |
| **📊 Market** | Crypto Prices | **CoinGecko** | `market.coingecko.*` | None | Limited | Existing (fixed) |
| **📊 Market** | Crypto Prices | **CoinMarketCap** | `market.coinmarketcap.*` | CMC_API_KEY | Free tier | Existing (fixed) |
| **📊 Market** | TVL/DeFi | **DefiLlama** | N/A (inline) | None | Unlimited | Existing (fixed) |
| **📅 Macro Events** | Economic Calendar | **FRED** | `events.fred` | FRED_API_KEY | Unlimited | Existing |
| **📅 Crypto Events | Coin Calendar | **CoinMarketCal** | `events.coinmarketcal` | COINMARKETCAL_API_KEY | Free tier | Existing |
| **🇨🇳 China Market** | A-Shares/Stocks | **Xueqiu (雪球)** | `reach.xueqiu.*` | XUEQIU_COOKIE | Post-MVP | 22a — Code done |
| **📡 News Feeds** | RSS/Atom | **RSS Parser** | `reach.rss.*` | None | Unlimited | 22b — Post-MVP |

**Doctor Expansion** (22e extended):

`reach.doctor` now checks **14 sources across 6 layers**:

```
DoctorReport.overall derivation:
  healthy   = all sources "ok" or "off" (expected-off)
  degraded  = any "warn" or "rate_limited", zero "error"
  critical  = at least one "error"

Layer checks added:
  🔍 exa-mcp      → HEAD/OPTIONS to mcp.exa.ai/mcp (MCP connectivity)
  📚 arxiv        → GET export.arxiv.org/api/query?search_query=test&max_results=1
  💬 hackernews   → GET hacker-news.firebaseio.com/v0/maxitem.json
  📰 rss-feeds    → GET configurable test feed URL (if set)
  🛠️ github       → GET api.github.com/rate_limit (or zen if unauthenticated)
```

---

## REMOVED Requirements

### REQ-MOD-1: Router Architecture

**BEFORE**: 14 routes (Chat, Workspace, Market, Research, Planner, Portfolio, Journal, Review, Evolution, Marketplace, Journey, System, Settings, root)

**AFTER**: 7 routes (Dashboard/, Markets/, Workspace/:id?, Journal, Timeline, Settings, Evolution/)

**Migration**:
- ChatWorkspace code → moves to WorkspacePage/Research sub-tab
- ResearchPage content → absorbed into Workspace/Research
- PlannerPage content → absorbed into Workspace/Decisions (trade plan = decision)
- PortfolioPage → **removed** (not in MVP scope)
- ReviewPage content → absorbed into Workspace/Review
- EvolutionPage → **restored as 7th standalone route** (/evolution) — advice-based improvement aggregation (not auto-evolution, just suggestions)
- MarketplacePage → **removed** (not in MVP scope)
- JourneyPage → **removed** (not in MVP scope)
- SystemPage → **removed** (status moves to Dashboard)

### REQ-MOD-2: Artifact Panel

**BEFORE**: ArtifactPanel shows global artifacts list, toggled from Chat footer

**AFTER**: ArtifactPanel is Workspace-aware:
- When inside a Workspace: shows only that workspace's artifacts
- When on global pages (Dashboard/Markets): shows recent artifacts across all workspaces
- New artifact types added: `alpha-signal`, `decision-card`, `workspace-summary`, `research-report`

### REQ-MOD-3: Memory System

**BEFORE**: 8 domains (conversation/market/trade/review/skill/workspace/research/strategy)

**AFTER**: 11 domains (+ 3 new):
- `decision` — Decision records metadata
- `alpha` — Alpha Radar scan results cache
- `deep-research` — Deep Research session logs and intermediate findings

### REQ-MOD-4: Existing Workflows Enhancement

**`research.asset`** workflow:
- NOW accepts optional `workspaceId` parameter
- Generated research-report artifact auto-linked to workspace
- Uses Reddit skill for community sentiment (new data source)
- Can be upgraded to Deep Research mode for deeper analysis

**`trade.plan`** workflow:
- NOW integrates with Decision Engine: trade plan → decision record
- Uses Polymarket data when topic is a prediction market
- Output includes structured decision recommendation

**`review.daily`** workflow:
- NOW scoped to workspace (optional) or global
- Links to specific decisions and their outcomes
- Includes community sentiment comparison (what Reddit thought vs what happened)
- Can consume Deep Research reports as input for richer review context

### REQ-MOD-5: Design System Compliance (NEW)

**ALL new pages and components MUST comply with `apps/web/design.md`**:

- Dark Glassmorphism: `bg-card/70 backdrop-blur-xl border-white/[0.08]`
- Cyan accent: `#06b6d4` (oklch variant) on all interactive elements
- Typography: Geist Sans (headings/UI) + JetBrains Mono (data/code/chat)
- Animations: framer-motion with defined duration scale (150ms-400ms)
- Responsive: Mobile (<640px) sidebar hidden + bottom tab bar
- Cards: `rounded-lg`, max `rounded-lg` (terminal feel)
- Z-index scale per design.md Section 4
- Safe area insets for mobile notch devices
- `prefers-reduced-motion` respected globally

---

## REMOVED Requirements

### REQ-REM-1: Independent Chat Page
**Reason**: Merged into Workspace/Research sub-tab. Chat capability preserved but no longer a top-level route.
**Migration**: All ChatWorkspace code moves to WorkspacePage internal component.

### REQ-REM-2: Portfolio Page
**Reason**: Not in MVP 6-page architecture. Paper trade tracking moves to Workspace/Journal.
**Migration**: Portfolio data accessible via Journal page P&L summary.

### REQ-REM-3: Evolution Page (Updated)
**Reason**: Originally removed, but **restored** as 7th standalone route after grill-me Round 2. Now provides advice-based improvement aggregation (NOT automatic evolution — human decides).
**Migration**: `evolution.propose` workflow remains in backend. New EvolutionPage with 5 sections: Progress Dashboard, Improvement Feed, Pattern Highlights, Rule Workshop, Quick Actions. New backend APIs for evolution data.

### REQ-REM-4: Marketplace / Journey / System Pages
**Reason**: Not in MVP scope. System status moves to Dashboard.
**Migration**: Remove routes. Functionality redistributed to Dashboard and Settings.

### REQ-REM-5: CCXT Integration (Removed)
**Reason**: datasource.md explicitly recommends CoinGecko as replacement ("推荐替代 CCXT"). MVP uses CoinGecko for all crypto market data. CCXT's multi-exchange connectivity is not needed in MVP (no real trading, no exchange comparison).
**Migration**: Remove any existing CCXT skill references. CoinGecko skill remains as sole crypto data source. Phase 2 may re-add CCXT if multi-exchange comparison is needed.

### REQ-REM-6: AIO Sandbox (Deferred to Phase 2)
**Reason**: Listed as P0 in datasource.md ("万能适配器"), but all P0 data sources now have dedicated APIs (**Exa MCP**, Jina, Reddit, Polymarket, Semantic Scholar). AIO Sandbox as fallback browser scraper is valuable but adds significant complexity (browser lifecycle management, DOM extraction, screenshot capture).
**Migration**: Phase 2 implementation. When **Exa MCP**/Jina/Reddit return insufficient results for a research query, Deep Research ReAct loop will fall back to AIO Sandbox for web scraping. For MVP, agent will note "limited sources available" when data is sparse.

---

## Database Schema Changes

### New Tables

```sql
-- Workspaces (topic containers)
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    topic_type TEXT DEFAULT 'general',  -- general | crypto | prediction | sports | macro
    topic_ref TEXT,                    -- e.g., polymarket condition_id or coin symbol
    creator_session_id TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (creator_session_id) REFERENCES sessions(id)
);

-- Decision Records (structured decisions)
CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('YES','NO','LONG','SHORT','HOLD')),
    position_size REAL NOT NULL DEFAULT 0,
    confidence TEXT NOT NULL DEFAULT 'B',
    risk_level TEXT NOT NULL DEFAULT 'B' CHECK(risk_level IN ('A','B','C','D')),
    supporting_reasons TEXT,        -- JSON array
    against_reasons TEXT,            -- JSON array
    thesis TEXT NOT NULL,
    invalidation_criteria TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    executed_at TEXT,
    settled_at TEXT,
    result_pnl REAL,
    review_id TEXT,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (review_id) REFERENCES reviews(id)
);

-- Deep Research Sessions (NEW in v2)
CREATE TABLE IF NOT EXISTS research_sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'builtin' CHECK(mode IN ('builtin','openrouter')),
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','cancelled')),
    total_iterations INTEGER NOT NULL DEFAULT 0,
    completed_iterations INTEGER NOT NULL DEFAULT 0,
    report_artifact_id TEXT,          -- FK to artifacts table
    token_usage_input INTEGER DEFAULT 0,
    token_usage_output INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (report_artifact_id) REFERENCES artifacts(id)
);
```

### Modified Tables
- `artifacts`: Add `workspace_id` column (FK → workspaces.id), add type `research-report`
- `timeline_events`: Add `workspace_id` column (nullable)
- `memory_records`: Already supports `workspace` domain, no schema change needed

---

## Environment Configuration (.env.example Updates)

### Required API Keys for MVP

```env
# === Core AI ===
OPENAI_API_KEY=sk-xxx                    # Primary LLM (GPT-4o, etc.)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# === Data Sources (P0 — Required for Full MVP Experience) ===
EXA_API_KEY=exa-xxx                      # Exa MCP (optional — free mode works without key; key unlocks 1K+/mo + advanced features)
JINA_API_KEY=jina-xxx                    # Web page reading & scraping
TAVILY_API_KEY=tavily-xxx                 # Alternative web search (backup)

# === Observability (Optional) ===
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=

# === Local App ===
TRADING_PI_DATA_DIR=.trading-pi
TRADING_PI_API_PORT=8787
TRADING_PI_WEB_PORT=5173
TRADING_PI_DEFAULT_EXCHANGE=binance
TRADING_PI_EXCHANGE_FALLBACKS=okx,bybit,coinbase,kraken
TRADING_PI_TRADING_MODE=paper

# === Browser Layer (Optional) ===
AIO_SANDBOX_BASE_URL=http://localhost:8080

# === Premium Features (Optional — Enhances Deep Research Quality) ===
OPENROUTER_API_KEY=or-xxx               # For DeepResearch model (alibaba/tongyi-deepresearch-30b-a3b)
SERPER_DEV_KEY=serper-xxx               # Google Search API (alternative to Exa)
COINMARKETCAP_API_KEY=cmc-xxx            # Enhanced crypto data (supplements CoinGecko)
DASHSCOPE_API_KEY=dashscope-xxx          # Alibaba DashScope (file parsing, alternative to Jina)
POLYMARKET_API_KEY=                      # Polymarket CLOB (optional, Gamma API is free)
REDDIT_CLIENT_ID=                        # Reddit OAuth (optional, public JSON API works without it)
```

### Key Priority Matrix

| Key | Priority | Used By | Free Tier? |
|-----|----------|---------|------------|
| OPENAI_API_KEY | **P0** | All AI features | No ($5 min) |
| EXA_API_KEY | **P0** | Deep Research, Alpha Radar, News | Optional — free mode via Exa MCP works without key (1K req/mo). With key: 1K+ req/mo + advanced features (code search, deep research, contents extraction) |
| JINA_API_KEY | **P0** | Deep Research (read pages), Research | Yes (1M free) |
| TAVILY_API_KEY | **P1** | Backup search | Yes (1000 free) |
| OPENROUTER_API_KEY | **P1** | Premium Deep Research mode | Pay-per-use |
| SERPER_DEV_KEY | **P2** | Google Search backup | Yes (2500 free) |
| POLYMARKET_API_KEY | **P2** | CLOB API (Gamma is free) | Yes (free tier) |

---

## E2E Test Scenarios (MVP Acceptance Criteria)

### E2E-1: Dashboard Alpha Radar
- [ ] Open app → Dashboard loads → Alpha Radar section visible
- [ ] Top5 opportunity cards render with real data (or cached/stale indicator)
- [ ] Each card shows: title, probability/odds, volume, change, risk stars, source tag
- [ ] Card hover effect works (scale + glow per design.md)
- [ ] Clicking card navigates to Workspace with topic pre-filled
- [ ] Today's Reminders section renders (even if empty, shows placeholder)
- [ ] Recent Reviews section renders with win rate summary
- [ ] System Status section shows agent/model/config info (existing, verified working)
- [ ] Design compliance: glassmorphism, cyan accent, framer-motion animations

### E2E-2: Markets Dual-Source
- [ ] Navigate to Markets → two tabs visible: "Crypto Spot" | "Prediction Markets"
- [ ] Crypto Tab: CoinGecko data loads (trending coins, prices, search works)
- [ ] Prediction Tab: Polymarket data loads (markets with odds/volume/settlement)
- [ ] Tab switch animation smooth (framer-motion layout animation)
- [ ] Search works in both tabs
- [ ] Favorite/star toggle persists
- [ ] Click market card → opens Workspace with that market as topic
- [ ] Category filters work in Prediction tab

### E2E-3: Research (AI Chat in Workspace)
- [ ] Navigate to Workspace → create/select workspace → Research tab
- [ ] Send message → SSE streaming response renders
- [ ] AI response includes Tool calls (visible, expandable)
- [ ] AI response includes Thinking/Reasoning (toggleable per Settings)
- [ ] AI response includes Plan component (when agent generates plan)
- [ ] AI response includes Artifact inline card (when agent produces artifact)
- [ ] Artifact sidebar panel opens on artifact_update event
- [ ] Artifact detail view shows content, download works (.md export)
- [ ] Export menu (HTML/Markdown/PDF) works for workspace research
- [ ] Multi-source data: AI can call **Exa MCP**, Jina, Reddit, Polymarket in same conversation

### E2E-4: Deep Research Agent (NEW in v2)
- [ ] Workspace Overview tab shows "Start Deep Research" button
- [ ] Research tab shows "Deep Research" trigger button
- [ ] Clicking "Deep Research" opens topic input (pre-filled with workspace topic)
- [ ] User selects mode: Built-in (default) or OpenRouter (if API key configured)
- [ ] Starting research shows progress panel with step-by-step updates via SSE
- [ ] Progress events: research:started → research:step (multiple) → research:complete
- [ ] Each step shows: step name, number (N/total), detail text
- [ ] Cancel button stops research mid-execution
- [ ] On completion: full Research Report renders in Research tab
- [ ] Report contains: Executive Summary, Key Findings (with sources), Counter-Arguments, Risk Factors, Conclusion
- [ ] Report saved as artifact in workspace (visible in ArtifactPanel)
- [ ] Report exportable as Markdown
- [ ] After report: user can switch to Chat mode for follow-up questions
- [ ] Deep Research from Alpha Radar: card "Research this" button → auto-launches

### E2E-5: Decision Engine (Complete Closed Loop)
- [ ] In Workspace Research tab, ask "should I bet on [topic]?"
- [ ] AI generates structured Decision Card component
- [ ] Decision Card shows: confidence badge, risk stars, support reasons, against reasons, thesis, invalidation criteria
- [ ] "Confirm Decision" button saves to Decisions tab
- [ ] Decisions tab shows recorded decision with all fields
- [ ] From decision, execute "Paper Trade" → Journal entry auto-created
- [ ] Journal tab shows the new entry
- [ ] After simulated settlement, trigger Review → Review report generates
- [ ] Review tab shows report with P&L, lessons, improvements
- [ ] **Full loop**: Dashboard(Radar) → Markets → Workspace(Research→Decision→Journal→Review) complete
- [ ] **Enhanced loop with Deep Research**: Dashboard(Radar) → Workspace(Depth Research→Decision→Journal→Review)

### E2E-6: Chat Message + Plan + Artifact Display
- [ ] Send message in Workspace/Research → response message renders correctly
- [ ] Response contains text with proper Markdown rendering (Streamdown)
- [ ] If agent thinks deeply → Reasoning/Thinking component visible
- [ ] If agent calls tool(s) → Tool component shows name + input + output
- [ ] If agent produces plan → Plan component shows steps with status icons
- [ ] If agent produces artifact → Artifact inline card appears (cyan border, clickable)
- [ ] New: If agent produces research report → ResearchReport card renders with collapsible sections
- [ ] Agent status indicators work (thinking/typing/tool-running states)
- [ ] Error states handled gracefully (network error, API error, timeout)

### E2E-7: Memory Storage & Persistence
- [ ] AI conversation messages persist after page reload
- [ ] Memory page (Timeline/Memory) shows records being written
- [ ] Memory records have correct domain classification (including new `deep-research` domain)
- [ ] Memory can be deleted from Memory page
- [ ] Memory can be exported (JSON export button)
- [ ] Session switching preserves correct memory context
- [ ] Workspace-specific artifacts persist and are re-linked on workspace reopen
- [ ] Deep Research sessions logged to memory (domain="deep-research")

### E2E-8: Artifact Panel & Export
- [ ] Artifact panel opens (sidebar or inline)
- [ ] Artifact list loads from GET /api/artifacts
- [ ] Clicking artifact shows detail view with markdown content
- [ ] Download artifact as .md file works
- [ ] Export menu (HTML/Markdown/PDF) produces valid downloadable files
- [ ] HTML export includes dark theme styling
- [ ] Markdown export includes thinking blocks and tool calls
- [ ] PDF export renders readable document
- [ ] New: Research Report artifact renders with full structure (findings, citations, risks)

### E2E-9: Design Compliance (design.md)
- [ ] Glassmorphism: bg-card/70, backdrop-blur-xl on all cards
- [ ] Cyan accent (#06b6d4) on all interactive elements
- [ ] JetBrains Mono font on data/code elements
- [ ] Geist Sans (via CSS import) on headings
- [ ] framer-motion entrance animations on all pages
- [ ] Responsive layout: sidebar collapses at <768px
- [ ] Safe area insets for mobile notch
- [ ] prefers-reduced-motion respected (animations disabled)
- [ ] Color tokens from design.md oklch space used consistently
- [ ] Z-index scale matches design.md Section 4
- [ ] Bottom tab bar on mobile (fixed, h-14, glass background)
- [ ] Touch targets ≥44px on mobile

### E2E-10: Settings → Backend Control
- [ ] Changing Thinking Level → POST /api/config → verified via GET /api/config
- [ ] Changing Auto-Compaction → POST /api/config → affects agent behavior
- [ ] Changing Model (if available) → POST /api/config → reflected in next AI response
- [ ] Theme toggle (dark/light) persists across reloads
- [ ] Show Thinking toggle persists
- [ ] API keys save correctly (**Exa MCP**, Jina, Reddit, OpenAI, OpenRouter)
- [ ] User Rules field saves and is accessible to agent
- [ ] NEW: Deep Research settings persist (mode preference, max iterations)

### E2E-11: Workspace Lifecycle
- [ ] Create new workspace (name + description)
- [ ] Workspace appears in sidebar under Workspace nav item
- [ ] Navigate to workspace → 5 tabs render correctly
- [ ] Switch between workspaces preserves state
- [ ] Delete workspace (with confirmation)
- [ ] Workspace Overview tab shows correct summary
- [ ] Research tab has full chat capability (inherited from ChatWorkspace)
- [ ] Research tab has Deep Research trigger + progress + report rendering
- [ ] Decisions tab lists decisions for this workspace only
- [ ] Journal tab lists entries for this workspace only
- [ ] Review tab lists reviews for this workspace only
- [ ] Cross-tab data consistency (decision in Decisions also in Overview)

### E2E-12: End-to-End Full Flow with Deep Research (Ultimate Test)
- [ ] App loads → Dashboard shows Alpha Radar with real opportunities
- [ ] Click opportunity → Workspace auto-created with topic
- [ ] Click "Start Deep Research" → autonomous research executes
- [ ] Progress shows 5-8 steps completing over 2-5 minutes
- [ ] Research Report appears with findings, citations, risks
- [ ] Ask follow-up in Chat → AI references the report
- [ ] Request Decision Card → AI generates structured recommendation
- [ ] Confirm Decision → saved to Decisions tab
- [ ] Execute Paper Trade → Journal entry created
- [ ] Simulate settlement → trigger Review
- [ ] Review report references both Decision and Research Report
- [ ] **Complete closed-loop verified**: Discover → Research → Decide → Act → Record → Review → Evolve

### E2E-13: Paper Trade Full Lifecycle (NEW)
- [ ] User confirms Decision Card in Workspace/Research tab
- [ ] Paper Trade auto-executes (no manual step needed)
- [ ] Journal entry auto-created with Dimensions 1 (Trade Data) + 2 (Reasoning) filled
- [ ] Decision status changes from "pending" to "executed"
- [ ] Workspace/Decisions tab shows open position with live status badge "OPEN · entered 2h ago"
- [ ] For Prediction Market: settlement detected → position auto-closes → P&L calculated
- [ ] For Crypto: user clicks "Close Position" → P&L calculated
- [ ] After close: Decision updates to "settled_win" or "settled_loss" with P&L badge
- [ ] Journal entry updated with exit price, P&L, holding duration, settlement reason
- [ ] Timeline event "paper_trade_settled" appears
- [ ] Toast notification: "Paper Trade settled (+$0.32). Run Review?"
- [ ] `paper_trades` DB record has correct data (entry/exit/P&L/status)

### E2E-14: Review 7-Section Report Generation (NEW)
- [ ] Navigate to Workspace with ≥2 settled decisions → Review tab
- [ ] Click "Request Review" button
- [ ] Agent gathers decisions + journal entries + user rules for workspace
- [ ] Review Report generates with all 7 sections:
  - [ ] Section 1 Overview: total trades, win rate, total P&L, best/worst trade, streaks
  - [ ] Section 2 Per-Trade Analysis: each decision with reasoning vs outcome comparison
  - [ ] Section 3 Error Summary: common mistakes list + frequency + loss concentration
  - [ ] Section 4 Improvement Suggestions: 2-3 actionable suggestions with priority/difficulty
  - [ ] Section 5 Emotion Analysis: emotion distribution, emotion-vs-result correlation, problematic emotions
  - [ ] Section 6 Rule Compliance: compliance rate, violations list, most-violated rule
  - [ ] Section 7 Historical Comparison: trend direction, key changes vs previous review (or "first review" if none)
- [ ] Each section collapsible with framer-motion animation
- [ ] Improvement suggestions have "Adopt as Rule" action buttons
- [ ] Report saved as artifact in workspace
- [ ] Review appears in Evolution page's Improvement Feed

### E2E-15: Journal 4-Dimension Records (NEW)
- [ ] After Paper Trade execution: Journal entry shows Dimension 1 (Trade Data) correctly
  - [ ] direction, asset, entry_price, position_size, entry_time all populated
  - [ ] exit_price/pnl null while position open
  - [ ] After settlement: exit_price, pnl, pnl_percent, holding_duration filled
- [ ] Dimension 2 (Decision Reasoning) auto-filled:
  - [ ] whyEntered matches decision thesis
  - [ ] evidenceCited includes sources (Deep Research report, market data, etc.)
  - [ ] confidenceAtEntry matches decision confidence
  - [ ] expectedOutcome populated
- [ ] Dimension 3 (Emotion Tag): user can tag emotion manually (dropdown)
  - [ ] Options: calm/confident/fomo/fear/greedy/frustrated/neutral/uncertain
  - [ ] Intensity slider 1-5
  - [ ] Optional free-text note
- [ ] Dimension 4 (Post-Review Reflection): auto-filled after Review runs
  - [ ] actualReason populated by AI analysis
  - [ ] wouldDoDifferently populated by AI
  - [ ] lessonLearned populated by AI
  - [ ] ruleCreated optionally suggested
- [ ] Global Journal page shows entries across all workspaces with filter working
- [ ] Export CSV/Markdown works and includes all 4 dimensions

### E2E-16: Timeline Event Logging (NEW)
- [ ] Navigate to Timeline page → event feed renders chronologically
- [ ] Category 1 (Tool Call) events appear when Agent uses tools:
  - [ ] Shows tool name, input summary, output summary, status, duration
  - [ ] Filter by "tool_call" category shows only these events
- [ ] Category 2 (User Action) events appear on user interactions:
  - [ ] workspace_created, decision_confirmed, paper_trade_executed, review_requested, etc.
  - [ ] Filter by "user_action" shows only these events
- [ ] Category 3 (System Event) events appear:
  - [ ] alpha_radar_scan_complete, paper_trade_settled, review_generated, warning, error
  - [ ] Severity badges on system events (info=blue, warning=amber, error=red)
- [ ] Category 4 (Milestone) events (P2 — may not trigger in short test session):
  - [ ] first_decision, first_paper_trade, first_review, etc.
- [ ] Summary stats at top: event count per category today
- [ ] Clicking event card expands full detail
- [ ] Filter by workspace dropdown works
- [ ] Date range filter works
- [ ] Status filter (success/failed/running) works

### E2E-17: Evolution Page (NEW — 7th Route)
- [ ] Navigate to /evolution without errors
- [ ] Evolution page renders with 5 sections:
  - [ ] Section 1 Progress Dashboard: shows stats (even if zeros for first-time users)
  - [ ] Section 2 Improvement Feed: lists suggestions from past Reviews (or empty state)
  - [ ] Section 3 Pattern Highlights: AI-generated insights (or placeholder for first-time)
  - [ ] Section 4 Rule Workshop: current User Rules displayed
  - [ ] Section 5 Quick Actions: Run Review, Export, Reset buttons present
- [ ] After running a Review: improvement suggestions appear in Feed
- [ ] "Suggest New Rules" button triggers AI analysis of reviews
- [ ] Adopting a suggestion adds it to User Rules in Settings
- [ ] Dismissing a suggestion marks it as read
- [ ] Progress metrics update after more trades/reviews are recorded
- [ ] Design compliance: glassmorphism, cyan accent per design.md

### E2E-18: User Rules Decision Integration (NEW)
- [ ] Navigate to Settings → add a rule: "max position size: 1U"
- [ ] Add another rule: "no FOMO trades within 1 hour of news"
- [ ] Save rules successfully
- [ ] Go to Workspace → Research → ask for Decision Card
- [ ] DecisionCard renders with **Rule Compliance section**:
  - [ ] Shows "All N rules ✓" if compliant
  - [ ] Shows warnings (amber) if soft violation detected
  - [ ] Shows blocking warning (red) if hard rule violated
  - [ ] Warnings include specific rule text and suggestion
- [ ] User can still confirm decision despite warnings (Human in the loop)
- [ ] Rule compliance info persists in saved decision record
- [ ] Review report Section 6 (Rule Compliance) references these checks
- [ ] Evolution page Rule Workshop shows the same rules

### E2E-19: Ultimate Closed Loop — All Systems Integrated (Final Test)
- [ ] **Step 1 — Discover**: Dashboard loads → Alpha Radar Top5 renders
- [ ] **Step 2 — Deep Research**: Click "Research this" on opportunity → autonomous research completes → dual-pane report renders
- [ ] **Step 3 — Decide**: Click "Generate Decision" → DecisionCard renders WITH Rule Compliance check (rules from Settings evaluated)
- [ ] **Step 4 — Confirm**: User confirms Decision → Paper Trade auto-executes → Journal entry created (Dimensions 1+2)
- [ ] **Step 5 — Record**: User tags emotion on Journal entry (Dimension 3)
- [ ] **Step 6 — Settle**: Simulate settlement → P&L calculated → Decision settled → Timeline event logged
- [ ] **Step 7 — Review**: Click "Request Review" → 7-section Review Report generates:
  - Overview: correct stats (1 trade, result, P&L)
  - Per-Trade: reasoning vs outcome comparison
  - Errors: pattern identification (even from single trade)
  - Suggestions: actionable improvements
  - Emotion: tagged emotion analyzed
  - Rules: compliance checked against User Rules
  - History: marked as first review
- [ ] **Step 8 — Evolve**: Navigate to Evolution page → see improvement suggestion from Review → Pattern Highlights show initial patterns
- [ ] **Step 9 — Iterate**: Suggest New Rules → AI proposes rule based on review → adopt into User Rules
- [ ] **Step 10 — Verify**: Next Decision Card shows updated Rule Compliance (newly adopted rule is checked)
- [ ] **Full loop verified**: Alpha Radar → Deep Research → Decision(Rule-checked) → Paper Trade → Journal(4-dim) → Settlement → Review(7-section) → Evolution(Rule adoption) → Next Decision(improved)
- [ ] All 7 pages navigable without console errors
- [ ] Design compliance verified across all pages
- [ ] Zero TypeScript compilation errors
