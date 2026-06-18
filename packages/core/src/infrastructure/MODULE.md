# Database + Sessions + Events 基础设施模块

> 本文档涵盖 Trading Pi OS 的三大核心基础设施模块：**数据库持久化层**、**会话生命周期管理**、**事件发布订阅系统**。

---

## Part A: 数据库 (`db/database.ts` + `db/repositories.ts`)

### 1. 模块定位

SQLite 持久化层，负责：
- **Schema 迁移**：30 张表的建表 + 向后兼容的列升级
- **CRUD 操作**：所有业务实体的增删改查
- **索引优化**：高频查询路径的性能保障
- **事务安全**：订单/交易/仓位等关键操作使用显式事务

### 2. TradingPiDatabase 类 (`db/database.ts`)

#### 构造函数

```typescript
constructor(readonly sqlitePath: string)
```

| 步骤 | 操作 |
|------|------|
| 1 | `mkdirSync(dirname(sqlitePath))` — 自动创建数据库所在目录 |
| 2 | `new DatabaseSync(sqlitePath)` — 打开 SQLite 数据库 |
| 3 | `PRAGMA journal_mode = WAL` — 启用 WAL 日志模式，提升并发读写性能 |
| 4 | `PRAGMA foreign_keys = ON` — 启用外键约束 |

#### migrate() — 全部 30 张 CREATE TABLE

| # | 表名 | 用途 |
|---|------|------|
| 1 | **sessions** | 会话元数据（ID、名称、JSONL 路径、状态） |
| 2 | **messages** | 对话消息（角色、内容 parts、模型、时间戳） |
| 3 | **timeline_events** | 时间线事件（工作流运行、技能执行等事件流） |
| 4 | **memory_records** | 记忆存储（scope/key 唯一约束，支持域和重要性评分） |
| 5 | **workflows** | 工作流定义（名称、描述、风险等级） |
| 6 | **workflow_runs** | 工作流运行实例（输入输出 JSON、状态机） |
| 7 | **skills** | 技能定义（名称、权限、风险等级） |
| 8 | **skill_runs** | 技能运行实例（关联 workflow_run） |
| 9 | **artifacts** | 产物文件（类型、标题、摘要、路径、预览） |
| 10 | **plans** | 交易计划（步骤列表、状态、结果） |
| 11 | **approvals** | 审批记录（高风险操作需人工审批） |
| 12 | **orders** | 订单记录（买卖方向、数量、价格、纸盘/实盘模式） |
| 13 | **trades** | 交易记录（关联订单、入场价、PnL） |
| 14 | **positions** | 当前持仓（symbol 主键、数量、均价、已实现盈亏） |
| 15 | **journal_entries** | 交易日记（情绪、纪律分数、违规规则、笔记） |
| 16 | **reviews** | 复盘报告（周期指标、纪律评分、总结） |
| 17 | **audit_records** | 审计日志（分类、操作、状态、操作者） |
| 18 | **data_cache** | 通用数据缓存（namespace 隔离、TTL 过期） |
| 19 | **mcp_servers** | MCP 服务器注册表（命令/URL、健康状态、Manifest） |
| 20 | **mcp_discoveries** | MCP 服务发现记录（查询+候选列表） |
| 21 | **mcp_permissions** | MCP 权限管理（服务器级权限粒度） |
| 22 | **browser_sessions** | 浏览器会话记录（Provider、URL、Payload/Result） |
| 23 | **workspace_links** | 工作空间关联链接（多态 ref_id 关联任意实体） |
| 24 | **marketplace_items** | 市场place 条目（种类、权限、Manifest） |
| 25 | **workspaces** | 工作空间（主题类型、创建者、默认标记、上下文 JSON） |
| 26 | **decisions** | 交易决策（方向、置信度、风险等级、正反理由、论点、失效条件） |
| 27 | **research_sessions** | 研究会话（迭代进度、Token 用量、报告产物） |
| 28 | **paper_trades** | 模拟交易（关联决策、入场/出场价格、PnL 百分比） |
| 29 | **strategies** | 策略定义（版本、参数 JSON、评分） |
| 30 | **backtests** | 回测记录（关联策略、指标 JSON） |
| 31 | **evolution_proposals** | 进化提案（策略改进建议、需审批） |
| 32 | **evolution_suggestions** | 进化建议（来自复盘、类别/优先级/规则文本） |
| 33 | **market_prices** | 市场行情快照（USD 价格、24h 涨跌、买卖盘口、高低量） |
| 34 | **market_ohlcv** | OHLCV K线数据（symbol/timeframe/timestamp 复合维度） |
| 35 | **search_cache** | 搜索结果缓存（query+provider 维度、TTL 过期） |

> 注：实际共 **35 张表**（含 market_prices / market_ohlcv / search_cache 三张数据缓存表）。

#### addColumnIfMissing() — 向后兼容迁移辅助方法

```typescript
private addColumnIfMissing(table: string, column: string, definition: string)
```

通过 `PRAGMA table_info()` 检测列是否存在，不存在则执行 `ALTER TABLE ADD COLUMN`。用于旧版本数据库无缝升级。

**迁移覆盖的表和新增列：**

| 表名 | 新增列 |
|------|--------|
| memory_records | domain, workspace_id, source_type, source_id, importance, metadata_json |
| artifacts | workspace_id, content_type, content, preview_ready, preview_payload_json |
| journal_entries | workspace_id, decision_id, paper_trade_id |
| workspaces | description, topic_type, topic_ref, creator_session_id, is_default |
| decisions | workspace_id, rule_compliance_json |
| research_sessions | workspace_id |
| paper_trades | workspace_id, decision_id |
| reviews | workspace_id, report_json |
| sessions | parent_session_id, message_count, prompt_tokens, completion_tokens |
| mcp_servers | manifest_json |

#### 全部索引

| 索引名 | 表 | 列 | 用途 |
|--------|-----|-----|------|
| idx_market_prices_symbol | market_prices | (symbol, fetched_at DESC) | 按符号查最新行情 |
| idx_market_ohlcv_symbol | market_ohlcv | (symbol, timeframe, timestamp DESC) | K线时序查询 |
| idx_trades_symbol | trades | (symbol, status) | 按标的查交易 |
| idx_messages_session | messages | (session_id, created_at) | 会话消息时序 |
| idx_memory_domain | memory_records | (domain, workspace_id) | 域级记忆检索 |
| idx_timeline_session | timeline_events | (session_id, created_at) | 时间线事件流 |
| idx_artifacts_session | artifacts | (session_id, created_at) | 会话产物列表 |
| idx_artifacts_workspace | artifacts | (workspace_id, created_at) | 工作空间产物 |
| idx_workspaces_updated | workspaces | (updated_at DESC) | 最近更新工作空间 |
| idx_decisions_workspace | decisions | (workspace_id, created_at DESC) | 工作空间决策历史 |
| idx_decisions_status | decisions | (status, created_at DESC) | 按状态筛选决策 |
| idx_research_sessions_workspace | research_sessions | (workspace_id, started_at DESC) | 工作空间研究列表 |
| idx_research_sessions_status | research_sessions | (status, started_at DESC) | 按状态筛选研究 |
| idx_paper_trades_workspace | paper_trades | (workspace_id, entry_time DESC) | 工作空间模拟交易 |
| idx_paper_trades_decision | paper_trades | (decision_id) | 决策→交易关联 |
| idx_paper_trades_status | paper_trades | (status, entry_time DESC) | 按状态筛选交易 |
| idx_reviews_workspace | reviews | (workspace_id, created_at DESC) | 工作空间复盘列表 |
| idx_evolution_suggestions_status | evolution_suggestions | (status, created_at DESC) | 按状态筛选建议 |
| idx_evolution_suggestions_workspace | evolution_suggestions | (workspace_id, created_at DESC) | 工作空间进化建议 |
| idx_search_cache_query | search_cache | (query, provider, fetched_at) | 搜索缓存命中 |

共 **20 个索引**。

#### close()

关闭数据库连接。

```typescript
close(): void
```

---

### 3. Repositories 类 (`db/repositories.ts`) — 全部公共方法

> 所有 ID 使用 `{prefix}_{UUID}` 格式自动生成。所有时间戳使用 ISO 8601 格式。

#### 3.1 会话 (Session)

| 方法 | 签名 | 说明 |
|------|------|------|
| list | `list("sessions")` | 列出全部会话（按 created_at DESC，上限 100） |
| createSessionFork | `createSessionFork(id, parentId, title)` | 创建分叉会话记录（path 格式为 `fork:{parentId}`） |

#### 3.2 消息 (Message)

| 方法 | 签名 | 说明 |
|------|------|------|
| list | `list("messages")` | 列出全部消息 |

#### 3.3 时间线 (Timeline)

| 方法 | 签名 | 说明 |
|------|------|------|
| createTimeline | `createTimeline(event)` | 创建时间线事件，返回 eventId（格式 `evt_{uuid}`）。支持 session/workflow/skill 三级关联 |
| list | `list("timeline_events")` | 列出全部时间线事件 |

#### 3.4 记忆 (Memory)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertMemory | `upsertMemory(scope, key, value)` | 按 `(scope, key)` 唯一约束 upsert，轻量版 |
| writeMemory | `writeMemory(input)` | 完整版记忆写入（支持 domain/workspaceId/importance/sourceType/metadata），自动写审计日志 |
| queryMemory | `queryMemory({domain?, workspaceId?, q?, limit?})` | 多条件模糊查询（支持 key/value LIKE 匹配），按 importance DESC 排序 |
| deleteMemory | `deleteMemory(memoryId)` | 按 ID 删除记忆，成功则写审计日志 |
| list | `list("memory_records")` | 列出全部记忆记录 |

#### 3.5 产物 (Artifact)

| 方法 | 签名 | 说明 |
|------|------|------|
| createArtifact | `createArtifact(artifact)` | 创建产物（支持 session/workflow/workspace 三级关联、预览标记），返回 artifactId（`art_{uuid}`） |
| getArtifact | `getArtifact(artifactId)` | 按 ID 获取完整产物记录（含类型断言） |
| list | `list("artifacts")` | 列出全部产物 |

#### 3.6 审批 (Approval)

| 方法 | 签名 | 说明 |
|------|------|------|
| createApproval | `createApproval(approval)` | 创建待审批记录（默认 status=pending），返回 approvalId（`app_{uuid}`） |
| updateApprovalStatus | `updateApprovalStatus(id, status)` | 更新审批状态并记录 decided_at |
| list | `list("approvals")` | 列出全部审批记录 |

#### 3.7 计划 (Plan)

| 方法 | 签名 | 说明 |
|------|------|------|
| createPlan | `createPlan(plan)` | 创建计划（含 steps 数组序列化），返回 planId |
| updatePlanStatus | `updatePlanStatus(id, status, result?)` | 更新计划状态和结果（COALESCE 保护已有结果） |
| listPlans | `listPlans(sessionId?)` | 列出计划（可按 session 过滤，全局上限 50） |
| getPlan | `getPlan(id)` | 按 ID 获取计划 |

#### 3.8 订单/交易/持仓 (Order / Trade / Position)

| 方法 | 签名 | 说明 |
|------|------|------|
| createPaperOrder | `createPaperOrder(input)` | **事务内**创建纸盘订单+交易记录+更新持仓，返回 `{orderId, tradeId, mode, status}` |
| portfolioSnapshot | `portfolioSnapshot()` | 获取组合快照（positions + orders + trades 各 100 条） |
| reviewMetrics | `reviewMetrics()` | 计算复盘指标（胜率、已实现 PnL、违规次数、平均纪律分） |
| list | `list("orders" \| "trades" \| "positions")` | 列出订单/交易/持仓 |

#### 3.9 日记 (Journal)

| 方法 | 签名 | 说明 |
|------|------|------|
| createJournalEntry | `createJournalEntry(input)` | 创建交易日记（可关联 decision/paperTrade/trade/plan/artifact），返回 journalId（`jnl_{uuid}`） |
| attachJournalArtifact | `attachJournalArtifact(journalId, artifactId)` | 将产物附加到日记条目 |
| list | `list("journal_entries")` | 列出全部日记条目 |

#### 3.10 复盘 (Review)

| 方法 | 签名 | 说明 |
|------|------|------|
| createReview | `createReview(input)` | 创建复盘报告（含 metrics/disciplineScore/report），返回 reviewId（`rev_{uuid}`） |
| attachReviewArtifact | `attachReviewArtifact(reviewId, artifactId)` | 将产物附加到复盘报告 |
| listReviews | `listReviews(workspaceId?)` | 列出复盘报告（可按 workspace 过滤） |
| getReview | `getReview(reviewId)` | 按 ID 获取复盘报告 |

#### 3.11 工作空间 (Workspace)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertWorkspace | `upsertWorkspace(input)` | 创建或更新工作空间（ON CONFLICT DO UPDATE），返回 workspaceId（`wrk_{uuid}`） |
| createWorkspace | `createWorkspace(input)` | 创建工作空间并返回完整 WorkspaceRecord |
| listWorkspaces | `listWorkspaces(sessionId?)` | 列出工作空间（可按 creator 过滤，包含默认工作空间） |
| getWorkspace | `getWorkspace(workspaceId)` | 按 ID 获取工作空间（返回 camelCase 映射后的 record） |
| updateWorkspace | `updateWorkspace(workspaceId, input)` | 部分更新工作空间字段 |
| deleteWorkspace | `deleteWorkspace(workspaceId)` | 删除工作空间（保护默认工作空间不可删） |
| linkWorkspace | `linkWorkspace({workspaceId, kind, refId, metadata?})` | 创建工作空间关联链接，返回 linkId（`wlk_{uuid}`） |
| workspaceContext | `workspaceContext(workspaceId)` | 获取工作空间完整上下文（workspace + memory + links） |
| ensureDefaultWorkspace | `ensureDefaultWorkspace(sessionId?)` | 确保存在默认工作空间（ID 固定为 `workspace_general`） |

#### 3.12 决策 (Decision)

| 方法 | 签名 | 说明 |
|------|------|------|
| createDecision | `createDecision(input)` | 创建交易决策（自动写 timeline 事件），返回 DecisionRecord |
| updateDecisionStatus | `updateDecisionStatus(decisionId, status, input?)` | 更新决策状态（自动填充 executedAt/settledAt），自动写 timeline |
| listDecisions | `listDecisions(workspaceId?)` | 列出决策（可按 workspace 过滤） |
| getDecision | `getDecision(decisionId)` | 按 ID 获取决策 |

**决策相关类型别名：**

| 类型 | 可选值 |
|------|--------|
| DecisionDirection | `YES` / `NO` / `LONG` / `SHORT` / `HOLD` |
| DecisionConfidence | `A+` ~ `F`（11 级） |
| DecisionRiskLevel | `A` / `B` / `C` / `D`（4 级） |
| DecisionStatus | `pending` / `executed` / `settled_win` / `settled_loss` / `invalidated` / `expired` |

#### 3.13 模拟交易 (Paper Trade)

| 方法 | 签名 | 说明 |
|------|------|------|
| createPaperTrade | `createPaperTrade(input)` | **事务内**创建模拟交易+日记条目+更新决策状态为 executed，返回 PaperTradeRecord |
| settlePaperTrade | `settlePaperTrade(paperTradeId, {exitPrice, ...})` | **事务内**结算交易（计算 PnL/PnL% → 更新决策 settled 状态 → 更新日记笔记） |
| cancelPaperTrade | `cancelPaperTrade(paperTradeId, reason?)` | 取消未结算的模拟交易 |
| listPaperTrades | `listPaperTrades({workspaceId?, status?})` | 列出模拟交易（支持双维度过滤） |
| getPaperTrade | `getPaperTrade(paperTradeId)` | 按 ID 获取模拟交易 |

**PaperTradeStatus**: `open` / `closed` / `cancelled`

#### 3.14 研究会话 (Research Session)

| 方法 | 签名 | 说明 |
|------|------|------|
| createResearchSession | `createResearchSession(input)` | 创建研究会话（初始状态 running，自动写 timeline），返回 ResearchSessionRecord |
| updateResearchSession | `updateResearchSession(sessionId, input)` | 部分更新研究状态（自动填充 completedAt） |
| listResearchSessions | `listResearchSessions(workspaceId?)` | 列出研究会话（可按 workspace 过滤） |
| getResearchSession | `getResearchSession(sessionId)` | 按 ID 获取研究会话 |

**ResearchSessionStatus**: `running` / `completed` / `failed` / `cancelled`

#### 3.15 策略/回测/进化 (Strategy / Backtest / Evolution)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertStrategy | `upsertStrategy(input)` | 创建或更新策略（ON CONFLICT DO UPDATE），返回 strategyId（`str_{uuid}`） |
| createBacktest | `createBacktest(input)` | 创建回测记录，返回 backtestId（`bkt_{uuid}`） |
| createEvolutionProposal | `createEvolutionProposal(input)` | 创建进化提案（可关联 approval），返回 proposalId（`evo_{uuid}`） |
| createEvolutionSuggestion | `createEvolutionSuggestion(input)` | 创建进化建议（来自复盘），返回 EvolutionSuggestionRecord |
| listEvolutionSuggestions | `listEvolutionSuggestions({workspaceId?, status?, limit?})` | 列出进化建议（支持双过滤） |
| getEvolutionSuggestion | `getEvolutionSuggestion(suggestionId)` | 按 ID 获取进化建议 |
| updateEvolutionSuggestionStatus | `updateEvolutionSuggestionStatus(suggestionId, status)` | 更新建议状态 |
| list | `list("strategies" \| "backtests" \| "evolution_proposals" \| "evolution_suggestions")` | 列出策略/回测/提案/建议 |

#### 3.16 行情数据缓存 (Market Data Cache)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertMarketPrice | `upsertMarketPrice(data)` | 写入/更新行情快照（ID 格式 `mp_{symbol}_{source}`，upsert 语义） |
| getLatestMarketPrice | `getLatestMarketPrice(symbol, source?)` | 获取最新行情（可按 source 过滤） |
| listMarketPrices | `listMarketPrices(symbol)` | 列出某标的行情历史（上限 50） |
| upsertOhlcvCandles | `upsertOhlcvCandles(candles[])` | 批量写入 K线数据（ID 格式 `ohlcv_{symbol}_{timeframe}_{timestamp}`） |
| getOhlcvCandles | `getOhlcvCandles(symbol, timeframe, limit?)` | 获取 K线数据（默认上限 100 根） |

#### 3.17 搜索缓存 (Search Cache)

| 方法 | 签名 | 说明 |
|------|------|------|
| getCachedSearchResults | `getCachedSearchResults(query, provider)` | 读取搜索缓存（检查 TTL 过期，返回解析后的 results） |
| cacheSearchResults | `cacheSearchResults(query, provider, results, ttlMinutes?)` | 写入搜索缓存（支持 TTL 分钟级过期） |

#### 3.18 MCP (Model Context Protocol)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertMcpServer | `upsertMcpServer(input)` | 注册/更新 MCP 服务器（command 或 URL 二选一），返回 serverId（`mcp_{uuid}`） |
| updateMcpServer | `updateMcpServer({id, status?, permission?, health?})` | 部分更新 MCP 服务器状态 |
| createMcpDiscovery | `createMcpDiscovery(input)` | 记录 MCP 发现结果，返回 discoveryId（`mcpd_{uuid}`） |
| upsertMcpPermission | `upsertMcpPermission(input)` | 创建 MCP 权限记录，返回 permissionId（`mcpp_{uuid}`） |
| list | `list("mcp_servers" \| "mcp_discoveries" \| "mcp_permissions")` | 列出 MCP 相关记录 |

#### 3.19 浏览器会话 (Browser Session)

| 方法 | 签名 | 说明 |
|------|------|------|
| createBrowserSession | `createBrowserSession(input)` | 记录浏览器自动化会话（provider/action/url/payload/result），返回传入的 id |
| list | `list("browser_sessions")` | 列出浏览器会话 |

#### 3.20 市场 Place (Marketplace)

| 方法 | 签名 | 说明 |
|------|------|------|
| upsertMarketplaceItem | `upsertMarketplaceItem(input)` | 注册/更新市场条目（kind/name/description/permission/manifest），返回 itemId（`market_{uuid}`） |
| list | `list("marketplace_items")` | 列出市场条目 |

#### 3.21 审计 (Audit)

| 方法 | 签名 | 说明 |
|------|------|------|
| createAuditRecord | `createAuditRecord(input)` | 写入审计日志（category/action/status/actor/payload），返回 auditId（`aud_{uuid}`） |
| list | `list("audit_records")` | 列出审计记录 |

#### 3.22 通用 (Generic)

| 方法 | 签名 | 说明 |
|------|------|------|
| list | `list(table)` | 通用列表方法，支持全部 35 张表（不同表有不同默认排序） |
| setCache | `setCache({namespace, key, value, source, ttlMs?})` | 写入通用数据缓存（TTL 毫秒级过期，key 冲突 upsert） |
| getCache | `getCache(key)` | 读取通用数据缓存（检查 TTL 过期，返回解析后值） |
| upsertSkill | `upsertSkill(skill)` | 注册/更新技能定义 |
| upsertWorkflow | `upsertWorkflow(workflow)` | 注册/更新工作流定义 |
| createWorkflowRun | `createWorkflowRun(workflowId, input, sessionId?)` | 启动工作流运行实例，返回 runId（`wfr_{uuid}`） |
| finishWorkflowRun | `finishWorkflowRun(runId, status, output?, error?)` | 结束工作流运行（写 output/error/finished_at） |
| createSkillRun | `createSkillRun(workflowRunId?, skillId, input)` | 启动技能运行实例，返回 runId（`skr_{uuid}`） |
| finishSkillRun | `finishSkillRun(runId, status, output?, error?)` | 结束技能运行 |

#### 3.23 辅助函数

| 函数 | 签名 | 说明 |
|------|------|------|
| nowIso | `nowIso(): string` | 返回当前 ISO 8601 时间戳 |
| id | `id(prefix: string): string` | 生成 `{prefix}_{UUID}` 格式 ID |

---

### 4. Schema 快速参考

| 表名 | 主键 | 核心列 | 典型行数说明 |
|------|------|--------|-------------|
| sessions | `id TEXT PK` | name, path, status, parent_session_id | 每个用户会话一行 |
| messages | `id TEXT PK` | session_id(FK), role, parts, model, created_at | 每条对话消息一行 |
| timeline_events | `id TEXT PK` | session_id, type, title, status, payload_json | 每个事件一行 |
| memory_records | `id TEXT PK` | scope, key(UQ), value, domain, importance | 按 scope+key 去重 |
| workflows | `id TEXT PK` | name, description, risk_level | 少量固定工作流 |
| workflow_runs | `id TEXT PK` | workflow_id(FK), status, input/output_json | 每次运行一行 |
| skills | `id TEXT PK` | name, description, risk_level, permission | 少量固定技能 |
| skill_runs | `id TEXT PK` | workflow_run_id(FK), skill_id(FK), status | 每次技能调用一行 |
| artifacts | `id TEXT PK` | session_id, workspace_id, type, path, content | 每个产出文件一行 |
| plans | `id TEXT PK` | session_id(FK), title, status, steps(JSON), result | 每个交易计划一行 |
| approvals | `id TEXT PK` | action, risk_level, status, reason | 每次审批请求一行 |
| orders | `id TEXT PK` | symbol, side, order_type, quantity, price, mode | 每笔订单一行 |
| trades | `id TEXT PK` | order_id(FK), symbol, side, entry_price, pnl, status | 每笔成交一行 |
| positions | `symbol TEXT PK` | quantity, avg_price, realized_pnl | 每个标的最多一行 |
| journal_entries | `id TEXT PK` | workspace_id, decision_id, paper_trade_id, mood, discipline_score | 每篇日记一行 |
| reviews | `id TEXT PK` | workspace_id, period, metrics_json, discipline_score | 每次复盘点一行 |
| audit_records | `id TEXT PK` | category, action, status, actor, payload_json | 每次审计事件一行 |
| data_cache | `key TEXT PK` | namespace, value_json, expires_at | 缓存条目（自动过期） |
| mcp_servers | `id TEXT PK` | name, command/url, status, permission, health_json | 每个 MCP 服务器一行 |
| mcp_discoveries | `id TEXT PK` | query, provider, candidates_json | 每次发现查询一行 |
| mcp_permissions | `id TEXT PK` | server_id(FK), permission, status | 每条权限规则一行 |
| browser_sessions | `id TEXT PK` | provider, status, action, url, result_json | 每次浏览器操作一行 |
| workspace_links | `id TEXT PK` | workspace_id(FK), kind, ref_id, metadata_json | 每条关联一行 |
| marketplace_items | `id TEXT PK` | kind, name, description, permission, manifest_json | 每个 marketplace 条目一行 |
| workspaces | `id TEXT PK` | name, kind, topic_type, is_default, context_json | 每个工作空间一行 |
| decisions | `id TEXT PK` | workspace_id, direction, confidence, risk_level, thesis, status | 每个交易决策一行 |
| research_sessions | `id TEXT PK` | workspace_id, topic, status, total/completed_iterations | 每次深度研究一行 |
| paper_trades | `id TEXT PK` | decision_id(FK), direction, asset, entry/exit_price, pnl | 每笔模拟交易一行 |
| strategies | `id TEXT PK` | name, version, status, parameters_json, score | 每个策略版本一行 |
| backtests | `id TEXT PK` | strategy_id(FK), status, metrics_json | 每次回测一行 |
| evolution_proposals | `id TEXT PK` | strategy_id(FK), status, proposal_json, approval_id | 每个进化提案一行 |
| evolution_suggestions | `id TEXT PK` | workspace_id, category, priority, status, rule_text | 每条改进建议一行 |
| market_prices | `id TEXT PK` | symbol, exchange, source, price_usd, bid/ask/high/low/volume | 每次行情快照一行 |
| market_ohlcv | `id TEXT PK` | symbol, timeframe, timestamp, OHLCV | 每根K线一行 |
| search_cache | `id TEXT PK` | query, provider, results_json, expires_at | 每次搜索缓存一行 |

---

## Part B: 会话管理 (`sessions/session-store.ts`)

### 1. 模块定位

**对话生命周期管理层**，采用 **JSONL 文件存储消息体 + SQLite 存储元数据** 的混合架构：

- **JSONL 文件**：每行一个 JSON 对象，追加式写入，适合流式对话场景
- **SQLite 元数据**：sessions 表存储会话 ID、名称、文件路径、状态

### 2. SessionStore 类

#### 构造函数

```typescript
constructor(
  private readonly paths: LocalPaths,    // 本地路径配置
  private readonly repos: Repositories,   // 数据库仓库实例
)
```

#### 公共方法一览

| 方法 | 签名 | 说明 |
|------|------|------|
| **createSession** | `createSession(name?)` | 创建新会话：生成 `ses_{uuid}` ID → 写 JSONL header → 插入 sessions 表 → 返回 `{id, name, path, createdAt}` |
| **getSession** | `getSession(sessionId)` | 从 SQLite 查询会话元数据（返回 `{id, name, path}` 或 undefined） |
| **ensureSession** | `ensureSession(sessionId?, name?)` | 确保会话存在：若 sessionId 有效则返回现有会话，否则创建新会话 |
| **append** | `append(sessionId, type, data)` | **向 JSONL 文件追加一条 Entry**：自动读取上一条 entry 作为 parentId → 生成 `ent_{8位短UUID}` ID → appendFileSync 写入 → 更新 sessions.updated_at |
| **read** | `read(sessionId)` | **读取 JSONL 文件全部 Entry**：读文件 → 按行分割 → JSON.parse → 过滤掉 header 行（type==="session"） |
| **updateSessionName** | `updateSessionName(sessionId, name)` | 更新会话名称 |
| **deleteSession** | `deleteSession(sessionId)` | 删除会话：删除 JSONL 文件 + 删除 SQLite 记录 |
| **createFork** | `createFork(parentSessionId)` | **创建会话分叉**：验证父会话存在 → 创建新 JSONL 文件 → 写入带 parentSessionId 的 header → **复制父会话全部 entries 到 fork** → 在 DB 中记录 fork 关系 |

### 3. Entry 类型

每条 JSONL Entry 的结构：

```typescript
interface SessionEntry {
  type: string;           // 条目类型标识
  id: string;             // ent_{8位短UUID}
  parentId: string | null; // 上一条 entry 的 id（链表结构）
  timestamp: string;      // ISO 8601 时间戳
  data: unknown;          // 业务载荷（根据 type 不同而不同）
}
```

| type 值 | 用途 | data 内容 |
|---------|------|-----------|
| `"session"` | **文件头**（仅首行，read 时被过滤） | `{version, id, timestamp, name, parentSessionId?}` |
| `"message"` | 用户消息 | 消息内容对象 |
| `"pi_message"` | Pi 助手回复 | 回复内容对象 |
| `"agent_state"` | Agent 状态快照 | 状态快照对象 |
| `"workflow_result"` | 工作流执行结果 | 结果对象 |

### 4. 文件格式

**磁盘上的 JSONL 文件示例：**

```
{"type":"session","version":1,"id":"ses_abc123","timestamp":"2025-01-15T...","name":"Trading Pi Session"}
{"type":"message","id":"ent_x1y2z3","parentId":null,"timestamp":"2025-01-15T...","data":{"role":"user","content":"分析 BTC"}}
{"type":"pi_message","id":"ent_a1b2c3","parentId":"ent_x1y2z3","timestamp":"2025-01-15T...","data":{"role":"assistant","content":"..."}}
{"type":"agent_state","id":"ent_d4e5f6","parentId":"ent_a1b2c3","timestamp":"2025-01-15T...","data":{"thinking":"..."}}
```

**关键设计特点：**

| 特性 | 说明 |
|------|------|
| 追加式写入 | 使用 `appendFileSync`，不重写整个文件 |
| 链表结构 | 每条 entry 引用前一条的 parentId，保留顺序关系 |
| 分叉语义 | createFork 复制全部历史到新文件，fork 有独立路径 |
| 文件命名 | `{ISO日期}_{sessionId}.jsonl`，日期中的 `:` 和 `.` 替换为 `-` |

---

## Part C: 事件系统 (`events/event-feeds.ts` + `events/pubsub.ts`)

### 1. 模块定位

**事件驱动基础设施**，由两个子模块组成：

- **event-feeds.ts**：外部经济日历事件获取（FRED 宏观经济 + CoinMarketCal 加密货币事件）
- **pubsub.ts**：内存级发布/订阅总线，用于组件间实时通信

---

### 2. Event Feeds — 外部经济日历 (`events/event-feeds.ts`)

#### FRED 事件（美国联邦储备经济数据）

**数据源**：[St. Louis Fed FRED API](https://api.stlouisfed.org/fred)

**FredEvent 接口：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `string` | 事件唯一标识 |
| title | `string` | 发布名称（如 "Consumer Price Index"） |
| date | `string` | 发布日期 (YYYY-MM-DD) |
| importance | `"low" \| "medium" \| "high"` | 重要程度（基于类别自动判定） |
| category | `"cpi" \| "unemployment" \| "gdp" \| "rate_decision" \| "inflation" \| "jobs" \| "macro"` | 经济类别（基于标题关键词自动归类） |
| source | `"fred"` | 固定为 `"fred"` |
| releaseTime? | `string` | 精确发布时间 |
| url? | `string` | FRED 原始链接 |

**FRED 类别自动映射规则（fredCategory 函数）：**

| 标题关键词 | 映射类别 |
|------------|----------|
| cpi / consumer price | `cpi` |
| pce / inflation | `inflation` |
| unemployment | `unemployment` |
| payems / payroll / employment | `jobs` |
| gdp | `gdp` |
| fed / funds / rate | `rate_decision` |
| 其他 | `macro` |

**重要程度自动判定（fredImportance 函数）：**

| 类别 | 重要程度 |
|------|----------|
| rate_decision, cpi, inflation, jobs, unemployment | `high` |
| gdp | `medium` |
| 其他 | `low` |

**核心监控系列（KEY_FRED_SERIES）：**

| Series ID | 含义 | 默认重要度 |
|-----------|------|------------|
| FEDFUNDS | 联邦基金利率 | high |
| DFEDTARU | 利率目标上限 | high |
| CPIAUCSL | CPI 消费者价格指数 | high |
| PCEPILFE | PCE 核心通胀 | medium |
| PAYEMS | 非农就业人数 | high |
| UNRATE | 失业率 | high |
| GDP | 国内生产总值 | medium |

**公共 API 方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| getFredCalendar | `getFredCalendar(apiKey?, options?, signal?)` | 获取 FRED 发布日历（无 apiKey 时返回 fallback 静态列表） |
| getFredSeries | `getFredSeries(apiKey, seriesId, options?, signal?)` | 获取指定系列的时间序列观测值（并行请求 series 元信息 + observations） |
| searchFred | `searchFred(apiKey, searchText, limit?, signal?)` | 搜索 FRED 系列（按 popularity 排序） |

**其他 FRED 类型：**

| 类型 | 说明 |
|------|------|
| FredSeriesObservation | 单个观测点 `{date, value}` |
| FredSeriesResult | 系列查询结果 `{seriesId, title?, observations[]}` |
| FredSearchResult | 搜索结果项 `{id, title, frequency?, units?, popularity?, notes?}` |

#### 加密货币日历事件（CoinMarketCal）

**数据源**：[CoinMarketCal API](https://developers.coinmarketcal.com/v1)，支持官方 API 和 RapidAPI 双通道

**CryptoEvent 接口：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `string` | 事件唯一标识 |
| title | `string` | 事件标题 |
| date | `string` | 事件日期 |
| coins | `string[]` | 涉及币种符号列表 |
| type | `string` | 事件类型（取自 categories[0]） |
| description | `string` | 事件描述 |
| sourceUrl? | `string` | 来源链接 |
| source | `"coinmarketcal"` | 固定为 `"coinmarketcal"` |

**公共 API 方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| getCoinMarketCalEvents | `getCoinMarketCalEvents(apiKey?, options?, signal?)` | 获取加密货币事件（支持 days/coins/types 过滤，默认 7 天/50 条上限）；官方 API 失败自动降级到 RapidAPI |
| getCoinMarketCalToday | `getCoinMarketCalToday(apiKey, signal?)` | 获取今日加密货币事件（days=1 的便捷封装） |

**容错机制：**

| 场景 | 行为 |
|------|------|
| 未配置 API Key | 返回空结果 + warning 信息 |
| 官方 API 请求失败 | 自动切换到 RapidAPI 端点重试 |
| 两次请求均失败 | 返回空结果 + 错误信息 |
| 响应格式不确定 | 兼容 array / body / data 三种响应结构 |

---

### 3. PubSub 发布/订阅系统 (`events/pubsub.ts`)

**内存级事件总线**，用于组件间的松耦合实时通信。

#### 核心类型

```typescript
type EventType = "created" | "updated" | "deleted"

interface Event<T extends { id: string }> {
  type: EventType    // 事件类型
  data: T            // 事件载荷（必须含 id 字段）
  timestamp: number  // 事件时间戳 (Date.now())
}
```

#### PubSub<T> 类

泛型类，`T` 约束为必须包含 `id: string` 的实体类型。

##### 内部存储

| 属性 | 类型 | 说明 |
|------|------|------|
| subscribers | `Map<string, Set<callback>>` | 按 `data.id` 索引的特定订阅者集合 |
| allSubscribers | `Set<callback>` | 全局订阅者集合（接收所有事件） |

##### 公共方法

| 方法 | 签名 | 说明 |
|------|------|------|
| **subscribe** | `subscribe(key: string, fn): () => void` | **按 ID 订阅**：监听特定 `data.id` 的事件；返回取消订阅函数 |
| **subscribeAll** | `subscribeAll(fn): () => void` | **全局订阅**：接收所有事件的回调；返回取消订阅函数 |
| **publish** | `publish(type: EventType, data: T): void` | **发布事件**：构造 Event 对象 → 通知特定 ID 订阅者 → 通知全局订阅者 |
| **clear** | `clear(): void` | 清除所有订阅者（用于测试清理或组件卸载） |

#### 使用模式示例

```typescript
// 创建 workspace 事件总线
const workspaceBus = new PubSub<WorkspaceRecord>();

// 按 workspace ID 订阅
const unsub = workspaceBus.subscribe("workspace_123", (event) => {
  console.log(`Workspace ${event.type}:`, event.data);
});

// 全局订阅（监听所有 workspace 变更）
const unsubAll = workspaceBus.subscribeAll((event) => {
  console.log("Any workspace changed:", event.data);
});

// 发布事件
workspaceBus.publish("updated", { id: "workspace_123", name: "New Name", ... });

// 取消订阅
unsub();
unsubAll();
```

#### 设计特点

| 特性 | 说明 |
|------|------|
| 内存实现 | 无持久化，进程重启后丢失，适合运行时组件通信 |
| 泛型安全 | TypeScript 泛型约束确保 data 结构一致 |
| 取消订阅 | 所有 subscribe 方法返回 unsubscribe 函数，避免内存泄漏 |
| 双层分发 | 先匹配 ID 特定订阅者，再广播给全局订阅者 |
| 无错误传播 | 订阅者回调异常不会影响其他订阅者或 publish 本身 |

---

## 模块依赖关系图

```
┌─────────────────────────────────────────────────────┐
│                   应用层 (App Layer)                 │
│  Agent / CLI / API Routes                           │
└──────────┬──────────┬──────────┬────────────────────┘
           │          │          │
     ┌─────▼───┐ ┌────▼────┐ ┌──▼──────────┐
     │ Sessions │ │   DB    │ │   Events    │
     │  Store   │ │Repositories│ │  Feeds/PubSub│
     └────┬─────┘ └────┬─────┘ └──────┬───────┘
          │            │               │
          ▼            ▼               ▼
   ┌──────────┐  ┌───────────┐  ┌──────────────┐
   │ JSONL 文件 │ │  SQLite   │  │ FRED API     │
   │ (磁盘)    │ │ (database) │  │ CoinMarketCal│
   └──────────┘  └───────────┘  └──────────────┘
```
