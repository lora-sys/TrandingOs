# Spec D — Frontend Complete Layer (前端完成层)

> **推进式验证:** 每个页面可独立验证。全部完成后，Playwright 全链路测试覆盖所有页面。

---

## 子系统索引

| # | 子系统 | 前置依赖 | 完成后可验证 |
|---|--------|---------|-------------|
| D.1 | 缺失页面补全 | 全部 API | 15 个页面全部有真实数据 |
| D.2 | 图表集成 | D.1 | 市场 K 线 + 组合 PnL + 纪律趋势 |
| D.3 | Approval 交互 | D.1 | 审批按钮可点击（批准/拒绝/模拟） |
| D.4 | Playwright E2E 全覆盖 | D.1-D.3 | 所有页面 + 核心链路的自动测试 |

---

## D.1 — 缺失页面补全

### 现状
当前 15 个导航项中，9 个有完整页面、2 个是占位符（Evolution、Marketplace）、4 个完全缺失（Orders、Positions、Airdrop Tutor、Skill Factory）。

### 需要补全的页面

| 页面 | 当前状态 | 需要做的 |
|------|---------|---------|
| `/evolution` | Placeholder | EvolutionPage 已在新 router 中？确认并完善 |
| `/marketplace` | Placeholder | MarketplacePage 已在新 router 中？确认并完善 |
| `/settings` | 完全缺失 | 新建 SettingsPage |
| `/dashboard` | 完全缺失 | 新建 DashboardPage |
| `/orders` | 完全缺失 | 新建 OrdersPage |
| `/positions` | 完全缺失 | 合并到 Portfolio 或独立 |
| `/airdrop` | 完全缺失 | 新建 AirdropPage |
| `/skill-factory` | 完全缺失 | 新建 SkillFactoryPage |

### 前端路由（更新 `apps/web/src/router.tsx`）
```typescript
const routes = [
  // 已有路由
  createRoute({ path: "/", component: ChatPage }),
  createRoute({ path: "/market", component: MarketPage }),
  createRoute({ path: "/research", component: ResearchPage }),
  createRoute({ path: "/planner", component: PlannerPage }),
  createRoute({ path: "/portfolio", component: PortfolioPage }),
  createRoute({ path: "/journal", component: JournalPage }),
  createRoute({ path: "/review", component: ReviewPage }),
  createRoute({ path: "/evolution", component: EvolutionPage }),
  createRoute({ path: "/marketplace", component: MarketplacePage }),
  createRoute({ path: "/journey", component: BeginnerJourneyPage }),
  createRoute({ path: "/system", component: SystemPage }),
  // 新增路由
  createRoute({ path: "/dashboard", component: DashboardPage }),
  createRoute({ path: "/settings", component: SettingsPage }),
  createRoute({ path: "/airdrop", component: AirdropPage }),
  createRoute({ path: "/skill-factory", component: SkillFactoryPage }),
  // 嵌套 workspace 路由
  createRoute({ path: "/workspace/$workspaceId/chat", component: ChatPage }),
  createRoute({ path: "/workspace/$workspaceId/market", component: MarketPage }),
  createRoute({ path: "/workspace/$workspaceId/research", component: ResearchPage }),
];
```

### SettingsPage 内容
```typescript
// 设置页功能
export function SettingsPage() {
  return (
    <section>
      <h1>Settings</h1>
      <Card><Card.Header>API Keys</Card.Header>
        {/* Exa, Tavily, Jina, CoinMarketCap 等 API key 配置 */}
      </Card>
      <Card><Card.Header>Trading Mode</Card.Header>
        {/* mock / paper / live_guarded 切换 */}
      </Card>
      <Card><Card.Header>Data Export</Card.Header>
        {/* 导出 memory / journal / trades */}
      </Card>
      <Card><Card.Header>Cache Management</Card.Header>
        {/* 清除缓存按钮 */}
      </Card>
    </section>
  );
}
```

### 验收标准 (D.1)
- [ ] `npm run check` 通过，无类型错误
- [ ] 全部 15 个页面有对应路由，非 404
- [ ] Settings 页面可配置 API key、切换 Trading mode
- [ ] 所有页面从 API 获取数据（无硬编码 fake）
- [ ] 前端与概念图（foronted.png）布局一致

### E2E 测试
```typescript
// Playwright: Settings Page
test('Settings page shows all configuration sections', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('API Keys')).toBeVisible();
  await expect(page.getByText('Trading Mode')).toBeVisible();
  await expect(page.getByText('Data Export')).toBeVisible();
});

// Playwright: 所有页面可访问
const pages = ['/', '/market', '/research', '/planner', '/portfolio', '/journal', '/review', '/evolution', '/marketplace', '/settings', '/airdrop', '/journey', '/system'];
for (const path of pages) {
  test(`${path} loads without error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(path);
    expect(errors.length).toBe(0);
  });
}
```

### 前置依赖
- A、B、C 全部完成（所有 API 可用）

---

## D.2 — 图表集成

### 目标
在 Market、Portfolio、Review 页面集成可视化图表。

> **决策记录:** 图表方案采用 lightweight-charts + recharts 混用。Market 页 K 线图用 lightweight-charts（专为金融图表设计，原生 K 线/成交量支持，<50KB）。Portfolio 页 PnL 曲线和饼图、Review 页纪律趋势和错误分类用 recharts（通用图表库，交互式图例更成熟）。

### 技术选型
- K 线图：`lightweight-charts`（TradingView 出品，轻量、快速）
- 趋势线/饼图：`recharts`
- 集成到 TanStack 生态

### 具体页面

#### Market Page — K 线图
- 使用 `lightweight-charts` 的 `createChart`
- 数据源：`GET /api/market/ohlcv?symbol=ETH/USDT&timeframe=1h`
- 组件位置：市场页面，替代当前的数据表

#### Portfolio Page — PnL 曲线 + 分配饼图
- PnL 曲线：`recharts` `LineChart`（X=时间，Y=PnL）
- 分配饼图：`recharts` `PieChart`（按资产类别）
- 数据源：`GET /api/portfolio` + `GET /api/trades`

#### Review Page — 纪律趋势线
- 纪律分数趋势：`recharts` `LineChart`（X=日期，Y=disciplineScore）
- 错误分类：`recharts` `BarChart`（X=违规类型，Y=次数）
- 胜率趋势：`recharts` `LineChart`

### 验收标准 (D.2)
- [ ] Market 页面显示 K 线图（非空数据）
- [ ] Portfolio 页面显示 PnL 曲线 + 分配饼图
- [ ] Review 页面显示纪律趋势线 + 错误分类柱状图
- [ ] `npm run check` 通过，图表组件无类型错误

### E2E 测试
```typescript
test('Market page displays candlestick chart', async ({ page }) => {
  await page.goto('/market');
  await page.fill('[aria-label="Symbol"]', 'ETH/USDT');
  await page.click('text=Load Chart');
  // lightweight-charts 渲染 canvas
  await expect(page.locator('canvas')).toBeVisible();
});
```

### 前置依赖
- D.1（页面路由完整）

---

## D.3 — Approval 交互

### 目标
当前 Approval Card 是静态展示，用户不可交互。升级为可点击批准/拒绝/模拟按钮。

### 架构变更

#### API 端点
| 端点 | 方法 | 用途 |
|------|------|------|
| `POST /api/approvals/:id/approve` | POST | 批准 |
| `POST /api/approvals/:id/reject` | POST | 拒绝 |
| `POST /api/approvals/:id/simulate` | POST | 模拟（只预览不执行）|

#### ApprovalCard 组件增强
```typescript
// 当前（静态展示）
<div className="approvalCard">
  <p>{action} requires approval</p>
  <p>Risk: {riskLevel}</p>
  {/* 没有按钮 */}
</div>

// 目标（交互式）
<div className="approvalCard">
  <p>{action} requires approval</p>
  <p>Risk: {riskLevel}</p>
  <p>Reason: {reason}</p>
  <div className="approvalActions">
    <Button variant="success" onClick={() => approve(approvalId)}>Approve</Button>
    <Button variant="danger" onClick={() => reject(approvalId)}>Reject</Button>
    <Button variant="secondary" onClick={() => simulate(approvalId)}>Simulate First</Button>
  </div>
</div>
```

### 验收标准 (D.3)
- [ ] Approval Card 显示 "Approve" / "Reject" / "Simulate First" 三个按钮
- [ ] 点击 "Approve" → API 调用成功 → timeline 更新
- [ ] 点击 "Reject" → API 调用成功 → action 取消
- [ ] 审批操作写入 audit_records 表

### E2E 测试
```typescript
test('Approval card buttons are interactive', async ({ page }) => {
  // 执行一个需要审批的 action
  await page.fill('textarea', '/plan ETH/USDT 100 spot');
  await page.press('textarea', 'Enter');
  
  // 等待 approval card 出现
  const approveBtn = page.locator('button:has-text("Approve")');
  await expect(approveBtn).toBeVisible({ timeout: 15000 });
  
  // 点击批准
  await approveBtn.click();
  // 验证 timeline 更新
  await expect(page.locator('.timelineItem:has-text("approved")')).toBeVisible();
});
```

### 前置依赖
- A.5（DAG Workflow — approval gate 集成到 workflow）

---

## D.4 — Playwright E2E 全覆盖

### 目标
所有页面 + 核心链路都有 Playwright 自动测试，确保每次改动不破坏已有功能。

### Playwright 配置
```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 1,
  workers: 4,
  use: {
    baseURL: "http://localhost:8787",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 8787,
    reuseExistingServer: true,
  },
});
```

### 测试文件结构
```
tests/e2e/
  infrastructure.spec.ts    # AIO Sandbox / MCP Hub / Browser Layer
  skills.spec.ts           # 核心 skill 调用链
  pages.spec.ts            # 所有页面可访问
  trading-loop.spec.ts     # paper trade → journal → review → evolution
  airdrop.spec.ts          # 空投学习工作流
  approval.spec.ts         # 审批交互
```

### 核心链路测试 (skills.spec.ts)
```typescript
test('/research ETH creates research artifact', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', '/research ETH');
  await page.press('textarea', 'Enter');
  await expect(page.locator('.artifactCard')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.artifactCard')).toContainText('Research Report');
});

test('/browser screenshot generates PNG preview', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', '/browser screenshot https://example.com');
  await page.press('textarea', 'Enter');
  await expect(page.locator('.artifactCard')).toBeVisible({ timeout: 30000 });
  // Artifact Preview Panel 应显示 PNG 标签
  await expect(page.locator('[data-slot="tab"]:has-text("PNG")')).toBeVisible();
});

test('DAG workflow shows parallel execution in timeline', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', '/research ETH');
  await page.press('textarea', 'Enter');
  // Timeline 应显示多个并行节点
  await expect(page.locator('.timelineList')).toBeVisible({ timeout: 30000 });
});
```

### 验收标准 (D.4)
- [ ] `npx playwright test` 全部通过（headless）
- [ ] 覆盖至少 10 个测试用例
- [ ] 服务自动启停（webServer 配置）
- [ ] 测试失败时自动截图

---

## Spec D 整体验证

```bash
npm run check && npm run test && npm run build

# Playwright 全链路测试
npx playwright test --reporter=list

# 应输出:
# ✓ infrastructure.spec.ts (AIO Sandbox / MCP Hub)
# ✓ skills.spec.ts (/research / /browser / /plan)
# ✓ pages.spec.ts (15 个页面全部可访问)
# ✓ trading-loop.spec.ts (paper→journal→review→evolution)
# ✓ airdrop.spec.ts (空投工作流)
# ✓ approval.spec.ts (审批交互)
```

### 前置依赖
- D.1 + D.2 + D.3（页面、图表、审批全部完成）
