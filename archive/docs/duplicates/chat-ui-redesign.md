# Trading Pi OS — MVP UI/UX 设计规范

> 基于 `images/mvp.png` 概念图 + `tests/mvp.md` MVP 规格

## 设计哲学

**Claude 的简洁 × 交易终端的精密**

让一个完全不会交易的人，第一次打开 Trading Pi，就能完成一次完整的"研究 → 计划 → 模拟 → 复盘"闭环。

## 布局架构

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar      │  Chat Workspace (主角)      │  Panel (可折叠) │
│  ───────────  │  ────────────────────────   │  ────────────  │
│  π 标识        │  ┌─ Header ────────────┐   │  Artifact     │
│               │  │ Trading Pi  ● idle   │   │  Preview      │
│  Chat ◄       │  └─────────────────────┘   │  (Markdown)    │
│  Research     │  ┌─ Conversation ──────┐   │               │
│  Portfolio    │  │                     │   │  Timeline     │
│  Journal      │  │  User →             │   │  (agent 运行  │
│  Review       │  │                     │   │   期间显示)   │
│  Settings     │  │  ← Assistant (mono) │   │               │
│               │  │                     │   │               │
│               │  │  ┌─ Tool Call ──┐   │   │               │
│               │  │  │ fetchTicker  │   │   │               │
│               │  │  └──────────────┘   │   │               │
│               │  └─────────────────────┘   │               │
│               │  ┌─ Input ────────────┐   │               │
│               │  │  /research ETH    →│   │               │
│               │  └─────────────────────┘   │               │
└─────────────────────────────────────────────────────────────┘
```

### 核心原则

| 原则 | 说明 |
|------|------|
| **Chat is King** | 聊天区占 60%+ 可视面积，header 极简，对话最大化 |
| **信息分层** | 用户消息 / AI 回复 / 工具调用 / 系统事件，视觉层级分明 |
| **面板即服务** | 右侧 panel 默认折叠，artifact 生成后自动展开 |
| **最小噪音** | 无冗余文字、无多余卡片、无不需要的边框 |
| **终端质感** | 暗色、等宽字体、圆点状态指示器、精密间距 |

## 色彩系统

```css
/* 极简暗色板 — 只有真正需要的地方才有颜色 */
--bg-app:         #080b10;      /* 应用背景 */
--bg-sidebar:     #0c131c;      /* 侧栏 */
--bg-chat:        #080b10;      /* 聊天区 */
--bg-surface:     #0f1722;      /* 卡片/面板 */
--bg-hover:       #162033;      /* 悬浮状态 */
--bg-user-msg:    #1a2d42;      /* 用户消息气泡 */

--border:         rgba(255,255,255,.06);  /* 极淡边框 */
--border-strong:  rgba(255,255,255,.10);  /* 强调边框 */

--text-primary:   #e8edf5;      /* 主文字 */
--text-secondary: #8899b0;      /* 次要文字 */
--text-muted:     #556677;      /* 禁用/占位 */

--cyan:           #22d3ee;      /* 信息/运行中 */
--emerald:        #22c55e;      /* 成功 */
--amber:          #f59e0b;      /* 警告 */
--red:            #ef4444;      /* 错误 */
```

## 字体系统

| 元素 | 字体 | 字号 | 字重 |
|------|------|------|------|
| UI 文字 | Inter, system-ui | 13-14px | 400 |
| AI 回复 | JetBrains Mono | 14px | 400 |
| 用户消息 | Inter | 14px | 400 |
| 工具调用 | JetBrains Mono | 12px | 400 |
| 状态标签 | JetBrains Mono | 11px | 500 |
| 品牌 π | serif | 22px | 900 |

## 组件规格

### 1. 侧栏 (Sidebar) — 200px

```
┌──────────────────┐
│  π  Trading Pi   │  ← 品牌，无副标题
├──────────────────┤
│  ○ Chat          │  ← 图标 + 文字，当前页高亮
│  ○ Research      │
│  ○ Portfolio     │
│  ○ Journal       │
│  ○ Review        │
│  ○ Settings      │
├──────────────────┤
│  ◉ SQLite  local │  ← 状态指示，极小
│  ◉ OpenAI ready  │
└──────────────────┘
```

- 无副标题，无多余文字
- 导航项仅 6 个（Chat / Research / Portfolio / Journal / Review / Settings）
- 状态指示仅 2 行，写在底部

### 2. 聊天区 (Chat) — 主角

**Header:**
```
Trading Pi  ● idle
```
- 仅一行标题 + 状态圆点
- 无描述文字、无 command hints（这些功能保留但用更轻量的方式）

**Conversation:**
- 用户消息：右对齐，深色气泡，圆角 12px
- AI 回复：左对齐，无气泡，等宽字体 14px，行高 1.7
- 工具调用：折叠卡片，左 cyan 边框，等宽字体
- Artifact 卡片：在对话流中作为 AI 回复的一部分渲染

**Input:**
- 底部固定
- 圆角 10px，聚焦时 cyan 边框
- 支持多行
- 占位文字：`/research ETH — 输入或使用斜杠命令`

### 3. 右侧面板 (Panel) — 360px 可折叠

**Tab 1: Artifact Preview** (默认)
- 类似 Claude 的 artifact 面板
- Markdown 渲染
- Copy / Fullscreen 按钮
- 仅在有 artifact 生成时显示内容

**Tab 2: Execution Timeline** (agent 运行期间自动切到该 tab)
- 紧凑事件流
- 每个事件：状态圆点 + 事件名 + 时间
- running / success / failed 状态

## 交互模式

| 交互 | 行为 |
|------|------|
| 用户发送消息 | SSE 流式开始，状态圆点变 cyan+RUNNING |
| AI 回复中 | 等宽字体逐字出现，闪烁光标 `▊` |
| 工具调用 | 折叠卡片默认展开，完成后自动折叠 |
| Artifact 生成 | 右侧面板自动展开并显示 Artifact Preview |
| 用户切换页面 | 保留会话状态 |
| 右侧面板 | 可手动折叠/展开 |

## 动画

| 元素 | 动画 |
|------|------|
| 新消息 | fadeIn 0.25s ease-out |
| 流式光标 | blink 0.8s step-end |
| 运行中圆点 | pulse 1.2s ease-in-out |
| 面板展开 | slideIn 0.2s ease-out |

## MVP 验收映射

| MVP 需求 | UI 对应 |
|----------|---------|
| Chat Workspace (类似 Claude) | 聊天区为主，输入框固定 |
| Streaming | SSE + isAnimating + 闪烁光标 |
| Artifact Preview | 右侧面板，Markdown 渲染 |
| Execution Timeline | 右侧面板 Timeline tab |
| Single Agent 状态 | 顶部状态圆点 |
| 斜杠命令 | 输入框内 `/` 提示 |

## 响应式

| 断点 | 布局 |
|------|------|
| >1180px | 三栏完整 |
| 800-1180px | 侧栏 + 聊天+面板合并 |
| <800px | 单栏，面板叠在下方 |
