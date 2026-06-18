# Guardrails 模块：审批引擎 + 产物引擎

> **路径**: `packages/core/src/guardrails/`
>
> **子模块**:
> - `approvals/approval-engine.ts` — 审批引擎（权限门控）
> - `artifacts/artifact-engine.ts` — 产物引擎（持久化输出存储）
>
> **定位**: 工作流执行的两大护栏——审批引擎在执行前拦截高风险操作，产物引擎在执行后固化输出成果。两者通过 Timeline 事件共享审计轨迹。

---

## Part A：审批引擎 (`ApprovalEngine`)

### 模块目的

权限门控机制，在危险或高风险操作执行前阻断流程，直至用户显式授予批准。确保 AI Agent 无法自主执行可能造成资金损失、系统变更或安全风险的操作。

### 核心类型

#### `PermissionRequest`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 审批记录唯一标识（格式 `app_xxx`） |
| `toolName` | `string` | 被拦截的工具/动作名称 |
| `description` | `string` | 操作描述/原因 |
| `riskLevel` | `string` | 风险等级（`low` / `medium` / `high` / `critical`） |
| `sessionId` | `string?` | 关联会话 ID |
| `status` | `"pending" \| "approved" \| "denied"` | 审批状态 |
| `createdAt` | `string` | 创建时间（ISO 8601） |
| `resolvedAt` | `string?` | 决策时间（批准/拒绝时写入） |

### 危险操作集合（硬编码）

以下操作无论 `riskLevel` 为何值，均强制触发审批：

| 动作标识 | 风险说明 |
|----------|----------|
| `real.order` | **实盘下单** — 涉及真实资金交易 |
| `strategy.patch.apply` | **策略热补丁** — 直接修改运行中策略 |
| `api.key.update` | **API 密钥更新** — 凭证变更操作 |
| `skill.install` | **技能安装** — 外部代码引入系统 |
| `mcp.enable` | **MCP 服务启用** — 外部工具链接入 |
| `sandbox.export` | **沙箱导出** — 数据/文件导出边界 |

### `ApprovalEngine` 类方法

#### `requiresApproval(action, riskLevel?, sessionId?)`

判断某操作是否需要用户审批。

```
决策逻辑：
1. 若 sessionId 在 autoApproveSessions 中 → 直接返回 false（跳过审批）
2. 若 action ∈ dangerousActions → 返回 true
3. 若 riskLevel === "high" 或 "critical" → 返回 true
4. 其他情况 → 返回 false
```

#### `request(input)`

创建审批记录并写入 Timeline。

**输入参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | `string` | ✅ | 动作名称 |
| `riskLevel` | `string` | ✅ | 风险等级 |
| `reason` | `string` | ✅ | 申请理由 |
| `payload` | `unknown` | ✅ | 操作载荷（JSON 序列化存入 DB） |
| `sessionId` | `string?` | ❌ | 关联会话 |
| `workflowRunId` | `string?` | ❌ | 关联工作流运行 |

**返回**: `approvalId` (string)

**副作用**:
- 向 `approvals` 表插入一条 `status='pending'` 的记录
- 向 `timeline_events` 表插入 `type="approval"`, `status="blocked"` 事件

#### `grant(approvalId)`

批准操作。

**副作用**:
- 更新 `approvals.status = 'approved'`, 写入 `decided_at`
- 插入 Timeline 事件: `status="completed"`, `payload.resolution="approved"`

#### `deny(approvalId)`

拒绝操作。

**副作用**:
- 更新 `approvals.status = 'denied'`, 写入 `decided_at`
- 插入 Timeline 事件: `status="failed"`, `payload.resolution="denied"`

#### `autoApproveSession(sessionId)`

将指定会话加入白名单，该会话后续所有操作跳过审批检查。

### 审批生命周期

```
pending ──grant()──▶ approved
   │
   └──deny()────▶ denied
```

状态流转不可逆——一旦 approved 或 denied，不再变回 pending。

### 集成点

| 调用方 | 触发时机 |
|--------|----------|
| `TradingPiAgent.beforeToolCall()` | 每次 Tool 调用前检查 |
| `WorkflowEngine.runSkill()` | 工作流执行 Skill 前检查 |

---

## Part B：产物引擎 (`ArtifactEngine`)

### 模块目的

持久化、版本化的输出存储引擎。每次工作流完成后的结构化产出（研究报告、交易计划、风险报告等）同时写入磁盘文件和数据库记录，支持 UI 渲染预览和历史回溯。

### `ArtifactEngine.create()` 输入参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | `string` | ✅ | — | 产物类型（见下方类型表） |
| `title` | `string` | ✅ | — | 产物标题 |
| `summary` | `string` | ✅ | — | 产物摘要 |
| `markdown` | `string` | ✅ | — | Markdown 正文内容 |
| `contentType` | `string?` | ❌ | `"text/markdown"` | 内容 MIME 类型 |
| `previewReady` | `boolean?` | ❌ | `true` | 是否可预览 |
| `previewPayload` | `unknown?` | ❌ | `{ kind: "markdown", path }` | 预览渲染数据 |
| `sessionId` | `string?` | ❌ | — | 关联会话 ID |
| `workflowRunId` | `string?` | ❌ | — | 关联工作流运行 ID |
| `workspaceId` | `string?` | ❌ | — | 关联工作区 ID |
| `payload` | `unknown?` | ❌ | `{}` | 扩展业务数据 |

### 创建流程

```
1. 构建目录: resolve(artifactsDir, type) → mkdirSync(dir, { recursive: true })
2. 生成文件名: `${Date.now()}-${slug(title)}.md`
     └─ slug(): 小写 + 替换非字母数字为 "-" + 截断 80 字符
3. 写入磁盘: writeFileSync(path, markdown)
4. 入库: INSERT INTO artifacts → 返回 artifactId
5. 记录 Timeline: type="artifact", status="completed"
6. 返回: { id: artifactId, path }
```

### 系统使用的产物类型

| 类型标识 | 用途 | 典型场景 |
|----------|------|----------|
| `research-report` | 研究报告 | 市场调研、标的深度分析 |
| `trade-plan` | 交易计划 | 策略生成的具体买卖方案 |
| `risk-report` | 风险报告 | 组合风险评估、敞口分析 |
| `market-snapshot` | 市场快照 | 实时行情摘要 |
| `daily-review` | 日度回顾 | 每日收盘总结 |
| `workspace-review` | 工作区审查 | 工作区健康度检查 |
| `backtest-report` | 回测报告 | 策略回测结果 |
| `os-bootstrap` | 系统引导 | OS 初始化配置快照 |
| `browser-evidence` | 浏览器证据 | 浏览器自动化采集的截图/页面 |

### 数据库 Schema（artifacts 表）

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 唯一标识（`art_xxx`） |
| `session_id` | TEXT | FK→sessions | 关联会话 |
| `workflow_run_id` | TEXT | FK→workflow_runs | 关联工作流运行 |
| `workspace_id` | TEXT | FK→workspaces | 关联工作区 |
| `type` | TEXT | NOT NULL | 产物类型 |
| `title` | TEXT | NOT NULL | 标题 |
| `summary` | TEXT | NOT NULL | 摘要 |
| `path` | TEXT | NOT NULL | 磁盘文件绝对路径 |
| `content_type` | TEXT | NOT NULL DEFAULT `'text/markdown'` | MIME 类型 |
| `content` | TEXT | | Markdown 原文 |
| `preview_ready` | INTEGER | NOT NULL DEFAULT 0 | 是否可预览（0/1） |
| `preview_payload_json` | TEXT | | 预览渲染数据（JSON） |
| `payload_json` | TEXT | NOT NULL | 业务扩展数据（JSON） |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**索引**:
- `idx_artifacts_session ON artifacts(session_id, created_at)`
- `idx_artifacts_workspace ON artifacts(workspace_id, created_at)`

### 预览系统

UI 层通过 `previewReady` 和 `previewPayload` 字段决定如何渲染产物：

| previewReady | previewPayload | UI 行为 |
|-------------|----------------|---------|
| `true` | `{ kind: "markdown", path }` | 内嵌 Markdown 渲染器 |
| `true` | 自定义对象 | 按 kind 分发到对应渲染器 |
| `false` |任意 | 显示「待生成」占位符 |

---

## Part C：跨模块交互

### 审批 → 技能执行 → 产物的完整链路

```
┌─────────────────────────────────────────────────────────────┐
│                     Trading Pi OS                           │
│                                                             │
│  用户请求                                                    │
│    │                                                         │
│    ▼                                                         │
│  WorkflowEngine.runSkill()                                  │
│    │                                                         │
│    ├── ApprovalEngine.requiresApproval(action, riskLevel)   │
│    │     │                                                   │
│    │     ├── true  → ApprovalEngine.request()               │
│    │     │              │                                   │
│    │     │              ├── Timeline: blocked               │
│    │     │              │                                   │
│    │     │              └── 等待用户 grant()/deny()         │
│    │     │                                                   │
│    │     └── false → 继续执行                                │
│    │                                                         │
│    ▼                                                         │
│  Skill 执行完毕                                               │
│    │                                                         │
│    ▼                                                         │
│  ArtifactEngine.create({ type, title, summary, markdown })  │
│    │                                                         │
│    ├── 写入磁盘: artifactsDir/type/{timestamp}-{slug}.md     │
│    ├── 入库: INSERT INTO artifacts                          │
│    └── Timeline: artifact created                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 共享审计轨迹：Timeline 事件

两个引擎均通过 `repos.createTimeline()` 写入统一的事件流：

| 来源 | type | 典型 status | payload 关键字段 |
|------|------|------------|------------------|
| ApprovalEngine | `"approval"` | `blocked` / `completed` / `failed` | `{ approvalId, riskLevel, resolution }` |
| ArtifactEngine | `"artifact"` | `completed` | `{ artifactId, path, type }` |

Timeline 作为全局审计线索，支撑：
- **事后追溯**：谁在何时批准了什么操作、产生了什么产物
- **调试排查**：工作流执行链路的完整时间线
- **合规审计**：所有高危操作的审批记录与产出物一一对应

### 文件依赖关系

```
approval-engine.ts ──→ Repositories (createApproval, updateApprovalStatus, createTimeline)
artifact-engine.ts  ──→ LocalPaths (artifactsDir)
                   ──→ Repositories (createArtifact, createTimeline)
                   ──→ node:fs (mkdirSync, writeFileSync)
                   ──→ node:path (resolve)
```
