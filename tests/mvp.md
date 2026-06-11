# Trading Pi MVP

## 核心目标

**让一个完全不会交易的人，第一次打开 Trading Pi，就能完成一次完整的"研究 → 计划 → 模拟 → 复盘"闭环。**

如果不能做到这个，其它都是伪需求。

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

## P0（必须做）

### 1. Chat Workspace

类似 Claude。支持：

- 对话
- Streaming
- 历史会话
- Workspace 切换

UI：HeroUI + assistant-ui

### 2. Single Agent

核心组件：

- Intent Parser — 识别用户意图
- Planner — 生成执行步骤
- Tool Router — 路由到正确 Skill

能识别的意图：

- Research
- Trade
- Review
- Airdrop

不用复杂推理，够用就行。

### 3. Workflow Engine

先只做 4 个 Workflow：

| Workflow | 输出 |
|----------|------|
| Research Workflow | Research Report |
| Trade Planner Workflow | Trade Plan |
| Paper Trade Workflow | Paper Trade Result |
| Review Workflow | Review Report |

### 4. Skill Registry

先做最少，够用就行。

**市场 — CCXT**
- `fetchTicker`
- `fetchOHLCV`

**搜索 — Exa**
- `search`

**风险 — Risk**
- `risk.evaluate`
  - 仓位建议
  - 止损建议

**Journal**
- `journal.create`

### 5. Artifact Engine

这是 MVP 的灵魂。必须支持以下 Artifact 类型：

- Research Report
- Trade Plan
- Paper Trade Report
- Review Report

全部使用 **Markdown** 格式。先不要 PDF。

### 6. Artifact Preview

必须做。类似 Claude。支持：

- Markdown Preview
- Copy
- Fullscreen

先不做：PDF、HTML、Browser。以后再说。

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

够了。

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

## MVP 不做（全部砍掉）

这些都是以后的事。

| 功能 | 原因 |
|------|------|
| Live Trade（真实交易） | 监管、风险、复杂度 |
| Adaptive Skill Factory | 不是 MVP |
| Evolution Governor | 不是 MVP |
| Weakness Mining | 不是 MVP |
| 自动 Proposal | 不是 MVP |
| Browser Automation | 以后 |
| AIO Sandbox | 以后 |
| MCP Marketplace | 不是 MVP |
| PDF Export | 不是 MVP |
| HTML Artifact | 不是 MVP |
| 策略市场 | 不是 MVP |
| Governor | 不是 MVP |
| 多 Agent | **永远不做。坚持 Single Agent** |

---

## MVP E2E 验收标准

必须全部通过。

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

---

## 推荐开发顺序

### Sprint 1

Chat + Single Agent + Research Workflow + Artifact Preview

### Sprint 2

Trade Planner + Risk Skill + Execution Timeline

### Sprint 3

Paper Trading + Journal

### Sprint 4

Review + 完整 E2E 测试

---

## 一句话总结 MVP

> **让一个完全不会交易的人，在不碰真钱的情况下，通过 AI 完成一次完整的研究 → 制定计划 → 模拟交易 → 记录原因 → 自动复盘。**

如果这个闭环跑通，Trading Pi 的 MVP 就成功了。

其它所有东西——Evolution、Governor、Skill Factory、Loop Library、Personal Alpha——都建立在这个闭环之上。

**先把这个做扎实，才是真正的 MVP。**
