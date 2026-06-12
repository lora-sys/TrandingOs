前端目录：`apps/web/src/`

## 背景

当前状态：
- Tailwind v4 已安装（`@tailwindcss/vite`），但所有组件仍用 `styles.css` 里的自定义 CSS class（`.appShell`、`.topBar`、`.sidebar` 等）
- `styles.css` 是 71KB 单文件，包含所有布局、组件、响应式样式
- `apps/web/src/components/ui/` 下已有 17 个 shadcn/ui 组件，但主组件没有使用它们
- `@heroui/react` 和 shadcn 并存，需要清理
- 布局状态（`leftOpen`、`rightOpen`、`previewOpen`）分散在 `Layout.tsx` 本地，通过 props 层层传递
- `TopBar.tsx` 导入 `../api/client.js`，其他组件导入 `../api.js`，路径不一致

## 目标

1. `styles.css` 只保留 `@import "tailwindcss"`、`@theme` design tokens、全局 reset（约 60 行）
2. 所有组件改用 Tailwind v4 utility classes + shadcn/ui 组件
3. Zustand 全局 UI 状态，消除 props drilling
4. 修复所有已知 Bug
5. 路由懒加载

---

## 设计美学（frontend-design 方向）

### 设计哲学

**暗色交易终端 × AI 助手精度** — 极简、高信息密度、终端质感。

| 原则 | 说明 |
|------|------|
| **Chat is King** | 聊天区占 60%+ 可视面积，header 极简，对话最大化 |
| **信息分层** | 用户消息 / AI 回复 / 工具调用 / 系统事件，视觉层级分明 |
| **面板即服务** | 右侧 panel 默认折叠，artifact 生成后自动展开 |
| **最小噪音** | 无冗余文字、无多余卡片、无不需要的边框 |
| **终端质感** | 暗色、等宽字体、圆点状态指示器、精密间距 |

### 色彩系统

```css
/* 极简暗色板 — 只有真正需要的地方才有颜色 */
--color-bg-app:         #080b10;      /* 应用背景 */
--color-bg-sidebar:     #0c131c;      /* 侧栏 */
--color-bg-surface:     #0f1722;      /* 卡片/面板 */
--color-bg-hover:       #162033;      /* 悬浮状态 */
--color-bg-user-msg:    #1a2d42;      /* 用户消息气泡 */
--color-bg-elevated:    #141e2e;      /* 模态/弹出层 */

--color-border:         rgba(255,255,255,.08);
--color-border-hover:   rgba(255,255,255,.12);
--color-border-active:  #22d3ee;

--color-text-primary:   #e8edf5;
--color-text-secondary: #7a8ba0;
--color-text-muted:     #5b6c7d;

--color-cyan:           #22d3ee;      /* 信息/运行中 */
--color-emerald:        #22c55e;      /* 成功 */
--color-amber:          #f59e0b;      /* 警告 */
--color-red-trading:    #ef4444;      /* 错误/止损 */
```

### 字体系统

| 元素 | 字体 | 字号 | 字重 |
|------|------|------|------|
| UI 文字 | Noto Sans SC (Inter fallback) | 13px | 400 |
| AI 回复 | JetBrains Mono | 14px | 400 |
| 用户消息 | Noto Sans SC | 14px | 400 |
| 工具调用 | JetBrains Mono | 12px | 400 |
| 状态标签 | JetBrains Mono | 11px | 500 |
| 品牌 π | serif | 22px | 900 |
| 数值/价格 | JetBrains Mono | 13px | 500 |

### 动效规范

| 元素 | 动效 | 时长 |
|------|------|------|
| 新消息进入 | fadeIn + slideInUp | 0.25s ease-out |
| 流式光标 | blink | 0.8s step-end |
| 运行中圆点 | pulse | 1.2s ease-in-out |
| 面板展开/收起 | slideIn + grid transition | 0.3s cubic-bezier |
| 按钮悬浮 | color/background transition | 0.15s |
| 面板 toggle 按钮位置 | right 属性 transition | 0.3s cubic-bezier |

---

## 第一步：重构 styles.css → 只保留 @theme

将 `apps/web/src/styles.css` 精简为：

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600&display=swap');
@import "tailwindcss";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

/* ─── Design Tokens → Tailwind v4 @theme ─── */
@theme {
  --color-bg-app:         #080b10;
  --color-bg-sidebar:     #0c131c;
  --color-bg-surface:     #0f1722;
  --color-bg-hover:       #162033;
  --color-bg-user-msg:    #1a2d42;
  --color-bg-input:       #0f1722;
  --color-bg-elevated:    #141e2e;

  --color-border:         rgba(255,255,255,.08);
  --color-border-hover:   rgba(255,255,255,.12);
  --color-border-active:  #22d3ee;

  --color-text-primary:   #e8edf5;
  --color-text-secondary: #7a8ba0;
  --color-text-muted:     #5b6c7d;

  --color-cyan:           #22d3ee;
  --color-emerald:        #22c55e;
  --color-amber:          #f59e0b;
  --color-red-trading:    #ef4444;

  --font-family-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-family-sans: 'Noto Sans SC', sans-serif;

  --font-size-xs:   11px;
  --font-size-sm:   12px;
  --font-size-base: 13px;
  --font-size-md:   13px;
  --font-size-lg:   15px;
  --font-size-xl:   17px;
  --font-size-xxl:  19px;

  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* ─── Motion ─── */
  --animate-fade-in: fadeIn 0.25s ease-out;
  --animate-slide-in-up: slideInUp 0.25s ease-out;
  --animate-pulse: pulse 1.2s ease-in-out infinite;
  --animate-blink: blink 0.8s step-end infinite;
  --animate-cursor-blink: cursorBlink 0.8s step-end infinite;
  --animate-spin: spin 1s linear infinite;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes blink { 50% { opacity: 0; } }
@keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* ─── Reset ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { font-family: var(--font-family-mono); color-scheme: dark; }

/* ─── App Shell Grid ─── */
/* 保留这个，因为 CSS grid 动态列宽用 CSS 变量比 Tailwind 更简洁 */
.appShell {
  height: 100vh;
  width: 100vw;
  display: grid;
  grid-template-rows: 48px 1fr;
  grid-template-columns: var(--left-w, 260px) 1fr var(--preview-w, 0px) var(--right-w, 280px);
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  background: #080b10;
}
.appShell.left-open   { --left-w: 260px; }
.appShell:not(.left-open) { --left-w: 0px; }
.appShell.preview-open { --preview-w: 480px; }
.appShell:not(.preview-open) { --preview-w: 0px; }
.appShell.right-open  { --right-w: 280px; }
.appShell:not(.right-open) { --right-w: 0px; }
@media (min-width: 1400px) { .appShell.preview-open { --preview-w: 600px; } }
@media (max-width: 1200px) { .appShell.preview-open.right-open { --right-w: 0px; } }
@media (max-width: 768px)  { .appShell { grid-template-columns: 0px 1fr 0px 0px; } }
```

删除 styles.css 中所有其他内容（`.topBar`、`.sidebar`、`.chatWorkspace`、`.btn`、`.card` 等所有自定义 class）。

---

## 第二步：新建 Zustand store

新建 `apps/web/src/lib/store.ts`：

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  leftOpen: boolean;
  rightOpen: boolean;
  previewOpen: boolean;
  selectedArtifactId: string | undefined;
  paperTrading: boolean;
  sessionId: string | undefined;

  setLeftOpen: (v: boolean) => void;
  setRightOpen: (v: boolean) => void;
  setPreviewOpen: (v: boolean, artifactId?: string) => void;
  setPaperTrading: (v: boolean) => void;
  setSessionId: (id: string | undefined) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      previewOpen: false,
      selectedArtifactId: undefined,
      paperTrading: true,
      sessionId: undefined,
      setLeftOpen: (v) => set({ leftOpen: v }),
      setRightOpen: (v) => set({ rightOpen: v }),
      setPreviewOpen: (v, artifactId) =>
        set({ previewOpen: v, selectedArtifactId: artifactId ?? undefined }),
      setPaperTrading: (v) => set({ paperTrading: v }),
      setSessionId: (id) => set({ sessionId: id }),
    }),
    {
      name: "trading-pi-ui",
      partialize: (s) => ({ paperTrading: s.paperTrading, leftOpen: s.leftOpen }),
    }
  )
);
```

安装 zustand：在 `apps/web/package.json` 的 `dependencies` 中添加 `"zustand": "^5.0.0"`，并在 monorepo 根目录运行 `pnpm install`。

---

## 第三步：重构 Layout.tsx

`apps/web/src/components/Layout.tsx` 改为从 `useUIStore` 读取状态，移除所有本地 `useState`，移除 `SessionProvider`（session 状态迁移到 store）：

```tsx
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useUIStore } from "../lib/store.js";
import { TopBar } from "./TopBar.js";
import { LeftSidebar } from "./LeftSidebar.js";
import { RightSidebar } from "./RightSidebar.js";
import { PreviewPanel } from "./PreviewPanel.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

export function Layout({ children }: { children: ReactNode }) {
  const { leftOpen, rightOpen, previewOpen, selectedArtifactId, setPreviewOpen } = useUIStore();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setPreviewOpen]);

  return (
    <main
      className={`appShell ${leftOpen ? "left-open" : ""} ${rightOpen ? "right-open" : ""} ${previewOpen ? "preview-open" : ""}`}
      id="appShell"
    >
      <TopBar />

      <ErrorBoundary name="LeftSidebar">
        <LeftSidebar />
      </ErrorBoundary>

      <section className="workspace overflow-hidden flex flex-col bg-bg-app">
        {children}
      </section>

      {/* 条件渲染，不再 display:none */}
      {previewOpen && (
        <PreviewPanel artifactId={selectedArtifactId} onClose={() => setPreviewOpen(false)} />
      )}

      {/* previewToggleBtn：用 CSS 变量定位，不再硬编码像素 */}
      <button
        className="fixed bottom-8 z-50 flex items-center justify-center w-7 h-7 rounded-sm bg-bg-surface border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-all duration-300"
        style={{ right: "calc(var(--right-w, 280px) + var(--preview-w, 0px) + 12px)" }}
        onClick={() => setPreviewOpen(!previewOpen)}
        title={previewOpen ? "Hide Preview" : "Show Preview"}
      >
        {previewOpen ? "▶" : "◀"}
      </button>

      <ErrorBoundary name="RightSidebar">
        <RightSidebar />
      </ErrorBoundary>
    </main>
  );
}
```

---

## 第四步：重构 TopBar.tsx

`apps/web/src/components/TopBar.tsx` 改为：
- 从 `useUIStore` 读取 `paperTrading`、`setPaperTrading`、`setLeftOpen`、`setRightOpen`
- 导入路径统一为 `../api.js`（删除 `../api/client.js` 引用）
- Settings 按钮加 `useNavigate` 路由跳转
- Paper Mode 按钮连接真实状态
- 全部用 Tailwind utility classes，不再用 `.topBar`、`.paperModeBtn` 等 CSS class

```tsx
import { useQuery } from "@tanstack/react-query";
import { Settings, User, Menu, PanelRightOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { tradingPiApi } from "../api.js";
import { useUIStore } from "../lib/store.js";

export function TopBar() {
  const navigate = useNavigate();
  const { leftOpen, setLeftOpen, setRightOpen, paperTrading, setPaperTrading } = useUIStore();

  const { data: statusData } = useQuery({
    queryKey: ["status"],
    queryFn: tradingPiApi.status,
    refetchInterval: 3000,
  });

  const agentRunning = statusData?.status === "running";

  return (
    <header className="col-span-full flex items-center justify-between px-[18px] h-12 border-b border-border bg-bg-sidebar gap-[14px]">
      {/* Brand */}
      <div className="flex items-center gap-[10px] shrink-0">
        <button
          className="flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setLeftOpen(!leftOpen)}
          aria-label="Toggle left sidebar"
        >
          <Menu size={18} />
        </button>
        <div className="w-7 h-7 grid place-items-center rounded-sm bg-gradient-to-br from-cyan to-emerald text-[#061016] font-serif text-base font-black">
          π
        </div>
        <div className="flex items-center gap-[6px]">
          <h1 className="text-[13px] font-bold text-text-primary tracking-[0.5px] hidden sm:block">TRADING PI</h1>
          <h1 className="text-[13px] font-bold text-text-primary tracking-[0.5px] sm:hidden">TP</h1>
          <span className="text-[10px] font-semibold text-cyan bg-cyan/10 border border-cyan/20 rounded-[2px] px-1.5 py-px tracking-[0.5px]">MVP</span>
        </div>
        <span className="text-[12px] text-text-secondary whitespace-nowrap hidden md:block">
          AI 交易助手 · 研究 → 计划 → 模拟 → 复盘闭环
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[10px] shrink-0">
        {/* Agent status indicator */}
        {agentRunning && (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
            Running
          </span>
        )}

        {/* Paper Mode toggle */}
        <button
          onClick={() => setPaperTrading(!paperTrading)}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-sm border text-[12px] font-medium transition-all ${
            paperTrading
              ? "border-cyan/25 bg-cyan/8 text-cyan hover:bg-cyan/14 hover:border-cyan/40"
              : "border-amber/25 bg-amber/8 text-amber hover:bg-amber/14 hover:border-amber/40"
          }`}
        >
          <span className="hidden sm:inline">{paperTrading ? "Paper Mode" : "Live Mode"}</span>
          <span className="sm:hidden">{paperTrading ? "P" : "L"}</span>
        </button>

        <button
          className="text-text-muted hover:text-text-primary transition-colors p-1"
          title="Settings"
          aria-label="Settings"
          onClick={() => navigate({ to: "/settings" })}
        >
          <Settings size={16} />
        </button>

        <div className="flex items-center gap-[6px] cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a2d42] to-bg-surface border border-border grid place-items-center overflow-hidden">
            <User size={14} className="text-text-secondary" />
          </div>
          <span className="text-[12px] text-text-secondary hidden lg:block">Trading Pi User</span>
        </div>

        <button
          className="text-text-muted hover:text-text-primary transition-colors p-1"
          onClick={() => setRightOpen((prev: boolean) => !prev)}
          aria-label="Toggle right sidebar"
        >
          <PanelRightOpen size={18} />
        </button>
      </div>
    </header>
  );
}
```

---

## 第五步：重构 LeftSidebar.tsx

`apps/web/src/components/LeftSidebar.tsx` 改为：
- 从 `useUIStore` 读取 `sessionId`、`setSessionId`、`paperTrading`、`leftOpen`
- 移除本地 `paperTrading` state
- 移除 `drawerOpen`/`onCloseDrawer` props
- `WorkspaceItem` 改为 `<Link>` 组件，连接到对应路由
- `setSessionId("")` 改为 `setSessionId(undefined)`
- 修复 `isTablet` auto-collapse stale closure（在 `useEffect` 依赖数组中加入 `collapsed`）
- 全部用 Tailwind utility classes

关键改动示例：
```tsx
import { Link } from "@tanstack/react-router";
import { useUIStore } from "../lib/store.js";

const WorkspaceItem = memo(function WorkspaceItem({ ws, collapsed }: WorkspaceItemProps) {
  const Icon = ws.icon;
  return (
    <Link
      to={ws.path}
      className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
      activeProps={{ className: "text-cyan bg-cyan/8" }}
    >
      <Icon size={16} aria-hidden />
      {!collapsed && <span className="text-[12px]">{ws.label}</span>}
    </Link>
  );
});
```

工作空间路由映射：
- `trading` → `/`
- `research` → `/research`
- `review` → `/review`
- `notes` → `/journal`
- `market` → `/market`
- `portfolio` → `/portfolio`

---

## 第六步：重构 RightSidebar.tsx

`apps/web/src/components/RightSidebar.tsx` 改为：
- 移除 `drawerOpen`/`onCloseDrawer`/`onOpenPreview` props，从 `useUIStore` 读取
- 移除 `style={{ gridColumn: 4 }}`，改为纯 CSS class
- 修复 memory 数据结构：
  ```ts
  const memoryUsage = useMemo(() => {
    const records = Array.isArray(memoryData) ? memoryData : [];
    return {
      shortTermCount: records.filter((r: any) => r.domain === "conversation").length,
      longTermCount: records.filter((r: any) => r.domain !== "conversation").length,
      userPrefsLoaded: records.length > 0,
    };
  }, [memoryData]);
  ```
- 全部用 Tailwind utility classes

---

## 第七步：重构 PreviewPanel.tsx

修复两个核心 Bug：

**1. K线图分离初始化和数据更新**：
```ts
const chartRef = useRef<IChartApi | null>(null);
const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

// 只初始化一次
useEffect(() => {
  if (!chartContainerRef.current) return;
  const chart = createChart(chartContainerRef.current, { /* options */ });
  const series = chart.addSeries(CandlestickSeries, { /* colors */ });
  chartRef.current = chart;
  seriesRef.current = series;
  const handleResize = () => {
    if (chartContainerRef.current)
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
  };
  window.addEventListener("resize", handleResize);
  return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
}, []); // 空依赖

// 只更新数据
useEffect(() => {
  if (!seriesRef.current || !chartData?.length) return;
  seriesRef.current.setData(chartData as any);
  chartRef.current?.timeScale().fitContent();
}, [chartData]);
```

**2. 修复 EMA 计算**（当前是 SMA）：
```ts
function calcEMA(closes: number[], period: number): number {
  if (closes.length < period) return closes.reduce((a, b) => a + b, 0) / closes.length;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i]! * k + ema * (1 - k);
  }
  return ema;
}
```

全部用 Tailwind utility classes 替换 `.previewPanel`、`.chartContainer` 等 CSS class。

---

## 第八步：重构 ChatWorkspace.tsx

**修复 timeline 跨 session 污染**：
```ts
const { data: rawTimeline } = useQuery<RichTimeline[]>({
  queryKey: ["timeline", sessionId],
  queryFn: () => tradingPiApi.timeline(sessionId),
  refetchInterval: false, // 不轮询，由 SSE done 事件触发 invalidate
});
```

如果后端 `/api/timeline` 不支持 `sessionId` 参数，在前端过滤：
```ts
const sessionTimeline = useMemo(
  () => (rawTimeline ?? []).filter(e => !e.sessionId || e.sessionId === sessionId),
  [rawTimeline, sessionId]
);
```

全部用 Tailwind utility classes 替换 `.chatWorkspace`、`.messageList`、`.composerBar` 等 CSS class。

---

## 第九步：重构 session.tsx

`apps/web/src/components/session.tsx` 中的 `SessionProvider` 和 `useSession` 改为从 `useUIStore` 读取：

```ts
// session.tsx - 保留 hook 接口以减少改动量
import { useUIStore } from "../lib/store.js";

export function useSession() {
  const { sessionId, setSessionId } = useUIStore();
  return { sessionId, setSessionId };
}

// SessionProvider 变为 passthrough
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

## 第十步：重构所有 Route 页面

对 `apps/web/src/routes/` 下的所有页面组件，将 CSS class 替换为 Tailwind utility classes：

- `ChatPage.tsx`：`.chatPage` → `flex flex-col h-full`
- `MarketPage.tsx`：`.marketPage`、`.artifactGrid`、`.artifactCard` → Tailwind grid/flex
- `ReviewPage.tsx`：`.reviewPage` → Tailwind
- `PortfolioPage.tsx`：`.portfolioPage` → Tailwind
- `JournalPage.tsx`：`.journalPage` → Tailwind
- `ResearchPage.tsx`：`.researchPage` → Tailwind
- 其他页面同理

---

## 第十一步：路由懒加载

`apps/web/src/router.tsx` 改为懒加载非首屏路由：

```tsx
import { lazy, Suspense } from "react";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { Layout } from "./components/Layout.js";
import { ChatPage } from "./routes/ChatPage.js"; // 首屏不懒加载

const MarketPage = lazy(() => import("./routes/MarketPage.js").then(m => ({ default: m.MarketPage })));
const ResearchPage = lazy(() => import("./routes/ResearchPage.js").then(m => ({ default: m.ResearchPage })));
const PlannerPage = lazy(() => import("./routes/PlannerPage.js").then(m => ({ default: m.PlannerPage })));
const PortfolioPage = lazy(() => import("./routes/PortfolioPage.js").then(m => ({ default: m.PortfolioPage })));
const JournalPage = lazy(() => import("./routes/JournalPage.js").then(m => ({ default: m.JournalPage })));
const ReviewPage = lazy(() => import("./routes/ReviewPage.js").then(m => ({ default: m.ReviewPage })));
// ... 其他页面

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted text-[12px]">Loading...</div>}>
        <Outlet />
      </Suspense>
    </Layout>
  ),
});
```

---

## 第十二步：性能优化 - 移除全局轮询

`apps/web/src/main.tsx` 改为：

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: false, // 默认不轮询
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

各组件按需设置 `refetchInterval`：
- `status` query：`refetchInterval: 3000`（只在 TopBar）
- `sessions` query：`refetchInterval: 30000`（LeftSidebar）
- `ohlcv` query：`refetchInterval: 60000`（PreviewPanel）
- 其他 query：不轮询，由 SSE 事件触发 `queryClient.invalidateQueries`

---

## 第十三步：清理 @heroui/react

检查哪些组件实际使用了 `@heroui/react`（`grep -r "@heroui" apps/web/src/`），如果只有少量使用，用 shadcn/ui 对应组件替换，然后从 `package.json` 中移除 `@heroui/react`、`@heroui/styles`、`@heroui/theme`，避免与 shadcn 的样式冲突。

---

## 第十四步：统一 API 导入路径

将 `apps/web/src/components/TopBar.tsx` 中的 `import { tradingPiApi } from "../api/client.js"` 改为 `import { tradingPiApi } from "../api.js"`。

检查 `apps/web/src/api/` 目录下是否有 `client.ts`，如果有则将其内容合并到 `apps/web/src/api.ts`，删除 `apps/web/src/api/` 目录。

---

## 验收标准 + Playwright E2E 测试方案

### 验收检查清单

- [ ] `styles.css` 只剩 `@import`、`@theme`、reset、`.appShell` grid（约 80 行）
- [ ] 所有组件不再使用 `.topBar`、`.sidebar`、`.chatWorkspace` 等自定义 CSS class
- [ ] `PreviewPanel` 只在 `previewOpen === true` 时挂载（条件渲染）
- [ ] K线图不再闪烁（chart 只初始化一次，数据更新用 `series.setData()`）
- [ ] `WorkspaceItem` 点击可以路由跳转
- [ ] `paperTrading` 开关在 TopBar 和 LeftSidebar 显示一致（来自同一 store）
- [ ] memory 显示正确的条数（按 domain 过滤）
- [ ] EMA 计算使用真正的指数移动平均
- [ ] 默认不全局轮询，只有 `status` 保持 3s 轮询
- [ ] 所有 API 导入路径统一为 `../api.js`
- [ ] 非首屏路由懒加载
- [ ] `@heroui/react` 依赖已清理（如无实际使用）

### Playwright E2E 验收流程

每一步使用 `playwright-cli` 在浏览器中验证。前置条件：`npm run dev` 在后台运行。

#### 1️⃣ 基础布局验证

```bash
# 打开浏览器
playwright-cli open http://localhost:5173

# 验证布局结构
playwright-cli snapshot
# 检查点：
# - 页面加载无白屏
# - 顶部栏可见（π logo + TRADING PI 标题）
# - 左侧栏可见（导航项：Chat、Research、Portfolio 等）
# - 聊天区可见（"Trading Pi" header + 输入框）
# - 右侧栏可见（Timeline、Agent State 等 section）
```

#### 2️⃣ 侧栏折叠/展开

```bash
# 记下当前 snapshot 的元素 ref（假设 left sidebar toggle = e3, right sidebar toggle = e25）

# 点击左侧栏 toggle 按钮
playwright-cli click e3
playwright-cli snapshot
# 验证：左侧栏折叠，聊天区宽度增加

# 再次展开
playwright-cli click e3
playwright-cli snapshot
# 验证：左侧栏恢复

# 点击右侧栏 toggle 按钮
playwright-cli click e25
playwright-cli snapshot
# 验证：右侧栏折叠

# 再次展开
playwright-cli click e25
playwright-cli snapshot
```

#### 3️⃣ 聊天功能（核心 MVP 流程）

```bash
# 在聊天输入框中输入消息
# 找到 textarea / input 元素
playwright-cli snapshot
# 假设输入框为 e10
playwright-cli click e10
playwright-cli type "/research ETH"
playwright-cli press Enter

# 等待 AI 响应（观察 SSE 流式输出）
playwright-cli snapshot
# 验证：
# - 用户消息显示在聊天区（右对齐，深色气泡）
# - 状态圆点变为 cyan + RUNNING
# - AI 回复逐字出现（流式效果）
# - 工具调用卡片显示（cyan 左边框）
# - 最终回复内容合理

# 等待流式完成
sleep 5
playwright-cli snapshot
# 验证：状态恢复 idle
```

#### 4️⃣ Artifact Preview 面板

```bash
# 发送一条会生成 artifact 的命令
playwright-cli click e10
playwright-cli type "/plan ETH 100 spot"
playwright-cli press Enter

sleep 8
playwright-cli snapshot
# 验证：
# - artifact 卡片出现在聊天流中
# - 右侧 Preview Panel 自动展开
# - Preview Panel 显示 Markdown 内容
# - 有 Copy / Fullscreen 等操作按钮
```

#### 5️⃣ 导航路由跳转（懒加载验证）

```bash
# 点击 Market 导航项
# 假设 Market nav item = e6
playwright-cli click e6
playwright-cli snapshot
# 验证：URL 变为 /market，页面内容为 MarketPage

# 点击 Portfolio
# 假设 Portfolio nav item = e8
playwright-cli click e8
playwright-cli snapshot
# 验证：URL 变为 /portfolio

# 点击 Chat 返回首页
playwright-cli click e4
playwright-cli snapshot
# 验证：URL 变为 / 或 /chat
```

#### 6️⃣ Paper Mode 切换

```bash
# 找到 Paper Mode 按钮（在 TopBar）
playwright-cli snapshot
# 假设 Paper Mode 按钮 = e15

# 点击切换
playwright-cli click e15
playwright-cli snapshot
# 验证：按钮文字从 "Paper Mode" 变为 "Live Mode"，颜色从 cyan 变为 amber

# 再切回来
playwright-cli click e15
playwright-cli snapshot
```

#### 7️⃣ 响应式布局验证

```bash
# 缩小浏览器窗口
playwright-cli set-viewport 800 900
playwright-cli snapshot
# 验证：768-1200px 区间，右侧栏自动折叠

# 进一步缩小到移动端
playwright-cli set-viewport 375 812
playwright-cli snapshot
# 验证：<768px 时，侧栏按钮变为移动菜单，面板叠在下方

# 恢复
playwright-cli set-viewport 1440 900
```

#### 8️⃣ K线图 + EMA 验证

```bash
# 打开 MarketPage
playwright-cli click e6
sleep 2
playwright-cli snapshot
# 验证：K线图渲染无闪烁，EMA 线显示

# 检查 EMA 数值合理性（假设 EMA 显示在指标表中）
# 截图保存验证
playwright-cli screenshot
```

#### 9️⃣ 性能与错误边界

```bash
# 检查控制台无报错
playwright-cli console
# 验证：无 React error、无 404、无 CORS 错误

# 检查网络请求
playwright-cli requests
# 验证：
# - /api/health 正常返回
# - /api/status 3s 轮询正常
# - 其他 API 不轮询（请求间隔 > 30s）
```

#### 🔟 懒加载 + 构建验证

```bash
# 检查 Network tab 确认非首屏路由 JS 是动态加载的
playwright-cli requests
# 看是否有 .chunk.js 按需加载
```

#### ✅ 完整回归测试

```bash
# 关闭浏览器
playwright-cli close

# TypeScript 检查
npm run check

# 单元测试
npm run test
```

### 回滚策略

如果 playwright E2E 验收失败：
1. `git stash` 暂存重构改动
2. `npm run check && npm run test` 确认原始代码正常
3. 逐一排查失败的测试步骤
4. 修复后重新运行对应 playwright 步骤
5. 全部通过后 `git stash pop`
