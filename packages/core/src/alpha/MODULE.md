# Alpha Radar 模块

> **模块路径**: `packages/core/src/alpha/alpha-radar.ts`
> **导出方式**: 通过 `packages/core/src/index.ts` 统一导出

---

## 1. 模块用途

Alpha Radar 是 Trading Pi OS 的**后台机会扫描器**。它负责交叉引用以下多源数据，产出**时效性 Alpha 信号（Alpha Signals）**：

| 数据源 | 说明 |
|--------|------|
| Polymarket 预测市场 | 高成交量市场数据 |
| 新闻搜索 | 实时突发新闻 |
| Reddit 社区 | 社区热门讨论 |
| 日历事件 | FRED 宏观日历 + CoinMarketCal 加密事件 |

最终输出结构化的 `AlphaSignal[]`，供 Dashboard 展示和后续研究决策使用。

---

## 2. 职责边界

| ✅ 本模块负责 | ❌ 不属于本模块 |
|---|---|
| 类型定义（`AlphaSignal`、`AlphaSignalCategory`、`AlphaSignalSource`） | 数据抓取（由 `market/`、`search/`、`community/` 模块完成） |
| 文本 → 分类映射（`alphaCategory()`） | 工作流编排（在 `workflows/default-workflows.ts` 中实现） |
| 数值格式化（`formatUsd()`、`formatPercent()`） | UI 渲染（由 `apps/web` 的 `AlphaRadarCard` 组件完成） |
| 信号评分与风险评级逻辑（`scoreMarket()`、`riskFromMarket()` 定义于 workflow 文件） | 持久化写入（由 memory/cache 系统处理） |

> **核心原则**：本模块是纯类型 + 纯函数层，不包含副作用、网络请求或状态管理。

---

## 3. 核心类型与接口

### 3.1 AlphaSignalCategory

```typescript
export type AlphaSignalCategory = "sports" | "politics" | "crypto" | "macro" | "entertainment";
```

信号分类枚举，共 5 类：

| 值 | 含义 |
|----|------|
| `sports` | 体育赛事相关机会 |
| `politics` | 政治选举 / 政策相关 |
| `crypto` | 加密货币市场 |
| `macro` | 宏观经济 / FED / 经济指标 |
| `entertainment` | 娱乐 / 其他（默认兜底分类） |

### 3.2 AlphaSignalSource

```typescript
export type AlphaSignalSource = "polymarket" | "news" | "community" | "composite";
```

信号来源标识：

| 值 | 含义 |
|----|------|
| `polymarket` | 仅来自 Polymarket 市场 |
| `news` | 仅来自新闻搜索 |
| `community` | 仅来自社区（Reddit 等） |
| `composite` | 多源交叉验证后的综合信号（默认来源） |

### 3.3 AlphaSignal

```typescript
export interface AlphaSignal {
  id: string;              // 唯一标识，格式: alpha_{conditionId} 或 alpha_fallback_*
  title: string;           // 信号标题，通常为市场问题
  category: AlphaSignalCategory;  // 分类
  source: AlphaSignalSource;      // 来源
  currentValue: string;    // 当前值，如 "YES 65%" 或 "Odds pending"
  change24h: string;       // 24h 变动，如 "+5.2%" 或 "0%"
  volume: string;          // 成交量，格式化为 "$1.2M" / "$500K"
  riskRating: 1 | 2 | 3 | 4;     // 风险等级（1=低风险, 4=高风险）
  reasoning: string;       // 生成理由说明
  marketId?: string;       // 关联的市场 ID（Polymarket conditionId）
  newsUrls?: string[];     // 关联新闻链接（最多 5 条）
  redditUrls?: string[];   // 关联 Reddit 链接（最多 3 条）
  expiresAt?: string;      // 过期时间（市场结束日期）
}
```

字段分为三组：

| 分组 | 字段 | 必填 |
|------|------|------|
| **标识** | `id`, `title`, `category`, `source` | ✅ |
| **市场数据** | `currentValue`, `change24h`, `volume`, `riskRating`, `reasoning` | ✅ |
| **扩展引用** | `marketId?`, `newsUrls?`, `redditUrls?`, `expiresAt?` | ❌ 可选 |

---

## 4. 辅助函数

### 4.1 `alphaCategory(value)`

将任意文本映射为 `AlphaSignalCategory`：

```typescript
export function alphaCategory(value: string | undefined): AlphaSignalCategory
```

**匹配规则（按优先级）**：

| 关键词 | 映射到 |
|--------|--------|
| 包含 "sport" | `"sports"` |
| 包含 "politic" 或 "election" | `"politics"` |
| 包含 "crypto"、"bitcoin"、"ethereum" | `"crypto"` |
| 包含 "macro"、"fed"、"econom" | `"macro"` |
| 以上均不匹配 | `"entertainment"`（兜底） |

### 4.2 `formatUsd(value)`

将数值格式化为人类可读的 USD 表示：

```typescript
export function formatUsd(value: number): string
```

| 输入范围 | 输出示例 |
|----------|----------|
| ≥ $1,000,000 | `$1.5M` |
| ≥ $1,000 | `$500K` |
| < $1,000 | `$999` |

### 4.3 `formatPercent(value)`

将数值格式化为带符号的百分比：

```typescript
export function formatPercent(value: number | null | undefined): string
```

| 输入 | 输出 |
|------|------|
| `5.23` | `"+5.2%"` |
| `-3.1` | `"-3.1%"` |
| `0` | `"+0.0%"` |
| `null` / `undefined` / `NaN` | `"0%"` |

---

## 5. Alpha Signal 的生产流程

信号由工作流 **`alpha.radar.scan`**（定义于 `workflows/default-workflows.ts` 第 148–215 行）生产。完整流程如下：

```
┌─────────────────────────────────────────────────────────────┐
│                   alpha.radar.scan                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① Polymarket 市场扫描                                      │
│     └─ market.polymarket.markets (limit=50, active=true)    │
│        └─ 过滤: volume >= $50K                              │
│        └─ 排序: scoreMarket() 降序                           │
│        └─ 取 Top 5                                          │
│                                                             │
│  ② 新闻搜索                                                 │
│     └─ search.query ("breaking prediction markets ...")     │
│        └─ 提取 URLs (最多 5 条)                              │
│                                                             │
│  ③ Reddit 社区扫描                                         │
│     └─ community.reddit (hot, 按 category 选 subreddit)     │
│        └─ 提取 permalinks (最多 3 条)                        │
│                                                             │
│  ④ 日历事件 (并行)                                          │
│     ├─ events.fred (calendar, limit=10)                     │
│     └─ events.coinmarketcal (events, days=7)               │
│                                                             │
│  ⑤ 构建 AlphaSignal[]                                      │
│     └─ 对每个 Top5 市场映射为 AlphaSignal                    │
│        └─ category ← alphaCategory(market.category)         │
│        └─ currentValue ← YES 概率百分比                      │
│        └─ change24h ← formatPercent(change24h)              │
│        └─ volume ← formatUsd(volume)                        │
│        └─ riskRating ← riskFromMarket(market)               │
│        └─ source ← "composite"                              │
│                                                             │
│  ⑥ 兜底: 若无有效市场 → fallbackAlphaSignals()              │
│                                                             │
│  ⑦ 存储                                                     │
│     ├─ memory.write(domain="alpha", key="radar:top5")       │
│     └─ setCache(namespace="alpha", key="alpha:radar:top5")  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 评分公式：`scoreMarket()`

```typescript
// 定义于 default-workflows.ts 第 866 行
function scoreMarket(market: any): number {
  const volume = Number(market.volume ?? 0);
  const liquidity = Number(market.liquidity ?? 0);
  const change = Math.abs(Number(market.change24h ?? 0));
  return volume * 0.4 + liquidity * 0.2 + change * 1_000;
}
```

| 因子 | 权重 | 说明 |
|------|------|------|
| `volume` | × 0.4 | 成交量越高越优 |
| `liquidity` | × 0.2 | 流动性越高越优 |
| `\|change24h\|` | × 1,000 | 波动越大越值得关注 |

### 5.2 风险评级：`riskFromMarket()`

```typescript
// 定义于 default-workflows.ts 第 873 行
function riskFromMarket(market: any): 1 | 2 | 3 | 4
```

| 条件 | 风险等级 | 含义 |
|------|----------|------|
| volume > $1M **且** liquidity > $100K | **1** | 低风险 — 高流动性大市场 |
| volume > $250K | **2** | 中低风险 |
| volume > $50K | **3** | 中高风险 |
| 其他 | **4** | 高风险 — 流动性不足 |

### 5.3 兜底信号：`fallbackAlphaSignals()`

当 Polymarket 未返回足够数据时，返回单条兜底信号：

- `id`: `"alpha_fallback_research_backlog"`
- `category`: `"crypto"`
- `currentValue`: `"Data unavailable"`
- `riskRating`: `4`
- `reasoning`: 提示用户重试或手动研究

---

## 6. 存储机制

Alpha Signal 产生后通过两层存储持久化：

| 存储层 | Key | TTL | 用途 |
|--------|-----|-----|------|
| **Memory Records** | `domain="alpha"`, `key="radar:top5"` | 永久（importance=0.72） | 跨会话持久化，可被 Agent 回溯检索 |
| **Cache** | `namespace="alpha"`, `key="alpha:radar:top5"` | **5 分钟** | 快速读取，Dashboard 实时展示用 |

缓存 TTL 为 5 分钟（`ttlMs: 5 * 60_000`），确保信号的时效性。

---

## 7. 与 Dashboard 的集成

前端通过 **`AlphaRadarCard`** 组件渲染 Alpha Signal（位于 `apps/web/src/components/mvp/AlphaRadarCard.tsx`）。

### 数据映射关系

| AlphaSignal 字段 → AlphaRadarCard Props |
|-------------------------------------------|
| `title` → `title` |
| `category` → `category`（同时决定左侧边框颜色） |
| `source` → `source` |
| `currentValue` → `currentValue` |
| `change24h` → `change24h` |
| `volume` → `volume` |
| `riskRating` → `riskRating`（渲染为 1-5 星级） |
| `reasoning` → `reasoning`（最多显示 2 行截断） |

### Category 颜色映射

| Category | 左边框颜色 |
|----------|-----------|
| `sports` | cyan-300 |
| `politics` | violet-300 |
| `crypto` | emerald-300 |
| `macro` | amber-300 |
| `entertainment` | pink-300 |

组件还提供两个交互：
- **点击卡片** → `onClick` 回调（跳转详情）
- **Research this 按钮** → `onResearchClick` 回调（触发深度研究）

---

## 8. 文件地图

```
packages/core/src/
├── alpha/
│   └── alpha-radar.ts              # ★ 本模块：类型定义 + 纯函数
│
├── workflows/
│   └── default-workflows.ts        # alpha.radar.scan 工作流（第148-215行）
│                                    #   scoreMarket(), riskFromMarket(), fallbackAlphaSignals()
│
├── agents/
│   └── alpha-radar.md              # Agent 配置声明（YAML frontmatter）
│
├── index.ts                        # 统一导出 alpha/alpha-radar 的所有内容
│
apps/web/src/components/mvp/
├── AlphaRadarCard.tsx              # Dashboard 卡片组件（消费 AlphaSignal 类型）
└── index.ts                        # 导出 AlphaRadarCard
```

---

## 9. 依赖关系

### 输入依赖（上游）

| 依赖 | 方式 | 说明 |
|------|------|------|
| `market.polymarket.markets` Skill | Workflow 调用 | 提供 Polymarket 市场列表 |
| `search.query` Skill | Workflow 调用 | 提供实时新闻搜索结果 |
| `community.reddit` Skill | Workflow 调用 | 提供 Reddit 社区帖子 |
| `events.fred` Skill | Workflow 调用 | 提供宏观经济日历 |
| `events.coinmarketcal` Skill | Workflow 调用 | 提供加密货币事件日历 |

### 输出依赖（下游）

| 消费者 | 方式 | 说明 |
|--------|------|------|
| `AlphaRadarCard` 组件 | Props 传入 | Dashboard 渲染信号卡片 |
| Memory System (`memory_records`) | `write()` | 持久化 top5 信号供 Agent 检索 |
| Cache System (`setCache`) | `setCache()` | 5分钟缓存供快速读取 |
| Dashboard Page | 读取 cache | 页面加载时获取最新信号 |
