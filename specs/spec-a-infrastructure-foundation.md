# Spec A — Infrastructure Foundation Layer

> **推进式验证:** 每个子系统完成后可独立验证，不依赖后续子系统。全部完成后，系统具备 A → B 的基础连通能力。

---

## 子系统索引

| # | 子系统 | 前置依赖 | 完成后可验证 |
|---|--------|---------|-------------|
| A.1 | 项目清理 + 架构整理 | 无 | `npm run check` 通过，死代码清理 |
| A.2 | AIO Sandbox Docker + 配置 | A.1 | Docker 启动 Sandbox，API 返回健康 |
| A.3 | MCP Hub 重建 + Exa MCP | A.1 | MCP 服务器可发现、连接、调用工具 |
| A.4 | Browser Layer 重建 (对接 AIO) | A.2 + A.3 | 浏览器截图/搜索/提取全部可用 |
| A.5 | Workflow DAG 升级 | A.1 | Workflow 支持 DAG 执行 + 并行节点 |

---

## A.1 — 项目清理 + 架构整理

### 目标
清理 7 个只有 `dist/` 无源码的无效 package，重构 `tsconfig.json`，确保项目结构清晰可构建。

### 背景
当前 `packages/` 下有 7 个包只有 `dist/` 目录，无源码、无 package.json、不在 git 中、未被任何文件引用：`browser-layer`, `journal`, `mcp-hub`, `memory-engine`, `research-hub`, `search-hub`, `strategy-engine`。`tsconfig.json` 只引用了 3 个项目（core, api, web）。

> **决策记录:** 7 个 dist-only 包直接删除，不留 dist 参考。删除理由：不在 git 中、未被引用、无 package.json，保留只会干扰构建和类型检查。后续按各子系统的 spec 重建源码。

### 架构变更
- 删除 7 个无效 package 的 `dist/` 目录
- 从 `package.json` workspaces 移除这些包
- 确认 `packages/core` 不依赖这些包（已验证：core 的 package.json 没有这些依赖）
- `tsconfig.json` 保持只引用 core / api / web

### 验收标准
- [ ] `npm run check` 通过，零类型错误
- [ ] `npm run test` 全部通过（当前 9 个测试）
- [ ] `npm run build` 成功构建所有包
- [ ] `packages/` 下只保留 `core/`（其他 7 个清理干净）

### E2E 测试
```bash
npm run check && npm run test && npm run build
# 验证 API 启动
npm run dev &
curl http://localhost:8787/api/health | grep "ok"
```

---

## A.2 — AIO Sandbox Docker + 配置

### 目标
AIO Sandbox（`ghcr.io/agent-infra/sandbox:latest`）作为 Docker 服务运行，Browser Layer 可连接并调用其 API。

### 架构变更

#### docker-compose.yml 新增 service
```yaml
services:
  trading-pi:
    # ... 现有配置 ...
    environment:
      - AIO_SANDBOX_BASE_URL=http://aio-sandbox:8080
    depends_on:
      - aio-sandbox

  aio-sandbox:
    image: ghcr.io/agent-infra/sandbox:latest
    container_name: trading-pi-sandbox
    ports:
      - "8080:8080"
    security_opt:
      - seccomp=unconfined
    restart: unless-stopped
```

#### .env 新增配置
```bash
AIO_SANDBOX_BASE_URL=http://localhost:8080
```

### API 契约 (AIO Sandbox 原生 API)

| 端点 | 方法 | 用途 |
|------|------|------|
| `/v1/browser/screenshot` | GET | 浏览器截图，返回 `image/png` |
| `/v1/browser/actions` | POST | 浏览器 GUI 操作（点击、输入、滚动） |
| `/v1/browser/info` | GET | 获取 CDP URL 和 viewport 信息 |
| `/v1/shell/exec` | POST | 执行 shell 命令 |
| `/v1/file/read` | POST | 读取沙盒内文件 |
| `/v1/docs` | GET | OpenAPI 文档 |
| `/mcp` | GET | MCP 端点 |

### 验收标准 (A.2)
- [ ] `docker compose up aio-sandbox` 启动成功，日志无 error
- [ ] `curl http://localhost:8080/v1/browser/info` 返回浏览器信息
- [ ] `curl http://localhost:8080/v1/browser/screenshot` 返回 PNG 图片
- [ ] `curl http://localhost:8080/mcp` 返回 MCP 端点信息

### E2E 测试
```bash
# 1. 启动 sandbox
docker compose up -d aio-sandbox

# 2. 验证健康
curl http://localhost:8080/v1/docs | jq '.openapi' # 应显示版本号
curl http://localhost:8080/v1/browser/info | jq '.data.cdp_url' # 应返回 cdp url

# 3. 验证截图
curl -o /tmp/sandbox-test.png http://localhost:8080/v1/browser/screenshot
file /tmp/sandbox-test.png # 应显示 PNG image data
```

### 前置依赖
- A.1（项目清理完成）

---

## A.3 — MCP Hub 重建 + Exa MCP

### 目标
MCP Hub 从硬编码 metadata 升级为真实 MCP 客户端，支持动态发现、前端自助配置、自动注册工具到 Skill Registry，并为系统自进化（系统自动创造新的 MCP 服务器和技能）打好基础。

> **决策记录:** MCP 发现策略采用动态发现（非配置文件驱动）。MCP Hub 启动时自动扫描本地端口和已注册的 MCP 端点，前端提供 MCP 管理界面（"连接新 MCP"表单，输入 name/command/URL 即可连接）。长期目标是系统能自我进化——通过 Evolution Engine 自动发现、创建和注册新的 MCP 服务器和 Skills，无需手动配置。

### 架构变更

#### 新增源码：`packages/mcp-hub/`

```
packages/mcp-hub/
  package.json
  tsconfig.json
  src/
    index.ts          # 主入口，导出 McpHub 类
    client.ts         # MCP 客户端（stdio + SSE）
    registry.ts       # MCP 服务器注册表
    types.ts          # 类型定义
```

#### 核心数据流
```
Agent → Skill Registry → McpHub 
  → StdioMcpClient(spawn @exa-labs/exa-mcp-server)
  → SseMcpClient(http://localhost:8080/mcp)
  → McpTool → SkillRegistry.register()
```

### API 契约

#### MCP Hub 端点（通过 API Server）
| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/mcp/hub/servers` | GET | 列出所有 MCP 服务器 |
| `/api/mcp/hub/connect` | POST | 连接 MCP 服务器 |
| `/api/mcp/hub/disconnect` | POST | 断开 MCP 服务器 |
| `/api/mcp/hub/health` | GET | MCP Hub 健康状态 |

#### MCP 客户端类型
```typescript
// packages/mcp-hub/src/types.ts
export type McpTransport = "stdio" | "sse";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  command?: string;      // stdio: spawn command
  args?: string[];       // stdio: spawn args
  url?: string;          // sse: endpoint URL
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpHubEvents {
  onToolRegistered: (tool: McpTool) => void;
  onToolError: (error: Error) => void;
  onConnectionStatus: (serverId: string, connected: boolean) => void;
}
```

### Exa MCP 配置
```json
{
  "id": "exa-search",
  "name": "Exa Search MCP",
  "transport": "stdio",
  "command": "npx",
  "args": ["@exa-labs/exa-mcp-server", "--api-key", "${EXA_API_KEY}"]
}
```

注册后的 skill IDs:
- `mcp.exa.search` — 搜索网页
- `mcp.exa.news` — 搜索新闻
- `mcp.exa.similar` — 查找相似页面

### AIO Sandbox MCP 配置
```json
{
  "id": "aio-sandbox",
  "name": "AIO Sandbox MCP",
  "transport": "sse",
  "url": "http://localhost:8080/mcp"
}
```

注册后的 skill IDs:
- `mcp.sandbox.browser.screenshot` — 截图
- `mcp.sandbox.browser.navigate` — 导航
- `mcp.sandbox.shell.exec` — 执行命令

### 前端 MCP 管理界面（Marketplace 页面）

Marketplace 页面增加 MCP Hub 管理区块：

```typescript
// 功能:
// 1. "连接新 MCP" 表单 → 输入 name/command(args)/url → 点击连接
// 2. 已连接的 MCP 服务器列表 → 每项显示: name / status(connected/disconnected) / capabilities
// 3. 每个服务器的操作: Disconnect / Health Check / View Tools
// 4. 自动发现的结果列表 → 显示 "可用 MCP 候选" + "一键连接" 按钮
```

### 验收标准 (A.3)
- [ ] Exa MCP server 可通过 stdio 启动并连接
- [ ] Exa 搜索工具注册到 Skill Registry
- [ ] AIO Sandbox MCP 可通过 SSE 连接
- [ ] MCP Hub 健康检查返回所有已连接服务器状态
- [ ] MCP 断开后自动重连
- [ ] 前端 Marketplace 页面可配置新 MCP 连接
- [ ] 前端显示已连接 MCP 的健康状态

### E2E 测试
```bash
# 1. MCP Hub 健康
curl http://localhost:8787/api/mcp/hub/health

# 2. 连接 Exa MCP（需要 EXA_API_KEY 配置）
curl -X POST http://localhost:8787/api/mcp/hub/connect \
  -H 'Content-Type: application/json' \
  -d '{"id":"exa-search","transport":"stdio","command":"npx","args":["@exa-labs/exa-mcp-server","--api-key","${EXA_API_KEY}"]}'

# 3. 验证 Exa 工具已注册
curl http://localhost:8787/api/skills | jq '.[] | select(.id | startswith("mcp.exa"))'

# 4. 通过 Agent 调用 Exa
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/research BTC"}'
# 验证: research artifact 包含 exa 搜索结果
```

### 前置依赖
- A.1（项目清理完成）
- A.2 非必需（AIO Sandbox MCP 可后续连接）

---

## A.4 — Browser Layer 重建 (对接 AIO Sandbox)

### 目标
重建 `packages/browser-layer/` 源码，对接 AIO Sandbox 真实 API，提供 browser.search / screenshot / extract / pdf 能力。当 AIO Sandbox 不可用时，自动 fallback 到本地 Playwright。

### 架构变更

#### 新增源码：`packages/browser-layer/`
```
packages/browser-layer/
  package.json
  tsconfig.json
  src/
    index.ts            # 主入口，导出 BrowserLayer
    aio-sandbox.ts      # AIO Sandbox API 适配器
    playwright-fallback.ts  # 本地 Playwright fallback
    types.ts            # 类型定义
```

#### BrowserLayer 接口
```typescript
export type BrowserAction = 
  | "browser.search" 
  | "browser.open" 
  | "browser.extract" 
  | "browser.screenshot" 
  | "browser.pdf";

export interface BrowserResult {
  status: "completed" | "unavailable" | "failed";
  action: BrowserAction;
  sessionId: string;
  provider: "aio-sandbox" | "playwright";
  contentType?: string;
  content?: string;
  artifactKind?: "markdown" | "html" | "png" | "pdf";
  url?: string;
  reason?: string;
}

export class BrowserLayer {
  constructor(private config: { aioSandboxBaseUrl?: string }) {}
  
  async search(query: string): Promise<BrowserResult>
  async open(url: string): Promise<BrowserResult>
  async extract(url: string): Promise<BrowserResult>
  async screenshot(url: string): Promise<BrowserResult>
  async pdf(url: string): Promise<BrowserResult>
}
```

#### AIO Sandbox API 映射
| BrowserLayer action | AIO Sandbox API |
|--------------------|-----------------|
| `search(query)` | 打开浏览器 → 导航到搜索引擎 → 提取结果 |
| `open(url)` | 打开浏览器 → 导航到 URL |
| `extract(url)` | 打开页面 → 提取内容 |
| `screenshot(url)` | 打开页面 → `GET /v1/browser/screenshot` |
| `pdf(url)` | 打开页面 → 截图 → 生成 PDF |

### 错误处理规则
- AIO Sandbox 配置但不可用 → 返回 `status: "failed"` + `reason`
- AIO Sandbox 未配置（`AIO_SANDBOX_BASE_URL` 为空）→ fallback 到 Playwright
- Playwright 也不可用 → 返回 `status: "unavailable"`
- 任何情况都不抛异常

### 验收标准 (A.4)
- [ ] `browser.screenshot(url)` 返回 PNG base64 content
- [ ] `browser.extract(url)` 返回页面 Markdown 内容
- [ ] `browser.search(query)` 返回搜索结果列表
- [ ] AIO Sandbox 断开时自动 fallback 到 Playwright
- [ ] 所有 browser action 生成 evidence artifact

### E2E 测试
```bash
# 1. 截图测试（通过 AIO Sandbox）
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/browser screenshot https://example.com"}'
# 验证: 返回 artifact 包含 previewReady: true, contentType: "image/png"

# 2. 搜索测试
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/browser search ETH price"}'
# 验证: 返回 browser evidence artifact

# 3. Playwright fallback 测试（非 AIO Sandbox 环境）
AIO_SANDBOX_BASE_URL="" npm run dev &
# 同样请求应返回 status: "completed", provider: "playwright"
```

### 前置依赖
- A.1（项目清理）
- A.2 + A.3（AIO Sandbox 运行 + MCP Hub 可用，用于 skill 注册）

---

## A.5 — Workflow DAG 升级

> **决策记录:** DAG 改造采用渐进策略——先改造 `research.investment_committee` 验证 DAG 引擎模式（bull/bear/tech 并行→debate 合并→report），通过验收后再改造剩余的 4 个 workflow（trade_plan、review.daily、evolution.strategy_patch、airdrop.learning）。不一次性全改。

### 目标
从线性 `runSkill() → runSkill() → runSkill()` 升级为 DAG 工作流引擎，支持并行节点、条件分支、重试策略和事件流。

### 架构变更

#### 当前（线性）
```typescript
// 当前 workflow.ts
const result1 = await runSkill("skill.a", input);
const result2 = await runSkill("skill.b", result1);
const result3 = await runSkill("skill.c", result2);
```

#### 目标（DAG）
```typescript
// workflow-spec.md v4.1 格式
const dag = new WorkflowDAG({
  id: "research.investment_committee",
  steps: [
    { id: "bull", type: "skill", uses: "research.bull_case", dependsOn: [] },
    { id: "bear", type: "skill", uses: "research.bear_case", dependsOn: [] },
    { id: "tech", type: "skill", uses: "research.technical_case", dependsOn: [] },
    { id: "debate", type: "skill", uses: "research.debate", dependsOn: ["bull", "bear", "tech"] },
    { id: "report", type: "artifact", uses: "artifact.create_report", dependsOn: ["debate"] },
  ],
});
```

#### 核心类型（`packages/core/src/workflows/types.ts`）
```typescript
export interface DAGNode {
  id: string;
  type: "skill" | "workflow" | "artifact" | "approval" | "condition";
  uses: string;
  dependsOn: string[];
  retry?: { maxAttempts: number; backoffMs: number };
  onFailure?: "abort" | "skip" | "continue";
}

export interface WorkflowManifest {
  id: string;
  name: string;
  version: string;
  nodes: DAGNode[];
  approvals?: string[];
}
```

#### 改造范围
- 新增 `WorkflowEngine.addDag(manifest)` 方法
- 新增 DAG 执行器（拓扑排序 + 并行执行）
- 现有 workflows 迁移到 DAG 格式
- timeline 事件增加节点级粒度

### 升级后的 workflow 清单

| Workflow ID | DAG 节点数 | 说明 |
|---|---|---|
| `research.investment_committee` | 5 | bull/bear/tech/debate/report |
| `trading.trade_plan` | 5 | market/research/risk/plan/approval |
| `review.daily` | 4 | trades/journal/metrics/artifact |
| `evolution.strategy_patch` | 5 | review/propose/backtest/compare/approval |
| `airdrop.learning` | 5 | search/verify/scam/eligibility/guide |

### 验收标准 (A.5)
- [ ] DAG 工作流支持并行节点执行（bull/bear/tech 同时跑）
- [ ] DAG 工作流失败时按 `onFailure` 策略处理
- [ ] 现有 5 个 workflow 全部迁移到 DAG 格式
- [ ] timeline 事件细化到节点级别（不仅是 workflow 级别）
- [ ] 重试策略生效（`retry.maxAttempts > 1` 时自动重试）

### E2E 测试
```typescript
// Playwright: 测试 DAG 工作流
// 1. 执行 /research ETH
// 2. 验证 timeline 显示 bull/bear/tech 三个并行节点
// 3. 验证 debate 节点在三个并行节点完成后才执行
// 4. 验证最终 artifact 创建

// API 测试
curl -X POST http://localhost:8787/api/workflows/research.investment_committee/run \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","input":{"symbol":"ETH/USDT"}}'
// 验证: 返回包含所有节点的执行状态
```

### 前置依赖
- A.1（项目清理完成）

---

## Spec A 整体验证

全部 5 个子系统完成后：

```bash
# 1. 项目构建
npm run check && npm run test && npm run build

# 2. 启动所有服务
docker compose up -d

# 3. 验证 AIO Sandbox
curl http://localhost:8080/v1/browser/info

# 4. 验证 MCP Hub
curl http://localhost:8787/api/mcp/hub/servers | jq length  # 应 > 0

# 5. 验证 Browser 截图（通过 Agent）
curl -X POST http://localhost:8787/api/session/message \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","message":"/browser screenshot https://example.com"}'

# 6. 验证 DAG Workflow
curl -X POST http://localhost:8787/api/workflows/research.investment_committee/run \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","input":{"symbol":"ETH/USDT"}}'

# 7. Playwright E2E（打开浏览器验证全链路）
npx playwright test tests/e2e/infrastructure.spec.ts
```

## 开发顺序

```
A.1 (清理) → A.2 (Sandbox Docker) → A.3 (MCP Hub + Exa) 
                                  ↘ A.4 (Browser Layer)
A.5 (DAG)  可在 A.1 后任意时间做，独立
```
