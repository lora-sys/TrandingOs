# Market Data 模块

> **路径**: `packages/core/src/market/`
>
> **职责**: 市场数据获取层 — 负责从外部 API 获取加密货币行情和预测市场数据，并返回统一格式。**不包含交易决策或策略逻辑**。

---

## 1. 模块概述

本模块是 Trading Pi OS 的市场数据采集层，采用 **双源架构**：

| 数据源 | 用途 | 子模块 |
|--------|------|--------|
| **CCXT** | 加密交易所实时行情（Ticker + K线） | `ccxt.ts` |
| **CoinGecko** | 加密资产 USD 报价（免密钥） | `coingecko.ts` |
| **Polymarket (Gamma + CLOB)** | 预测市场价格、订单簿、市场列表 | `polymarket.ts` |

### 职责边界

```
✅ 包含: 原始数据获取 → 字段标准化 → 返回结构化对象
❌ 不包含: 交易信号生成 / 策略逻辑 / 风控决策 / 订单执行
```

---

## 2. 文件地图

| 文件 | 导出函数数 | 说明 |
|------|-----------|------|
| `ccxt.ts` | 2 | CCXT 统一交易所接口：Ticker 行情 + OHLCV K线 |
| `coingecko.ts` | 1 | CoinGecko 免密钥 USD 报价 |
| `polymarket.ts` | 5 (+12 类型) | Polymarket 预测市场：列表/详情/价格/订单簿/搜索 |

---

## 3. 子模块详解

### 3a) CCXT — 加密交易所行情 (`ccxt.ts`)

依赖 **ccxt** npm 包，通过动态实例化目标交易所类获取数据。

#### 函数签名

| 函数 | 签名 | 返回类型 |
|------|------|----------|
| `fetchCcxtTicker` | `(exchangeId: string, symbol: string) => Promise<CcxtTickerResult>` | 单一 Ticker 对象 |
| `fetchCcxtOhlcv` | `(exchangeId: string, symbol: string, timeframe?: string, limit?: number) => Promise<CcxtOhlcvResult>` | 含 rows[] 的 K线结果 |

#### `fetchCcxtTicker` 返回类型

```typescript
{
  source: "ccxt";
  exchange: string;       // 如 "binance", "okx"
  symbol: string;         // 如 "BTC/USDT"
  last: number | null;
  bid: number | null;
  ask: number | null;
  high: number | null;
  low: number | null;
  percentage: number | null; // 24h 涨跌幅 %
  timestamp: number;
  datetime: string;        // ISO 8601
}
```

#### `fetchCcxtOhlcv` 返回类型

```typescript
{
  source: "ccxt";
  exchange: string;
  symbol: string;
  timeframe: string;       // 默认 "1h"
  rows: Array<{
    timestamp: number;     // Unix ms
    datetime: string;      // ISO 8601
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}
```

**默认参数**: `timeframe = "1h"`, `limit = 24`

**注意**: 每个调用都会新建 Exchange 实例（`enableRateLimit: true`），无连接池复用。

---

### 3b) CoinGecko — 免密钥报价 (`coingecko.ts`)

使用 CoinGecko Public API v3 的 `/simple/price` 端点，无需 API Key。

#### 函数签名

| 函数 | 签名 | 返回类型 |
|------|------|----------|
| `fetchCoinGeckoQuote` | `(symbol: string, signal?: AbortSignal) => Promise<CoinGeckoQuoteResult>` | 报价对象 |

#### 返回类型

```typescript
{
  source: "coingecko";
  symbol: string;          // 用户传入原始符号，如 "BTC" 或 "BTC/USDT"
  assetId: string;         // CoinGecko 内部 ID，如 "bitcoin", "ethereum"
  priceUsd: number;
  change24h: number | null;
  fetchedAt: string;       // ISO 8601
}
```

#### 符号映射表 (`mapSymbol`)

内部将常见交易符号映射为 CoinGecko ID：

| 输入 | 映射后 |
|------|--------|
| btc / BTC | bitcoin |
| eth / ETH | ethereum |
| sol / SOL | solana |
| bnb / BNB | binancecoin |
| xrp / XRP | ripple |
| doge / DOGE | dogecoin |

未命中映射时直接使用小写符号作为 ID。

#### 超时配置

- 使用 `DATA_SOURCE_TIMEOUTS.coingecko = 15_000`（15 秒）
- 支持 `AbortSignal` 外部取消

---

### 3c) Polymarket — 预测市场 (`polymarket.ts`)

最复杂的子模块，同时对接 **Gamma API**（元数据/市场列表）和 **CLOB API**（订单簿/实时价格）。

#### API 端点

| 用途 | Base URL | 端点 | 方法 |
|------|----------|------|------|
| 市场列表 | `https://gamma-api.polymarket.com` | `GET /markets` | Gamma API |
| 市场搜索 | 同上 | `GET /public-search?q=...` | Gamma API |
| 单市场详情 | 同上 | `GET /markets/:id` | Gamma API |
| Token 价格 | `https://clob.polymarket.com` | `GET /price?token_id=&side=buy` | CLOB API |
| 订单簿 | 同上 | `GET /book?token_id=` | CLOB API |

#### 默认超时: `30_000` ms（30 秒）

#### 导出函数签名

| 函数 | 签名 | 说明 |
|------|------|------|
| `getPolymarketMarkets` | `(options?: PolymarketListOptions, signal?) => Promise<PolymarketMarket[]>` | 列表查询，支持分类/关键词过滤 |
| `searchPolymarketMarkets` | `(query: string, limit?, signal?) => Promise<PolymarketMarket[]>` | 关键词搜索，失败回退到 markets 过滤 |
| `getPolymarketMarket` | `(conditionIdOrId: string, signal?) => Promise<PolymarketMarket>` | 单市场详情，失败自动搜索兜底 |
| `getPolymarketPrice` | `(conditionIdOrId: string, signal?) => Promise<PolymarketPrice>` | YES/NO 实时价格（CLOB 优先） |
| `getPolymarketOrderbook` | `(conditionIdOrId: string, signal?) => Promise<PolymarketOrderbook>` | YES Token 订单簿深度 |

#### 核心类型定义

```typescript
type PolymarketCategory = "sports" | "politics" | "crypto" | "macro" | "entertainment" | "other";

interface PolymarketListOptions {
  active?: boolean;     // 默认 true
  closed?: boolean;     // 默认 false
  category?: string;
  limit?: number;       // 默认 50
  offset?: number;      // 默认 0
  q?: string;           // 关键词搜索
}

interface PolymarketMarket {
  id: string;
  conditionId: string;
  question: string;
  slug?: string;
  category: PolymarketCategory;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  change24h: number | null;
  endDate: string | null;
  outcomes: string[];
  outcomePrices: number[];
  tokens: PolymarketToken[];
  event?: PolymarketEvent;
  raw: unknown;          // 原始 API 响应，保留用于调试
}

interface PolymarketPrice {
  conditionId: string;
  yes: number | null;
  no: number | null;
  tokens: Array<{ tokenId: string; outcome: string; price: number | null }>;
  fetchedAt: string;
}

interface PolymarketOrderbook {
  conditionId: string;
  tokenId: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  minOrderSize?: string;
  tickSize?: string;
  raw: unknown;
  fetchedAt: string;
}
```

#### 数据标准化策略 (`normalizeMarket`)

Polymarket Gamma API 返回字段命名不一致（驼峰/蛇形混用），模块内部做了大量兼容处理：

- **ID 字段**: 尝试 `id` → `marketId` → `conditionId` → `condition_id`
- **价格字段**: 尝试 `volumeNum` → `volume` → `volume24hr` → `volume24hrClob`
- **数组字段**: 支持原生数组、JSON 字符串、逗号分隔字符串三种格式
- **分类推断**: 根据文本关键词自动归入 6 大类别

---

## 4. 数据流图

```
┌─────────────┐    Skill 调用     ┌──────────────────┐   HTTP/Fetch   ┌──────────────────┐
│  AI Agent   │ ──────────────→ │  market/*.ts 函数  │ ───────────→  │  外部 API         │
│  (Workflow) │                 │                  │                │                   │
└─────────────┘                 └────────┬─────────┘                ├─ CoinGecko API    │
                                         │                          ├─ CCXT (多交易所)   │
                                         │ 标准化返回               ├─ Gamma API         │
                                         ↓                          └─ CLOB API          │
                                ┌──────────────────┐                                │
                                │  结构化 Result    │ ←───────────────────────────────┘
                                └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ↓                    ↓                     ↓
            ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
            │ DB 缓存写入    │  │ 直接返回给 Skill │  │ 写入 Cache 层     │
            │ market_prices  │  │ (AI 可消费)      │  │ search_cache      │
            │ market_ohlcv   │  │                  │  │                   │
            └───────────────┘  └─────────────────┘  └──────────────────┘
```

### 具体消费链路

| Skill ID | 调用的 market 函数 | 缓存策略 |
|----------|-------------------|----------|
| `market.coingecko.quote` | `fetchCoinGeckoQuote()` | `withCacheStrategy`: 先查 `market_prices` 表，60s TTL 后刷新 |
| `market.ccxt.ticker` | `fetchCcxtTicker()` | 通过 `withCacheStrategy` 缓存到 `market_prices` |
| `market.ccxt.ohlcv` | `fetchCcxtOhlcv()` | 写入 `market_ohlcv` 表 |
| `market.polymarket.markets` | `getPolymarketMarkets()` | `search_cache` 表，namespace=`polymarket`，60s TTL |
| `market.polymarket.detail` | `getPolymarketMarket()` + `getPolymarketOrderbook()` | 无缓存（实时） |
| `market.polymarket.price` | `getPolymarketPrice()` | 无缓存（实时） |
| `market.polymarket.search` | `searchPolymarketMarkets()` | 无缓存 |

---

## 5. 数据库缓存 Schema

所有表定义位于 `packages/core/src/db/database.ts`。

### `market_prices` — 价格缓存表

```sql
CREATE TABLE IF NOT EXISTS market_prices (
  id              TEXT PRIMARY KEY,
  symbol          TEXT NOT NULL,
  exchange        TEXT,             -- 交易所标识，如 "binance", "coingecko"
  source          TEXT NOT NULL,    -- 数据来源: "ccxt" | "coingecko"
  price_usd       REAL,
  change_24h      REAL,
  bid             REAL,
  ask             REAL,
  last            REAL,
  high            REAL,
  low             REAL,
  volume          REAL,
  extra_json      TEXT,             -- 扩展字段 JSON（如 CoinGecko assetId）
  fetched_at      TEXT NOT NULL     -- ISO 8601
);

-- 索引
CREATE INDEX idx_market_prices_symbol ON market_prices(symbol, fetched_at DESC);
```

### `market_ohlcv` — K线持久化表

```sql
CREATE TABLE IF NOT EXISTS market_ohlcv (
  id              TEXT PRIMARY KEY,
  symbol          TEXT NOT NULL,
  exchange        TEXT,
  timeframe       TEXT NOT NULL,    -- "1m", "5m", "15m", "1h", "4h", "1d" 等
  timestamp       INTEGER NOT NULL, -- Unix ms（K线开盘时间）
  open            REAL NOT NULL,
  high            REAL NOT NULL,
  low             REAL NOT NULL,
  close           REAL NOT NULL,
  volume          REAL DEFAULT 0,
  fetched_at      TEXT NOT NULL
);

-- 索引
CREATE INDEX idx_market_ohlcv_symbol ON market_ohlcv(symbol, timeframe, timestamp DESC);
```

---

## 6. 依赖关系

### 上游依赖（本模块导入）

| 依赖 | 来源 | 用途 |
|------|------|------|
| `ccxt` | npm 包 | CCXT 交易所统一接口 |
| `DATA_SOURCE_TIMEOUTS` | `../config/timeouts.js` | 各数据源超时常量（仅 coingecko 使用） |

### 下游消费者（谁调用了 market 模块）

| 消费者文件 | 调用方式 |
|-----------|---------|
| `skills/default-skills.ts` | **主要消费者** — 将 market 函数包装为 Skill 注册项 |
| `index.ts` | Barrel export：`export * from "./market/coingecko.js"` 和 `export * from "./market/polymarket.js"` |

> **注意**: `ccxt.ts` 未在 `index.ts` 中 barrel export，仅被 `default-skills.ts` 直接 import。

---

## 7. 错误处理模式

三个子模块采用统一的错误处理策略：

### 通用模式

```
try {
  const result = await fetch(url, { signal, timeout });
  if (!response.ok) throw new Error(`HTTP ${status}`);
  return normalize(response.json());
} catch (error) {
  // 不同子模块的降级策略不同：
}
```

### 各子模块具体策略

| 子模块 | 错误行为 | 降级/兜底 |
|--------|---------|-----------|
| **ccxt.ts** | 交易所不存在时 `throw Error`；网络错误直接抛出 | **无兜底** — 错误上抛给 Skill 层处理 |
| **coingecko.ts** | HTTP 非 200 或缺少 quote 时 `throw Error`；超时由 `AbortController` 触发 | **无兜底** — 但有超时保护（15s） |
| **polymarket.ts** | 多层防御：<br>① `searchPolymarketMarkets`: 搜索 API 失败 → 回退到 `getPolymarketMarkets({q})` 本地过滤<br>② `getPolymarketMarket`: 直接查询失败 → 回退到搜索匹配<br>③ `getTokenPrice`: 单 token 价格获取失败 → `catch(() => null)` 用 Gamma 价格填充<br>④ `getPolymarketOrderbook`: 在 Skill 层 `.catch()` 返回 error 对象而非崩溃 | **强兜底** — Polymarket 因网络环境不稳定，设计了完整的 fallback 链 |

### 超时与取消

| 子模块 | 超时值 | 取消支持 |
|--------|--------|---------|
| ccxt.ts | 由 CCXT 内部 `enableRateLimit` 控制 | 不支持 `AbortSignal` |
| coingecko.ts | `DATA_SOURCE_TIMEOUTS.coingecko` = **15,000ms** | ✅ 支持 `AbortSignal` |
| polymarket.ts | `DEFAULT_TIMEOUT_MS` = **30,000ms** | ✅ 支持 `AbortSignal` |

---

## 8. 使用示例

```typescript
import { fetchCoinGeckoQuote } from "@/market/coingecko";
import { fetchCcxtTicker, fetchCcxtOhlcv } from "@/market/ccxt";
import {
  getPolymarketMarkets,
  getPolymarketPrice,
  getPolymarketOrderbook,
  searchPolymarketMarkets,
} from "@/market/polymarket";

// CoinGecko 报价
const btcQuote = await fetchCoinGeckoQuote("BTC");
// => { source: "coingecko", symbol: "BTC", assetId: "bitcoin", priceUsd: 67500, ... }

// CCXT Ticker
const ticker = await fetchCcxtTicker("binance", "BTC/USDT");
// => { source: "ccxt", exchange: "binance", last: 67500, bid: 67499, ask: 67501, ... }

// CCXT K线
const ohlcv = await fetchCcxtOhlcv("binance", "BTC/USDT", "4h", 48);
// => { rows: [{ timestamp, open, high, low, close, volume }, ...] }

// Polymarket 市场列表
const cryptoMarkets = await getPolymarketMarkets({ category: "crypto", limit: 20 });

// Polymarket 搜索
const results = await searchPolymarketMarkets("Bitcoin price");

// Polymarket 实时价格
const price = await getPolymarketPrice("0xabc...");
// => { yes: 0.65, no: 0.34, tokens: [...] }

// Polymarket 订单簿
const book = await getPolymarketOrderbook("0xabc...");
// => { bids: [{ price: 0.64, size: 1000 }, ...], asks: [...] }
```
