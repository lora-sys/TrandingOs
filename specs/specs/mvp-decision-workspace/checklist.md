# Checklist — Trading Pi MVP: Prediction Decision Workspace v2

## Phase 1: Backend Foundation Checkpoints

### Polymarket Client (Task 1.1)
- [ ] `packages/core/src/market/polymarket.ts` exists with Gamma API client
- [ ] Gamma API implements GET /markets, /markets/{id}, search endpoints
- [ ] CLOB API client for price/orderbook data present
- [ ] Error handling with fallback chain (Gamma → CLOB → cache) implemented
- [ ] 10s timeout per request configured
- [ ] TypeScript types defined: Market, Price, Orderbook, Event
- [ ] 4 Polymarket skills registered in `default-skills.ts`:
  - [ ] `market.polymarket.markets`
  - [ ] `market.polymarket.detail`
  - [ ] `market.polymarket.price`
  - [ ] `market.polymarket.search`

### Reddit + Academic Search Skills (Task 1.2)
- [ ] Reddit skill implementation uses public JSON API (`reddit.com/r/{sub}/hot.json`)
- [ ] Methods implemented: hot(), search(), comments()
- [ ] Rate limit handling with retry/backoff for 429 responses
- [ ] Post type parsed: title, score, comments, url, created
- [ ] Supported subreddits configured: CryptoCurrency, PredictionMarkets, soccer, politics, wallstreetbets
- [ ] Skill registered in default-skills.ts
- [ ] **Semantic Scholar skill** (`academic.semanticscholar`) implemented
  - [ ] API endpoint: `https://api.semanticscholar.org/graph/v1/paper/search`
  - [ ] Methods: search(query, limit?, year?), details(paperId), citations(paperId), references(paperId)
  - [ ] Returns Paper[] with paperId, title, authors, abstract, **tldr**, citationCount, url, openAccessPdf, venue
  - [ ] AI TLDR field used for report summaries
  - [ ] Rate limit handling (1000 req/sec shared / 1 req/sec with key)
- [ ] **Crossref skill** (`academic.crossref`) implemented
  - [ ] API endpoint: `https://api.crossref.org/works`
  - [ ] Methods: search(query, rows?, filter?), byDOI(doi)
  - [ ] Returns Work[] with DOI, title[], author[], published, container-title, ISSN, type, link[]
  - [ ] User-Agent header includes email for politeness
- [ ] **OpenAlex skill** (`academic.openalex`) implemented
  - [ ] API endpoint: `https://api.openalex.org/works`
  - [ ] Methods: search(query, per_page?, filter?), work(workId)
  - [ ] Returns Work[] with id, title, publication_year, cited_by_count, concepts[], open_access
  - [ ] All 3 academic skills registered in default-skills.ts

### Alpha Radar Workflow (Task 1.3)
- [ ] AlphaSignal type defined in core types
- [ ] Artifact type "alpha-signal" registered
- [ ] Workflow `alpha.radar.scan` implemented in default-workflows.ts
- [ ] Step 1: Fetches Polymarket trending markets (volume > $50K filter)
- [ ] Step 2: Fetches Exa breaking news (crypto/prediction keywords)
- [ ] Step 3: Fetches Reddit hot posts from target subreddits
- [ ] Step 4: Cross-references & scores (volume*0.4 + novelty*0.3 + sentiment*0.3)
- [ ] Step 5: Returns Top5 as AlphaSignal[]
- [ ] Step 6: Caches results to memory domain "alpha" with 5-min TTL
- [ ] GET /api/alpha/radar endpoint exists in server/api.ts
- [ ] Endpoint triggers background scan and returns cached/current results

### Decision Engine (Task 1.4)
- [ ] `decisions` table created in database.ts with correct schema
- [ ] Repository methods implemented in repositories.ts:
  - [ ] createDecision()
  - [ ] updateDecisionStatus()
  - [ ] listDecisions(workspaceId?)
  - [ ] getDecision(id)
- [ ] Skill `decision.analyze` registered and gathers market+news+community data
- [ ] Outputs structured decision recommendation using DecisionCard format
- [ ] API endpoints exist in server/api.ts:
  - [ ] POST /api/decisions (create decision)
  - [ ] GET /api/decisions (list decisions)
  - [ ] GET /api/decisions/:id (single decision)
  - [ ] PATCH /api/decisions/:id/status (update status)

### Workspace Backend (Task 1.5)
- [ ] `workspaces` table created in database.ts with correct schema
- [ ] Repository methods implemented:
  - [ ] createWorkspace()
  - [ ] listWorkspaces(sessionId?)
  - [ ] getWorkspace(id)
  - [ ] updateWorkspace(id)
  - [ ] deleteWorkspace(id)
- [ ] API endpoints exist in server/api.ts:
  - [ ] GET /api/workspaces
  - [ ] POST /api/workspaces
  - [ ] GET /api/workspaces/:id
  - [ ] PATCH /api/workspaces/:id
  - [ ] DELETE /api/workspaces/:id
- [ ] Artifacts table modified: workspace_id FK column added
- [ ] Existing workflows accept optional workspaceId parameter

### Deep Research Agent (Task 1.6) **Grill-me Finalized**
- [ ] `research_sessions` table created in database.ts
  - [ ] Columns: id, workspace_id, topic, mode(builtin only for MVP), status, iterations, report_artifact_id, token_usage, error_message, timestamps
- [ ] ReAct Loop engine implemented in `packages/core/src/research/deep-research.ts`
  - [ ] Decomposes research question into sub-questions
  - [ ] **Search phase includes academic sources**: Exa + Semantic Scholar + Crossref + Reddit + market data
  - [ ] Read phase: Jina Reader for discovered URLs/papers (top 5-10)
  - [ ] Analyze phase: cross-reference findings, identify patterns
  - [ ] Synthesize phase: generates ResearchReport (aligned w/ DeepResearch: executionSummary → keyFindings → dataSourceSummary → conclusion)
  - [ ] Max iterations configurable (default: 5), fully auto (user only inputs topic)
  - [ ] Each iteration emits SSE progress event with: stepName, detail, toolName, inputPreview, outputPreview
  - [ ] Cancellation support via AbortController
  - [ ] **MVP: Built-in mode only** (uses current OpenAI API, no OpenRouter backend in MVP)
- [ ] Workflow `deep.research` registered in default-workflows.ts
  - [ ] Input: topic, workspaceId (**only 2 required fields — fully automatic**)
  - [ ] Tools available: exa, jina, reddit, semanticscholar, crossref, polymarket, coingecko
  - [ ] Outputs: ResearchReport artifact + research_session record
- [ ] `/api/research/deep` SSE endpoint exists in server/api.ts
  - [ ] POST starts research session, returns SSE stream
  - [ ] Events: research:started, **research:step (with toolName/inputPreview/outputPreview)**, research:complete, research:error
  - [ ] GET /api/research/sessions for listing past sessions
  - [ ] GET /api/research/sessions/:id for single session status
- [ ] ResearchReport artifact type "research-report" registered
  - [ ] Stores full report JSON in artifacts table
  - [ ] Links to workspace via workspace_id
- [ ] **Report → Decision one-click helper** implemented
  - [ ] Takes ResearchReport as context → calls decision.analyze → outputs DecisionCard
  - [ ] Enables closed loop: Deep Research → Decision

### Event Feed Skills (Task 1.2.6) **NEW**
- [ ] `events.tradingeconomics` skill implemented
  - [ ] API endpoint: TradingEconomics (macro events)
  - [ ] Methods: calendar(upcoming?, country?), news(category?)
  - [ ] Returns Event[] with title, date, country, importance(low/medium/high), category, forecast, previous
  - [ ] Free developer tier handling
- [ ] `events.coinmarketcal` skill implemented
  - [ ] API endpoint: CoinMarketCal (crypto events)
  - [ ] Methods: events(days?, coins?, types?), today()
  - [ ] Returns CryptoEvent[] with title, date, coins[], type, description, source_url
  - [ ] Free tier handling
- [ ] Both skills registered in default-skills.ts
- [ ] Dashboard "Today's Reminders" fetches from both sources on mount
  - [ ] Results cached for 30 minutes
  - [ ] Macro events displayed with importance color (🔴 high / 🟡 medium / 🟢 low)
  - [ ] Crypto events displayed with type icons
  - [ ] Events also feed into Alpha Radar context (upcoming events affect opportunity scoring)

### Build Verification (Task 1.7)
- [ ] `cd packages/core && npm run build` completes with zero errors
- [ ] All new TypeScript types compile without errors
- [ ] All new skills register correctly (including 3 academic skills)
- [ ] All new workflows compile
- [ ] Repository methods type-check correctly
- [ ] Deep Research module compiles (deep-research.ts)

---

## Phase 2: Frontend Page Restructure Checkpoints

### Router Rewrite (Task 2.1)
- [ ] router.tsx contains exactly 6 routes:
  - [ ] Dashboard (/)
  - [ ] Markets (/markets)
  - [ ] Workspace (/workspace/:id?)
  - [ ] Journal (/journal)
  - [ ] Timeline (/timeline)
  - [ ] Settings (/settings)
- [ ] Old routes removed: Chat, Research, Planner, Portfolio, Review, Evolution, Marketplace, Journey, System
- [ ] AppLayout navItems array updated to 6 items
- [ ] Layout structure preserved (sidebar/header/outlet)

### Dashboard Page (Task 2.2)
- [ ] DashboardPage renders Alpha Radar section at TOP
- [ ] Auto-triggers alpha.radar.scan on mount (useQuery with 5min interval)
- [ ] Top5 opportunity cards render with glassmorphism styling per design.md
- [ ] Each card displays: title, value, change, volume, risk stars, source badge
- [ ] Card click navigates to /workspace/new?topic=...&source=...
- [ ] Card secondary button "Research this" triggers Deep Research flow
- [ ] Loading state shows shimmer skeleton cards
- [ ] Error/stale state shows cached data with badge
- [ ] Today's Reminders section visible
  - [ ] Shows **real events** from TradingEconomics (macro: FOMC/CPI etc.) + CoinMarketCal (crypto: listings/unlocks)
  - [ ] Macro events have importance color coding (🔴 high / 🟡 medium / 🟢 low)
  - [ ] Crypto events show type icons
  - [ ] Events cached 30min, refresh on Dashboard remount
- [ ] Recent Reviews summary visible (last 7 from /api/reviews)
- [ ] System Status section shows correct config values
- [ ] framer-motion entrance animations per design.md duration scale

### Markets Page (Task 2.3)
- [ ] Two tabs rendered: "Crypto Spot" | "Prediction Markets"
- [ ] Crypto tab reuses existing CoinGecko data display
- [ ] Prediction tab fetches from GET /api/markets?source=polymarket
- [ ] Market cards display with glassmorphism per design.md
- [ ] Each card shows: question text, YES%/NO%, volume ($), settlement countdown, 24h change
- [ ] Category filter pills work (Sports/Politics/Crypto/Macro/Entertainment)
- [ ] Search input filters cards client-side
- [ ] Favorite toggle persists in localStorage
- [ ] Card click navigates to /workspace/new?topic=...&source=polymarket&id=...
- [ ] Tab switch animation uses framer-motion layout animation
- [ ] Empty states shown for both tabs

### Workspace Page (Task 2.4) — MVP Core
- [ ] **Shell Component** (2.4.1):
  - [ ] No :id param → workspace list page shown
  - [ ] :id provided → workspace detail with 5 sub-tabs
  - [ ] Workspace list shows: name, topic_type, decision count, last activity
  - [ ] Create New Workspace button functional
  - [ ] Breadcrumb navigation: Workspaces > [Current Workspace Name]

- [ ] **Overview Tab** (2.4.2):
  - [ ] Workspace metadata header (name, description, created date, topic type badge)
  - [ ] Linked market snapshot displayed (if topic_ref exists)
  - [ ] Key metrics: decisions count, win rate, total P&L, journal entries count
  - [ ] Recent activity feed (last 10 timeline events for this workspace)
  - [ ] Quick action buttons: Start Research, **Start Deep Research**, Record Decision, View Journal

- [ ] **Research Tab** (2.4.3) — Chat + Deep Research dual mode:
  - [ ] **Chat Mode**: Full SSE streaming capability (inherited from ChatWorkspace)
  - [ ] Tool calls display correctly
  - [ ] Thinking/Reasoning toggle works
  - [ ] Plan component renders
  - [ ] Artifact panel functional
  - [ ] Export menu works (HTML/Markdown/PDF)
  - [ ] Artifacts scoped to this workspace
  - [ ] **Deep Research Mode** (NEW):
    - [ ] "Deep Research" trigger button visible next to chat input
    - [ ] Topic input modal opens (pre-filled with workspace topic)
    - [ ] Mode selector: Built-in (default) | OpenRouter
    - [ ] Max iterations slider (3-10)
    - [ ] Progress panel renders during execution (per design.md glassmorphism)
    - [ ] Progress steps show: ✓ completed, ○ running (spinner), □ pending
    - [ ] Progress bar shows N/total + estimated time
    - [ ] Cancel button stops research
    - [ ] On completion: ResearchReport view renders with collapsible sections
    - [ ] Report sections: Executive Summary, Key Findings, Citations, Evidence, Counter-Arguments, Risk Factors, Conclusion
    - [ ] Source links clickable in report
    - [ ] Counter-arguments styled amber/warning
    - [ ] Risk factor matrix (impact × probability badges)
    - [ ] Export: Copy Markdown, Download, Follow-up in Chat

- [ ] **Decisions Tab** (2.4.4):
  - [ ] List of DecisionRecord cards for workspace
  - [ ] Each card: direction badge, confidence color, risk stars, one-line thesis, status badge, P&L
  - [ ] Click expands full details (supporting/against reasons, invalidation criteria)
  - [ ] "New Decision" button opens form OR triggers AI analysis
  - [ ] Filter by status (pending/executed/settled_win/settled_loss)

- [ ] **Journal Tab** (2.4.5):
  - [ ] Timeline of journal entries for this workspace
  - [ ] Each entry: timestamp, direction, size, entry/exit price, P&L, emotion tag, notes preview
  - [ ] Click expands full entry with linked decision/research
  - [ ] "Add Entry" manual form functional
  - [ ] Summary bar: total entries, win rate, total P&L

- [ ] **Review Tab** (2.4.6):
  - [ ] List of review reports for this workspace
  - [ ] Each review: date, outcome (win/loss), P&L, key lessons preview
  - [ ] Click expands full review content
  - [ ] "Request Review" button triggers AI workflow
  - [ ] Links to related decisions and journal entries

### Journal Page (Task 2.5)
- [ ] Global timeline of ALL journal entries across ALL workspaces
- [ ] Filter bar: workspace dropdown, date range, outcome (all/win/loss/open), search
- [ ] Chronological entry list (newest first)
- [ ] Summary stats header: total entries, win rate, total P&L, best trade, worst trade
- [ ] "Add Entry" manual form functional
- [ ] Export CSV/Markdown button works
- [ ] Entry expand/collapse with full detail view
- [ ] Links to parent workspace and linked decision

### Settings Page (Task 2.6)
- [ ] Section 1: AI Model — model selector, thinking level slider, show thinking toggle → wires to /api/config
- [ ] Section 2: Data Sources — API key inputs (OpenAI, Exa, Jina, Reddit, **OpenRouter**)
- [ ] Section 3: Trading — default position size, max positions, daily loss limit, auto-compaction → wires to /api/config
- [ ] Section 4: Appearance — theme toggle, font size, sidebar default collapsed → localStorage only
- [ ] Section 5: User Rules — textarea (one rule per line) → saves to memory domain
- [ ] Section 6: **Deep Research** (NEW): Enable/disable toggle, Mode select, Max steps slider
- [ ] Section 7: About — version, build info, docs links
- [ ] Glassmorphism styling consistent with design.md
- [ ] Save indicators show checkmark on successful save

### AppLayout Update (Task 2.7)
- [ ] Nav items reduced to exactly 6: Dashboard, Markets, Workspace, Journal, Timeline, Settings
- [ ] Recent workspaces shown as collapsible sub-items under "Workspace" (max 5)
- [ ] Sessions list moved under Workspace or removed
- [ ] Icons updated to match new page semantics

---

## Phase 3: New UI Components Checkpoints

### AlphaRCard Component (Task 3.1)
- [ ] Component accepts props: title, category, source, currentValue, change24h, volume, riskRating, reasoning, onClick, onResearchClick
- [ ] Glassmorphism card styling per design.md with category-colored left border
- [ ] Risk star icons render correctly
- [ ] Hover effect: scale + glow
- [ ] Category colors applied: sports=cyan, politics=purple, crypto=green, macro=amber, entertainment=pink
- [ ] Two action buttons: primary (open workspace), secondary ("Research this")

### DecisionCard Component (AI-generated) (Task 3.2)
- [ ] Component accepts props: confidence, riskLevel, supportingReasons[], againstReasons[], thesis, invalidationCriteria, onConfirm, onEdit
- [ ] Confidence badge renders colored A+-F scale
- [ ] Risk stars render (1-4 level)
- [ ] Supporting reasons show green check bullets
- [ ] Against reasons show red warning bullets
- [ ] Thesis text highlighted
- [ ] Invalidation criteria shown in italic
- [ ] Confirm/Edit buttons functional
- [ ] Renders inside chat message area as new ChatItem kind: "decision"

### DecisionForm Component (Manual) (Task 3.3)
- [ ] Form fields present: topic, direction, position size, confidence, risk level, thesis, supporting reasons, against reasons, invalidation criteria
- [ ] Validation: required fields enforced, number ranges validated
- [ ] Submit → POST /api/decisions → refreshes list
- [ ] Error handling for failed submissions

### WorkspaceList Component (Task 3.4)
- [ ] Shows user's workspaces as cards/list
- [ ] Each workspace: name, topic type icon/badge, decision count, last activity relative time
- [ ] Click navigates to workspace detail
- [ ] "Create New Workspace" CTA button/card present
- [ ] Empty state: illustration + "Create your first workspace" prompt

### DeepResearchProgressPanel Component (Task 3.5) **Grill-me Finalized: DeepResearch-style step flow**
- [ ] **NOT a simple progress bar — full step-by-step execution view**
- [ ] Props: isRunning, currentStep, totalSteps, steps[], topic, mode, elapsedTime, onCancel
- [ ] Steps array includes: name, status, detail?, toolName?, inputPreview?, outputPreview?
- [ ] **Top status bar**: glassmorphism header with topic + "Built-in ReAct" mode badge + elapsed timer
- [ ] **Step list** (main scrollable area) renders correctly:
  - [ ] ✓ completed = green checkmark + bold step name + gray detail line
  - [ ] ○ running = cyan pulse spinner + bold step name + live detail text (updates in real-time)
  - [ ] □ pending = muted text (step name only)
  - [ ] ✗ error = red warning icon + step name + error message
- [ ] **Bottom bar**: progress bar (cyan fill = completed/total) + "Step N of M" + "~Nmin remaining" + Cancel button
- [ ] Full glassmorphism styling per design.md (bg-card/70, backdrop-blur-xl, border-white/[0.08])
- [ ] Animations: framer-motion slide+fade on new step completion, pulse animation on running state
- [ ] Cancel button calls onCancel callback (AbortController)

### ResearchReportView Component (Task 3.6) **Grill-me Finalized: Dual-pane document style**
- [ ] **Dual-pane layout** (left TOC nav + right content area):
  - [ ] Left pane (~240px): collapsible table-of-contents navigation
    - [ ] Items: Executive Summary / Key Findings (N sub-items) / Data Sources (grouped) / Conclusion
    - [ ] Click item → smooth scroll to section in right pane
    - [ ] Active item: cyan left border + cyan text highlight
    - [ ] Collapsible on mobile (<768px)
  - [ ] Right pane: Markdown-rendered content via Streamdown
    - [ ] Executive Summary: highlighted box with tools/steps/source count
    - [ ] Key Findings: ### headings with evidence quotes, **clickable source links**, relevance badges (★ High/★★ Med/★★★ Low)
    - [ ] Data Sources: grouped list "Exa: N articles | Semantic Scholar: N papers | Reddit: N threads"
    - [ ] Conclusion: final assessment in highlighted box
- [ ] **Bottom toolbar** (fixed, glassmorphism, high z-index):
  - [ ] [← Return to Chat] — switches back to Chat mode in Research tab
  - [ ] [Ask Follow-up] — auto-injects report context into Chat for Q&A
  - [ ] [Generate Decision] → triggers decision.analyze(report) → renders DecisionCard inline
  - [ ] [↓ Export .md] — downloads full report as Markdown file
  - [ ] [🔗 Copy Link] — copies workspace/report URL to clipboard
- [ ] All styling follows design.md glassmorphism tokens

### ChatItem Type Extensions (Task 3.7)
- [ ] `kind: "decision"` added to ChatItem union in types.ts
- [ ] Conversion logic in syncToItems() handles decision events
- [ ] Render case in chat-item-view.tsx for DecisionCard display
- [ ] `kind: "alpha-signal"` added to ChatItem union
- [ ] Render case for inline Alpha Radar cards in chat
- [ ] `kind: "research-report"` added to ChatItem union
- [ ] Render case for inline Research Report cards in chat

---

## Phase 4: Integration & Polish Checkpoints

### Alpha Radar Integration (Task 4.1)
- [ ] Dashboard useQuery calls GET /api/alpha/radar on mount
- [ ] Results passed to AlphaRadarCard components correctly
- [ ] Loading state handled (shimmer/skeleton)
- [ ] Error state handled (error message/fallback)
- [ ] Empty state handled (no opportunities message)
- [ ] Stale data state handled (cached data with timestamp badge)
- [ ] Auto-refresh every 5 minutes working
- [ ] "Research this" secondary button wired to Deep Research flow

### Markets-Polymarket Integration (Task 4.2)
- [ ] Prediction tab useQuery calls GET /api/markets?source=polymarket
- [ ] Search query uses GET /api/markets?source=polymarket&q=query
- [ ] Favorites stored in localStorage correctly
- [ ] Favorite toggle persists across page reloads

### Workspace CRUD Integration (Task 4.3)
- [ ] Workspace list loads via GET /api/workspaces
- [ ] Create workspace sends POST /api/workspaces
- [ ] Delete workspace sends DELETE /api/workspaces/:id with confirm dialog
- [ ] Workspace detail loads via GET /api/workspaces/:id
- [ ] Decisions within workspace load via GET /api/decisions?workspaceId=...

### Decision Engine-AI Integration (Task 4.4)
- [ ] Agent outputs decision-format data in SSE stream
- [ ] Decision data renders as DecisionCard component in chat
- [ ] Confirm button sends POST /api/decisions
- [ ] Queries invalidated after successful creation
- [ ] Success toast/notification shown
- [ ] Decision Card appears as new ChatItem kind in conversation

### Deep Research Frontend Integration (Task 4.5) **NEW in v2**
- [ ] "Start Deep Research" button POSTs to /api/research/deep
- [ ] SSE connection opens and streams progress events
- [ ] research:started event → shows progress panel
- [ ] research:step event → updates current step + progress bar
- [ ] research:finding event → optionally shows interim findings
- [ ] research:complete event → switches to ResearchReportView
- [ ] research:error event → shows error state with retry option
- [ ] Cancel button aborts SSE + calls cancel endpoint
- [ ] Mode switching reads from settings store
- [ ] Report saved to workspace artifacts after completion
- [ ] Error handling: timeout, API failure, model overload

### ArtifactPanel Workspace Awareness (Task 4.6)
- [ ] Accepts optional workspaceId prop
- [ ] When workspaceId provided: artifacts filtered by workspace
- [ ] When not provided: shows global recent artifacts (current behavior)
- [ ] New artifact types styled appropriately (alpha-signal, decision-card, research-report)
- [ ] ResearchReport artifact shows executive summary preview

---

## Phase 5: E2E Testing Checkpoints

### E2E-1: Dashboard Alpha Radar (Task 5.1)
- [ ] Dashboard page loads without errors
- [ ] Alpha Radar section visible at top of page
- [ ] Opportunity cards render (real or stale/cached data)
- [ ] Each card shows: title, probability/odds, volume, change, risk rating, source tag
- [ ] Card hover effect works (scale + glow per design.md)
- [ ] Clicking primary card navigates to Workspace with topic pre-filled
- [ ] Clicking "Research this" launches Deep Research in workspace
- [ ] Today's Reminders section visible with **real event data** (TradingEconomics macro + CoinMarketCal crypto)
  - [ ] Importance colors correct for macro events
  - [ ] Type icons present for crypto events
- [ ] Recent Reviews section visible with win rate summary
- [ ] System Status section shows agent/model/config info
- [ ] No console errors on page load
- [ ] Design compliance: glassmorphism tokens, cyan accent, animations

### E2E-2: Markets Dual-Source (Task 5.2)
- [ ] Navigate to /markets without errors
- [ ] Two tabs visible: "Crypto Spot" | "Prediction Markets"
- [ ] Crypto tab loads CoinGecko data correctly
- [ ] Prediction tab loads Polymarket data correctly
- [ ] Search works in both tabs
- [ ] Category filters work in Prediction tab
- [ ] Favorite/star toggle persists after reload
- [ ] Click market card → navigates to Workspace
- [ ] Tab switch animation smooth (framer-motion)

### E2E-3: Research (Chat in Workspace) (Task 5.3)
- [ ] Navigate to any Workspace → Research tab
- [ ] Send message → receive streaming response
- [ ] Tool calls display correctly in chat
- [ ] Thinking/Reasoning toggle shows/hides reasoning
- [ ] Plan component renders with steps and status
- [ ] Artifact inline card appears when agent generates file
- [ ] Artifact sidebar panel opens on click
- [ ] Export menu works (HTML/Markdown/PDF download)
- [ ] AI can call multiple data sources (Exa/Jina/Reddit/Polymarket)
- [ ] No SSE disconnection errors during long conversations

### E2E-4: Deep Research Agent (Task 5.4) **Grill-me Finalized**
- [ ] "Start Deep Research" button visible in Overview tab
- [ ] "Start Deep Research" toggle/button visible in Research tab
- [ ] Clicking opens **simple topic input** (pre-filled with workspace topic) — no config modal
- [ ] **Fully automatic**: only topic input + Start button (no mode selector, no iteration slider in MVP)
- [ ] Starting research triggers SSE stream to /api/research/deep
- [ ] **DeepResearch-style progress panel** appears:
  - [ ] Top status bar: topic + mode badge + elapsed time
  - [ ] Step list shows: ✓ completed (green), ○ running (cyan spinner), □ pending (gray)
  - [ ] Each step shows: step name + detail line (+ toolName for search/read steps)
  - [ ] Current running step shows live-updating detail text
  - [ ] Progress bar at bottom: cyan fill = completed/total steps
  - [ ] "Step N of M" + "~Nmin remaining" text
  - [ ] Cancel button stops research and cleans up
- [ ] Steps transition with framer-motion animations (slide+fade on complete, pulse on running)
- [ ] On completion: **dual-pane ResearchReportView** renders
  - [ ] Left TOC pane: Executive Summary / Key Findings (N items) / Data Sources / Conclusion
  - [ ] Right content pane: Markdown rendered with evidence quotes, source links, relevance badges
  - [ ] Active TOC item highlighted with cyan accent
  - [ ] Clicking TOC item scrolls to section in right pane
- [ ] Report contains: Execution Summary (tools/steps/sources count), Key Findings (with evidence+source links), Data Sources (grouped by type), Conclusion
- [ ] **Bottom toolbar** present and functional:
  - [ ] [← Return to Chat] switches back to Chat mode
  - [ ] [Ask Follow-up] injects report context into Chat
  - [ ] **[Generate Decision]** triggers decision.analyze → DecisionCard inline
  - [ ] [↓ Export .md] downloads report as Markdown
  - [ ] [🔗 Copy Link] copies URL to clipboard
- [ ] Report saved as artifact in workspace (visible in ArtifactPanel)
- [ ] Academic sources appear in report (Semantic Scholar papers, Crossref works)
- [ ] Deep Research from Alpha Radar "Research this" button works end-to-end
- [ ] Error state shows gracefully if research fails
- [ ] **Report→Decision one-click**: clicking Generate Decision produces valid DecisionCard

### E2E-5: Complete Closed Loop (Task 5.5)
- [ ] AI generates Decision Card in Research tab
- [ ] User clicks Confirm on Decision Card
- [ ] Decision saved and appears in Decisions tab
- [ ] From decision, execute Paper Trade → Journal entry auto-created
- [ ] Journal entry visible in Journal tab (workspace-scoped and global)
- [ ] After simulated settlement, trigger Review → Review report generates
- [ ] Review tab shows report with P&L, lessons, improvements
- [ ] Full loop verifiable: Dashboard(Radar) → Markets → Workspace(Research→Decision→Journal→Review)
- [ ] Enhanced loop verifiable: Dashboard(Radar) → Workspace(Depth Research→Decision→Journal→Review)

### E2E-6: Chat Components (Task 5.6)
- [ ] Messages send and receive correctly
- [ ] Plan component displays steps with status indicators
- [ ] Artifact component clickable → panel opens
- [ ] Memory records persist and visible in Memory page
- [ ] Memory deletion works (with confirmation)
- [ ] Agent status indicators visible (model, thinking level)
- [ ] Multi-turn conversation context maintained
- [ ] ResearchReport renders correctly in artifact flow

### E2E-7: Export & Design Compliance (Task 5.7)
- [ ] HTML export downloads valid .html file (opens in browser)
- [ ] Markdown export downloads valid .md file (correct formatting)
- [ ] PDF export downloads valid .pdf file (readable)
- [ ] Glassmorphism tokens correct throughout:
  - [ ] Background cards use bg-card/70 opacity
  - [ ] Backdrop blur effects present
  - [ ] Cyan (#06b6d4) accent color used consistently
- [ ] JetBrains Mono font on code/data elements
- [ ] Geist Sans font on headings
- [ ] framer-motion entrance animations present on pages/cards
- [ ] Responsive layout works: sidebar collapses below 768px
- [ ] Mobile bottom tab bar present (fixed, h-14, glass background)
- [ ] Safe area insets for mobile notch devices
- [ ] Touch targets ≥44px on mobile
- [ ] prefers-reduced-motion respected (animations disabled)

### E2E-8: Settings → Backend Control (Task 5.8)
- [ ] Navigate to /settings
- [ ] Change Thinking Level slider → saved to backend
- [ ] Verify /api/config returns updated thinkingLevel
- [ ] Toggle Auto-Compaction → affects agent behavior
- [ ] Toggle Show Thinking → persists across reloads
- [ ] Theme toggle (dark/light) persists across reloads
- [ ] API keys entered and saved correctly (Exa, Jina, Reddit, OpenAI, OpenRouter)
- [ ] User Rules saved and accessible to agent
- [ ] Save indicator (checkmark) appears on successful save
- [ ] NEW: Deep Research settings persist (mode preference, max steps)
- [ ] NEW: OpenRouter API key field saves correctly

### E2E-9: Workspace Lifecycle (Task 5.9)
- [ ] Create new workspace (name + description)
- [ ] Workspace appears in sidebar under Workspace nav item
- [ ] Navigate to workspace → all 5 tabs render correctly
- [ ] Switch between workspaces → state preserved per workspace
- [ ] Delete workspace (with confirmation dialog)
- [ ] Workspace Overview tab shows correct summary metrics
- [ ] Research tab has full chat capability
- [ ] Research tab has Deep Research trigger + progress + report rendering
- [ ] Decisions tab lists decisions for this workspace only
- [ ] Journal tab lists entries for this workspace only
- [ ] Review tab lists reviews for this workspace only
- [ ] Cross-tab data consistency: decision in Decisions also in Overview
- [ ] Deep Research sessions visible and linked to workspace

### E2E-10: Final Compilation + Browser Verification (Task 5.10)
- [ ] `npx tsc --noEmit` completes with zero TypeScript errors (apps/web)
- [ ] `npm run build` succeeds without warnings
- [ ] Dev server starts: `npm run dev`
- [ ] Browser opens to http://localhost:5173/
- [ ] Dashboard page loads without console errors
- [ ] All 6 pages navigable via sidebar:
  - [ ] Dashboard ✓
  - [ ] Markets ✓
  - [ ] Workspace ✓
  - [ ] Journal ✓
  - [ ] Timeline ✓
  - [ ] Settings ✓
- [ ] Visual inspection matches design.md specifications:
  - [ ] Dark glassmorphism theme consistent
  - [ ] Cyan accent color used throughout
  - [ ] Typography correct (JetBrains Mono + Geist Sans)
  - [ ] Spacing and padding consistent
  - [ ] Animations smooth and not jarring
- [ ] No runtime errors in browser console during normal usage
- [ ] Network requests complete without 500 errors (except expected auth failures)
- [ ] **Ultimate test**: Full flow Dashboard→Alpha Radar→Deep Research→Decision→Journal→Review completes without errors

### E2E-11: Data Flow Integrity (Bonus Verification)
- [ ] Polymarket data flows: API → Server → Frontend correctly
- [ ] Reddit data flows: API → Agent → Chat display correctly
- [ ] Exa/Jina search results appear in Research tab
- [ ] Decision data persists in SQLite database
- [ ] Workspace-artifact linking works bidirectionally
- [ ] Alpha Radar cache invalidates after 5 minutes
- [ ] Deep Research session logged to memory (domain="deep-research")
- [ ] Research Report artifact persists across page reloads
- [ ] Session persistence works (reload → data still there)
- [ ] Error boundaries catch failures gracefully (no white screen of death)
- [ ] OpenRouter mode fallback works (when no API key configured)

### Paper Trade Lifecycle (Task 1.8 + Task 4.7) **NEW**
- [ ] `paper_trades` table created in database.ts with correct schema
  - [ ] Columns: id, decision_id, workspace_id, direction, asset, entry_price, exit_price, position_size, pnl, pnl_percent, entry_time, exit_time, status, settlement_reason
- [ ] `paper.trade.lifecycle` workflow implemented in default-workflows.ts
  - [ ] Creates paper_trade record on decision confirmation (status=open)
  - [ ] Fetches current market price for entry_price
  - [ ] Auto-creates Journal Entry with Dimensions 1+2 filled
  - [ ] Settlement step: calculates P&L → updates decision status → updates journal → creates timeline event
- [ ] API endpoints exist in server/api.ts:
  - [ ] POST /api/paper-trades (execute from decision)
  - [ ] GET /api/paper-trades (list with workspace/status filters)
  - [ ] GET /api/paper-trades/:id (single with live P&L)
  - [ ] PATCH /api/paper-trades/:id/close (manual close for crypto)
  - [ ] POST /api/paper-trades/:id/settle (auto-settlement)
- [ ] Frontend: DecisionCard "Confirm" → auto-executes paper trade
- [ ] Frontend: Decisions tab shows open positions with "OPEN · entered X ago" badge
- [ ] Frontend: Live P&L polling for open positions (30s interval)
- [ ] Frontend: "Close Position" button for crypto trades
- [ ] Frontend: Settlement toast notification ("Paper Trade settled (+$X.XX). Run Review?")
- [ ] After settlement: Decision status updates to settled_win/settled_loss with P&L badge

### Review Workflow 7-Section Report (Task 1.9 + Task 5.12) **NEW**
- [ ] `review.workspace` workflow enhanced to produce 7-section ReviewReport
  - [ ] Section 1 Overview: totalTrades, winCount/lossCount, winRate, totalPnL, avgPnL, best/worst trade, streaks
  - [ ] Section 2 Per-Trade Analysis: each decision with reasoningAtTime vs actualOutcome vs reasoningAccuracy
  - [ ] Section 3 Error Summary: commonMistakes[], mistakeFrequency{}, lossConcentration, biggestContributorToLoss
  - [ ] Section 4 Improvement Suggestions: suggestions[] with title/category/priority/actionable/difficulty
  - [ ] Section 5 Emotion Analysis: emotionDistribution, emotionVsResult[], problematicEmotions[], recommendedAdjustment
  - [ ] Section 6 Rule Compliance: userRules[], complianceRate, violations[], mostViolatedRule, suggestion
  - [ ] Section 7 Historical Comparison: previousPeriodOverview, trendDirection, keyChanges[], streakStatus, nextTarget
- [ ] Review trigger: manual only (Workspace Review tab "Request Review" / Evolution "Run Review")
- [ ] Review report renders in Review tab with all 7 collapsible sections
- [ ] Improvement suggestions have "Adopt as Rule" action buttons
- [ ] Report saved as artifact in workspace
- [ ] Suggestions feed into Evolution page's Improvement Feed

### Journal 4-Dimension Records (REQ-MVP-14) **NEW**
- [ ] JournalEntry schema includes all 4 dimensions:
  - [ ] Dimension 1 Trade Data: direction, asset, entryPrice, exitPrice, positionSize, timestamps, pnl, settlementReason
  - [ ] Dimension 2 Reasoning: whyEntered, evidenceCited[], confidenceAtEntry, riskPerceptionAtEntry, expectedOutcome, thesis
  - [ ] Dimension 3 Emotion (P1): tag (calm/confident/fomo/fear/greedy/frustrated/neutral/uncertain), intensity(1-5), note
  - [ ] Dimension 4 Reflection: actualReason, wouldDoDifferently, lessonLearned, ruleCreated
- [ ] Auto-population on Paper Trade: Dimensions 1+2 filled from Decision record
- [ ] Emotion tagging UI: dropdown + intensity slider + optional note
- [ ] Post-review auto-fill: Dimension 4 populated by AI when Review runs
- [ ] Global Journal page shows all 4 dimensions in entry detail view
- [ ] Export CSV/Markdown includes all 4 dimension data

### Timeline Event Types (REQ-MVP-15) **NEW**
- [ ] TimelineEvent type defined with 4 categories:
  - [ ] tool_call: toolName, inputSummary, outputSummary, tokenCost, triggeredBy
  - [ ] user_action: actionType (18 types), targetId
  - [ ] system_event: eventType (9 types), severity (info/warning/error/critical)
  - [ ] milestone: milestoneType (11 types), badge
- [ ] Category 1 (Tool Call) events logged when Agent uses tools
- [ ] Category 2 (User Action) events logged on user interactions (workspace CRUD, decisions, trades, reviews, etc.)
- [ ] Category 3 (System Event) events logged (settlements, reviews, warnings, errors)
- [ ] Timeline page renders chronological event feed with category icons
- [ ] Filter by category (all/tool/user/system/milestone) works
- [ ] Filter by workspace dropdown works
- [ ] Date range filter works
- [ ] Status filter (success/failed/running) works
- [ ] Summary stats at top accurate (events per category today)
- [ ] Click event card expands full detail

### Evolution Page (Task 2.8 + Task 5.15) **NEW — 7th Route**
- [ ] /evolution route exists in router.tsx
- [ ] EvolutionPage renders with 5 sections:
  - [ ] Section 1 Progress Dashboard: stat cards (win rate, P&L, streaks, best workspace)
  - [ ] Section 2 Improvement Feed: review suggestions with Adopt/Dismiss actions
  - [ ] Section 3 Pattern Highlights: AI-generated insight cards
  - [ ] Section 4 Rule Workshop: current rules + AI-suggested rules + adopt/reject
  - [ ] Section 5 Quick Actions: Run Review, Export, Reset buttons
- [ ] GET /api/evolution/summary returns progress metrics + pattern highlights
- [ ] GET /api/evolution/suggestions returns all suggestions with adoption status
- [ ] POST /api/evolution/suggest-rules triggers AI rule proposal from reviews
- [ ] POST /api/evolution/rules/:id/adopt adopts suggestion → writes to User Rules
- [ ] After running Review: suggestions appear in Feed
- [ ] Design compliance per design.md

### User Rules Decision Integration (REQ-MVP-18) **NEW**
- [ ] User Rules loadable from Settings (stored in memory domain "user_rules")
- [ ] At decision generation time: Agent loads active User Rules
- [ ] Each rule evaluated against proposed decision parameters
- [ ] DecisionCard includes `ruleCompliance` section:
  - [ ] totalRules, passed count
  - [ ] warnings[] with rule text + detail (amber styling)
  - [ ] blocked flag (red styling if true)
  - [ ] human-readable message
- [ ] All-pass shows "All N rules ✓"
- [ ] Warnings prominently displayed (cannot be missed)
- [ ] User can still confirm despite warnings (Human in the loop)
- [ ] Compliance data persisted in decision record
- [ ] Review report Section 6 references these checks
- [ ] Evolution Rule Workshop shows same rules

---

## Summary Statistics

- **Total Checkpoints**: ~380+ (increased significantly due to Round 2 grill-me additions)
- **Phase 1 (Backend)**: ~120 checkpoints (+ Paper Trade ~15, + Review/Evolution/Rules ~20)
- **Phase 2 (Frontend)**: ~95 checkpoints (+ Evolution Page ~15)
- **Phase 3 (Components)**: ~45 checkpoints (unchanged)
- **Phase 4 (Integration)**: ~45 checkpoints (+ Paper Trade wiring ~10, + Review/Evolution/Rules wiring ~12)
- **Phase 5 (E2E Testing)**: ~150 checkpoints (+ E2E-13 through E2E-19 = 7 new test scenarios ~50)

## Pass Criteria

MVP is considered **COMPLETE** when:

1. ✅ All Phase 1-4 checkpoints pass (implementation verified)
2. ✅ All E2E-1 through E2E-**19** scenarios pass (browser testing verified — 19 total scenarios)
3. ✅ Zero TypeScript compilation errors
4. ✅ Zero runtime console errors during normal usage
5. ✅ Visual compliance with design.md verified
6. ✅ Complete closed-loop demo possible: Dashboard(Radar) → Workspace(Depth Research→Decision→Journal→Review)
7. ✅ **NEW**: Deep Research end-to-end working (both Built-in mode)
8. ✅ **NEW**: Paper Trade full lifecycle working (auto-execute → monitor → settle → P&L)
9. ✅ **NEW**: Review 7-section report working (Overview/Per-Trade/Errors/Suggestions/Emotion/Rules/History)
10. ✅ **NEW**: Journal 4-dimension records working (Trade Data + Reasoning + Emotion + Reflection)
11. ✅ **NEW**: Timeline event logging working (Tool/User/System/Milestone events)
12. ✅ **NEW**: Evolution page working (Progress Dashboard + Improvement Feed + Pattern Highlights + Rule Workshop)
13. ✅ **NEW**: User Rules decision-time integration working (compliance check on every DecisionCard)
14. ✅ **Ultimate E2E-19 verified**: Alpha Radar → Deep Research → Decision(Rule-checked) → Paper Trade → Journal(4-dim) → Settlement → Review(7-section) → Evolution(Rule adoption) → Next Decision(improved)
