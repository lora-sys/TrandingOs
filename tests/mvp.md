# Trading Pi MVP 设计计划（更新版）

## 核心目标

**让一个完全不会交易的人，第一次打开 Trading Pi，就能完成一次完整的"研究 → 计划 → 模拟 → 复盘"闭环。**

如果不能做到这个，其它都是伪需求。

---

## 核心功能流程

```
Chat
↓
Alpha Radar ⭐
↓
Market
↓
Plan
↓
Paper Trade
↓
Review
↓
Evolution
```

---

## 北极星用户故事

用户说：

> 帮我分析 ETH 现在值不值得买，并给我一个交易计划。

系统响应：

```
Chat
↓
Agent 理解意图
↓
Research Workflow
↓
调用数据 Skills
↓
生成 Trade Plan
↓
Artifact Preview
↓
用户确认
↓
Paper Trade
↓
记录 Journal
↓
生成 Review
```

结束。

---

## 功能模块详情

### 1️⃣ Chat

支持用户输入自然语言指令，Streaming 输出，历史会话记录，Workspace 切换。

UI：HeroUI OSS + TanStack + React

### 2️⃣ Alpha Radar ⭐

**目的**：提供每日潜在机会，作为 Alpha 来源。

**输入**：用户指令如"最近有什么值得关注的事件？"

**数据源**：

| 类别 | 来源 |
|------|------|
| 信息检索 | Exa（Semantic Search） |
| 社交情绪 | X/Twitter、Reddit（高频话题、情绪） |
| 事件日历 | CoinMarketCal、Economic Calendar、世界杯赛程 |
| 预测市场 | Polymarket、Kalshi 等 Prediction Markets |
| 兜底采集 | AIO Sandbox 浏览器抓取（页面无 API 可用时） |

**输出**：今日机会 Top5，每条包含：
- 事件名称
- 市场/场景
- 当前概率/市场热度
- 风险评分
- 简短理由

**用户操作**：点击机会 → 生成研究计划 → Paper Buy → 完成闭环

**技术实现**：Radar Skill + Alpha Radar Workflow，Artifact 输出为 Markdown，可在前端 Artifact Preview 查看

### 3️⃣ Market

接入 CCXT 获取实时市场数据，提供价格、成交量、历史数据，为 Plan / Paper Trade 提供基础信息。

### 4️⃣ Plan

生成 Trade Plan Artifact，可调用 Risk Skill 评估仓位和止损。

### 5️⃣ Paper Trade

模拟买入/卖出，保留交易日志，供 Journal 和 Review 使用。

### 6️⃣ Review

自动生成复盘报告，分析盈亏、策略执行情况，提供改进建议。

### 7️⃣ Evolution

提供半自进化建议（Advice-Based Evolution），当前版本不自动修改 Skill / Workflow。

后续版本可接入 Weakness Mining + Proposal Validation + Evolution Governor。

---

## P0（必须做）

### 1. Chat Workspace

类似 Claude。支持：

- 对话
- Streaming
- 历史会话
- Workspace 切换

### 2. Single Agent

核心组件：

- Intent Parser — 识别用户意图
- Planner — 生成执行步骤
- Tool Router — 路由到正确 Skill

能识别的意图：

- Research
- Alpha Radar
- Trade
- Review
- Airdrop

### 3. Workflow Engine

先做 7 个 Workflow：

| Workflow | 输出 |
|----------|------|
| Chat Workflow | 对话响应 |
| Alpha Radar Workflow | 今日机会 Top5 |
| Research Workflow | Research Report |
| Trade Planner Workflow | Trade Plan |
| Paper Trade Workflow | Paper Trade Result |
| Review Workflow | Review Report |
| Evolution Workflow | 改进建议 |

### 4. Skill Registry

**市场 — CCXT**
- `fetchTicker`
- `fetchOHLCV`

**搜索 — Exa**
- `search`

**Alpha Radar**
- `radar.scan` — 扫描多源机会
- `radar.top5` — 输出 Top5

**风险 — Risk**
- `risk.evaluate` — 仓位建议、止损建议

**Journal**
- `journal.create`

### 5. Artifact Engine

必须支持以下 Artifact 类型：

- Research Report
- Trade Plan
- Paper Trade Report
- Review Report
- Alpha Radar Report

全部使用 **Markdown** 格式。先不要 PDF / HTML。

### 6. Artifact Preview

必须做。类似 Claude。支持：

- Markdown Preview
- Copy
- Fullscreen

先不做：PDF、HTML、Browser。

### 7. Execution Timeline

必须做。用户必须知道 Agent 在干嘛。

状态节点示例：

- 搜索新闻
- 获取行情
- 风险评估
- 生成交易计划

每个节点状态：

- `running`
- `success`
- `failed`

### 8. Paper Trading

必须做。没有 Paper Trade，新手容易送钱。

支持：

- 模拟买入
- 模拟卖出
- 记录收益

不碰真实资金。

### 9. Journal

必须做。每次 Paper Trade 后记录：

- 为什么买
- 为什么卖
- 截图（可选）
- 备注

### 10. Review

必须做。自动生成：

- 今天做了什么
- 盈亏如何
- 犯了什么错
- 改进建议

这是成长闭环。

---

## 数据源扩充策略

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 第一优先（稳定数据） | CCXT（行情数据）、Exa MCP（信息检索） | 稳定可靠，优先接入 |
| 第二优先（Alpha） | CoinMarketCal、Economic Calendar、Polymarket、Kalshi、体育赛事 | 提供 Alpha 信号 |
| 第三优先（兜底） | AIO Sandbox 浏览器采集 | 可自动抓取网页、Reddit、论坛等 |

---

## 技术实现总结

| 维度 | 方案 |
|------|------|
| 前端 | HeroUI OSS + TanStack + React |
| Agent | Pi Mono Single Agent |
| Workflow | Chat → Alpha Radar → Market → Plan → Paper Trade → Review → Evolution |
| Artifact Preview | 支持 Markdown，可扩展 HTML/PDF |
| Loop / E2E | 所有 Skill 调用、Workflow 执行、Artifact 生成有日志，可用于回溯和自进化 |

---

## MVP 不做（全部砍掉）

这些都是以后的事。

| 功能 | 原因 |
|------|------|
| Live Trade（真实交易） | 监管、风险、复杂度 |
| Adaptive Skill Factory | 不是 MVP |
| Evolution Governor | 不是 MVP |
| Weakness Mining | 不是 MVP |
| 自动 Proposal | 不是 MVP |
| PDF Export | 不是 MVP |
| HTML Artifact | 不是 MVP |
| 策略市场 | 不是 MVP |
| Governor | 不是 MVP |
| 多 Agent | **永远不做。坚持 Single Agent** |
| AIO Sandbox（作为独立功能） | 仅作为 Alpha Radar 兜底层，不单独开发 |
| 自动修改 Skill/Workflow | Evolution 仅出建议，不自动执行 |

---

## MVP E2E 验收标准

必须全部通过。

### E2E 0: Alpha Radar

- 用户说：最近有什么值得关注的事件？
- 结果：Alpha Radar Report 生成，显示 Top5 机会，每条含风险评分和理由

### E2E 1: 研究

- 用户说：分析 ETH
- 结果：Research Report 生成，Artifact Preview 可查看

### E2E 2: 交易计划

- 用户说：生成 ETH 交易计划
- 结果：Trade Plan 生成，Timeline 完整

### E2E 3: 模拟交易

- 用户按计划模拟买入
- 结果：Paper Trade 成功，收益被记录

### E2E 4: Journal

- 用户记录原因
- 结果：Journal Entry 生成

### E2E 5: Review

- 用户说：帮我复盘
- 结果：Review Report 生成

### E2E 6: Evolution

- 用户说：有什么可以改进的？
- 结果：改进建议生成，不自动修改

---

## 推荐开发顺序

### Sprint 1

Chat + Single Agent + Research Workflow + Artifact Preview

### Sprint 2

Alpha Radar + Market Data + Trade Planner + Risk Skill + Execution Timeline

### Sprint 3

Paper Trading + Journal

### Sprint 4

Review + Evolution + 完整 E2E 测试

---

## 一句话总结 MVP

> **让一个完全不会交易的人，在不碰真钱的情况下，通过 AI 完成一次完整的研究 → Alpha Radar 发现机会 → 制定计划 → 模拟交易 → 记录原因 → 自动复盘 → 持续进化。**

如果这个闭环跑通，Trading Pi 的 MVP 就成功了。

其它所有东西——Evolution Governor、Skill Factory、Loop Library、Personal Alpha——都建立在这个闭环之上。

**先把这个做扎实，才是真正的 MVP。**
