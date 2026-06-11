# Trading Pi OS — UI/UX 完整设计规范

## 设计方向：交易终端精密感

**灵感来源**：专业交易终端（Bloomberg Terminal、TradingView）的暗色界面 × AI 聊天的流动性。

**记忆点**：AI 回复以等宽字体像终端输出一样逐字出现，每个 agent 动作都有清晰的视觉状态。

## 布局架构

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (210px)  │  Chat Workspace (1fr, max 900px)   │ Inspector (320px) │
│  ──────────────── │  ───────────────────────────────    │ ────────────────  │
│  π 品牌标识       │  ┌─ Header ────────────────────┐   │ Timeline 事件流   │
│  导航菜单          │  │ Trading Pi Agent  ● READY   │   │ Skills 技能列表   │
│  Chat             │  │ Command hints: /research     │   │ Approvals 审批    │
│  Workspaces       │  └─────────────────────────────┘   │ Runtime 状态      │
│  Market           │  ┌─ Conversation ──────────────┐   │ Artifact 预览     │
│  Research         │  │  (sticky-scroll 对话区)      │   │                   │
│  Planner          │  │                              │   │                   │
│  Portfolio        │  │  User Message ──────────►   │   │                   │
│  Journal          │  │                              │   │                   │
│  Review           │  │  ◄── Assistant Message       │   │                   │
│  Evolution        │  │      等宽字体流式输出        │   │                   │
│  Marketplace      │  │      ┌─ Tool Call ──┐       │   │                   │
│  Beginner         │  │      │ ▼ research  │       │   │                   │
│  System           │  │      └──────────────┘       │   │                   │
│  Settings         │  │                              │   │                   │
│                   │  └─────────────────────────────┘   │                   │
│  SQLite ● local   │  ┌─ Input ────────────────────┐   │                   │
│  Langfuse ● on    │  │  Ask Trading Pi or /cmd…   │   │                   │
│  Sandbox  ● off   │  │                     [→]    │   │                   │
│                   │  └─────────────────────────────┘   │                   │
└─────────────────────────────────────────────────────────┘
```

## 色彩系统

```css
/* 基础色板 */
--bg-primary:     #080b10;      /* 主背景 - 极深 */
--bg-surface:     rgba(12,19,32,.86);  /* 卡片表面 */
--bg-elevated:    rgba(18,28,45,.92);  /* 悬浮/激活 */
--bg-input:       rgba(11,17,29,.92);  /* 输入框 */
--bg-user-msg:    rgba(20,34,53,1);    /* 用户消息气泡 */

--border-default: #1d2a3b;      /* 默认边框 */
--border-hover:   #2a3d57;      /* 悬浮边框 */
--border-active:  #22d3ee;      /* 激活边框 (cyan) */

--text-primary:   #e5edf6;      /* 主文字 */
--text-secondary: #8da1b6;      /* 次要文字 */
--text-muted:     #5a6f85;      /* 禁用/占位文字 */

--accent-cyan:    #22d3ee;      /* 主强调色 - 信息/运行中 */
--accent-emerald: #22c55e;      /* 强调色 - 成功/完成 */
--accent-amber:   #f59e0b;      /* 警告色 */
--accent-red:     #ef4444;      /* 错误色 */
--accent-blue:    #3b82f6;      /* 信息色 */
```

## 字体系统

| 元素 | 字体 | 字号 | 行高 | 字重 |
|------|------|------|------|------|
| 界面文字 | Inter, system-ui, sans-serif | 13-14px | 1.5 | 400 |
| 标题 h1 | Inter | 24px | 1.3 | 600 |
| 标题 h2 | Inter | 15px | 1.4 | 600 |
| 导航项 | Inter | 13px | — | 500 |
| AI 回复 | JetBrains Mono, monospace | 14px | 1.7 | 400 |
| 用户消息 | Inter | 14px | 1.6 | 400 |
| 代码 | JetBrains Mono, monospace | 13px | 1.5 | 400 |
| 标签/徽章 | JetBrains Mono, monospace | 11px | 1.3 | 500 |
| 时间戳/元数据 | JetBrains Mono, monospace | 11px | 1.3 | 400 |
| 导航品牌 | 几何衬线 (π 符号) | 28px | 1 | 900 |

## 组件设计细节

### 左侧导航栏 (Sidebar)
- 宽度 210px, 固定, 全高, 右侧分割线
- 顶部: π 品牌标识 + "Trading Pi" 名称 + "Local Trading OS" 副标题
- 导航: 13 个菜单项, 当前页高亮 (cyan 左边框)
- 底部: 4 个状态指示器, 小圆点 + 标签 + 值 (Chip)
- hover 效果: 背景变亮, 边框 cyan

### 聊天工作区 (ChatWorkspace)
- max-width 900px, margin: 0 auto, 全高 grid
- Header: 标题 + 状态徽章 (● READY / ● RUNNING / ● ERROR) + command hints
- Conversation: StickToBottom, 内边距 16px, 消息间距 20px
- User Message: 右对齐, 深色气泡, 圆角 12px, Inter 字体
- AI Message: 左对齐, 无气泡, JetBrains Mono 字体, 流式打字机
- Tool Call: 折叠面板, 默认打开(运行中)或关闭(完成), 左侧 cyan 边框
- Empty State: 居中, 图标 + 标题 + 描述
- Input: 底部固定, 圆角 10px, 边框 #1d2a3b, 多行 textarea

### 右侧监控面板 (Inspector)
- 宽度 320px, 固定, 全高, 左侧分割线
- 4 个面板卡片 (Timeline / Skills / Risk / Runtime)
- Timeline: 事件列表, 左侧状态圆点 (绿=完成, 青=运行, 红=失败, 黄=阻塞)
- Skills: Chip 列表, 等宽字体
- Risk: 审批项, 紧凑布局
- Runtime: 键值对网格
- Artifact Preview: 仅有点击 Preview 按钮时加载

### AI 回复流式效果
- 打字机效果: Streamdown isAnimating
- 闪烁光标: `▊` 在文本末尾, CSS animation blink
- Mono 字体: JetBrains Mono 14px, 行高 1.7

### 状态指示器
- ● READY: 绿色 (#22c55e), 静态
- ● RUNNING: 青色 (#22d3ee), 脉冲动画
- ● SUBMITTED: 青色 (#22d3ee), 旋转
- ● ERROR: 红色 (#ef4444), 静态

## 间距系统

```
--space-xs:  4px
--space-sm:  8px
--space-md:  14px
--space-lg:  20px
--space-xl:  28px

--radius-sm: 6px
--radius-md: 8px
--radius-lg: 10px
--radius-xl: 12px
```

## 动画

| 元素 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 新消息入场 | fadeIn + translateY(6px) | 0.25s | ease-out |
| 流式光标 | blink (opacity) | 0.8s | step-end |
| 运行中工具 | pulse (scale) | 1.2s | ease-in-out |
| hover 状态 | background-color + border-color | 0.15s | ease |
| Tool 折叠 | height + opacity | 0.2s | ease-in-out |

## 响应式

| 断点 | 布局 |
|------|------|
| >1180px | 三栏完整 |
| 800-1180px | 双栏 (侧栏 + 聊天+监察合并) |
| <800px | 单栏堆叠 |
