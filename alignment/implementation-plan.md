# MVP 前端改造实施计划

## 目标
将 ChatWorkspace 全面迁移到 ai-elements，使 UI 匹配概念设计图 (`images/frtontend.png`)。

## 改造清单

### 1. ChatWorkspace.tsx — 全面重写
| 当前实现 | 目标 (ai-elements) |
|---------|-------------------|
| TanStack Virtual 手动滚动 | `Conversation` + `ConversationContent` (stick-to-bottom) |
| HeroUI Card + `<p>` 渲染消息 | `Message` + `MessageContent` + `MessageResponse` (Streamdown) |
| Flat notice 卡片表示工具调用 | `Tool` (可折叠，状态徽章：running/completed/error) |
| Flat notice 卡片表示审批 | `Confirmation` (接受/拒绝/原因) |
| 纯 textarea 输入 | `PromptInput` + `PromptInputTextarea` + `PromptInputSubmit` |
| 无 agent 状态指示 | PromptInputSubmit 的 streaming/stop 状态 |

### 2. ArtifactPreviewPanel.tsx — 增强
- 保持 HeroUI Tabs（功能已经在，改动最小）
- 改进渲染：ai-elements `Artifact` 组件包一层 Header/Actions/Content

### 3. CSS 适配
- ai-elements 使用 shadcn CSS 变量（--background, --foreground, --muted 等）
- 这些变量已经在 styles.css 的 `.dark` 中定义
- 只需确保 ChatWorkspace 中用到的 ai-elements 类名正确

### 4. 后端数据映射
- API 返回自定义 ChatMessage 类型
- 在 ChatWorkspace 中映射到 ai-elements 需要的格式
- 从 timeline 事件中提取 tool call 数据

### 5. Playwright E2E 验证
- 打开浏览器，测试每个 MVP 用户故事
- 验证：消息发送/接收、工具调用显示、审批交互、工件预览

## 执行顺序
1. ChatWorkspace.tsx 全面重写（集成 ai-elements）
2. ArtifactPreviewPanel.tsx 增强
3. CSS 调整
4. 启动 dev server + Playwright 真实浏览器测试
