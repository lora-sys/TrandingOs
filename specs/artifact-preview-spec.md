# Artifact Preview Panel SPEC v1

版本：v4.1 增量功能补充

## 1. 功能描述

新增一个前端 Artifact Preview Panel，用于展示 Workflow/Skill 生成的 Artifact 内容。

支持内容类型：
- Markdown
- HTML
- PDF / Screenshot

支持操作：
- Tab 切换不同 Artifact 类型（Trade Plan / Research / Review / Strategy / Evolution Proposal）
- 滚动查看
- Copy / Export

## 2. 前端实现

- 基于 Pi Web 核心 + Hero UI
- 放置于 Chat Workspace 或 Artifact Viewer 旁边
- Tab / Card / Modal 可切换
- Scrollable，支持文本和图片/截图显示

## 3. 后端实现

- Artifact Engine 输出包含字段 `content` 和 `preview_ready`
- Browser Skill 可以调用：
  - `sandbox.render_html(url_or_content)` → 返回截图/preview
  - `sandbox.preview_md(content)` → 返回渲染结果
- 所有浏览器操作必须通过 Sandbox
- Agent 调用 Workflow / Skill 时，Artifact 必须附带 `preview_ready`

## 4. MCP / Sandbox 关联

- 浏览器 Skill 只能通过 Sandbox 执行
- 禁止直接访问主机或真实浏览器
- Artifact Engine 返回的数据可供前端直接展示

## 5. Agent 使用规则

- Artifact Preview Panel 仅作为观察和浏览工具
- 不改变核心 Agent / Workflow / Skills 的执行逻辑
- 所有浏览器调用必须经过 Sandbox
- Artifact 输出必须可追踪

## 6. 前端验收标准

- 可以预览所有 Artifact 类型
- Markdown 正确渲染
- HTML / Web 页面通过 Sandbox 渲染截图可显示
- PDF / Screenshot 可查看
- 支持 Tab 切换和滚动浏览
- 支持 Copy / Export
- 不破坏现有 Chat Workspace 与 Artifact Viewer

## 7. 后端验收标准

- Artifact Engine 输出含 `content` 和 `preview_ready`
- Sandbox 渲染正确返回数据
- Agent 调用 Preview 不直接访问真实系统
- 所有操作生成日志和执行记录
