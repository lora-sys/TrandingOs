# Memory 模块

> 长期知识存储层 — 按 **域（Domain）** 和 **工作空间（Workspace）** 作用域隔离的持久化记忆系统。

---

## 1. 模块目的

Memory 是 Trading Pi OS 的**跨会话长期知识存储**。它将 Agent 运行过程中产生的关键信息持久化到 SQLite，使后续会话能够检索历史洞察、用户偏好、研究结论等上下文，避免每次从零开始。

核心设计理念：

- **域隔离**：不同类型的信息归属不同域（如交易、市场、策略），查询时可按域精确过滤
- **工作空间隔离**：同一域下可按 workspaceId 进一步分区，支持多工作空间并行
- **重要性排序**：每条记录带 `importance` (0-1) 分数，高优先级记录优先返回

---

## 2. 职责边界

| ✅ Memory 负责 | ❌ Memory 不负责 |
|---|---|
| 记录的写入、查询、删除 | 会话内短期消息历史（由 Session 管理） |
| 按 domain/workspaceId 过滤和排序 | 实时市场数据拉取（由 Market 模块负责） |
| 生成上下文文本块注入 Agent prompt | 文件/Artifact 的原始存储（由 Repositories 管理） |
| 重要性驱动的记录排序 | 用户认证与权限控制 |

---

## 3. 核心类型与接口

### 3.1 `MemoryDomain` — 域枚举（12 个值）

定义在 `types.ts:1-12`：

| 域值 | 用途说明 |
|---|---|
| `conversation` | 对话摘要/关键对话结论 |
| `market` | 市场观察、行情模式、异常事件 |
| `trade` | 交易计划、执行记录、盈亏总结 |
| `review` | 复盘结论、日度/周度回顾 |
| `skill` | 技能使用经验、工具调用模式 |
| `workspace` | 工作空间配置、项目状态 |
| `research` | 深度研究报告摘要 |
| `strategy` | 策略参数、回测结论 |
| `alpha` | Alpha 信号、雷达扫描发现 |
| `user_rules` | 用户自定义规则、偏好设置 |
| `evolution` | 进化提案、自我改进记录 |

### 3.2 `MemoryRecord` 接口

定义在 `types.ts:14-23`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `domain` | `MemoryDomain` | ✅ | 记录所属域 |
| `workspaceId` | `string?` | ❌ | 工作空间 ID，缺省为 `"global"` |
| `key` | `string` | ✅ | 记录唯一键（域内唯一） |
| `value` | `string` | ✅ | 记录内容文本 |
| `importance` | `number?` | ❌ | 重要性分数 `0-1`，越高越优先 |
| `sourceType` | `"session" \| "artifact" \| "trade" \| "journal" \| "review" \| "skill" \| "manual"`? | ❌ | 数据来源类型 |
| `sourceId` | `string?` | ❌ | 来源对象 ID（如 artifactId、tradeId） |
| `metadata` | `Record<string, unknown>?` | ❌ | 扩展元数据 |

### 3.3 辅助函数

#### `memoryScope(domain, workspaceId?)`

```ts
// types.ts:25
export function memoryScope(domain: MemoryDomain, workspaceId = "global"): string
```

生成作用域字符串：`"domain:workspaceId"`。例如：
- `memoryScope("trade", "ws-001")` → `"trade:ws-001"`
- `memoryScope("market")` → `"market:global"`

#### `memoryKey(input)`

```ts
// types.ts:29
export function memoryKey(input: Pick<MemoryRecord, "domain" | "workspaceId" | "key">): string
```

生成完整唯一键：`"domain:workspaceId:key"`。用于去重和精确定位。

#### `formatMemoryRecord(record)`

```ts
// types.ts:33
export function formatMemoryRecord(record: MemoryRecord): string
```

将 `MemoryRecord` 格式化为人类可读的单行文本：

```
[trade/ws-001 source=trade:tx-003 importance=0.9] plan: BTC long entry @ 67000
```

---

## 4. MemoryStore 类

定义在 `memory-store.ts:4-59`。通过构造函数接收 `Repositories` 实例，所有操作委托给底层 SQLite。

### 公共方法一览

| 方法 | 签名 | 说明 |
|---|---|---|
| **write()** | `write(input: { domain, key, value, workspaceId?, importance?, sourceType?, sourceId?, metadata? })` | 写入一条结构化记忆记录（推荐入口） |
| **query()** | `query({ domain?, workspaceId?, q?, limit? })` | 按条件查询记忆记录，支持全文搜索 `q` |
| **delete()** | `delete(id: string)` | 按 ID 删除单条记录 |
| **upsert()** | `upsert(scope: string, key: string, value: string)` | 底层 upsert 操作，按 scope+key 去重 |
| **list()** | `list(scope = "user")` | 列出指定 scope 下所有记录，按 importance DESC 排序 |
| **listAll()** | `listAll(limit = 500)` | 全局列出所有记录 |
| **domainContext()** | `domainContext(domain, workspaceId?)` | 生成指定域的上下文文本块（最多 12 条），用于注入 prompt |
| **workspaceContext()** | `workspaceId?)` | 生成指定工作空间的上下文文本块（最多 24 条） |
| **contextBlock()** | `contextBlock(scope = "user")` | 生成通用上下文文本块，按 key-value 列表格式化 |

### contextBlock 输出格式示例

```
- alpha:radar:2024-01-15: Detected bullish divergence on ETH/BTC
- trade:plan:ws-001: Long BTC @ 67k, stop 64k, target 72k
- user_rules:risk:max_position_size=5%
```

---

## 5. 域使用指南

以下表格汇总了各模块/工作流写入的域：

| 域 | 写入来源（工作流/模块） | 典型 Key 模式 | 示例场景 |
|---|---|---|---|
| **alpha** | `default-workflows.ts` → `alpha.radar.scan` 工作流 | `radar:{date}:{signal}` | 雷达扫描发现的 Alpha 信号 |
| **trade** | `default-workflows.ts` → `trade.plan` 工作流；`default-skills.ts` → 交易技能 | `plan:{workspaceId}` / `execution:{tradeId}` | 交易计划、执行记录 |
| **review** | `default-workflows.ts` → `review.daily` / `review.workspace` 工作流 | `daily:{date}` / `weekly:{date}` | 日度复盘、周度回顾结论 |
| **research** | `deep-research.ts` → `deep.research` 工作流；`default-skills.ts` → 研究技能 | `deep-research:{sessionId}` | 深度研究报告摘要 |
| **strategy** | `default-skills.ts` → 策略技能 | `backtest:{name}` / `param:{strategy}` | 策略回测结果、参数调优 |
| **market** | `default-skills.ts` → 市场分析技能 | `observation:{date}` / `pattern:{type}` | 市场观察、形态识别 |
| **workspace** | `default-skills.ts` → 工作空间技能 | `config:{workspaceId}` / `status:{workspaceId}` | 工作空间配置变更 |
| **user_rules** | `default-workflows.ts` → 规则读取；`default-skills.ts` → 设置技能 | `risk:*` / `preference:*` / `constraint:*` | 用户自定义规则（只读查询为主） |
| **evolution** | 进化工作流（预留） | `proposal:{id}` / `improvement:{area}` | 自我改进提案 |
| **conversation** | Agent 对话压缩时（预留） | `summary:{sessionId}` | 会话摘要 |
| **skill** | 技能使用统计（预留） | `usage:{skillName}` | 技能调用模式学习 |
| **evolution** | 进化工作流（预留） | `proposal:{id}` | 进化提案记录 |

---

## 6. Scope / Key 约定

### Scope 字符串格式

```
{domain}:{workspaceId}
```

- `domain`: `MemoryDomain` 枚举值之一
- `workspaceId`: 工作空间标识符，未指定时默认 `"global"`
- 示例：`"trade:ws-001"`、`"market:global"`

### Key 结构

完整 key 由 `memoryKey()` 函数生成：

```
{domain}:{workspaceId}:{userKey}
```

- `userKey` 由调用方指定，建议采用 `{类别}:{标识}` 格式
- 在同一 scope 内必须唯一（upsert 语义）

### 推荐命名规范

| 域 | Key 命名示例 |
|---|---|
| alpha | `radar:2024-01-15`, `signal:eth-btc-divergence` |
| trade | `plan:ws-001`, `execution:tx-003`, `pnl:2024-W03` |
| review | `daily:2024-01-15`, `weekly:2024-W03` |
| research | `deep-research:sess-042` |
| strategy | `backtest:mean-reversion-v2`, `param:trend-follow` |
| market | `observation:fomc-minute`, `pattern:bull-flag` |
| workspace | `config:ws-001`, `status:ws-001` |
| user_rules | `risk:max_drawdown`, `preference:timeframe`, `constraint:no_leverage` |

---

## 7. 重要性评分（Importance Scoring）

| 分数范围 | 含义 | 使用场景 |
|---|---|---|
| `0.9 - 1.0` | 关键 | 重大交易决策、风险事件、核心用户规则 |
| `0.7 - 0.8` | 重要 | 研究结论、策略回测结果、Alpha 信号 |
| `0.5 - 0.6` | 一般 | 市场观察、常规复盘、工作空间状态更新 |
| `0.3 - 0.4` | 参考 | 技能使用日志、临时笔记 |
| `0.0 - 0.2` | 低优 | 调试信息、待清理数据 |

- `list()` 和 `domainContext()` 默认按 `importance DESC, updated_at DESC` 排序
- 未设置 importance 的记录排在最后
- 实际写入示例：`deep-research` 工作流写 research 域时设 `importance: 0.82`

---

## 8. 文件映射

| 文件 | 职责 |
|---|---|
| `types.ts` | 类型定义：`MemoryDomain`、`MemoryRecord`、辅助函数 |
| `memory-store.ts` | `MemoryStore` 类：读写查询 API、上下文生成 |

---

## 9. 依赖关系

### 入站依赖（谁使用了 Memory）

| 消费者 | 文件 | 用途 |
|---|---|---|
| **TradingPiAgent** | `agent/trading-pi-agent.ts` | 注入 memory 到 deps；`contextBlock()` 注入 prompt（transformContext / prepareNextTurn） |
| **DeepResearch** | `research/deep-research.ts` | 研究完成后写入 `research` 域记忆 |
| **Skills Types** | `skills/types.ts` | SkillContext 中声明 memory 依赖 |
| **DefaultWorkflows** | `workflows/default-workflows.ts` | alpha/trade/review/user_rules 各工作流的读写 |
| **DefaultSkills** | `skills/default-skills.ts` | research/trade/workspace/strategy/market/user_rules 各技能的读写 |

### 出站依赖（Memory 依赖了什么）

| 提供者 | 用途 |
|---|---|
| **Repositories** (`db/repositories.ts`) | 底层数据访问：`writeMemory()`、`queryMemory()`、`deleteMemory()`、`upsertMemory()` |

---

## 10. 与 Agent Prompt 的集成

Memory 通过 `contextBlock()` 方法将持久化记忆注入 Agent 的系统提示中，确保跨会话的知识连续性。

### 注入点一：transformContext（消息变换）

**文件**: `agent/trading-pi-agent.ts:113-117`

在每轮对话的消息列表中插入 memory 快照：

```typescript
contextMessages.push({
  role: "user",
  content: `Local memory snapshot:\n${this.deps.memory.contextBlock("user")}`,
  timestamp: Date.now(),
});
```

- **时机**: 每次调用 LLM 前
- **scope**: `"user"`
- **位置**: 在 compaction summary 之后、实际用户消息之前

### 注入点二：prepareNextTurn（下一轮准备）

**文件**: `agent/trading-pi-agent.ts:120-131`

在 `prepareNextTurn` 回调中刷新 memory 上下文：

```typescript
const memoryContext = this.deps.memory.contextBlock("user");
return {
  context: {
    systemPrompt: agentSystemPrompt,
    messages: [{
      role: "user",
      content: `--- Context refresh ---\nSession: ${session.id}\nMemory:\n${memoryContext}`,
    }],
  },
};
```

- **时机**: 准备下一轮对话时
- **用途**: 确保 Agent 在新轮次中能感知最新的持久化记忆

### 数据流示意

```
各工作流/技能
   │
   ▼ memory.write({ domain, key, value, importance })
   │
   ▼ SQLite (via Repositories.writeMemory)
   │
   ▼ memory.query() / memory.contextBlock()
   │
   ▼ Agent transformContext / prepareNextTurn
   │
   ▼ 注入 LLM Messages → Agent 具备跨会话记忆能力
```
