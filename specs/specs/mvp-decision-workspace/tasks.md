# Tasks — Trading Pi MVP: Prediction Decision Workspace v2

## Phase 1: Backend Foundation (New Data Sources + Workflows + Deep Research)

- [ ] **Task 1.1**: Create Polymarket client module
  - [ ] 1.1.1: Create `packages/core/src/market/polymarket.ts`
    - Gamma API client (GET /markets, /markets/{id}, search)
    - CLOB API client (price, orderbook)
    - Error handling with fallback chain (Gamma → CLOB → cache)
    - 10s timeout per request
    - TypeScript types for Market, Price, Orderbook, Event
  - [ ] 1.1.2: Register 4 Polymarket skills in `default-skills.ts`
    - `market.polymarket.markets` — list/filter markets
    - `market.polymarket.detail` — single market with orderbook
    - `market.polymarket.price` — current YES/NO price
    - `market.polymarket.search` — text search

- [ ] **Task 1.2**: Create Reddit skill + Academic Search Skills
  - [ ] 1.2.1: Create `community.reddit` skill implementation
    - Public JSON API (no auth): `reddit.com/r/{sub}/hot.json`
    - Methods: hot(), search(), comments()
    - Rate limit handling (429 → retry with backoff)
    - Parse to structured Post type (title, score, comments, url, created)
    - Supported subreddits: CryptoCurrency, PredictionMarkets, soccer, politics, wallstreetbets
  - [ ] 1.2.2: Register reddit skill in default-skills.ts + add to SearchHub if applicable
  - [ ] 1.2.3: Create **Semantic Scholar** skill (`academic.semanticscholar`) [NEW]
    - API: `https://api.semanticscholar.org/graph/v1/paper/search`
    - Methods: search(query, limit?, year?), details(paperId), citations(paperId), references(paperId)
    - Returns: Paper[] with paperId, title, authors, abstract, tldr, citationCount, url, openAccessPdf, venue
    - Rate limit: 1000 req/sec shared (no key) or 1 req/sec (with free key)
    - AI TLDR field used for report summaries
  - [ ] 1.2.4: Create **Crossref** skill (`academic.crossref`) [NEW]
    - API: `https://api.crossref.org/works`
    - Methods: search(query, rows?, filter?), byDOI(doi)
    - Returns: Work[] with DOI, title, authors, published, container-title, ISSN, type, link[]
    - No auth needed; User-Agent header with email for politeness
  - [ ] 1.2.5: Create **OpenAlex** skill (`academic.openalex`) [NEW]
    - API: `https://api.openalex.org/works`
    - Methods: search(query, per_page?, filter?), work(workId)
    - Returns: Work[] with id, title, publication_year, cited_by_count, concepts[], open_access
    - Fully free, no key needed

- [ ] **Task 1.2.6**: Create Event Feed Skills (**NEW** — TradingEconomics + CoinMarketCal)
  - [ ] Create `events.tradingeconomics` skill (macro events: FOMC/CPI/NFP/GDP)
  - [ ] Create `events.coinmarketcal` skill (crypto events: listings/unlocks/airdrops)
  - [ ] Both registered in default-skills.ts
  - [ ] Dashboard "Today's Reminders" fetches from both (cached 30min)

- [ ] **Task 1.3**: Create Alpha Radar Workflow
  - [ ] 1.3.1: Define AlphaSignal type + artifact type "alpha-signal"
  - [ ] 1.3.2: Implement `alpha.radar.scan` workflow in default-workflows.ts
    - Step 1: Fetch Polymarket trending (volume > $50K)
    - Step 2: Fetch Exa breaking news (crypto/prediction keywords)
    - Step 3: Fetch Reddit hot posts (target subreddits)
    - Step 4: Cross-reference & score (volume*0.4 + novelty*0.3 + sentiment*0.3)
    - Step 5: Return Top5 as AlphaSignal[]
    - Step 6: Cache results to memory domain "alpha" (5-min TTL)
  - [ ] 1.3.3: Add `/api/alpha/radar` endpoint to server/api.ts (GET = scan, trigger background)

- [ ] **Task 1.4**: Create Decision Engine
  - [ ] 1.4.1: Add `decisions` table to database.ts
    - Schema: id, workspace_id, topic, direction, position_size, confidence, risk_level, supporting_reasons(JSON), against_reasons(JSON), thesis, invalidation_criteria, status, timestamps, result_pnl, review_id
  - [ ] 1.4.2: Add CRUD repository methods in repositories.ts
    - createDecision(), updateDecisionStatus(), listDecisions(workspaceId?), getDecision(id)
  - [ ] 1.4.3: Register `decision.analyze` skill
    - Gathers market data + news + community sentiment
    - Outputs structured decision recommendation
    - Uses new DecisionCard tool format
  - [ ] 1.4.4: Add Decision API endpoints to server/api.ts
    - POST /api/decisions (create), GET /api/decisions (list), GET /api/decisions/:id, PATCH /api/decisions/:id/status

- [ ] **Task 1.5**: Create Workspace backend
  - [ ] 1.5.1: Add `workspaces` table to database.ts
    - Schema: id, name, description, topic_type, topic_ref, creator_session_id, is_default, timestamps
  - [ ] 1.5.2: Add Workspace repository methods
    - createWorkspace(), listWorkspaces(sessionId?), getWorkspace(id), updateWorkspace(id), deleteWorkspace(id)
  - [ ] 1.5.3: Add Workspace API endpoints
    - GET /api/workspaces, POST /api/workspaces, GET /api/workspaces/:id, PATCH /api/workspaces/:id, DELETE /api/workspaces/:id
  - [ ] 1.5.4: Modify artifacts table — add workspace_id FK column
  - [ ] 1.5.5: Modify existing workflows to accept optional workspaceId parameter (research.asset, trade.plan, review.daily)

- [ ] **Task 1.6**: Create Deep Research Agent (Built-in ReAct, MVP only)
  - [ ] 1.6.1: Add `research_sessions` table to database.ts
    - Schema: id, workspace_id, topic, mode(builtin), status(running/completed/failed/cancelled), total_iterations, completed_iterations, report_artifact_id, token_usage, error_message, started_at, completed_at
  - [ ] 1.6.2: Implement ReAct Loop engine in `packages/core/src/research/deep-research.ts`
    - Decompose research question into sub-questions
    - Search phase (parallel): Exa + Semantic Scholar + Crossref + Reddit + market data
    - Read phase: Jina Reader for discovered URLs/papers (top 5-10)
    - Analyze phase: cross-reference findings, identify patterns
    - Synthesize phase: generate ResearchReport (aligned w/ DeepResearch format: executionSummary → keyFindings → dataSourceSummary → conclusion)
    - Max iterations configurable (default: 5)
    - Each iteration emits SSE progress event with stepName, detail, toolName, inputPreview, outputPreview
    - Cancellation support (AbortController)
    - **MVP: Built-in mode only** (uses current OpenAI API, no OpenRouter backend)
  - [ ] 1.6.3: Register `deep.research` workflow in default-workflows.ts
    - Input: topic, workspaceId (only 2 required fields — fully auto)
    - Output: ResearchReport artifact + research_session record
    - Tools available: exa, jina, reddit, semanticscholar, crossref, polymarket, coingecko
  - [ ] 1.6.4: Add `/api/research/deep` SSE endpoint to server/api.ts
    - POST starts research session, returns SSE stream
    - Events: research:started, research:step (with toolName/inputPreview/outputPreview), research:complete, research:error
    - GET /api/research/sessions for listing past sessions
    - GET /api/research/sessions/:id for single session status
  - [ ] 1.6.5: Register ResearchReport as new artifact type "research-report"
    - Store full report JSON in artifacts table
    - Link to workspace via workspace_id
  - [ ] 1.6.6: Add "Generate Decision from Report" helper logic
    - Takes ResearchReport as context → calls decision.analyze → outputs DecisionCard
    - Enables report→decision one-click closed loop
    - Include in ArtifactPanel queries

- [ ] **Task 1.7**: Build packages/core && verify zero errors
  - Run `cd packages/core && npm run build`
  - Fix any TypeScript errors
  - Verify all new types/skills/workflows/repositories compile

- [ ] **Task 1.8**: Create Paper Trade Lifecycle Workflow (**NEW**)
  - [ ] 1.8.1: Add `paper_trades` table to database.ts (id, decision_id, workspace_id, direction, asset, entry_price, exit_price, position_size, pnl, pnl_percent, entry_time, exit_time, status, settlement_reason)
  - [ ] 1.8.2: Implement `paper.trade.lifecycle` workflow (create → monitor → settle → P&L)
  - [ ] 1.8.3: Paper Trade API endpoints (POST execute, GET list/:id, PATCH close, POST settle)

- [ ] **Task 1.9**: Enhance Review Workflow + Evolution + User Rules Integration (**NEW**)
  - [ ] 1.9.1: Enhance review workflow → 7-section ReviewReport output (REQ-MVP-13)
  - [ ] 1.9.2: User Rules decision-time integration (load rules → evaluate → append to DecisionCard)
  - [ ] 1.9.3: Evolution backend APIs (summary, suggestions, suggest-rules, adopt-rule)

## Phase 2: Frontend Page Restructure (14 → 7)

- [ ] **Task 2.1**: Rewrite router.tsx (7 routes only)
  - Remove: Chat, Research, Planner, Portfolio, Review, Evolution(standalone→re-add as route), Marketplace, Journey, System routes
  - Keep: Dashboard(/), Markets(/markets), Workspace(/workspace/:id?), Journal(/journal), Timeline(/timeline), Settings(/settings), **Evolution(/evolution)**
  - Total: exactly 7 routes
  - Update AppLayout navItems array to 7 items
  - Preserve all existing layout (sidebar/header/outlet) structure

- [ ] **Task 2.2**: Rewrite DashboardPage (Alpha Radar首页)
  - Keep existing stats grid (agent status, model info, config values) — move to lower section
  - Add Alpha Radar section at TOP:
    - Auto-trigger alpha.radar.scan on mount (useQuery with 5min interval)
    - Render Top5 opportunity cards (glassmorphism per design.md, cyan accent)
    - Each card: title, value, change, volume, risk stars, source badge
    - Click handler: navigate to /workspace/new?topic=...&source=...
    - Loading: shimmer skeleton cards
    - Error/stale: cached data with badge
  - Add Today's Reminders section (placeholder for now, static or from calendar API)
  - Add Recent Reviews summary (from /api/reviews, last 7)
  - framer-motion entrance animations per design.md duration scale

- [ ] **Task 2.3**: Rewrite MarketsPage (双源 Tab)
  - Two tabs: "Crypto Spot" | "Prediction Markets" (Tab component from ui/)
  - Crypto tab: reuse existing CoinGecko data display (from current MarketPage code)
  - Prediction tab: NEW
    - Fetch from GET /api/markets?source=polymarket
    - Grid of market cards (glassmorphism per design.md)
    - Each card: question text, YES%/NO%, volume ($), settlement countdown, 24h change
    - Category filter pills (Sports/Politics/Crypto/Macro/Entertainment)
    - Search input (client-side filter)
    - Favorite toggle (localStorage persistence)
    - Click → navigate to /workspace/new?topic=...&source=polymarket&id=...
  - Tab switch animation (framer-motion layout animation per design.md)
  - Empty states for both tabs

- [ ] **Task 2.4**: Build WorkspacePage (MVP 核心页面 — 最复杂)
  - [ ] 2.4.1: Workspace shell component
    - If no :id param → show workspace list page (create new + recent workspaces)
    - If :id provided → show workspace detail with 5 sub-tabs
    - Workspace list: cards showing name, topic_type, decision count, last activity, create button
    - Breadcrumb navigation: Workspaces > [Current Workspace Name]
  - [ ] 2.4.2: Overview tab
    - Workspace metadata header (name, description, created date, topic type badge)
    - Linked market snapshot (if topic_ref exists, fetch and display)
    - Key metrics: decisions count, win rate, total P&L, journal entries count
    - Recent activity feed (last 10 timeline events filtered to this workspace)
    - Quick action buttons: Start Research, **Start Deep Research**, Record Decision, View Journal
  - [ ] 2.4.3: Research tab (**migrated from ChatWorkspace** + Deep Research UI)
    - **Mode A: Chat** (preserved from ChatWorkspace):
      - Full ChatWorkspace capability (SSE streaming, Tool display, Thinking, Plan, Artifact panel)
      - Pre-populated context when opened from Alpha Radar card
      - All existing ExportMenu functionality preserved
      - ArtifactPanel scoped to this workspace's artifacts
    - **Mode B: Deep Research** (NEW):
      - "Deep Research" trigger button next to chat input (or toggle)
      - Topic input modal (pre-filled with workspace topic)
      - Mode selector: Built-in (default) | OpenRouter (if API key set)
      - Max iterations slider (3-10)
      - Progress panel (see REQ-MVP-11d for wireframe):
        - Step list with checkmarks for completed, spinner for current, gray for pending
        - Progress bar: N/total steps + estimated time remaining
        - Cancel button
      - Report view on completion:
        - Collapsible sections (Executive Summary, Key Findings, etc.)
        - Source links clickable
        - Counter-arguments in amber style
        - Risk factor matrix (impact × probability)
        - Export: Copy Markdown, Download, Save to Workspace
  - [ ] 2.4.4: Decisions tab
    - List of DecisionRecord cards for this workspace
    - Each card: direction badge, confidence color, risk stars, one-line thesis, status badge, P&L (if settled)
    - Click → expand full details (supporting/against reasons, invalidation criteria, notes)
    - "New Decision" button → opens modal/form OR triggers AI decision analysis in Research tab
    - Filter by status (pending/executed/settled_win/settled_loss)
  - [ ] 2.4.5: Journal tab
    - Timeline of journal entries for this workspace
    - Each entry: timestamp, direction, size, entry/exit price, P&L, emotion tag, notes preview
    - Click → expand full entry with linked decision and research
    - "Add Entry" manual form
    - Summary bar at top: total entries, win rate, total P&L
  - [ ] 2.4.6: Review tab
    - List of review reports for this workspace
    - Each review: date, outcome (win/loss), P&L, key lessons (preview)
    - Click → expand full review content
    - "Request Review" button → triggers AI review workflow
    - Links to related decisions and journal entries

- [ ] **Task 2.5**: Rewrite JournalPage (Global)
  - Global timeline of ALL journal entries across ALL workspaces
  - Filter bar: workspace dropdown, date range, outcome (all/win/loss/open), search
  - Chronological entry list (newest first)
  - Summary stats header: total entries, win rate, total P&L, best trade, worst trade
  - "Add Entry" form (manual journaling)
  - Export CSV/Markdown button
  - Entry expand/collapse with full detail view
  - Link to parent workspace and linked decision

- [ ] **Task 2.6**: Rewrite SettingsPage (从 Stub 到完整实现)
  - Section 1: AI Model (model selector, thinking level slider, show thinking toggle) — wire to /api/config
  - Section 2: Data Sources (API key inputs: OpenAI, Exa, Jina, Reddit client-id, **OpenRouter**)
  - Section 3: Trading (default position size, max positions, daily loss limit, auto-compaction) — wire to /api/config
  - Section 4: Appearance (theme toggle, font size, sidebar default collapsed) — localStorage only
  - Section 5: User Rules (textarea, one rule per line) — save to memory domain
  - Section 6: **Deep Research** (NEW): Enable/disable toggle, Mode select (Builtin/OpenRouter), Max steps slider (3-10)
  - Section 7: About (version, build info, docs links)
  - Glassmorphism styling consistent with design.md
  - Save indicators (checkmark on successful save)

- [ ] **Task 2.7**: Update AppLayout sidebar/navigation
  - Nav items reduced to exactly **7**: Dashboard, Markets, Workspace, Journal, Timeline, Settings, **Evolution**
  - Under "Workspace" nav item: show recent workspaces as collapsible sub-items (max 5)
  - Sessions list moved under Workspace or removed (workspace replaces session concept for UX)
  - Update icons to match new page semantics

- [ ] **Task 2.8**: Build EvolutionPage (**NEW — 7th Route**)
  - [ ] 2.8.1: Section 1 — Progress Dashboard (stat cards: win rate, P&L, streaks, best workspace)
  - [ ] 2.8.2: Section 2 — Improvement Feed (review suggestions with Adopt/Dismiss actions)
  - [ ] 2.8.3: Section 3 — Pattern Highlights (AI-generated insight cards)
  - [ ] 2.8.4: Section 4 — Rule Workshop (current rules + AI-suggested rules + adopt/reject)
  - [ ] 2.8.5: Section 5 — Quick Actions (Run Review, Export, Reset)

## Phase 3: New UI Components

- [ ] **Task 3.1**: Create AlphaRadarCard component
  - Opportunity card for Dashboard Alpha Radar section
  - Props: title, category, source, currentValue, change24h, volume, riskRating, reasoning, onClick, onResearchClick
  - Styling: glassmorphism card per design.md, category-colored left border, risk star icons, hover scale+glow
  - Category colors: sports=cyan, politics=purple, crypto=green, macro=amber, entertainment=pink
  - Two action buttons: primary (open workspace), secondary ("Research this")

- [ ] **Task 3.2**: Create DecisionCard component (AI-generated)
  - Structured decision display for chat messages
  - Props: confidence, riskLevel, supportingReasons[], againstReasons[], thesis, invalidationCriteria, onConfirm, onEdit
  - Visual: confidence badge (colored A+-F), risk stars (1-4), support bullets (green check), against bullets (red warning), thesis highlight, italic invalidation, Confirm/Edit buttons
  - Renders inside chat message area (new ChatItem kind: "decision")

- [ ] **Task 3.3**: Create DecisionForm component (manual)
  - Manual decision entry form for Decisions tab
  - Fields: topic, direction (select), position size (number), confidence (select), risk level (select), thesis (text), supporting reasons (textarea), against reasons (textarea), invalidation criteria (text)
  - Validation: required fields, number ranges
  - Submit → POST /api/decisions → refresh list

- [ ] **Task 3.4**: Create WorkspaceList component
  - Shows user's workspaces as cards or list
  - Each workspace: name, topic type icon/badge, decision count, last activity relative time, click to open
  - "Create New Workspace" CTA button/card
  - Empty state: illustration + "Create your first workspace" prompt

- [ ] **Task 3.5**: Create DeepResearchProgressPanel component (**Grill-me Finalized: DeepResearch-style step flow**)
  - **NOT a simple progress bar — full step-by-step execution view**
  - Props: isRunning, currentStep, totalSteps, steps[], topic, mode, elapsedTime, onCancel
  - Steps array: { name, status('pending'|'running'|'completed'|'error'), detail?, toolName?, inputPreview?, outputPreview? }[]
  - **Top status bar**: glassmorphism header with topic + mode badge (Built-in ReAct) + elapsed timer
  - **Step list** (main scrollable area):
    - ✓ completed = green checkmark + bold step name + gray detail line
    - ○ running = cyan pulse spinner + bold step name + live detail text (updates in real-time)
    - □ pending = muted text (step name only)
    - ✗ error = red warning icon + step name + error message
  - **Bottom bar**: progress bar (cyan fill = completed/total) + "Step N of M" + "~Nmin remaining" + [Cancel] button
  - Styling: full glassmorphism per design.md (bg-card/70, backdrop-blur-xl, border-white/[0.08])
  - Animations: framer-motion slide+fade on new steps, pulse on running state

- [ ] **Task 3.6**: Create ResearchReportView component (**Grill-me Finalized: Dual-pane document style**)
  - **Dual-pane layout** (left nav + right content, like Notion/语雀):
    - **Left pane (TOC)**: collapsible navigation
      - Items: ▼ Executive Summary / ▼ Key Findings (N sub-items) / ▼ Data Sources (grouped) / ▶ Conclusion
      - Click → smooth scroll to section in right pane
      - Active item: cyan left border + cyan text
      - Width: ~240px, collapsible on mobile
    - **Right pane (content)**: Markdown-rendered via Streamdown
      - Executive Summary: highlighted box (tools used, steps, source count)
      - Key Findings: ### headings with evidence quotes, clickable source links, relevance badges (★ High / ★★ Med / ★★★ Low)
      - Data Sources: grouped list "Exa: 8 articles | Semantic Scholar: 12 papers | Reddit: 13 threads"
      - Conclusion: final assessment in highlighted box
  - **Bottom toolbar** (fixed, glassmorphism, z-index high):
    - [← Return to Chat] — switch back to Chat mode
    - [Ask Follow-up] — inject report context into Chat for Q&A
    - [Generate Decision] → decision.analyze(report) → DecisionCard inline
    - [↓ Export .md] — download as Markdown file
    - [🔗 Copy Link] — copy workspace URL to clipboard
  - All styling per design.md tokens

- [ ] **Task 3.7**: Extend ChatItem types + render path
  - Add `kind: "decision"` to ChatItem union in types.ts
  - Add conversion logic in syncToItems() for decision events
  - Add render case in chat-item-view.tsx for DecisionCard display
  - Add `kind: "alpha-signal"` to ChatItem union (for inline Alpha Radar cards in chat)
  - Add `kind: "research-report"` to ChatItem union (for inline report cards in chat)

## Phase 4: Integration & Polish

- [ ] **Task 4.1**: Wire Alpha Radar Dashboard → Backend
  - Dashboard useQuery calls GET /api/alpha/radar on mount
  - Pass results to AlphaRadarCard components
  - Handle loading/error/empty/stale states
  - Auto-refresh every 5 minutes
  - Wire "Research this" secondary button → navigate to workspace + start deep research

- [ ] **Task 4.2**: Wire Markets → Polymarket backend
  - Prediction tab useQuery calls GET /api/markets?source=polymarket
  - Search uses GET /api/markets?source=polymarket&q=query
  - Favorites stored in localStorage (or future /api/favorites endpoint)

- [ ] **Task 4.3**: Wire Workspace CRUD → Backend
  - Workspace list: GET /api/workspaces
  - Create workspace: POST /api/workspaces
  - Delete workspace: DELETE /api/workspaces/:id (with confirm dialog)
  - Workspace detail: GET /api/workspaces/:id
  - Decisions within workspace: GET /api/decisions?workspaceId=...

- [ ] **Task 4.4**: Wire Decision Engine → AI conversation
  - When agent outputs decision-format data in SSE stream → render as DecisionCard component
  - Confirm button → POST /api/decisions → invalidate queries → show success toast
  - Decision Card appears as a new ChatItem kind in the conversation

- [ ] **Task 4.5**: Wire Deep Research → Frontend (**NEW in v2**)
  - "Start Deep Research" button → POST /api/research/deep → open SSE stream
  - Parse SSE events → update DeepResearchProgressPanel state
  - On research:complete → render ResearchReportView component
  - Save report to workspace artifacts
  - Cancel button → abort SSE connection + call cancel endpoint
  - Mode switching: read from settings store (builtin vs openrouter)
  - Error handling: network timeout, API failure, model overload → show error state with retry

- [ ] **Task 4.6**: Enhance ArtifactPanel for Workspace awareness
  - Accept optional workspaceId prop
  - When workspaceId provided: filter artifacts by workspace
  - When not provided: show global recent artifacts (current behavior)
  - New artifact types styled appropriately (alpha-signal, decision-card, research-report)
  - ResearchReport artifact shows preview (executive summary truncated)

- [ ] **Task 4.7**: Wire Paper Trade Lifecycle (**NEW**)
  - DecisionCard "Confirm" button → POST /api/paper-trades → auto-executes
  - Workspace/Decisions tab shows open positions with live status badge
  - Live P&L polling for open positions (every 30s or on-demand)
  - "Close Position" button for crypto trades → PATCH /api/paper-trades/:id/close
  - Settlement toast notification after auto-settle
  - Journal entry auto-updates with exit data after settlement

- [ ] **Task 4.8**: Wire Review + Evolution + User Rules (**NEW**)
  - Review tab "Request Review" → triggers review.workspace workflow → renders 7-section report
  - Evolution page fetches from /api/evolution/summary, /api/evolution/suggestions
  - "Suggest New Rules" → POST /api/evolution/suggest-rules → displays proposals
  - "Adopt" rule → POST /api/evolution/rules/:id/adopt → updates Settings User Rules
  - DecisionCard shows Rule Compliance section (data from decision-time check)
  - Journal entry emotion tag form saves to journal record
  - Timeline page fetches from GET /api/timeline/events with category filters

## Phase 5: E2E Testing & Verification

- [ ] **Task 5.1**: E2E Test — Dashboard Alpha Radar
  - [ ] Dashboard loads with Alpha Radar section
  - [ ] Cards render with real/stale data
  - [ ] Card click navigates to Workspace
  - [ ] Card "Research this" launches Deep Research
  - [ ] Reminders + Reviews sections visible
  - [ ] System Status shows correct config
  - [ ] Design compliance verified (glassmorphism, cyan accent, animations)

- [ ] **Task 5.2**: E2E Test — Markets Dual-Source
  - [ ] Both tabs load data correctly
  - [ ] Search works in both tabs
  - [ ] Favorite persists
  - [ ] Card click → Workspace navigation

- [ ] **Task 5.3**: E2E Test — Research (Chat in Workspace)
  - [ ] Send message → streaming response
  - [ ] Tool calls display
  - [ ] Thinking/Reasoning toggle
  - [ ] Plan component renders
  - [ ] Artifact inline card + sidebar panel
  - [ ] Export menu works
  - [ ] Multi-source AI calls (Exa/Jina/Reddit/Polymarket)

- [ ] **Task 5.4**: E2E Test — Deep Research Agent (**NEW in v2**)
  - [ ] "Start Deep Research" button visible in Overview + Research tabs
  - [ ] Topic input modal opens with pre-filled value
  - [ ] Mode selection works (Builtin / OpenRouter)
  - [ ] Starting research triggers SSE stream
  - [ ] Progress panel updates in real-time (steps complete one by one)
  - [ ] Cancel button stops research
  - [ ] On completion: ResearchReport renders with all sections
  - [ ] Report saved as artifact (visible in ArtifactPanel)
  - [ ] Report exportable as Markdown
  - [ ] Follow-up Chat references the report context
  - [ ] Deep Research from Alpha Radar card works end-to-end

- [ ] **Task 5.5**: E2E Test — Complete Closed Loop (Decision→Trade→Journal→Review)
  - [ ] AI generates Decision Card
  - [ ] User confirms → saved to Decisions tab
  - [ ] Paper Trade execution → Journal entry
  - [ ] Review generation → Review report
  - [ ] Full loop verifiable across 5 Workspace tabs
  - [ ] **Enhanced loop**: Deep Research → Decision → Journal → Review

- [ ] **Task 5.6**: E2E Test — Chat Components (Plan/Artifact/Memory)
  - [ ] Messages send/receive correctly
  - [ ] Plan component displays steps with status
  - [ ] Artifact component clickable, panel opens
  - [ ] Memory records persist (verify via Memory page)
  - [ ] Memory deletion works
  - [ ] Agent status indicators visible
  - [ ] NEW: ResearchReport renders correctly in artifact flow

- [ ] **Task 5.7**: E2E Test — Export & Design Compliance
  - [ ] HTML export downloads valid file
  - [ ] Markdown export downloads valid file
  - [ ] PDF export downloads valid file
  - [ ] Glassmorphism tokens correct per design.md (bg-card/70, backdrop-blur, cyan accent)
  - [ ] JetBrains Mono on code/data
  - [ ] Geist Sans on headings
  - [ ] framer-motion animations present
  - [ ] Responsive layout works (<768px sidebar collapse)
  - [ ] Bottom tab bar on mobile
  - [ ] Safe area insets respected
  - [ ] Touch targets ≥44px on mobile

- [ ] **Task 5.8**: E2E Test — Settings → Backend Control
  - [ ] Thinking Level change → verified in /api/config
  - [ ] Auto-Compaction toggle → affects agent
  - [ ] Theme toggle persists
  - [ ] API keys save correctly (including OpenRouter)
  - [ ] User Rules accessible to agent
  - [ ] NEW: Deep Research settings persist (mode, max steps)

- [ ] **Task 5.9**: E2E Test — Workspace Lifecycle
  - [ ] Create/read/delete/update workspace
  - [ ] 5 tabs all render correctly (including Deep Research UI in Research tab)
  - [ ] Workspace switching preserves state
  - [ ] Cross-tab data consistency (decision in Decisions tab also visible in Overview)
  - [ ] Deep Research sessions visible across tabs

- [ ] **Task 5.10**: Final compilation + browser verification
  - [ ] `npx tsc --noEmit` zero errors (apps/web)
  - [ ] `npm run build` succeeds without warnings
  - [ ] Dev server starts: `npm run dev`
  - [ ] Browser opens to http://localhost:5173/
  - [ ] All **7** pages navigable without console errors:
    - [ ] Dashboard ✓
    - [ ] Markets ✓
    - [ ] Workspace ✓
    - [ ] Journal ✓
    - [ ] Timeline ✓
    - [ ] Settings ✓
    - [ ] Evolution ✓
  - [ ] Visual inspection matches design.md specifications
  - [ ] No runtime errors in browser console during normal usage

- [ ] **Task 5.11**: E2E Test — Paper Trade Full Lifecycle (**NEW**)
  - [ ] Confirm Decision → Paper Trade auto-executes → Journal auto-created
  - [ ] Open position shows live status badge with elapsed time
  - [ ] Settlement/close updates P&L on Decision + Journal + Timeline
  - [ ] Toast notification appears after settlement

- [ ] **Task 5.12**: E2E Test — Review 7-Section Report (**NEW**)
  - [ ] Request Review generates report with all 7 sections
  - [ ] Each section renders correctly with data
  - [ ] Improvement suggestions have "Adopt as Rule" action
  - [ ] Report saved as artifact and visible in Evolution Feed

- [ ] **Task 5.13**: E2E Test — Journal 4-Dimension Records (**NEW**)
  - [ ] Paper Trade creates Journal entry with Dimensions 1+2 auto-filled
  - [ ] Emotion tag (Dimension 3) can be set manually
  - [ ] Post-review reflection (Dimension 4) auto-filled after Review
  - [ ] Global Journal page filters work correctly

- [ ] **Task 5.14**: E2E Test — Timeline Event Logging (**NEW**)
  - [ ] Tool call events appear with tool name/input/output/status
  - [ ] User action events appear for all user interactions
  - [ ] System events appear (settlements, reviews, warnings)
  - [ ] Category filters work (tool/user/system/milestone)
  - [ ] Summary stats at top are accurate

- [ ] **Task 5.15**: E2E Test — Evolution Page (**NEW**)
  - [ ] /evolution route loads with 5 sections
  - [ ] Improvement Feed shows suggestions from past Reviews
  - [ ] Rule Workshop displays current User Rules
  - [ ] "Suggest New Rules" triggers AI analysis
  - [ ] Adopt/Dismiss actions work correctly

- [ ] **Task 5.16**: E2E Test — User Rules Decision Integration (**NEW**)
  - [ ] Rules added in Settings persist and are loadable
  - [ ] DecisionCard shows Rule Compliance section
  - [ ] Warnings display for soft violations (amber)
  - [ ] Blocking warnings display for hard violations (red)
  - [ ] User can confirm despite warnings (Human in the loop)

- [ ] **Task 5.17**: E2E Test — Ultimate Closed Loop — All Systems (**NEW**)
  - [ ] Alpha Radar → Deep Research → Decision(Rule-checked) → Paper Trade → Journal(4-dim) → Settlement → Review(7-section) → Evolution(Rule adoption) → Next Decision(improved)
  - [ ] All 7 pages navigable end-to-end
  - [ ] Zero console errors throughout full flow
  - [ ] Design compliance verified across all pages

# Task Dependencies
- [Task 1.7] depends on [Task 1.1], [Task 1.2], [Task 1.3], [Task 1.4], [Task 1.5], [Task 1.6]
- [Task 1.8] depends on [Task 1.4] (needs Decision schema) + [Task 1.5] (needs Workspace)
- [Task 1.9] depends on [Task 1.8] (Paper Trade data needed for Review) + [Task 1.4] (Decision data)
- [Task 2.1] must complete before [Task 2.2]-[Task 2.8]
- [Task 2.4] (WorkspacePage) depends on [Task 3.1]-[Task 3.7] for child components
- [Task 2.8] (EvolutionPage) depends on [Task 1.9] (Evolution backend APIs)
- [Task 4.7] (Paper Trade wiring) depends on [Task 1.8] + [Task 2.4] (Decisions tab)
- [Task 4.8] (Review/Evolution/Rules wiring) depends on [Task 1.9] + [Task 2.8] (Evolution page)
- [Task 4.1]-[Task 4.6] depend on [Phase 1] + [Phase 2] + [Phase 3] completion
- [Task 5.*] all depend on [Phase 1] + [Phase 2] + [Phase 3] + [Phase 4] completion
- [Task 5.11]-[Task 5.17] (new E2E tests) depend on all new features being integrated
- [Task 1.1] and [Task 1.2] can be done in parallel
- [Task 2.2], [Task 2.3], [Task 2.5], [Task 2.6], [Task 2.8] can be done in parallel after [Task 2.1]
- [Task 3.1]-[Task 3.7] can be done in parallel with [Phase 2] tasks
- [Task 1.6] (Deep Research) can be done in parallel with [Task 1.1]-[Task 1.5]
