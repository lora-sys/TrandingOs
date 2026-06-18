# Research 模块

## 模块定位

**深度研究引擎** — 自主多步信息采集与综合分析能力。负责将用户的研究主题拆解为子问题，并行调用 Web 搜索、学术数据库、社区舆情、市场数据等多源数据，最终生成结构化研究报告（`ResearchReport`）并持久化为 Artifact。

> **职责边界**：本模块仅负责**研究编排与合成**。具体数据源实现分别位于：
> - `market/` — Polymarket、CoinGecko 等市场数据
> - `academic/` — Semantic Scholar、Crossref、OpenAlex 学术接口
> - `community/` — Reddit 社区数据
> - 本模块通过 `SkillRegistry` 统一调用上述模块，不直接依赖其内部实现。

---

## 核心类型与接口

### ResearchFinding — 单条研究发现

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 发现标题 |
| `description` | `string` | 描述摘要 |
| `evidence` | `string` | 证据原文或引用 |
| `source` | `string` | 数据来源名称（如 "Polymarket"、"Semantic Scholar"、"Reddit"） |
| `relevance` | `"high" \| "medium" \| "low"` | 相关性评级 |

### ResearchReport — 完整研究报告

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 报告唯一标识，格式 `rr_{timestamp}` |
| `workspaceId` | `string` | 所属工作区 ID |
| `topic` | `string` | 研究主题 |
| `generatedAt` | `string` | ISO 8601 生成时间 |
| `mode` | `"builtin"` | 报告模式（当前仅 builtin） |
| `iterationsUsed` | `number` | 实际使用的迭代/步骤数 |
| `executionSummary` | `string` | 执行摘要（一句话概括） |
| `keyFindings` | `ResearchFinding[]` | 核心发现列表 |
| `dataSourceSummary` | `Array<{source, count, keyInsights[]}>` | 各数据源统计汇总 |
| `conclusion` | `string` | 结论（含风险提示） |
| `toolsUsed` | `string[]` | 调用的工具/Skill 列表 |
| `urlsAccessed` | `string[]` | 访问过的 URL 集合（上限 50） |
| `tokenUsage` | `{input, output}` | AI Token 消耗量 |

### DeepResearchEvent — 研究事件流

| 事件类型 | 触发时机 | data 关键字段 |
|----------|----------|---------------|
| `research:started` | 流程启动 | `sessionId`, `topic`, `mode`, `estimatedSteps` |
| `research:step` | 每步完成 | `sessionId`, `stepName`, `stepNumber`, `totalSteps`, `detail` |
| `research:complete` | 全部完成 | `session`, `report`, `artifact` |
| `research:error` | 异常终止 | `session`, `message` |

### DeepResearchContext — 注入依赖上下文

继承自 SkillContext，额外注入：

| 字段 | 类型 | 说明 |
|------|------|------|
| `env` | `TradingPiEnv` | 环境配置（含 OpenAI API Key 等） |
| `repos` | `Repositories` | 数据仓库（创建/更新 ResearchSession） |
| `artifacts` | `ArtifactEngine` | 制品引擎（创建研究报告 Artifact） |
| `approvals` | `ApprovalEngine` | 审批引擎 |
| `memory` | `MemoryStore` | 记忆存储（写入研究结果） |
| `skills` | `SkillRegistry` | 技能注册表（调用各数据源 Skill） |
| `sessionId?` | `string` | 可选会话 ID |
| `workflowRunId?` | `string` | 可选工作流运行 ID |

### ResearchSourceKind & ResearchSource — 数据源定义

```typescript
type ResearchSourceKind = "market" | "search" | "browser" | "onchain" | "document" | "memory";
```

| Kind | 含义 | 典型 Provider |
|------|------|---------------|
| `market` | 市场行情数据 | `market-data-layer` |
| `search` | Web 搜索结果 | `search-hub` / 各搜索引擎 |
| `browser` | 浏览器抓取证据 | `aio-sandbox` |
| `onchain` | 链上数据 | （预留） |
| `document` | 文档解析 | （预留） |
| `memory` | 工作区记忆 | `memory-engine` |

`ResearchSource` 接口字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | `ResearchSourceKind` | 来源分类 |
| `provider` | `string` | 提供方标识 |
| `status` | `"completed" \| "unavailable" \| "failed" \| "cached"` | 获取状态 |
| `title` | `string` | 来源标题 |
| `url?` | `string` | 原始 URL |
| `reason?` | `string` | 失败/不可用原因 |
| `payload?` | `unknown` | 原始数据负载 |

### ResearchBundle — 研究数据包

将多种来源聚合为统一结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 研究标的符号 |
| `workspaceId?` | `string` | 所属工作区 |
| `sources` | `ResearchSource[]` | 已组装的数据源列表 |
| `marketSnapshot?` | `unknown` | 市场快照原始数据 |
| `memoryContext?` | `string` | 记忆上下文文本 |
| `generatedAt` | `string` | 生成时间 |

---

## `runDeepResearch()` — 七步研究流水线

这是本模块的核心导出函数。接收研究主题和工作区 ID，执行完整的深度研究流程。

```
┌─────────────────────────────────────────────────────────────┐
│                    runDeepResearch() 入口                    │
│  输入: { topic, workspaceId, maxIterations?, context? }      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Step 1: 分解主题  │  decomposeTopic()
              │ → 生成子问题列表   │  (最多 maxIterations 条)
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Step 2: Web 搜索 │  search.query
              │ → 新闻 + 分析     │  (limit: 8)
              └────────┬────────┘
                       │
                       ▼
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Semantic  │  │ Crossref │  │ OpenAlex │
  │ Scholar   │  │          │  │          │
  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼            ← Step 3: 学术搜索 (并行)
                       │
                       ▼
              ┌─────────────────┐
              │ Step 4: 社区舆情 │  community.reddit
              │ → Reddit 讨论    │  (limit: 8)
              └────────┬────────┘
                       │
                       ▼
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
  ┌──────────────┐          ┌──────────────┐
  │  Polymarket  │          │  CoinGecko   │
  │  市场搜索     │          │  行情报价     │
  └──────┬───────┘          └──────┬───────┘
         │                         │
         └──────────┬──────────────┘
                    │                ← Step 5: 市场数据 (并行)
                    ▼
           ┌─────────────────┐
           │ Step 6: 交叉引用 │  buildFindings()
           │ → 结构化发现列表  │  分析多源证据一致性
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │ Step 7: 合成报告  │  synthesizeReport()
           │ → ResearchReport │  AI 或内置模板
           └────────┬────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
   ┌──────────┐       ┌──────────────┐
   │ Artifact  │       │ Memory Record│
   │ 创建制品   │       │ 写入记忆存储  │
   └──────────┘       └──────────────┘
          │                   │
          └─────────┬─────────┘
                    ▼
        ┌─────────────────────┐
        │ 返回 { session,     │
        │   report, artifact }│
        └─────────────────────┘
```

### 步骤详解

| 步骤 | 名称 | 调用的 Skill | 并行？ | 产出 |
|------|------|-------------|--------|------|
| **1** | Decompose topic | 内置 `decomposeTopic()` | 否 | 子问题数组（5 条模板化查询） |
| **2** | Web search | `search.query` | 否 | Web 新闻与分析结果 |
| **3** | Academic search | `academic.semanticscholar` + `academic.crossref` + `academic.openalex` | **是**（3 路并行） | 论文/文献列表 |
| **4** | Community sentiment | `community.reddit` | 否 | Reddit 帖子列表 |
| **5** | Market data | `market.polymarket.search` + `market.coingecko.quote` | **是**（2 路并行） | 预测市场 + 加密货币报价 |
| **6** | Cross-reference | 内置 `buildFindings()` | 否 | `ResearchFinding[]` |
| **7** | Synthesize report | `ai.respond`（有 API Key 时）或内置模板 | 否 | 完整 `ResearchReport` |

### 中断支持

- 通过 `AbortSignal` 支持取消：每步开始前调用 `throwIfAborted()`
- 取消时状态标记为 `cancelled`，异常时标记为 `failed`
- `maxIterations` 参数范围钳制在 `[3, 10]`，默认值 `5`

---

## `buildResearchBundle()` — 研究数据包组装

位于 `bundle.ts`，用于将分散的数据源输入组装为统一的 `ResearchBundle`。

**输入参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 标的符号（必填） |
| `workspaceId?` | `string` | 工作区 ID |
| `marketSnapshot?` | `unknown` | 市场快照数据 |
| `searchResult?` | `any` | 搜索结果 |
| `browserResult?` | `any` | 浏览器抓取结果 |
| `memoryContext?` | `string` | 记忆上下文 |

**组装的 4 种 Source**：

| # | kind | provider | status 判定逻辑 |
|---|------|----------|----------------|
| 1 | `market` | `market-data-layer` | 有 marketSnapshot → `completed`，否则 `unavailable` |
| 2 | `search` | `search-hub` | 有 cached → `cached`，有 status → 该值，否则 `unavailable` |
| 3 | `browser` | `aio-sandbox` | 有 status → 该值，否则 `unavailable` |
| 4 | `memory` | `memory-engine` | 有 memoryContext → `completed`，否则 `unavailable` |

**返回值**：`ResearchBundle & { sourceQuality: ReturnType<typeof sourceQuality> }` — 即 bundle 对象附带质量评分。

---

## `sourceQuality()` — 数据源质量评分

```typescript
sourceQuality(sources: ResearchSource[])
// => { total, completed, failed, unavailable, score }
```

| 指标 | 计算方式 |
|------|----------|
| `total` | sources 总数 |
| `completed` | status 为 `completed` 或 `cached` 的数量 |
| `failed` | status 为 `failed` 的数量 |
| `unavailable` | status 为 `unavailable` 的数量 |
| `score` | `(completed / total) * 100`，四舍五入整数百分比 |

---

## 辅助函数一览

| 函数 | 所在文件 | 功能 |
|------|----------|------|
| `decomposeTopic(topic, context?)` | `deep-research.ts` | 将主题拆解为 5 条子问题（最新市场催化剂、新闻分析、学术证据、社区情绪、风险因素） |
| `synthesizeReport(input, ctx, observedCtx, findings, iterations)` | `deep-research.ts` | 合成报告：优先使用 AI (`ai.respond`)，无 API Key 时回退到内置模板 |
| `baseResearchReport(input, observedCtx, findings, iterations)` | `deep-research.ts` | 生成基础内置版 ResearchReport（不含 AI 增强） |
| `buildFindings(topic, observedContext)` | `deep-research.ts` | 从观察上下文中提取结构化发现（市场、学术、社区三个维度） |
| `summarizeSources(observedContext)` | `deep-research.ts` | 生成 6 类数据源的统计摘要（Web、Semantic Scholar、Crossref、OpenAlex、Reddit、Polymarket） |
| `reportToMarkdown(report)` | `deep-research.ts` | 将 ResearchReport 渲染为 Markdown 文档（含标题、执行摘要、关键发现、数据源、结论） |
| `safeSkill(context, skillId, input)` | `deep-research.ts` | 安全调用 Skill：成功返回结果，失败返回 `{error, skillId}` 错误对象（不抛异常） |
| `inferSymbol(topic)` | `deep-research.ts` | 从研究主题推断加密货币符号（BTC/SOL/ETH），默认 ETH |
| `parseAiReport(response)` | `deep-research.ts` | 从 AI 响应中提取 JSON（支持 ```json 代码块和裸 JSON） |
| `normalizeAiReport(parsed, fallback)` | `deep-research.ts` | 将 AI 解析结果标准化，缺失字段回退到 fallback |
| `normalizeFindings(value, fallback)` | `deep-research.ts` | 标准化 findings 数组，过滤无效条目 |
| `normalizeDataSourceSummary(value, fallback)` | `deep-research.ts` | 标准化数据源摘要，支持数组和对象两种格式 |
| `normalizeRelevance(value)` | `deep-research.ts` | 将 relevance 归一化为合法枚举值，默认 `medium` |
| `extractUsage(response)` | `deep-research.ts` | 从 AI 响应中提取 token 用量（兼容多种字段名） |
| `collectUrls(value)` | `deep-research.ts` | 递归提取所有 http(s) URL（上限 50） |
| `countRows(value)` | `deep-research.ts` | 安全计数数组长度 |
| `firstTitles(value, key?)` | `deep-research.ts` | 取前 3 条记录的 title 字段 |
| `throwIfAborted(signal?)` | `deep-research.ts` | 检查 AbortSignal，已取消则抛错 |
| `researchQueryFor(symbol)` | `bundle.ts` | 生成标准研究查询字符串：`{symbol} crypto market news catalyst risk onchain macro` |

---

## 集成点

### 上游调用

由 `deep.research` 工作流触发，作为工作流的执行核心。

### 下游副作用

| 操作 | 实现 | 说明 |
|------|------|------|
| **DB 会话记录** | `repos.createResearchSession()` + `repos.updateResearchSession()` | 创建 ResearchSession 行，每步更新进度，完成/失败时更新状态 |
| **Artifact 制品** | `artifacts.create({ type: "research-report", ... })` | 创建研究报告 Artifact，附带 JSON payload 和 Markdown 内容 |
| **Memory 写入** | `memory.write({ domain: "research", ... })` | 以 importance=0.82 将执行摘要写入工作区记忆 |
| **Workspace 关联** | `repos.linkWorkspace()` | 将 Artifact 关联到 workspace，元数据标注 workflow 和 sessionId |

### 事件流

通过 `onEvent` 回调向外推送 4 种事件类型，供 UI 层实时展示研究进度。

---

## 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `deep-research.ts` | ~388 | 核心研究流水线：7 步编排、报告合成、辅助函数全集 |
| `bundle.ts` | ~83 | 数据包类型定义、组装函数 `buildResearchBundle()`、质量评分 `sourceQuality()` |

---

## 依赖关系

### 输入依赖（Import）

| 模块 | 来源路径 | 用途 |
|------|----------|------|
| `ArtifactEngine` | `../artifacts/artifact-engine.js` | 创建研究报告 Artifact |
| `Repositories` | `../db/repositories.js` | ResearchSession CRUD、Workspace 关联 |
| `TradingPiEnv` | `../config/env.js` | 读取 OpenAI API Key 等环境配置 |
| `MemoryStore` | `../memory/memory-store.js` | 写入研究结论到记忆系统 |
| `ApprovalEngine` | `../approvals/approval-engine.js` | 审批能力注入 |
| `SkillRegistry` | `../skills/registry.js` | 动态调用 search/academic/community/market/ai 等 Skill |

### 输出（Export）

| 导出项 | 类型 | 使用者 |
|--------|------|--------|
| `runDeepResearch()` | 函数 | `deep.research` 工作流 |
| `buildResearchBundle()` | 函数 | 需要预组装研究数据的下游模块 |
| `sourceQuality()` | 函数 | Bundle 质量评估 |
| `ResearchFinding` | Interface | 报告数据结构消费者 |
| `ResearchReport` | Interface | Artifact payload、UI 渲染 |
| `DeepResearchEvent` | Interface | 事件监听器 |
| `DeepResearchContext` | Interface | 工作流注入 |
| `ResearchSourceKind` | Type | 数据源分类枚举 |
| `ResearchSource` | Interface | Bundle 数据单元 |
| `ResearchBundle` | Interface | 研究数据聚合容器 |
| `researchQueryFor()` | 函数 | 查询字符串生成 |
