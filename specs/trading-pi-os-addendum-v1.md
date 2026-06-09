# Trading Pi OS Addendum v1

版本：v4.0 补充

此文件用于补充 v4.0 SPEC 中缺失的核心模块和功能，保证系统完整性。

---

## 1. MCP Hub

- MCP Registry: 管理所有技能
- MCP Discovery: 自动发现新技能
- MCP Health Check: 监控技能健康状态
- MCP Marketplace: 安装/启用/更新/卸载技能
- Permissions: Skill 权限管理
- Notifications: 技能状态和执行通知

## 2. Browser Layer (AIO Sandbox)

- 浏览器自动化
- Web Search
- Page Crawl
- Screenshot / PDF
- Form Fill / Login
- Multi Tab Sandbox
- Sandbox 执行 Skill / Workflow
- Paper Trading / 回测
- 所有危险操作必须 Approval

## 3. Search Hub (Exa)

- Exa Agent 查询
- Jina / Tavily / Google / Twitter / Reddit
- 输出 Artifact 供 Agent 使用
- Workflow 内部可调用

## 4. Memory Engine

- Conversation Memory (会话)
- Market Memory (市场数据)
- Trade Memory (交易历史)
- Review Memory (复盘数据)
- Skill Memory (技能执行记录)

## 5. Strategy Engine

- 策略库
- 策略版本管理
- 参数优化
- 策略评分
- 与 Evolution Engine 联动

## 6. Workspace System

- 多 Workspace 支持
- 示例：ETH Workspace / BTC Workspace / Macro Workspace
- Workspace = 上下文 + Artifact + Memory + Workflow

## 7. Journal System

- 记录交易原因
- 截图 / 情绪 / 执行情况
- 违反纪律标记
- 对应 Artifact

## 8. Research Hub

- 新闻 / 链上 / 市场 / 宏观 / 文件 / 浏览器
- 可生成 Research Artifact
- 可用于 Workflow / Skill 输入

## 9. Marketplace

- Skills / Workflows / Templates / MCP
- Skills 安装 / 启用 / 禁用 / 更新
- 与 MCP Hub 联动

## 10. Data Source Layer

- 交易所：CCXT
- DEX 数据：Dex / GeckoTerminal
- 链上数据：Dune / DefiLlama
- 新闻与社交媒体：Exa / Twitter
- 文件与知识库
- 浏览器 & 实时信息

## 11. Agent Rules

- 单 Agent 架构
- Workflow 调用 Skills
- 输出 Artifact
- Approval 必须
- 日志与 Execution Timeline 全记录
- 不允许硬编码 AI 或绕过 Sandbox / MCP
