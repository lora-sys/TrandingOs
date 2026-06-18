# Journal + Strategy 模块文档

> 本文档描述 Trading Pi OS 中 **Journal（交易日志）** 与 **Strategy（策略定义与评分）** 两个核心领域模块的接口、数据模型及跨模块关系。

---

## Part A：Journal 模块

### 1. 模块目的

Journal 模块负责**交易决策的行为日志记录**。每笔交易（实盘或模拟盘）在结算时，系统会生成一条 Journal Entry，捕获交易者当时的主观状态（情绪、纪律评分、违规规则）和客观关联（关联的交易、计划、截图），为后续 Review（复盘）和 Evolution（策略演进）提供定性数据输入。

**源文件**: `packages/core/src/journal.ts`

---

### 2. 核心类型

#### `JournalEntryInput`

Journal 条目的输入接口，所有字段均为可选（除 `notes`），由调用方按需填充：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tradeId` | `string \| undefined` | 否 | 关联的实盘交易 ID |
| `planArtifactId` | `string \| undefined` | 否 | 关联的计划产物 ID |
| `mood` | `string \| undefined` | 否 | 交易时的情绪描述（自由文本） |
| `disciplineScore` | `number \| undefined` | 否 | 纪律自评分数，0–100 |
| `rulesViolated` | `string[] \| undefined` | 否 | 本次交易违反的规则列表 |
| `notes` | `string` | **是** | 自由笔记，必填 |
| `screenshotPath` | `string \| undefined` | 否 | 截图文件路径 |

#### `normalizeJournalInput(input)`

输入标准化函数，执行以下校验/钳位逻辑：

| 字段 | 处理规则 |
|------|----------|
| `disciplineScore` | 钳位至 `[0, 100]` 区间；未提供时默认 `0` |
| `rulesViolated` | 未提供时默认空数组 `[]` |
| 其余字段 | 原样透传（spread 合并） |

---

### 3. 数据库 Schema：`journal_entries` 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 全局唯一 ID |
| `session_id` | TEXT | — | 所属会话 |
| `workspace_id` | TEXT | — | 所属工作区 |
| `decision_id` | TEXT | → decisions.id | 关联的交易决策 |
| `paper_trade_id` | TEXT | → paper_trades.id | 关联的模拟盘交易 |
| `trade_id` | TEXT | → trades.id | 关联的实盘交易 |
| `plan_artifact_id` | TEXT | → artifacts.id | 关联的交易计划产物 |
| `mood` | TEXT | — | 情绪文本 |
| `discipline_score` | INTEGER | NOT NULL DEFAULT 0 | 纪律评分（0–100） |
| `rules_violated_json` | TEXT | NOT NULL | 违规规则列表（JSON 序列化） |
| `notes` | TEXT | NOT NULL | 笔记内容 |
| `screenshot_path` | TEXT | — | 截图路径 |
| `artifact_id` | TEXT | → artifacts.id | 关联的日志产物（如有） |
| `created_at` | TEXT | NOT NULL | 创建时间 |

#### 外键关联关系图

```
journal_entries
├── decision_id       → decisions
├── paper_trade_id    → paper_trades      (paper_trades.journal_entry_id 反向指向)
├── trade_id          → trades
├── plan_artifact_id  → artifacts         (计划类产物)
└── artifact_id       → artifacts         (日志本身生成的产物)
```

---

### 4. 谁写入 Journal Entry

Journal 条目由 **`paper.trade.lifecycle` 工作流在交易结算（settlement）阶段自动创建**。具体流程：

1. 用户通过决策（Decision）发起模拟盘交易（Paper Trade）
2. 交易进入 open → closed/settled 生命周期
3. 结算时工作流收集：PnL 数据、用户填写的 mood / discipline score / notes
4. 调用 `normalizeJournalInput()` 标准化后写入 `journal_entries` 表
5. 同时回写 `paper_trades.journal_entry_id` 建立双向关联

---

## Part B：Strategy 模块

### 1. 模块目的

Strategy 模块负责**交易策略的定义、版本管理与综合评分**。一个 Strategy 包含一组可配置参数（如止损比例、仓位大小公式等）以及其生命周期状态。模块提供统一的评分函数，将胜率、盈亏比和纪律评分加权合成为单一策略得分，用于策略比较和筛选。

**源文件**: `packages/core/src/strategy.ts`

---

### 2. 核心类型

#### `StrategyDefinition`

策略定义接口：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string \| undefined` | 否 | 策略唯一 ID（新建时由数据库生成） |
| `name` | `string` | **是** | 策略名称 |
| `version` | `string \| undefined` | 否 | 版本号（如 `"1.0.0"`） |
| `parameters` | `Record<string, string \| number \| boolean>` | **是** | 策略参数键值对（如 `{ stopLoss: 0.02, riskPerTrade: 0.01 }`） |
| `status` | `"draft" \| "testing" \| "verified" \| "deprecated" \| undefined` | 否 | 策略生命周期状态 |

#### `scoreStrategy(input)`

策略综合评分函数。

**输入参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `winRate` | `number \| undefined` | `0` | 胜率（0–1 或 0–100 百分比均可，内部按原始值使用） |
| `rewardRisk` | `number \| undefined` | `0` | 盈亏比 R:R，上限钳位至 5.0 |
| `disciplineScore` | `number \| undefined` | `0` | 纪律评分（0–100） |

**输出**：`number` — 四舍五入到整数的综合得分（0–100）

**加权公式**：

```
score = round( (winRate × 0.40 + normalized_R:R × 0.25 + normalized_discipline × 0.25) × 100 )

其中：
- winRate 权重 = 40%
- rewardRisk 归一化 = min(rewardRisk, 5) / 5   权重 = 35%
- discipline 归一化 = disciplineScore / 100        权重 = 25%
```

> **注意**：`winRate` 直接参与计算未做归一化，调用方需确保传入 0–1 范围的小数或百分比形式一致。

---

### 3. 数据库 Schema：`strategies` 表

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 策略唯一 ID |
| `name` | TEXT | NOT NULL | 策略名称 |
| `version` | TEXT | NOT NULL | 版本号 |
| `status` | TEXT | NOT NULL | 生命周期状态（draft/testing/verified/deprecated） |
| `parameters_json` | TEXT | NOT NULL | 参数 JSON 序列化 |
| `score` | REAL | NOT NULL DEFAULT 0 | 综合得分（由 `scoreStrategy()` 计算） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

#### 关联表

| 表名 | 关联字段 | 说明 |
|------|----------|------|
| `backtests` | `strategy_id` → strategies.id | 该策略的历史回测记录 |
| `evolution_proposals` | `strategy_id` → strategies.id | 针对该策略的演进提案 |

---

### 4. 谁使用 Strategies

| 使用场景 | 工作流 | 说明 |
|----------|--------|------|
| 回测评估 | `strategy.backtest` | 用历史数据运行策略参数，产出 metrics 写入 `backtests` 表 |
| 策略演进 | `evolution.propose` | 基于 Review 结果生成参数调整提案，写入 `evolution_proposals` 表 |
| 评分计算 | `scoreStrategy()` | 在回测完成后或 Review 阶段被调用，更新 `strategies.score` |

---

### 5. 状态生命周期

```
draft ──► testing ──► verified ──► deprecated
  │          │              │
  │          ▼              ▼
  │     (回测不通过)    (新版本替代)
  └───────┘
```

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| `draft` | 草稿 | 策略刚创建，参数待定 |
| `testing` | 测试中 | 已提交回测，等待验证结果 |
| `verified` | 已验证 | 回测指标达标，可用于实盘参考 |
| `deprecated` | 已废弃 | 有更优版本替代或策略失效 |

---

## Part C：跨模块关系

### Journal → Review → Evolution → Strategy 数据流

```
┌─────────────┐     聚合      ┌─────────────┐     生成      ┌───────────────────┐
│  Journal     │ ──────────►  │  Review      │ ──────────►  │ Evolution          │
│  Entries     │  discipline  │  (复盘报告)   │  Suggestions │  Suggestions       │
│  (行为日志)   │  score 汇总  │              │  (改进建议)   │                    │
└─────────────┘              └─────────────┘              └────────┬──────────┘
                                                                    │
                                                                    ▼ 更新参数
                                                             ┌─────────────┐
                                                             │  Strategy    │
                                                             │  (策略定义)   │
                                                             └─────────────┘
```

### 具体关系说明

| 关系链路 | 数据流向 | 说明 |
|----------|----------|------|
| **Journal → Review** | `journal_entries.discipline_score` → `reviews.discipline_score` | Review 工作流聚合一段时间内所有 Journal Entry 的 discipline_score，计算出该周期的平均纪律评分，写入 reviews 表 |
| **Review → Evolution** | `reviews.report_json` → `evolution_suggestions` | 复盘报告分析纪律短板和模式问题，生成结构化的改进建议（含类别、优先级、目标规则文本） |
| **Evolution → Strategy** | `evolution_proposals.proposal_json` → `strategies.parameters_json` | 演进提案经审批后，可能修改现有 Strategy 的参数或创建新版本 Strategy |
| **Strategy ← 定量 + 定性** | `backtests.metrics_json` + `reviews.discipline_score` → `scoreStrategy()` | 策略评分同时融合定量指标（来自回测的 winRate、rewardRisk）和定性指标（来自 Journal/Review 的 disciplineScore），实现"人+系统"的综合评价 |

### 关键设计原则

1. **Journal 是定性数据的源头** — 每条 Journal Entry 捕获的是单次交易的"人的因素"，不可由系统自动生成
2. **Review 是聚合层** — 将分散的 Journal Entries 汇总为周期性的复盘洞察
3. **Evolution 是行动层** — 将 Review 洞察转化为可执行的策略变更提案
4. **Score 是统一标尺** — `scoreStrategy()` 用固定权重将定量与定性维度归一化为可比分数，支撑策略排序和淘汰决策
