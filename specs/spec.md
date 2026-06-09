# Trading Pi SPEC v4.1 COMPLETE

## 1. 系统概述

**Trading Pi** 是一个 **Personal Trading Operating System**，核心目标：

- 单 Agent 架构
- Workflow 驱动 Skill 执行
- Artifact 输出 + Preview Panel
- 支持 Paper Trading / Sandbox / Approval
- 提供 Memory、Workspace、Research、Journal、Marketplace 支持
- MCP + Exa 集成用于搜索与技能调度

---

## 2. 核心模块

### 2.1 Trading Pi Agent

- 理解用户意图
- 调度 Workflow
- 调用 Skills
- 生成 Artifact
- 接收 Approval 指令
- 日志记录 Execution Timeline

### 2.2 Workflow Engine

- Workflow Manifest + DAG
- 节点调用 Skill
- 事件 / Execution Timeline 追踪
- Sandbox 执行支持
- 可生成 Artifact

### 2.3 Skills / Adaptive Skill Factory

- 内置技能：市场数据、执行、风险、研究、交易计划
- Adaptive Skill Factory：
  - Pattern Extractor
  - Workflow Extractor
  - Skill Synthesizer
  - Validator
  - Registry Integration
  - Skill Lifecycle（draft / testing / verified / deprecated）
  - Skill Rating（usage, success, quality_score）

### 2.4 Artifact Engine + Preview Panel

- Artifact 类型：
  - Trade Plan
  - Research Report
  - Review Report
  - Backtest Report
  - Strategy Report
  - Evolution Proposal
- Preview Panel：
  - Markdown / HTML / PDF 渲染
  - Sandbox 浏览器渲染
  - Copy / Export / Tab 切换
- 所有 Artifact 可追踪来源与执行状态

### 2.5 MCP / Exa / AIO Sandbox

- MCP Hub：
  - Registry / Discovery / Health Check / Marketplace / Permissions / Notifications
- Exa Search Hub：
  - 搜索新闻 / 文档 /链上数据 / 社交媒体
- AIO Sandbox：
  - Browser 自动化 / 页面抓取 / PDF / Screenshot / Form Fill
  - Paper Trading / Workflow 测试
  - 所有 Skill 执行通过 Sandbox

### 2.6 Memory Engine

- Conversation Memory
- Market Memory
- Trade Memory
- Review Memory
- Skill Memory
- 支持 Evolution Engine / Review Engine 调用

### 2.7 Strategy Engine

- 策略库 / 策略版本
- 参数优化
- 策略评分
- Evolution Engine 输出接入
- Backtest Bridge（历史验证 + 比较）

### 2.8 Workspace System

- 多 Workspace 支持（ETH / BTC / Macro / Custom）
- Workspace = Context + Memory + Artifact + Workflow

### 2.9 Journal System

- 交易日志 / 截图 / 情绪 / 纪律记录
- Review Engine 可读取并生成 Artifact

### 2.10 Research Hub

- 新闻 / 链上 / 市场 / 宏观 / 文件 / 浏览器
- Workflow / Skill 调用统一入口
- Artifact 输出 Research Report

### 2.11 Marketplace

- Skills / Workflows / Templates / MCP
- 安装 / 启用 / 禁用 / 更新
- 与 MCP Hub 联动

---

## 3. 前端布局

- 基于 Pi Web + Hero UI + TanStack
- 左侧导航：
  - Workspaces / Research / Journal / Marketplace / Settings
- 中间：
  - Chat Workspace + Artifact Preview
- 右侧：
  - Execution Timeline / Approval Card / Skill Status
- Tab / Scroll / Export 支持

---

## 4. 风控与审批

- Skill 权限管理
- Sandbox 执行
- Paper Trading 默认
- Live / Guarded 模式必须 Approval
- Execution Timeline + Artifact 可追踪

---

## 5. 数据源

- 交易所：CCXT
- DEX / 链上数据：Dex / Dune / DefiLlama
- 新闻与社交媒体：Exa / Twitter / Reddit
- 文件与知识库
- 浏览器抓取 & 实时信息

---

## 6. 阶段化训练 / 新手指导

| Phase | Goal | Artifact | Agent Task | Risk |
|-------|------|---------|------------|------|
| 0 | 系统熟悉 | 操作指南 | 浏览 Workspace / Preview | 无 |
| 1 | 观察市场 | Market Overview | 获取行情 / 新闻 | 无 |
| 2 | 模拟下单 | Trade Plan | Paper Trading | Paper Mode |
| 3 | 复盘分析 | Review Report | Daily / Weekly Review | Paper Mode |
| 4 | 策略进化 | Evolution Proposal | Skill / Workflow 生成 | Sandbox |
| 5 | 实战演练 | Trade Plan + Execution | Paper / Guarded | Approval Card |
| 6 | 真实交易 | Trade Artifact | Agent Workflow | Guarded / Approval |
| 7 | 构建 Alpha | Strategy Artifact | Agent + Workflow | Sandbox / Live Guarded |

---

## 7. Agent 规则

- 单 Agent 架构
- Workflow 驱动 Skill 执行
- 所有 Skill / Workflow 执行生成 Artifact
- Approval 必须
- Paper / Sandbox 模式保护新手
- 日志与 Execution Timeline 全记录
- 禁止硬编码 AI 或绕过 Sandbox / MCP
- 所有输出可追踪、可审计

---

## 8. Acceptance Criteria

- 单 Agent 能理解用户意图并调用 Workflow + Skill
- Artifact 生成可预览（Markdown / HTML / PDF）
- Browser / Sandbox 调用安全且可追踪
- MCP / Exa 可提供外部数据查询
- 前端能显示 Chat / Artifact Preview / Execution Timeline / Approval Card / Workspace
- Paper / Sandbox 模式保护用户资金
- Review / Evolution / Strategy Engine 正常运行
- 新手训练路线清晰可执行

---

## 9. 技术栈
后端agent 核心部分人都直接使用pi mono https://github.com/earendil-works/pi.git
前后端配合 tanstack  的 serverfunction
- React
- TypeSpei he
- Tailwind CSS
- Hero UI
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- TanStack Virtual
- Zustand if local UI state is needed
- Framer Motion for subtle interaction
- TradingView Widget / lightweight-charts / Recharts / ECharts
- Pi Web / Hero UI / TanStack Start / Query / Router / Table / Form / Virtual
- PostgreSQL / Redis / S3 / MinIO / Chromadb
- Docker / Kubernetes / Kafka / OpenAI / Claude / LangChain
"""

# 写入文件
spec_path = Path("/mnt/data/TradingPi_SPEC_v4_1_FULL.md")
spec_path.write_text(content, encoding="utf-8")
spec_path
