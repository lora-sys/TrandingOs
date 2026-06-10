# Spec B — Engines Layer (核心引擎层)

> **推进式验证:** 每个引擎可独立验证。全部完成后，/research ETH 可整合 4 个数据源输出研究报告。

---

## 子系统索引

| # | 子系统 | 前置依赖 | 完成后可验证 |
|---|--------|---------|-------------|
| B.1 | Memory Engine 源码重建 | A.1 | memory read/write/query 三大接口工作 |
| B.2 | Search Hub 源码重建 | A.3 (Exa MCP) | search.query 整合 Exa/Jina/Tavily |
| B.3 | Research Hub 源码重建 | B.1 + B.2 | /research ETH 整合 4 源，出报告 |
| B.4 | Workspace System 完善 | B.1 | workspace-scoped 隔离可用 |

---

## B.1 — Memory Engine 源码重建

### 目标
重建 `packages/memory-engine/` 源码（当前只有 dist/），实现 domain-scoped 读写查询、重要性裁剪、对话自动总结。

### 背景
当前 memory 功能实现在 `packages/core/src/memory/memory-store.ts` 中，是一个薄 SQLite KV 封装（LIKE 查询）。`packages/memory-engine/` 只有类型定义和格式化函数，无实际引擎逻辑。

### 架构变更

#### 新增源码：`packages/memory-engine/`
```
packages/memory-engine/
  package.json
  tsconfig.json
  src/
    index.ts         # 主入口，导出 MemoryEngine
    store.ts         # 存储层（SQLite + JSONL 归档）
    query.ts         # 查询引擎（域过滤 + 重要性排序 + 文本搜索）
    consolidate.ts   # 合并/裁剪策略
    types.ts         # MemoryDomain, MemoryRecord
```

#### MemoryEngine 接口
```typescript
export type MemoryDomain = "conversation" | "market" | "trade" | "review" | "skill" | "workspace" | "research" | "strategy";

export interface MemoryRecord {
  id: string;
  domain: MemoryDomain;
  key: string;
  value: string;
  workspaceId?: string;
  importance: number;       // 0.0 ~ 1.0
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class MemoryEngine {
  constructor(private db: Database) {}
  
  // 写入记忆（自动去重）
  async write(record: Omit<MemoryRecord, "id" | "createdAt">): Promise<string>

  // 查询记忆（域 + 工作区 + 文本搜索 + 重要性过滤）
  async query(params: {
    domain?: MemoryDomain;
    workspaceId?: string;
    q?: string;         // LIKE 文本搜索
    minImportance?: number;
    limit?: number;
  }): Promise<MemoryRecord[]>

  // 获取域上下文（格式化为 Agent 提示块）
  async domainContext(domain: MemoryDomain, workspaceId?: string): Promise<string>
  async workspaceContext(workspaceId: string): Promise<string>

  // 合并/裁剪（低重要性 + 超过 TTL 的归档到 JSONL）
  async consolidate(): Promise<{ archived: number; deleted: number }>

  // 对话总结（总结最近的域记录为单个精华条目）
  async summarizeConversation(sessionId: string): Promise<string>
}
```

### 裁剪策略
- `importance < 0.3` 且创建超过 30 天 → 归档到 `.trading-pi/memory/archive.ndjson`

### 数据模型（已有表 `memory_records`，无需新增）
```sql
CREATE TABLE memory_records (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  workspace_id TEXT,
  importance REAL DEFAULT 0.5,
  source_type TEXT,
  source_id TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_memory_domain ON memory_records(domain, workspace_id, importance DESC);
CREATE INDEX idx_memory_search ON memory_records(domain, key);
```

### 预置记忆域
| Domain | 自动写入场景 | 重要性 |
|--------|-------------|--------|
| conversation | 每次 AI 对话 | 0.5 |
| market | market.snapshot skill | 0.6 |
| trade | paper.order.create | 0.7 |
| review | review.daily workflow | 0.7 |
| skill | 每次 skill 执行 | 0.4 |
| workspace | workspace.create | 0.8 |
| research | research.asset workflow | 0.6 |
| strategy | strategy.lifecycle | 0.7 |

### 验收标准 (B.1)
- [ ] `memory.write(domain, key, value)` 成功写入并返回 id
- [ ] `memory.query({ domain: "trade" })` 返回该域所有记录
- [ ] `memory.query({ q: "BTC" })` 返回包含 BTC 的记录
- [ ] `memory.consolidate()` 将低重要性老记录归档
- [ ] `memory.domainContext("trade")` 返回格式化字符串（Agent 可用）
- [ ] **无向量数据库依赖** — 继续使用 SQLite

### E2E 测试
```bash
# 写入记忆
curl -X POST http://localhost:8787/api/memory/write \
  -H 'Content-Type: application/json' \
  -d '{"domain":"trade","key":"btc-breakout","value":"BTC broke resistance at 70k","importance":0.8}'

# 查询记忆
curl -X POST http://localhost:8787/api/memory/query \
  -H 'Content-Type: application/json' \
  -d '{"domain":"trade","q":"BTC"}'
# 验证: 返回包含 BTC 的记录

# 域上下文
curl http://localhost:8787/api/memory/context?domain=trade
# 验证: 返回格式化的文本块
```

### 前置依赖
- A.1（项目清理完成）

---

## B.2 — Search Hub 源码重建

### 目标
重建 `packages/search-hub/` 源码，通过 MCP 协议集成 Exa（已由 A.3 完成），保留 Tavily + Jina 作为 fallback provider，统一抽象层使上层（Research Hub）不感知底层 provider 切换。支持多 provider 并行搜索 + 结果合并 + 自动降级。

> **决策记录:** Exa 作为主 provider。Tavily + Jina 保留为 fallback，当 Exa 不可用或 key 过期时自动降级。Search Hub 提供统一接口，上层不感知 provider 切换。

### 架构变更

#### 新增源码：`packages/search-hub/`
```
packages/search-hub/
  package.json
  tsconfig.json
  src/
    index.ts        # 主入口，导出 SearchHub
    providers.ts    # 搜索提供商适配器
    cache.ts        # 结果缓存（基于 data_cache 表）
    types.ts        # 类型定义
```

#### SearchHub 接口
```typescript
export type SearchProvider = "exa" | "tavily" | "jina" | "free";

export interface SearchOptions {
  query: string;
  limit?: number;
  providers?: SearchProvider[];
}

export interface SearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
  provider: SearchProvider;
}

export class SearchHub {
  constructor(private config: {
    exaApiKey?: string;
    tavilyApiKey?: string;
    jinaApiKey?: string;
  }) {}

  // 多 provider 并行搜索（按配置可用 provider 并行请求）
  async query(options: SearchOptions): Promise<{
    results: SearchResult[];
    providerStatus: Record<SearchProvider, "success" | "unavailable" | "failed">;
    cached: boolean;
  }>

  // 提取 URL 内容（通过 Jina Reader 或浏览器）
  async extract(url: string): Promise<{ content: string; provider: string }>

  // 缓存管理
  clearCache(): void
}
```

### 搜索降级策略
1. 并行请求所有已配置的 provider
2. 最快返回的优先
3. 某 provider 失败 → 不影响其他
4. 全部失败 → 返回空结果 + `providerStatus: { exa: "failed", ... }`
5. 结果去重（相同 URL 只保留一个）

### 缓存策略
- 缓存键: `search:${provider}:${query}:${limit}`
- TTL: 15 分钟（市场数据）/ 60 分钟（一般搜索）
- 基于 `data_cache` 表

### 验收标准 (B.2)
- [ ] Exa 搜索返回结果（前提：Exa MCP 已连接）
- [ ] 多 provider 并行搜索返回合并结果
- [ ] 某 provider 失败时不影响其他 provider
- [ ] 搜索结果去重（同一 URL 不重复）
- [ ] 缓存命中时返回 `cached: true`

### E2E 测试
```bash
# Exa 搜索
curl -X POST http://localhost:8787/api/search/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"BTC ETF latest news","providers":["exa"]}'
# 验证: 返回 results[]，每项有 title/url/content

# 缓存验证（第二次请求应更快并标记 cached）
time curl -X POST http://localhost:8787/api/search/query ...
# 第二次应明显更快
```

### 前置依赖
- A.1（项目清理）
- A.3（Exa MCP 连接）

---

## B.3 — Research Hub 源码重建

### 目标
重建 `packages/research-hub/` 源码，整合 Search Hub + Browser Layer + Memory + Market 数据源，构建完整的 ResearchBundle 并生成 Research Artifact。

### 架构变更

#### ResearchBundle 数据流
```
/research ETH
  → ResearchHub.buildBundle("ETH", sessionId)
    → Market data (CoinGecko / CCXT)        [并行]
    → Search results (Exa via SearchHub)     [并行]
    → Browser extraction (BrowserLayer)      [并行]
    → Memory context (MemoryEngine)          [并行]
  → 合并 → 输出 ResearchBundle
  → AI 生成 Research Report artifact
```

#### 源码新增
```
packages/research-hub/
  package.json
  tsconfig.json
  src/
    index.ts        # 主入口，导出 ResearchHub
    bundle.ts       # ResearchBundle 构建器
    sources.ts      # 数据源适配器
    types.ts        # 类型定义
```

#### ResearchHub 接口
```typescript
export interface ResearchBundle {
  symbol: string;
  market: { priceUsd: number; change24h: number | null; source: string } | null;
  searchResults: SearchResult[];
  browserExtracts: string[];
  memory: MemoryRecord[];
  sourceQuality: { completed: number; total: number; score: number };
  composedAt: string;
}

export class ResearchHub {
  constructor(
    private searchHub: SearchHub,
    private browserLayer: BrowserLayer,
    private memory: MemoryEngine,
    private market: { coingecko: (s: string) => Promise<any>; ccxt: (s: string) => Promise<any> }
  ) {}

  // 构建研究包（所有数据源并行获取）
  async buildBundle(symbol: string, workspaceId?: string): Promise<ResearchBundle>

  // 生成研究报告（调用 AI 基于 bundle 生成）
  async generateReport(bundle: ResearchBundle): Promise<{
    report: string;  // markdown
    summary: string;
    riskLevel: "low" | "medium" | "high";
  }>
}
```

### 验收标准 (B.3)
- [ ] ResearchBundle 包含 market + search + browser + memory 数据
- [ ] 某数据源失败时 bundle 中包含失败原因而非崩溃
- [ ] `/research ETH` 输出 Research Artifact（markdown）
- [ ] Research Artifact 包含 Market Snapshot / Source Quality / Thesis / Risks

### E2E 测试
```bash
# 研究完整链路
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/research ETH"}'
# 验证: 返回 workflow 结果，包含 artifactId

# 查看 Artifact
curl http://localhost:8787/api/artifacts/{artifactId}
# 验证: content 包含 "Market Snapshot", "Source Quality", "Thesis", "Risks"
```

### 前置依赖
- B.1（Memory Engine）
- B.2（Search Hub）
- A.4（Browser Layer，用于 browser extraction）

---

## B.4 — Workspace System 完善

### 目标
Workspace 达到 "Context + Memory + Artifacts + Workflows" 四要素完整，workspace-scoped 数据隔离。

### 架构变更

#### Workspace 数据模型（数据库已存在 `workspaces` 表）
```sql
-- 已有表，确认字段完整
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,       -- "btc" | "eth" | "macro" | "custom"
  context_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- workspace_links 表（关联 artifacts/workflows）
CREATE TABLE workspace_links (
  workspace_id TEXT NOT NULL,
  artifact_id TEXT,
  workflow_run_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### Workshop CRUD 增强
- `POST /api/workspaces` — 创建 workspace（含初始 context）
- `GET /api/workspaces` — 列出所有 workspace
- `GET /api/workspaces/:id/context` — 获取完整上下文
- `GET /api/workspaces/:id/memory` — 获取该 workspace 的记忆
- `GET /api/workspaces/:id/artifacts` — 获取该 workspace 的 artifacts
- `GET /api/workspaces/:id/workflows` — 获取该 workspace 的 workflows

#### 嵌套路由（前端）
```
/workspace/:workspaceId
  /chat
  /market
  /research
  /planner
  /portfolio
  /journal
  /review
```

### 验收标准 (B.4)
- [ ] 创建 workspace 后 memory 写入自动带上 workspaceId
- [ ] `/api/workspaces/:id/memory` 只返回该 workspace 的记忆
- [ ] 不同 workspace 的数据隔离
- [ ] 前端路由支持 `/workspace/:workspaceId/research` 等嵌套路径

### E2E 测试
```bash
# 创建工作区
curl -X POST http://localhost:8787/api/workspaces \
  -H 'Content-Type: application/json' \
  -d '{"name":"ETH Research","kind":"eth","context":{"symbol":"ETH/USDT","focus":"defi"}}'

# 验证 workspace memory 隔离
curl http://localhost:8787/api/workspaces/{id}/memory
# 验证: 只返回该 workspace 关联的记忆
```

### 前置依赖
- B.1（Memory Engine — workspace 记忆隔离依赖它）

---

## Spec B 整体验证

```bash
# 所有引擎层通过
npm run check && npm run test && npm run build

# 完整研究链路
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/research ETH"}'
# 验证: Research Artifact 包含 market/search/browser/memory 四源数据
```
