# Trading Pi MVP 用户故事

本文件整理 Trading Pi MVP 的核心用户故事，便于 Codex 进行端到端 (E2E) 测试。

| ID  | 功能模块                 | 用户目标                                  | Agent Skill / Workflow                                     | Artifact 输出                     | 前端组件                   | 验收标准 |
|-----|------------------------|-----------------------------------------|-----------------------------------------------------------|---------------------------------|---------------------------|---------|
| US01| Chat & Agent Interaction | 通过 Chat 输入交易请求                   | trading.trade_plan workflow, parsing intent              | Trade Plan Artifact             | Chat Thread               | Intent 解析正确，Workflow 被触发，Timeline 记录事件，Artifact 生成 |
| US02| Market Analysis         | 获取 ETH / BTC 市场分析                  | market.fetch_ticker, market.fetch_ohlcv                  | Market Overview Artifact        | Artifact Preview Panel    | Artifact 可渲染行情、K线、成交量 |
| US03| Research                | 自动生成 Research Report                 | research.exa_search, browser.extract                     | Research Artifact               | Artifact Preview Panel    | Artifact 内容完整，Preview 可查看 |
| US04| Airdrop Learning        | 生成空投任务指导                         | airdrop.search_opportunities, scam_check, eligibility_check | Airdrop Guide Artifact           | Artifact Preview Panel    | Artifact 包含官方来源、任务步骤、风险提示 |
| US05| Approval                | 高风险操作必须审批                        | approval.workflow                                         | Approval Artifact               | Approval Card            | 用户必须批准或拒绝操作，Workflow 按选择执行 |
| US06| Journal & Memory        | 自动记录交易与复盘                        | journal.log_trade, memory.update                         | Journal Entry Artifact           | Chat / Workspace         | Journal 保存 Skill/Workflow 数据，Timeline 更新 |
| US07| Strategy Evolution      | 自动生成新 Skill / 改进 Workflow          | skill.creator, evolution.strategy_patch                  | Skill Proposal / Evolution Artifact | Artifact Preview Panel    | Artifact 显示改进建议，Workflow 可执行 |
| US08| Frontend UI             | 切换 Workspace / 使用 Slash Command      | -                                                         | -                               | Drawer, Command, Tabs     | Workspace 切换成功，Slash Command 触发正确 Workflow |
| US09| E2E Closed Loop         | 从输入到 Artifact -> Approval -> Journal 完整闭环 | Market / Trade / Risk / Artifact / Journal Skills        | Trade Plan + Artifact + Journal | Chat Thread + Preview + Approval Card | 每步都有 workflow_run / skill_run / execution_event，Artifact 和 Journal 可查看 |
| US10| Trade Plan Generation   | 生成可执行的交易计划                      | trading.trade_plan workflow, market.fetch_ohlcv, risk.trade_permission | Trade Plan Artifact             | Artifact Preview Panel    | Artifact 内容完整，包含交易信号和风险建议 |
| US11| Market Research          | 生成资产研究报告                         | research.exa_search, browser.extract                     | Research Artifact               | Artifact Preview Panel    | Artifact 内容完整，包含市场、新闻、链上信息 |
| US12| Historical Backtest      | 对策略进行回测                           | backtest.skill, strategy_engine                          | Backtest Report Artifact        | Artifact Preview Panel    | 回测结果可视化，包含盈亏曲线和指标 |
| US13| Risk Analysis            | 风控评估                                 | risk.position_size, risk.stop_loss, risk.daily_loss_guard | Risk Report Artifact             | Artifact Preview Panel    | Artifact 显示风险等级，警告信息和限制建议 |
| US14| Paper Trading            | 在模拟环境下执行交易                      | execution.paper_order workflow                            | Trade Plan Artifact             | Approval Card + Timeline | 模拟订单生成，Timeline 可追踪，每步有 skill_run |
| US15| Real Trading Guarded     | 执行真实交易（需审批）                    | execution.real_order_guarded workflow                     | Trade Plan Artifact             | Approval Card + Timeline | 订单生成前必须用户审批，Paper Mode 可选 |
| US16| Workspace Management     | 管理多交易工作区                          | workspace.switch, workspace.load_memory                  | Workspace Context Artifact      | Drawer + Tabs            | Workspace 切换成功，Memory 和 Artifact 自动加载 |
| US17| Slash Commands           | 快速触发 Workflow / Skill                | slash_command_parser workflow                              | Artifact / Skill Run Artifact  | Command Input Field      | Slash Command 正确触发对应 Workflow，Artifact 生成 |


Trading Pi MVP 用户故事
1️⃣ 系统角色
新手交易者（User）：主要交互对象
Trading Pi Agent（Agent）：单 Agent 核心执行
Workflow Engine：执行工作流
Skill Registry：管理可用技能
Artifact Engine：生成可预览报告
Preview Panel：展示 Artifact
Approval Card：高风险操作审批
Memory / Journal / Strategy Engine：数据存储和复盘
2️⃣ 用户故事按功能模块
2.1 Chat & Agent Interaction

故事 1：用户可以通过 Chat 输入交易请求

Goal：让 Agent 理解意图并触发正确 Workflow
验收标准：
输入被解析成 intent
Workflow 被触发
Execution Timeline 记录事件
Artifact 生成或更新

故事 2：Agent 可以回答市场分析问题

Goal：提供 ETH/BTC 等市场简析
验收标准：
Agent 能生成 Market Overview Artifact
Artifact Preview Panel 能显示 Markdown 或 HTML
包含行情数据、K 线、成交量等信息

故事 3：用户可以查看对话历史

Goal：历史会话可回溯
验收标准：
Memory Engine 保存上下文
用户可在 Chat Workspace 回看历史
2.2 Workflow & Skill Execution

故事 4：Agent 调用技能生成交易计划

Goal：生成 Trade Plan Artifact
验收标准：
调用 market.fetch_ohlcv、market.fetch_ticker
调用 risk.trade_permission
Workflow 输出 Artifact
Execution Timeline 记录每个 Skill 调用

故事 5：Agent 可以执行 Research Workflow

Goal：生成 Research Report Artifact
验收标准：
调用 research.exa_search / browser.extract
Artifact 内容完整
Preview Panel 渲染可读报告

故事 6：Agent 可以执行 Airdrop 学习流程

Goal：生成 Step-by-Step Airdrop Guide
验收标准：
验证官方网站
Scam 检测
Eligibility 检查
Artifact Preview Panel 展示完整指南
2.3 Artifact Engine & Preview

故事 7：用户可以在 Preview Panel 查看 Trade Plan

Goal：可读、可滚动、可复制/导出
验收标准：
支持 Markdown / HTML / PDF
Tabs 切换不同 Artifact
Scrollable / Copy / Export 功能可用

故事 8：用户可以查看 Browser Preview

Goal：浏览器执行结果可视化
验收标准：
使用 AIO Sandbox 输出截图或 PDF
浏览器 Preview Panel 可显示截图
URL / Page Title 可见
2.4 Risk & Approval

故事 9：Agent 不能执行危险操作无审批

Goal：保证安全
验收标准：
Approval Card 弹出
Paper / Mock Mode 默认
Live Trade 需显式用户确认

故事 10：用户可批准或拒绝交易

Goal：风险控制
验收标准：
Approval Card 显示操作摘要
用户点击批准或拒绝
Workflow 根据选择执行或终止
2.5 Journal / Memory / Review

故事 11：Agent 自动记录交易日志

Goal：每个 Trade Plan 或执行都有记录
验收标准：
Journal Entry 自动创建
包含 Artifact reference / Skill 调用 / 时间戳

故事 12：Agent 可以生成 Daily / Weekly Review

Goal：复盘
验收标准：
Review Artifact 包含：
成功交易 / 失败交易
风险违规
改进建议
Artifact 可在 Preview Panel 查看
2.6 Strategy / Evolution

故事 13：Agent 可以生成新 Skill 或 Workflow

Goal：Adaptive Skill Factory
验收标准：
根据历史 Artifact 生成新 Skill Proposal
提交到 Skill Registry
Artifact Preview 显示 Skill Proposal

故事 14：Agent 可以演示策略进化效果

Goal：模拟改进 Trade Plan
验收标准：
Evolution Artifact 生成
显示优化前后指标对比
Preview Panel 可查看
2.7 Frontend UI

故事 15：用户可以切换 Workspace

Goal：支持 ETH/BTC/Airdrop/Macro 等 Context
验收标准：
Workspace Drawer 切换
相关 Memory / Artifact / Journal 自动加载

故事 16：用户可以执行 Slash Command

Goal：快速触发 Workflow / Skill
验收标准：
Command 输入 /plan ETH 或 /review
触发对应 Workflow
Timeline + Artifact 更新
2.8 E2E 测试闭环示例

故事 17：从 Chat → Artifact → Approval → Journal 完整闭环

Goal：验证系统完整性
验收标准：
用户输入交易请求
Agent 解析，触发 Workflow
Skill 执行并输出 Artifact
Preview Panel 渲染
用户点击 Approval Card
Journal / Execution Timeline 记录事件
E2E 测试完成
