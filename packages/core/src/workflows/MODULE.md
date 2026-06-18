# Workflow Engine 模块

> **路径**: `packages/core/src/workflows/`
> **职责**: 以 DAG（有向无环图）方式编排 Skill，将多个原子技能组合为端到端的交易工作流。

---

## 1. 模块目的

Workflow Engine 是 Trading Pi OS 的**工作流编排层**。它不实现任何具体的业务逻辑（如行情抓取、AI 推理、风险计算），而是将已有的 **Skill（技能）** 按照预定义的顺序和依赖关系串联起来，形成可复用的、端到端的自动化流程。

每个 Workflow 是一个 `TradingWorkflow` 实例，拥有唯一的 ID、名称、描述、风险等级，以及一个 `execute()` 方法。WorkflowEngine 负责注册、查找、运行这些 workflow，并在运行过程中自动记录时间线（Timeline）、Skill 运行记录和审批状态。

---

## 2. 职责边界

| ✅ 本模块负责 | ❌ 不在本模块 |
|---|---|
| Workflow 的定义与类型声明 | 单个 Skill 的内部逻辑实现 |
| Workflow 注册到 Engine | Skill 的参数校验与执行细节 |
| Workflow 执行的生命周期管理（创建 run → 记录 timeline → 完成/失败） | 市场数据源、AI 模型调用、数据库 CRUD |
| 默认 Workflow 的编排逻辑（调用哪些 Skill、以什么顺序） | Memory / Artifact / Approval 等基础设施 |

**一句话**: Workflow Engine 是"指挥官"，Skill 是"士兵"。本模块只管排兵布阵，不管士兵怎么打仗。

---

## 3. 核心类型与接口

### 3.1 `SkillContext` （来自 `skills/types.ts`）

所有 Skill 和 Workflow 共享的基础上下文：

```typescript
interface SkillContext {
  env: TradingPiEnv;        // 环境变量配置
  repos: Repositories;      // 数据库仓库层
  artifacts: ArtifactEngine; // 制品引擎
  approvals: ApprovalEngine; // 审批引擎
  memory: MemoryStore;       // 本地记忆存储
  workflowRunId?: string;    // 当前工作流运行 ID
  sessionId?: string;        // 当前会话 ID
}
```

### 3.2 `WorkflowContext` （`types.ts`）

在 `SkillContext` 基础上扩展了 SkillRegistry：

```typescript
interface WorkflowContext extends SkillContext {
  skills: SkillRegistry;  // 技能注册表，用于按 ID 查找并执行 Skill
}
```

> **关键差异**: 只有 Workflow 层持有 `skills` 引用，可以动态调度任意 Skill。单个 Skill 执行时只拿到 `SkillContext`（无 `skills`），避免 Skill 之间互相调用形成循环依赖。

### 3.3 `TradingWorkflow<TInput, TOutput>` （`types.ts`）

```typescript
interface TradingWorkflow<TInput = unknown, TOutput = unknown> {
  id: string;                                    // 唯一标识符，如 "market.snapshot"
  name: string;                                  // 可读名称
  description: string;                           // 功能描述
  riskLevel: "low" | "medium" | "high" | "critical";  // 风险等级
  execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
}
```

- 泛型 `TInput` / `TOutput` 为每个 workflow 提供强类型的输入输出约束。
- `riskLevel` 影响审批流程：高风workflow 在执行前可能需要用户确认。

---

## 4. Workflow Engine （`workflow-engine.ts`）

`WorkflowEngine` 类是所有 workflow 的注册中心和执行引擎。

### 4.1 方法一览

| 方法 | 签名 | 说明 |
|---|---|---|
| `register()` | `<TIn,TOut>(w: TradingWorkflow) => w` | 注册一个 workflow，返回自身（链式调用友好） |
| `get()` | `(id: string) => TradingWorkflow` | 按 ID 获取 workflow，未找到抛错 |
| `list()` | `() => WorkflowSummary[]` | 返回所有已注册 workflow 的摘要列表（不含 execute） |
| `syncToDb()` | `(ctx: WorkflowContext) => void` | 将所有已注册 workflow 元信息同步到数据库 |
| `run()` | `<TIn>(id, input, ctx) => Promise<{runId, output}>` | **核心方法**：完整生命周期运行一个 workflow |

### 4.2 `run()` 生命周期

```
用户调用 run(id, input, context)
  │
  ├─ 1. get(id) — 获取 workflow 定义
  ├─ 2. createWorkflowRun() — 在 DB 创建运行记录
  ├─ 3. createTimeline("started") — 写入开始时间线
  ├─ 4. workflow.execute(input, runContext) — 执行实际逻辑 ★
  │     │
  │     ├─ 成功 → finishWorkflowRun("completed") + Timeline("completed")
  │     └─ 失败 → finishWorkflowRun("failed", error) + Timeline("failed") + rethrow
  │
  └─ 返回 { runId, output }
```

- 每个 workflow 运行都会获得独立的 `runId`。
- 成功和失败都会写入 Timeline，保证审计完整性。
- 异常会被重新抛出，让上层（Sub-Agent）处理。

---

## 5. 全部 13 个默认 Workflow

以下为 `default-workflows.ts` 中通过 `registerDefaultWorkflows()` 注册的所有默认 workflow。

### 5.1 `chat.respond` — Chat 响应

| 属性 | 值 |
|---|---|
| **ID** | `chat.respond` |
| **名称** | Chat Response |
| **风险等级** | `low` |
| **输入** | `{ prompt: string }` |
| **输出** | `ai.respond` skill 的返回值 |
| **调用 Skill** | `ai.respond` |
| **产生制品** | ❌ |
| **关键逻辑** | 将用户 prompt + 系统 prompt（含本地记忆上下文）发送给 AI，返回聊天响应。最简单的单 skill 直通 workflow。 |

### 5.2 `market.snapshot` — 市场快照

| 属性 | 值 |
|---|---|
| **ID** | `market.snapshot` |
| **名称** | Market Snapshot |
| **风险等级** | `low` |
| **输入** | `{ symbol: string; exchange?: string }` |
| **输出** | `{ symbol, outputs, errors, artifact }` |
| **调用 Skill** | `market.snapshot`, `artifact.create` |
| **产生制品** | ✅ `market-snapshot` 类型 |
| **关键逻辑** | 先调用 market.snapshot skill 获取 CoinGecko + CCXT 双源数据，再将结果序列化为 Markdown 制品保存。 |

### 5.3 `research.asset` — 资产研究

| 属性 | 值 |
|---|---|
| **ID** | `research.asset` |
| **名称** | Asset Research |
| **风险等级** | `low` |
| **输入** | `{ symbol: string; exchange?: string; workspaceId?: string }` |
| **输出** | `{ symbol, researchContext, report, artifact }` |
| **调用 Skill** | `research.asset`, `research.report`, `artifact.create` |
| **产生制品** | ✅ `research-report` 类型 |
| **关键逻辑** | 三步流水线：① 收集研究数据 → ② AI 生成研究报告文本 → ③ 创建包含报告+来源+质量评分的 Markdown 制品。若提供 workspaceId 则关联到该 workspace。 |

### 5.4 `browser.evidence` — 浏览器证据采集

| 属性 | 值 |
|---|---|
| **ID** | `browser.evidence` |
| **名称** | Browser Evidence |
| **风险等级** | `medium` |
| **输入** | `{ action: "browser.search"\|"browser.open"\|"browser.extract"\|"browser.screenshot"\|"browser.pdf"; url?; query? }` |
| **输出** | `browser.action` skill 的返回值 |
| **调用 Skill** | `browser.action` |
| **产生制品** | ❌（由 browser skill 内部处理） |
| **关键逻辑** | 对 AIO Sandbox 浏览器操作的直通代理。action 类型决定具体操作：搜索/打开/提取/截图/PDF。 |

### 5.5 `alpha.radar.scan` — Alpha 雷达扫描

| 属性 | 值 |
|---|---|
| **ID** | `alpha.radar.scan` |
| **名称** | Alpha Radar Scan |
| **风险等级** | `low` |
| **输入** | `{ category?: string } = {}` |
| **输出** | `{ signals: AlphaSignal[], stale, generatedAt, sources }` |
| **调用 Skill** | `market.polymarket.markets`, `search.query`, `community.reddit`, `events.fred`, `events.coinmarketcal` |
| **产生制品** | ❌ |
| **关键逻辑** | 多源并行聚合 workflow：① Polymarket 预测市场（过滤 volume≥50k，按 scoreMarket 排序取 Top 5）② 新闻搜索 ③ Reddit 社区 ④ FRED 日历 + CoinMarketCal 事件。将结果合成为 `AlphaSignal[]`，写入 Memory 和 Cache。各数据源独立 catch 错误，任一源失败不影响整体。 |

### 5.6 `deep.research` — 深度研究

| 属性 | 值 |
|---|---|
| **ID** | `deep.research` |
| **名称** | Deep Research |
| **风险等级** | `low` |
| **输入** | `{ topic: string; workspaceId: string; maxIterations?: number; context?: string }` |
| **输出** | `runDeepResearch()` 的返回值（ResearchReport） |
| **调用 Skill** | 通过 `runDeepResearch()` 内部调度（来自 `research/deep-research.ts`） |
| **产生制品** | ✅ 由 deep-research 模块内部创建 |
| **关键逻辑** | 委托给独立模块 `runDeepResearch()` 执行自主迭代式深度研究。通过 `onEvent` 回钩将每步进度写入 Timeline，提供研究过程可视化。 |

### 5.7 `trade.plan` — 交易计划

| 属性 | 值 |
|---|---|
| **ID** | `trade.plan` |
| **名称** | Trade Plan |
| **风险等级** | `medium` |
| **输入** | `{ symbol, budgetUsd, direction?, exchange?, entry?, stop?, takeProfit?, riskPct? }` |
| **输出** | `{ market, risk, tradeRisk, plan, artifacts: { tradePlan, riskReport } }` |
| **调用 Skill** | `market.snapshot` (via engine), `risk.positionSizing`, `risk.tradePlan`, `ai.respond` (×2), `artifact.create` (×2) |
| **产生制品** | ✅ `trade-plan` + `risk-report` 两个制品 |
| **关键逻辑** | 最复杂的默认 workflow 之一：① 获取实时市场价格 ② 用 extractPrice() 解析观察价格 ③ 计算仓位 sizing ④ 生成交易风险评估 ⑤ AI 生成结构化交易计划（带 150s 超时）⑥ 创建两个 Markdown 制品 ⑦ 写入 Memory。entry 默认=观察价，stop 默认=entry×0.97。 |

### 5.8 `paper.trade.lifecycle` — 模拟交易生命周期

| 属性 | 值 |
|---|---|
| **ID** | `paper.trade.lifecycle` |
| **名称** | Paper Trade Lifecycle |
| **风险等级** | `low` |
| **输入** | 联合类型，三种 action：`{ action: "execute"; decisionId; entryPrice?; asset?; settlementReason? }` \| `{ action: "monitor"; paperTradeId?; workspaceId? }` \| `{ action: "close"|"settle"; paperTradeId; exitPrice?; settlementReason? }` |
| **输出** | 根据 action 不同返回 `{ action, trade, priceSource, warning? }` 或 `{ action, trades[] }` |
| **调用 Skill** | `market.polymarket.search`, `market.coingecko.quote` (间接通过 resolvePaperTradePrice) |
| **产生制品** | ❌ |
| **关键逻辑** | 状态机式 workflow，三种模式：**execute** — 从 Decision 创建 PaperTrade，自动解析入场价（Polymarket/CoinGecko/fallback）；**monitor** — 查询开仓交易列表；**close/settle** — 结算交易并记录退出价。使用 `resolvePaperTradePrice()` 统一价格解析，支持预测市场 YES/NO 方向。 |

### 5.9 `review.workspace` — 工作区评审

| 属性 | 值 |
|---|---|
| **ID** | `review.workspace` |
| **名称** | Workspace Review |
| **风险等级** | `low` |
| **输入** | `{ workspaceId: string; period?: string }` |
| **输出** | `{ reviewId, artifact, report }` |
| **调用 Skill** | `ai.respond`, `artifact.create` |
| **产生制品** | ✅ `workspace-review` 类型 |
| **关键逻辑** | 七段式评审报告生成器：从 DB 聚合已结算决策、模拟交易、日记条目、用户规则、历史评审 → 构建 baseReport → AI 审查 overlay → 合并结果 → 生成 Markdown 制品 → 创建 Review 记录 → 自动生成 EvolutionSuggestion（最多 5 条）→ 写入 Memory。使用 `buildWorkspaceReviewReport()` / `mergeWorkspaceReviewAi()` 等多个辅助函数。 |

### 5.10 `review.daily` — 每日评审

| 属性 | 值 |
|---|---|
| **ID** | `review.daily` |
| **名称** | Daily Review |
| **风险等级** | `low` |
| **输入** | `{ period?: string }` |
| **输出** | `{ reviewId, reviewContext, report, artifact }` |
| **调用 Skill** | `review.daily`, `ai.respond`, `artifact.create` |
| **产生制品** | ✅ `daily-review` 类型 |
| **关键逻辑** | 三步流水线：① 调用 review.daily skill 获取指标和组合数据 ② AI 生成评审文本（Scorecard / What Worked / Rule Breaks / Risk Notes / Tomorrow Focus 五段式）③ 创建制品 + Review 记录 + Memory 写入。比 workspace.review 轻量，不需要 workspaceId。 |

### 5.11 `os.bootstrap` — OS 引导初始化

| 属性 | 值 |
|---|---|
| **ID** | `os.bootstrap` |
| **名称** | OS Bootstrap |
| **风险等级** | `low` |
| **输入** | `{}` |
| **输出** | `{ mcp, mcpDiscovery, marketplace, workspaces, artifact }` |
| **调用 Skill** | `mcp.health`, `mcp.discover`, `marketplace.catalog.seed`, `workspace.create` (×3), `artifact.create` |
| **产生制品** | ✅ `os-bootstrap` 类型 |
| **关键逻辑** | 系统一次性初始化 workflow：检测 MCP 健康 + 发现可用 MCP + 种子化市场目录 + 并行创建三个默认 Workspace（BTC / ETH / Macro）。所有步骤并行最大化后汇总为一个引导制品。 |

### 5.12 `strategy.backtest` — 策略回测桥接

| 属性 | 值 |
|---|---|
| **ID** | `strategy.backtest` |
| **名称** | Strategy Backtest Bridge |
| **风险等级** | `medium` |
| **输入** | `{ name: string; symbol: string; timeframe?: string; parameters?: unknown }` |
| **输出** | `{ strategy, backtest, artifact }` |
| **调用 Skill** | `strategy.create`, `backtest.run`, `artifact.create` |
| **产生制品** | ✅ `backtest-report` 类型 |
| **关键逻辑** | 三步流水线：① 创建策略记录（status=testing）② 调用沙箱回测桥接 ③ 生成回测报告制品。parameters 默认为空对象 `{}`。 |

### 5.13 `evolution.propose` — 进化提案

| 属性 | 值 |
|---|---|
| **ID** | `evolution.propose` |
| **名称** | Evolution Proposal |
| **风险等级** | `medium` |
| **输入** | `{ strategyId?: string; focus?: string }` |
| **输出** | `evolution.propose` skill 的返回值 |
| **调用 Skill** | `evolution.propose` |
| **产生制品** | ❌ |
| **关键逻辑** | 最简单的直通 workflow，直接委托给 evolution.propose skill。基于评审、记忆、日记、回测上下文生成受 guardrails 保护的建议改进方案。 |

---

## 6. 辅助函数清单 (`default-workflows.ts`)

| 函数名 | 签名 | 用途 |
|---|---|---|
| `runSkill<T>(ctx, skillId, input)` | → `Promise<T>` | **核心调度器**：按 ID 查找 skill → 创建 SkillRun 记录 → 检查审批 → 执行 → 记录结果/异常到 Timeline。所有 workflow 调用 skill 的统一入口。 |
| `withTimeout<T>(promise, ms, label)` | → `Promise<T>` | Promise 超时包装器，超时后 reject 带 label 信息的 Error。用于 trade.plan 中限制 AI 响应时间。 |
| `extractPrice(market)` | → `number \| undefined` | 从 market.snapshot 输出中提取价格，优先级：ccxtTicker.last > coingecko.priceUsd > ccxtTicker.bid |
| `resolvePaperTradePrice(ctx, direction, topic, asset)` | → `Promise<PaperTradePriceQuote>` | 根据方向解析纸面交易价格：YES/NO → Polymarket；其他 → CoinGecko；都失败 → fallback=1 |
| `inferDecisionAsset(topic)` | → `string` | 从决策主题字符串推断资产代码（BTC/SOL/ETH/大写词组/PREDICTION） |
| `scoreMarket(market)` | → `number` | Polymarket 市场评分公式：`volume×0.4 + liquidity×0.2 + \|change24h\|×1000` |
| `riskFromMarket(market)` | → `1\|2\|3\|4` | 根据成交量和流动性计算风险评级（1=最低风险，4=最高风险） |
| `extractUrls(result)` | → `string[]` | 从搜索结果中提取 URL 列表（最多 5 条） |
| `fallbackAlphaSignals(newsUrls, redditUrls)` | → `AlphaSignal[]` | 当外部数据不足时返回的兜底 alpha 信号 |
| `settledWorkflowValue(result)` | → `T \| { error }` | 从 `PromiseSettledResult` 中提取值或错误信息 |
| `buildWorkspaceReviewReport(input)` | → `WorkspaceReviewReport` | 构建七段式工作区评审基础报告（overview / tradeAnalyses / errorSummary / suggestions / emotionAnalysis / ruleCompliance / historicalComparison / metadata） |
| `buildReviewSuggestions(input)` | → `SuggestionItem[]` | 根据亏损数、规则警告、纪律分数等条件生成改进建议（最多 4 条启发式规则） |
| `workspaceReviewMarkdown(report)` | → `string` | 将 WorkspaceReviewReport 渲染为 Markdown 文本 |
| `buildWorkspaceReviewAiPrompt(report)` | → `string` | 生成 AI 审查 overlay 的 JSON prompt 模板 |
| `mergeWorkspaceReviewAi(base, ai, model?)` | → `WorkspaceReviewReport` | 将 AI 审查结果合并到基础报告中（覆盖 summary/keyFinding/lesson/trend 等） |
| `parseJsonFromText(text)` | → `any` | 从可能包裹在 markdown 代码块中的文本提取 JSON（多候选尝试） |
| `parseRulesViolated(value)` | → `string[]` | 安全解析 JSON 格式的违规规则列表 |
| `capitalize(str)` | → `string` | 首字母大写工具函数 |

---

## 7. 文件地图

| 文件 | 行数 | 职责 |
|---|---|---|
| `types.ts` | ~14 | 定义 `WorkflowContext` 和 `TradingWorkflow<TInput, TOutput>` 接口 |
| `workflow-engine.ts` | ~75 | `WorkflowEngine` 类：注册、查找、列表、同步 DB、运行（含完整生命周期管理） |
| `default-workflows.ts` | ~915 | 13 个默认 workflow 注册 + 所有辅助函数（runSkill、价格解析、评分、评审报告构建等） |

---

## 8. 依赖关系

### 8.1 上游依赖（Import）

| 来源模块 | 导入内容 | 用途 |
|---|---|---|
| `skills/types.ts` | `SkillContext` | WorkflowContext 的基类 |
| `skills/registry.ts` | `SkillRegistry` | WorkflowContext.skills 字段类型 |
| `research/bundle.ts` | `ResearchBundle`, `sourceQuality` | research.asset workflow 的类型和来源质量评估 |
| `alpha/alpha-radar.ts` | `alphaCategory`, `formatPercent`, `formatUsd`, `AlphaSignal` | alpha.radar.scan workflow 的信号类型和格式化 |
| `research/deep-research.ts` | `runDeepResearch` | deep.research workflow 的委托执行函数 |

### 8.2 下游被依赖（Export）

| 消费方 | 使用内容 |
|---|---|
| 应用启动代码 | 调用 `registerDefaultWorkflows(engine, skills)` 注册全部默认 workflow |
| Sub-Agent 层 | 通过 `engine.run(id, input, context)` 触发 workflow 执行 |
| 数据库 | `syncToDb()` 写入 workflow 元数据；`run()` 过程中读写 runs / timelines / reviews / decisions / paper_trades |

---

## 9. 如何添加新 Workflow

### 步骤 1：定义 Workflow

在 `default-workflows.ts` 的 `registerDefaultWorkflows()` 函数内添加：

```typescript
engine.register({
  id: "your.workflow.id",
  name: "Your Workflow Name",
  description: "一句话描述这个 workflow 做什么。",
  riskLevel: "low" | "medium" | "high" | "critical",
  execute: async (input: { /* 你的输入类型 */ }, context) => {
    // 步骤 1: 调用需要的 skill
    const step1 = await runSkill<YourType>(context, "skill.id", { /* 参数 */ });

    // 步骤 2: 组装结果
    return { /* 输出 */ };
  },
});
```

### 步骤 2：遵循约定

1. **使用 `runSkill()` 调用 skill** — 不要直接 `context.skills.get().execute()`，因为 `runSkill()` 会自动处理审批检查、Timeline 记录、错误捕获。
2. **设置正确的 `riskLevel`** — 影响 UI 展示和审批流程。
3. **产生制品时使用 `artifact.create`** — 保持审计一致性。
4. **写入 Memory** — 若结果值得持久化，使用 `context.memory.write()`。

### 步骤 3：（可选）添加辅助函数

如果逻辑复杂，可以在文件底部的辅助函数区域添加私有函数（如 `buildXxxReport`、`parseXxx` 等）。这些函数不以 `export` 开头，仅限模块内部使用。

---

## 10. Workflow ↔ Sub-Agent 关系

Workflow Engine 是**纯函数式的编排层**，它本身不具备自主决策能力。实际的自主行为由 **Sub-Agent（子代理）** 提供：

```
用户意图
  ↓
Main Agent (意图识别)
  ↓ 选择 workflow id + 构造 input
  ↓
Sub-Agent (封装 workflow.run())
  ├── engine.run(workflowId, input, context)
  │     ├── WorkflowEngine: 创建 runId, 记录 timeline
  │     └── workflow.execute()
  │           ├── runSkill() → Skill 1 → 结果 A
  │           ├── runSkill() → Skill 2 → 结果 B
  │           └── ... 编排逻辑 ...
  │     ← 返回 { runId, output }
  ↓
Sub-Agent: 将 output 格式化为用户可见的响应
  ↓
用户看到结果
```

**关键设计点**：

- **Workflow 不知道自己被谁调用** — 它只接收 `(input, context)`，返回 `output`。
- **Sub-Agent 负责**：意图路由 → 参数构造 → 调用 `engine.run()` → 结果格式化 → 错误恢复。
- **Engine 负责**：注册表管理 → 生命周期记账 → Timeline 审计 → 异常传播。
- **这种分层使得**：同一个 workflow 可以被不同的 Sub-Agent 或定时任务复用，无需修改 workflow 代码。
