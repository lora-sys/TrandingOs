# Alignment Questions — 2026-06-11

## Q1: 前端 Chat UI 改造范围
**发现:** ai-elements 已经安装但 ChatWorkspace 未使用。MVP 要求 "Chat + Artifact Preview + Approval Card + Execution Timeline"
**方案 A:** 全面使用 ai-elements（Conversation + Message + Tool + Confirmation + PromptInput + Artifact）
**方案 B:** 仅替换 Message 渲染 (Streamdown markdown)，保持其他 HeroUI 不变
**方案 C:** 保持现有实现，只做最小修补

## Q2: Artifact Preview 改造
**发现:** ArtifactPreviewPanel 使用 HeroUI Tabs，未使用 ai-elements Artifact 组件
**方案 A:** 使用 ai-elements Artifact 组件 + shadcn/ui tabs
**方案 B:** 保持 HeroUI Tabs，只改进内容渲染

## Q3: 审批/确认 UI
**发现:** 目前审批只在 Timeline 显示 flat notice，无交互式 Approval Card
**方案 A:** 使用 ai-elements Confirmation 实现完整审批交互（接受/拒绝/原因）
**方案 B:** 保持现有 Timeline 展示

## Q4: Agent 状态指示
**发现:** 目前用户无法看到 agent 正在思考/调用工具/生成回复的状态
**方案 A:** 添加 Agent 状态指示 + PromptInputSubmit 的 streaming/stop 状态
**方案 B:** 纯 Loading text

## Q5: 验证方式
**发现:** MVP 要求端到端验证
**方案 A:** 修复后用 Playwright E2E 测试每个 MVP 用户故事
**方案 B:** 手动测试

## Q6: 后端 AI 调用
**发现:** 后端已实现真实 AI 调用，使用 deepseek-v4-flash 模型，slash commands 工作正常
**确认:** 后端不需要改动，只需要前端 UI 改造？
