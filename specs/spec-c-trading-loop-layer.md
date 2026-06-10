# Spec C — Trading Loop Layer (交易闭环层)

> **推进式验证:** 每个子系统可独立验证。全部完成后，paper trade → journal → review → evolution 完整流转。

---

## 子系统索引

| # | 子系统 | 前置依赖 | 完成后可验证 |
|---|--------|---------|-------------|
| C.1 | Strategy Engine 源码重建 | A.1 | strategy CRUD + lifecycle 可用 |
| C.2 | Backtest 真实模拟 | C.1 | 基于 CCXT 历史数据的回测 |
| C.3 | Journal + Review 完善 | B.1 | journal entry + daily/weekly review |
| C.4 | Evolution Engine 源码重建 | C.1 + C.2 + C.3 | 完整 propose → backtest → approve → apply 循环 |

---

## C.1 — Strategy Engine 源码重建

### 目标
重建 `packages/strategy-engine/` 源码，提供策略定义、版本管理、参数校验和评分。

### 架构变更

```
packages/strategy-engine/
  package.json
  tsconfig.json
  src/
    index.ts        # 主入口，导出 StrategyEngine
    lifecycle.ts    # draft → testing → verified → deprecated
    scoring.ts      # 策略评分（胜率/风险回报/纪律）
    types.ts        # 类型定义
```

#### StrategyEngine 接口
```typescript
export type StrategyStatus = "draft" | "testing" | "verified" | "deprecated";

export interface StrategyDefinition {
  id?: string;
  name: string;
  version: string;
  status: StrategyStatus;
  parameters: Record<string, unknown>;
  score?: number;
}

export interface StrategyScore {
  overall: number;
  winRate: number;
  rewardRisk: number;
  disciplineScore: number;
}

export class StrategyEngine {
  constructor(private db: Database) {}

  // CRUD
  async create(def: StrategyDefinition): Promise<string>
  async get(id: string): Promise<StrategyDefinition | null>
  async list(filter?: { status?: StrategyStatus }): Promise<StrategyDefinition[]>
  async update(id: string, def: Partial<StrategyDefinition>): Promise<void>

  // 生命周期
  async promote(id: string, to: StrategyStatus): Promise<void>
  async deprecate(id: string): Promise<void>

  // 评分
  async score(id: string, metrics: { winRate: number; rewardRisk: number; disciplineScore: number }): Promise<StrategyScore>

  // 版本管理
  async listVersions(name: string): Promise<StrategyDefinition[]>
  async rollback(name: string, targetVersion: string): Promise<void>
}
```

#### 数据库表（已有 `strategies`，新增 `strategy_versions`）
```sql
CREATE TABLE strategy_versions (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(id),
  version TEXT NOT NULL,
  parameters_json TEXT,
  score REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 验收标准 (C.1)
- [ ] strategy.create(name, status: "draft") 成功
- [ ] strategy.promote(id, "testing") 更新状态
- [ ] strategy.score(id, metrics) 返回结构化评分
- [ ] strategy.listVersions 返回版本历史
- [ ] strategy.rollback 回到旧版本

### E2E 测试
```bash
# 创建策略
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/strategy create MA crossover ETH 1h"}'
# 验证: 返回 strategyId + score

# 策略列表
curl http://localhost:8787/api/strategies
# 验证: 包含刚创建的策略
```

### 前置依赖
- A.1

---

## C.2 — Backtest 真实模拟

### 目标
从当前 mock backtest 升级为基于 CCXT OHLCV 历史数据的真实回测模拟器。

### 架构变更

#### 当前（mock）
```typescript
// 当前 backtest.run skill
const metrics = { symbol, timeframe, mode: "sandbox", note: "Mock bridge record." };
```

#### 目标（真实模拟）
```typescript
export class BacktestEngine {
  async simulate(params: {
    strategy: StrategyDefinition;
    symbol: string;
    timeframe: "1h" | "4h" | "1d";
    startDate: string;
    endDate: string;
    initialCapital: number;
    slippage: number;  // 滑点 %
  }): Promise<BacktestResult>
}

export interface BacktestResult {
  trades: { entryTime: string; exitTime: string; direction: "long" | "short"; entryPrice: number; exitPrice: number; pnl: number }[];
  metrics: {
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
  };
  equityCurve: { time: string; equity: number }[];
}
```

#### 数据流
```
1. 获取策略参数（entry/exit 条件）
2. 通过 CCXT 获取 OHLCV 历史数据
3. 逐 K 线模拟（入场判断 → 持仓 → 出场 → 计算 PnL）
4. 记录每笔交易 + 权益曲线
5. 输出 BacktestResult
6. 创建 Backtest Report artifact
```

### 验收标准 (C.2)
- [ ] backtest.simulate 使用真实 CCXT OHLCV 数据
- [ ] 返回结果包含 equityCurve + metrics（totalReturn, maxDrawdown, sharpeRatio）
- [ ] 滑点和手续费计入 PnL 计算
- [ ] 回测结果写入 `backtests` 表
- [ ] 生成 Backtest Report artifact

### E2E 测试
```bash
# 运行回测（需 CCXT 可用）
curl -X POST http://localhost:8787/api/workflows/strategy.backtest/run \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","input":{"symbol":"ETH/USDT","timeframe":"4h"}}'
# 验证: 返回 backtestId + metrics(totalReturn, maxDrawdown, sharpeRatio)
```

### 前置依赖
- C.1

---

## C.3 — Journal + Review 完善

### 目标
Journal 支持情绪标签、纪律违规标记；Review 支持 daily/weekly/monthly 三个维度。

### 架构变更

#### Journal 增强
```typescript
// journal 情绪标签预设
export type MoodLabel = "calm" | "confident" | "anxious" | "overconfident" | "fomo" | "revenge" | "disciplined";

// journal 纪律违规预设
export type DisciplineViolation = "no_stop_loss" | "over_position" | "fomo_entry" | "revenge_trade" | "deviated_from_plan" | "held_too_long";

export interface JournalInput {
  tradeId?: string;
  planArtifactId?: string;
  mood: MoodLabel;
  disciplineScore: number;      // 0-100
  rulesViolated: DisciplineViolation[];
  notes: string;
  screenshotPath?: string;
}
```

#### Review 指标
Review 聚合以下 metrics：
```typescript
export interface ReviewMetrics {
  period: "daily" | "weekly" | "monthly";
  tradeCount: number;
  winRate: number;
  avgR: number;               // 平均 R 倍数
  maxDrawdown: number;
  disciplineScore: number;
  topMistakes: { violation: string; count: number }[];
  portfolioValue: number;
  pnl: number;
}
```

### 验收标准 (C.3)
- [ ] journal entry 支持情绪标签、纪律违规标签
- [ ] `/review-day` 输出 daily review artifact
- [ ] `/review-week` 输出 weekly review artifact（需积累数据）
- [ ] review artifact 包含 tradeCount / winRate / avgR / disciplineScore

### E2E 测试
```bash
# 创建 journal entry
curl -X POST http://localhost:8787/api/journal \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","input":{"mood":"disciplined","disciplineScore":85,"rulesViolated":[],"notes":"Good entry, followed plan"}}'

# 执行 review
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/review-day"}'
# 验证: 返回 review artifact，包含 metrics
```

### 前置依赖
- B.1（Memory Engine — review 写入 trade/review memory）

---

## C.4 — Evolution Engine 源码重建

### 目标
重建 `packages/strategy-engine/` 中的 evolution 功能（或独立 package），实现完整的 propose → backtest → compare → approve → apply/rollback 循环。

> **决策记录:** evolution.apply rollback 分两阶段实现。
> 
> **阶段 A（当前实现）:** 只记录状态变更和审计日志。apply 将策略状态从 "draft|testing" 改为 "verified|active"，记录变更到 audit_records 表。rollback 将状态恢复为前一个状态。**不修改策略的真实参数值。** 目的是先跑通审计链和审批流程，确保每条变更可追溯。
> 
> **阶段 B（后续迭代）:** 实现参数级版本管理。apply 将当前策略参数序列化保存到 strategy_versions 表，然后应用新参数。rollback 从 strategy_versions 恢复旧参数。涉及参数 schema 校验、前后对比 diff、冲突检测。**不在当前 spec 范围内。**

### 架构变更

#### Evolution 全流程
```
触发（用户命令 / 自动检测）
  ↓
Review Memory → 检测重复错误模式
  ↓
Propose Patch（策略参数调整建议）
  ↓
Backtest Patch（运行对比回测）
  ↓
Compare Metrics（before/after 对比）
  ↓
Approval Gate（用户审批）
  ↓
Apply 或 Rollback
```

#### EvolutionEngine 接口
```typescript
export interface EvolutionProposal {
  id: string;
  strategyId: string;
  strategyName: string;
  focus: string;              // 改进方向
  currentMetrics: ReviewMetrics;
  proposedChanges: Record<string, unknown>;
  backtestResult?: BacktestResult;
  comparison?: {
    metricDeltas: Record<string, number>;  // winRate: +0.05
    verdict: "improvement" | "regression" | "unchanged";
  };
  approvalId?: string;
  status: "pending" | "approved" | "rejected" | "applied" | "rolled_back";
}

export class EvolutionEngine {
  constructor(
    private memory: MemoryEngine,
    private strategy: StrategyEngine,
    private backtest: BacktestEngine
  ) {}

  // 检测改进机会（从 review/trade memory 中识别模式）
  async detectOpportunities(strategyId: string): Promise<{
    focus: string;
    reason: string;
    suggestedChanges: Record<string, unknown>;
  } | null>

  // 生成 proposal
  async propose(strategyId: string, focus?: string): Promise<EvolutionProposal>

  // 回测对比
  async backtestCompare(proposalId: string): Promise<EvolutionProposal>

  // 申请审批
  async requestApproval(proposalId: string): Promise<string>  // 返回 approvalId

  // 应用（需审批通过）
  async apply(proposalId: string): Promise<void>

  // 回滚（恢复到 apply 前的状态）
  async rollback(proposalId: string): Promise<void>
}
```

### 验收标准 (C.4)
- [ ] `evolution.propose` 检测到改进机会并创建 proposal artifact
- [ ] `evolution.backtestCompare` 输出 before/after metrics 对比
- [ ] `evolution.apply` 需要 approval gate
- [ ] `evolution.rollback` 恢复到前一个版本
- [ ] 完整的 evolution proposal artifact 包含：改进方向 / 回测对比 / 审批状态

### E2E 测试
```bash
# 完整进化流程（通过 Agent）
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/evolve strategy"}'
# 验证: 返回 evolution proposal artifact

# 查看 proposal
curl http://localhost:8787/api/evolution/proposals
# 验证: 包含 strategyId / currentMetrics / proposedChanges / status
```

### 前置依赖
- C.1（Strategy Engine）
- C.2（Backtest Engine）
- C.3（Journal + Review — 数据源）

---

## Spec C 整体验证

```bash
npm run check && npm run test && npm run build

# 完整交易闭环 E2E
# 1. 创建策略
# 2. 运行回测
# 3. 创建 journal entry（模拟 paper trade）
# 4. 执行 review
# 5. propose evolution
# 所有步骤验证 artifact 创建 + timeline 记录
```
