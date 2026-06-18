# Skills System — MODULE.md

> **模块路径**: `packages/core/src/skills/`
> **最后更新**: 2026-06-16
> **源文件**: `types.ts` | `registry.ts` | `schema.ts` | `default-skills.ts` | `cache-utils.ts`

---

## 1. 模块目的

Skills（技能）是 Trading Pi OS 中的**原子能力单元**。每个 Skill 封装一个独立的、可被 AI Agent 调用的操作——从获取市场数据、搜索网页、记录交易日志到创建策略提案。

Skill 是 Agent 执行的最小粒度：Workflow（工作流）编排多个 Skill 的调用顺序，而 Skill 本身只负责**做一件事并返回结果**。

核心设计原则：

- **声明式参数**: 使用 TypeBox schema 定义输入，支持运行时验证
- **统一上下文注入**: 通过 `SkillContext` 注入环境、数据库、内存、审批等依赖
- **风险分级**: 每个 Skill 标注 `riskLevel` 和 `permission`，供审批引擎决策
- **可转换为 Pi Tool**: 通过 `toPiTool()` 将 Skill 桥接为 Pi Agent Core 的 `AgentTool`

---

## 2. 职责边界

### ✅ 职责内

| 职责 | 说明 |
|------|------|
| **Skill 定义与注册** | 声明式定义 Skill（id / name / description / parameters / execute），通过 `SkillRegistry` 集中管理 |
| **类型验证** | 使用 TypeBox `TSchema` 定义参数结构，运行时自动校验 |
| **转换为 Pi Tool** | `toPiTool()` 将 `TradingSkill` 适配为 `@earendil-works/pi-agent-core` 的 `AgentTool` 接口 |
| **缓存策略** | `withCacheStrategy()` 为市场数据类 Skill 提供统一的"读缓存 → 判断新鲜度 → 拉取 → 回退"流程 |
| **Schema 转换** | `typeBoxToJsonSchema()` 将 TypeBox schema 转换为 JSON Schema（用于 MCP 工具注册） |
| **默认 Skill 集合** | `registerDefaultSkills()` 注册系统内置的全部 ~60 个 Skill |

### ❌ 职责外（由其他模块负责）

| 不属于此模块 | 归属模块 |
|--------------|----------|
| Workflow 编排 / DAG 执行 | `workflows/` |
| 审批流程决策 | `approvals/approval-engine.ts` |
| 具体数据源实现 (CCXT/CoinGecko/FRED 等) | `market/`, `reach/`, `events/`, `academic/`, `community/` |
| Artifact 存储引擎 | `artifacts/artifact-engine.ts` |
| 内存持久化 | `memory/memory-store.ts` |
| 数据库 Repository | `db/repositories.ts` |

---

## 3. 核心类型与接口

### 3.1 `RiskLevel` — 风险等级

```typescript
type RiskLevel = "low" | "medium" | "high" | "critical";
```

| 值 | 含义 | 典型场景 |
|----|------|----------|
| `"low"` | 只读或纯本地写入 | 市场查询、搜索、日志读取 |
| `"medium"` | 有副作用的本地操作 | 仓位计算、纸单创建、策略创建 |
| `"high"` | 需要审批的危险操作 | 真实下单、MCP 权限请求、进化提案应用 |
| `"critical"` | 最高危险级别（当前未使用） | — |

### 3.2 `PermissionLevel` — 权限级别

```typescript
type PermissionLevel = "read" | "write" | "dangerous";
```

| 值 | 含义 |
|----|------|
| `"read"` | 只读操作，无需审批 |
| `"write"` | 写入本地数据（DB / 文件），一般不需要额外审批 |
| `"dangerous"` | 危险操作（真实交易、MCP 高权限），必须经过 ApprovalEngine 审批 |

### 3.3 `SkillContext` — 技能执行上下文

```typescript
interface SkillContext {
  env: TradingPiEnv;          // 环境变量（API keys、默认交易所等）
  repos: Repositories;        // 数据库 Repository 层
  artifacts: ArtifactEngine;  // Artifact 创建与管理引擎
  approvals: ApprovalEngine;  // 审批引擎（用于高权限操作的 gate）
  memory: MemoryStore;        // 领域记忆存储
  workflowRunId?: string;     // 当前工作流运行 ID（可选）
  sessionId?: string;         // 当前会话 ID（可选）
}
```

每个 Skill 的 `execute()` 方法接收完整的 `SkillContext`，从中获取所需的依赖。这种设计使得 Skill 本身是无状态的纯逻辑函数。

### 3.4 `TradingSkill<TParameters, TOutput>` — 技能接口

```typescript
interface TradingSkill<TParameters extends TSchema = TSchema, TOutput = unknown> {
  id: string;                                              // 唯一标识符（如 "market.coingecko.quote"）
  name: string;                                            // 人类可读名称（如 "CoinGecko Quote"）
  description: string;                                     // AI 描述文本，用于工具选择
  riskLevel: RiskLevel;                                    // 风险等级
  permission: PermissionLevel;                             // 权限级别
  parameters: TParameters;                                 // TypeBox 参数 schema
  execute(input: Static<TParameters>, context: SkillContext, signal?: AbortSignal): Promise<TOutput>;
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 全局唯一标识符，使用点分命名（如 `market.ccxt.ticker`）。也作为转换后的 Pi Tool 的 `name` |
| `name` | `string` | 显示名称，映射到 `AgentTool.label` |
| `description` | `string` | AI 用于选择该工具的描述文本，映射到 `AgentTool.description` |
| `riskLevel` | `RiskLevel` | 风险等级，影响是否触发审批 |
| `permission` | `PermissionLevel` | 权限级别，`dangerous` 级别强制走审批流 |
| `parameters` | `TParameters` (extends `TSchema`) | TypeBox 定义的参数 schema，同时用于运行时验证和 JSON Schema 导出 |
| `execute` | 函数 | 核心执行逻辑，接收已验证的输入、完整上下文和可选取消信号 |

### 3.5 `toPiTool()` — 转换为 Pi Agent Tool

```typescript
function toPiTool<TParameters extends TSchema>(
  skill: TradingSkill<TParameters>,
  context: SkillContext,
): AgentTool<TParameters, unknown>
```

将 `TradingSkill` 转换为 `@earendil-works/pi-agent-core` 的 `AgentTool` 接口：

- `name` ← `skill.id`
- `label` ← `skill.name`
- `description` ← `skill.description`
- `parameters` ← `skill.parameters`（TypeBox schema 直接透传）
- `execute` 包装器：调用 `onUpdate` 通知状态变化 → 调用 `skill.execute()` → 返回格式化结果

转换后的 Tool 可直接注册到 Pi Agent runtime 中供 LLM 调用。

---

## 4. Skill Registry（注册表）

**文件**: `registry.ts`

`SkillRegistry` 是所有 Skill 的中央注册表，基于 `Map<string, TradingSkill>` 实现。

### API

| 方法 | 签名 | 说明 |
|------|------|------|
| `register(skill)` | `<T>(skill: TradingSkill<T>) => skill` | 注册一个 Skill，以 `skill.id` 为 key 存入 Map，返回原 skill（链式友好） |
| `get(id)` | `(id: string) => TradingSkill` | 按 ID 查找 Skill，未找到时抛出错误 |
| `list()` | `() => Array<{id, name, description, riskLevel, permission}>` | 返回所有 Skill 的摘要列表（不含 execute 逻辑） |
| `syncToDb(context)` | `(context: SkillContext) => void` | 将所有已注册 Skill 元信息 upsert 到数据库 `skills` 表 |
| `toPiTools(context)` | `(context: SkillContext) => AgentTool[]` | 将所有 Skill 批量转换为 Pi Tool 数组 |

### 使用模式

```typescript
const registry = new SkillRegistry();
registerDefaultSkills(registry);   // 注册全部默认 Skill
const tools = registry.toPiTools(ctx);  // 转换为 Pi Agent 可用的 Tool 数组
```

---

## 5. 默认 Skill 清单

**文件**: `default-skills.ts`

以下按类别列出所有已注册的 Skill ID、名称及风险等级。

### Agent（子代理）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `Agent` | Sub-Agent | low | write |
| `StopAgent` | Stop Sub-Agent | low | write |
| `AgentStatus` | Sub-Agent Status | low | read |
| `ai.respond` | AI Response | low | read |

### Market（市场数据）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `market.coingecko.quote` | CoinGecko Quote | low | read |
| `market.polymarket.markets` | Polymarket Markets | low | read |
| `market.polymarket.detail` | Polymarket Market Detail | low | read |
| `market.polymarket.price` | Polymarket Price | low | read |
| `market.polymarket.search` | Polymarket Search | low | read |
| `market.ccxt.ticker` | CCXT Ticker | low | read |
| `market.ccxt.ohlcv` | CCXT OHLCV | low | read |
| `market.snapshot` | Market Snapshot | low | read |
| `market.router.health` | Exchange Router Health | low | read |
| `market.fetch_orderbook` | Fetch Orderbook | low | read |
| `market.fetch_balance` | Fetch Balance | low | read |

### Search（搜索）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `search.query` | Search Query | low | read |
| `search.extract` | Search Extract | low | read |
| `search.summarize` | Search Summarize | low | read |

### Community & Academic（社区与学术）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `community.reddit` | Reddit Community Data | low | read |
| `academic.semanticscholar` | Semantic Scholar Academic Search | low | read |
| `academic.crossref` | Crossref Academic Metadata | low | read |
| `academic.openalex` | OpenAlex Academic Search | low | read |

### Events（事件日历）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `events.fred` | FRED Macro Events | low | read |
| `events.coinmarketcal` | CoinMarketCal Crypto Events | low | read |

### Reach（数据源接入）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `reach.xueqiu.quote` | Xueqiu Stock Quote | low | read |
| `reach.xueqiu.search` | Xueqiu Stock Search | low | read |
| `reach.xueqiu.hot_posts` | Xueqiu Hot Posts | low | read |
| `reach.xueqiu.hot_stocks` | Xueqiu Hot Stocks | low | read |
| `reach.xueqiu.health` | Xueqiu Health Check | low | read |
| `reach.doctor` | Data Source Health Check | low | read |

### Browser（浏览器自动化）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `browser.search` | Browser search | low | read |
| `browser.open` | Browser open | medium | read |
| `browser.extract` | Browser extract | low | read |
| `browser.screenshot` | Browser screenshot | low | read |
| `browser.pdf` | Browser pdf | low | read |
| `browser.action` | Browser Action | medium | read |

### Risk（风险管理）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `risk.positionSizing` | Position Sizing | medium | read |
| `risk.tradePlan` | Trade Plan Risk | medium | read |
| `risk.stop_loss` | Stop Loss Calculator | low | read |
| `risk.daily_loss_guard` | Daily Loss Guard | medium | read |

### Research（研究）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `research.asset` | Asset Research Context | low | read |
| `research.report` | Research Report | low | write |

### Decision（决策引擎）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `decision.analyze` | Decision Analysis | low | read |
| `decision.record` | Record Decision | low | write |
| `decision.fromReport` | Generate Decision From Report | low | read |

### Artifact（制品）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `artifact.create` | Create Artifact | low | write |
| `artifact.read` | Read Artifact | low | read |
| `artifact.preview` | Artifact Preview | low | read |

### Journal（交易日志）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `journal.entry.create` | Create Journal Entry | low | write |
| `journal.log_signal` | Log Trading Signal | low | write |
| `journal.log_emotion` | Log Emotional State | low | write |
| `journal.attach_screenshot` | Attach Screenshot | low | write |

### Memory（记忆）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `memory.write` | Write Memory | low | write |
| `memory.query` | Query Memory | low | read |

### Workspace（工作区）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `workspace.create` | Create Workspace | low | write |
| `workspace.context` | Workspace Context | low | read |

### MCP（模型上下文协议）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `mcp.discover` | MCP Discovery | low | read |
| `mcp.register` | MCP Register | medium | write |
| `mcp.health` | MCP Health Check | low | read |
| `mcp.permission.request` | MCP Permission Request | high | dangerous |

### Strategy（策略）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `strategy.create` | Create Strategy | medium | write |
| `strategy.lifecycle` | Strategy Lifecycle | medium | write |

### Backtest（回测）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `backtest.run` | Run Backtest | medium | write |
| `backtest.compare` | Compare Backtests | low | read |

### Evolution（进化）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `evolution.propose` | Evolution Proposal | medium | write |

### Review（复盘）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `review.daily` | Daily Review Metrics | low | read |

### Execution（执行）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `execution.create_plan` | Create Execution Plan | medium | write |
| `execution.real_order_guarded` | Real Order (Guarded) | high | dangerous |
| `execution.cancel_order` | Cancel Order | medium | write |

### Paper Trading（模拟交易）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `paper.order.create` | Create Paper Order | medium | write |

### Approval（审批）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `approval.request` | Request Approval | high | dangerous |

### Marketplace（市场目录）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `marketplace.catalog.seed` | Seed Marketplace Catalog | low | write |

### Airdrop（空投）

| Skill ID | 名称 | Risk | Permission |
|----------|------|------|------------|
| `airdrop.search_opportunities` | Search Airdrop Opportunities | medium | read |
| `airdrop.check_eligibility` | Check Airdrop Eligibility | medium | read |

---

## 6. Schema — TypeBox 集成与 JSON Schema 转换

**文件**: `schema.ts`

### `typeBoxToJsonSchema(schema)`

将 TypeBox `TSchema` 对象递归转换为标准 JSON Schema 对象。

支持的 TypeBox 类型映射：

| TypeBox Kind | JSON Schema 输出 |
|-------------|------------------|
| `String` | `{ type: "string" }` |
| `Number` | `{ type: "number" }` |
| `Boolean` | `{ type: "boolean" }` |
| `Integer` | `{ type: "integer" }` |
| `Null` | `{ type: "null" }` |
| `Any` | `{}` |
| `Literal` | `{ type, const }` |
| `Enum` | `{ enum: [...] }` |
| `Array` | `{ type: "array", items: {...} }` |
| `Object` | `{ type: "object", properties: {...}, required: [...] }` |
| `Union` | `{ anyOf: [...] }` |
| `Intersect` | `{ allOf: [...] }` |
| 其他（Record 等） | `{}` （兜底最小表示） |

### `ToolManifest` 接口

```typescript
interface ToolManifest {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema 格式的参数定义
}
```

MCP 工具注册需要 JSON Schema 格式的 `inputSchema`，使用 `typeBoxToJsonSchema()` 从 Skill 的 TypeBox `parameters` 字段生成。

---

## 7. Cache Utils（缓存工具）

**文件**: `cache-utils.ts`

### `withCacheStrategy<T>(getCached, options)` — 统一缓存策略

封装完整的缓存生命周期：**检查缓存 → 新鲜度判断 → 拉取新数据 → 存储 → 错误回退**。

#### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `getCached` | `() => Promise<any \| null>` | 从 DB 读取缓存的异步函数 |
| `options.maxAgeMs` | `number` | 缓存最大有效时间（毫秒） |
| `options.fetchFresh` | `() => Promise<T>` | 从外部数据源获取最新数据的函数 |
| `options.storeCache` | `(data: T) => Promise<void>`? | 可选：将新数据存入缓存 |
| `options.transformCache` | `(cached: any) => T` | 将缓存原始数据转为 API 返回格式 |
| `options.shouldFallbackOnError` | `boolean`? | 外部失败时是否回退到过期缓存（默认 true） |
| `options.onErrorNoCache` | `() => T`? | 无缓存且外部失败时的兜底返回值 |
| `options.isCachedFresh` | `(cached, maxAgeMs) => boolean`? | 自定义新鲜度判断（默认检查 `fetched_at`） |

#### 执行流程

```
1. 调用 getCached()
2. 缓存存在且新鲜？→ transformCache(cached) 并返回
3. 调用 fetchFresh() 获取新数据
4. 成功 → storeCache(如有) → 返回新数据
5. 失败且有缓存 → shouldFallbackOnError ? transformCache(过期缓存) : 继续抛错
6. 失败且无缓存 → onErrorNoCache ? 返回兜底值 : 抛出原始错误
```

#### 使用示例（来自 `market.ccxt.ticker`）

```typescript
return withCacheStrategy(
  () => context.repos.getLatestMarketPrice(symbol, "ccxt"),
  {
    maxAgeMs: 60_000,
    fetchFresh: async () => {
      const result = await fetchCcxtTicker(exchange, symbol);
      await context.repos.upsertMarketPrice({ ... });
      return result;
    },
    transformCache: (cached) => ({ /* 映射字段 */ }),
  },
);
```

---

## 8. 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `types.ts` | ~53 | 核心类型定义：`TradingSkill`, `SkillContext`, `RiskLevel`, `PermissionLevel`, `toPiTool()` |
| `registry.ts` | ~44 | `SkillRegistry` 类：注册、查找、列表、同步 DB、批量转 Pi Tool |
| `schema.ts` | ~88 | TypeBox → JSON Schema 转换器 + `ToolManifest` 接口 |
| `default-skills.ts` | ~2458 | 全部 ~60 个默认 Skill 的注册实现 + 辅助函数 |
| `cache-utils.ts` | ~65 | `withCacheStrategy()` 统一缓存策略处理器 |

---

## 9. 依赖关系

### 入向依赖（Import From）

| 来源模块 | 用途 |
|----------|------|
| `@earendil-works/pi-agent-core` | `AgentTool` 类型（`toPiTool` 返回值） |
| `typebox` (`Type`, `Static`, `TSchema`) | 参数 schema 定义与静态类型提取 |
| `../db/repositories` | `Repositories` — 数据库操作（在 `SkillContext` 中使用） |
| `../artifacts/artifact-engine` | `ArtifactEngine` — 制品管理（在 `SkillContext` 中使用） |
| `../approvals/approval-engine` | `ApprovalEngine` — 审批引擎（在 `SkillContext` 中使用） |
| `../memory/memory-store` | `MemoryStore` — 记忆存储（在 `SkillContext` 中使用） |
| `../config/env` | `TradingPiEnv` — 环境变量配置（在 `SkillContext` 中使用） |
| `../journal` | `normalizeJournalInput()` — 日志输入标准化 |
| `../research/bundle` | `buildResearchBundle()`, `researchQueryFor()` — 研究包构建 |
| `../strategy` | `scoreStrategy()` — 策略评分 |
| `../ai/model` | `createTradingPiModel()` — AI 模型创建 |
| `../agents/manager` | `getDefaultSubAgentManager()` — 子代理管理器 |
| `../market/ccxt` | CCXT 市场数据（ticker, ohlcv, orderbook, balance） |
| `../market/coingecko` | CoinGecko 价格查询 |
| `../market/polymarket` | Polymarket 预测市场数据 |
| `../community/reddit` | Reddit 社区数据 |
| `../academic/search` | 学术搜索（Semantic Scholar, Crossref, OpenAlex） |
| `../events/event-feeds` | 事件日历（FRED, CoinMarketCal） |
| `../reach/xueqiu` | 雪球股票数据 |
| `../reach/doctor` | 数据源健康检查 |
| `@trading-pi/search-hub` | `SearchHub` — 统一搜索引擎 |
| `@trading-pi/browser-layer` | `AioSandboxBrowserLayer` — 浏览器沙箱层 |
| `@trading-pi/mcp-hub` | MCP 发现、健康检查、审批判断 |
| `@earendil-works/pi-ai` | `complete()` — AI 推理调用 |
| `../config/timeouts` | `DATA_SOURCE_TIMEOUTS` — 各数据源超时配置 |

### 出向依赖（Export To）

| 消费者 | 用途 |
|--------|------|
| `trading-pi-agent`（主 Agent） | 调用 `registerDefaultSkills()` → `registry.toPiTools()` 注册全部工具 |
| MCP 工具注册层 | 使用 `typeBoxToJsonSchema()` + `ToolManifest` 将 Skill 暴露为 MCP 工具 |
| 测试套件 | 直接 import `SkillRegistry`, `TradingSkill`, `withCacheStrategy` 进行单元测试 |

---

## 10. 如何添加新 Skill

### 步骤 1：创建 Skill 执行函数

在 `default-skills.ts` 的 `registerDefaultSkills()` 函数内添加 `registry.register({...})` 调用：

```typescript
registry.register({
  id: "category.skill_name",           // 点分命名，全局唯一
  name: "Human Readable Name",         // 显示名称
  description: "AI tool selection description.",  // LLM 工具选择描述
  riskLevel: "low",                    // "low" | "medium" | "high" | "critical"
  permission: "read",                  // "read" | "write" | "dangerous"
  parameters: Type.Object({
    // 使用 Type.Builder 定义参数 schema
    requiredParam: Type.String({ description: "必填参数说明" }),
    optionalParam: Type.Optional(Type.Number()),
  }),
  execute: async (input, context, signal) => {
    // input 已通过 TypeBox 验证，可直接使用
    // context 提供 env / repos / artifacts / approvals / memory
    // signal 可用于取消长耗时操作
    const result = await doSomething(input.requiredParam);
    context.repos.createAuditRecord({ category: "my-category", action: "my-skill", status: "completed", payload: input });
    return result;
  },
});
```

### 步骤 2：定义 TypeBox 参数 Schema

常用 TypeBox 构造器：

| 构造器 | 说明 | 示例 |
|--------|------|------|
| `Type.String()` | 字符串 | `Type.String({ description: "..." })` |
| `Type.Number()` | 数字 | `Type.Number()` |
| `Type.Boolean()` | 布尔值 | `Type.Boolean()` |
| `Type.Optional(T)` | 可选字段 | `Type.Optional(Type.String())` |
| `Type.Array(T)` | 数组 | `Type.Array(Type.String())` |
| `Type.Union([...])` | 联合类型 | `Type.Union([Type.Literal("a"), Type.Literal("b")])` |
| `Type.Literal(value)` | 字面量 | `Type.Literal("buy")` |
| `Type.Any()` | 任意类型 | `Type.Any()` |
| `Type.Object({ ... })` | 对象 | 包含上述字段的复合结构 |

### 步骤 3：注册完成

`registerDefaultSkills()` 在启动时被调用，新 Skill 会自动：

1. 加入 `SkillRegistry`（可通过 `registry.get("category.skill_name")` 查找）
2. 通过 `registry.toPiTools(ctx)` 转换为 Pi Agent Tool（LLM 可调用）
3. 通过 `registry.syncToDb(ctx)` 同步到数据库 `skills` 表

### 最佳实践

- **市场数据类 Skill**：优先使用 `withCacheStrategy()` 包装，避免重复请求外部 API
- **写操作 Skill**：始终调用 `context.repos.createAuditRecord()` 记录审计日志
- **有意义的操作**：考虑调用 `context.memory.write()` 写入领域记忆
- **产生内容的操作**：考虑调用 `context.artifacts.create()` 创建持久化制品
- **高风险操作**：设置 `permission: "dangerous"` 并在 `execute` 内调用 `context.approvals.request()`
