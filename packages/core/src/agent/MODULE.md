# Agent System 模块

## 1. 模块目的

Agent System 是 Trading Pi OS 的核心交互层，负责**用户意图的接收、路由、执行与响应**。它是系统中唯一的面向用户的主代理（TradingPiAgent），同时管理一组围绕已知工作流运行的子代理（Sub-Agent），用于市场扫描、深度研究、复盘、模拟交易和进化建议等专项任务。模块不直接执行业务逻辑，而是通过组合 SkillRegistry、WorkflowEngine、SessionStore、MemoryStore、ApprovalEngine 和 ArtifactEngine 等基础设施，将用户输入转化为可观测的执行流和结构化输出。

## 2. 职责边界

### 本模块负责
- 用户消息的会话管理与持久化（SessionStore 交互）
- 斜杠命令（`/research`、`/plan`、`/review-day` 等）的路由与工作流调度
- LLM Agent 实例的生命周期管理（创建 → prompt → compaction → 结果返回）
- 子代理的定义加载、生命周期管理（spawn → step → complete/fail/cancel）与事件发布
- 工具调用的审批门控（ApprovalEngine 集成）
- 上下文自动压缩（auto-compaction）

### 本模块委托给其他模块
| 能力 | 委托目标 |
|------|----------|
| LLM 推理与工具调用 | `@earendil-works/pi-agent-core` 的 `Agent` 类 |
| 模型创建 | `ai/model.ts` 的 `createTradingPiModel()` |
| 技能注册与工具转换 | `skills/registry.ts` 的 `SkillRegistry.toPiTools()` |
| 工作流执行 | `workflows/workflow-engine.ts` 的 `WorkflowEngine.run()` |
| 会话存储 | `sessions/session-store.ts` |
| 记忆上下文 | `memory/memory-store.ts` |
| 审批流程 | `approvals/approval-engine.ts` |
| 制品管理 | `artifacts/artifact-engine.ts` |
| 数据库操作 | `db/repositories.ts` |

## 3. 核心类型与接口

### 3.1 PromptOptions

运行时配置覆盖项，由 API 层传入 `prompt()` 方法。

```typescript
interface PromptOptions {
  /** 思考级别: off | minimal | low | medium | high | xhigh */
  thinkingLevel?: string;
  /** 模型标识符覆盖 */
  modelId?: string;
  /** 启用/禁用自动压缩 (默认: true) */
  autoCompaction?: boolean;
}
```

**使用场景**: API 端点 `/api/chat/prompt` 通过 options 参数控制单次 prompt 行为。

### 3.2 SubAgentLifecycleEventType

子代理生命周期事件类型枚举。

| 值 | 含义 |
|----|------|
| `"subagents:created"` | 会话已创建，状态为 queued |
| `"subagents:started"` | 开始执行，状态为 running 或 background |
| `"subagents:step"` | 执行步骤进度更新 |
| `"subagents:completed"` | 成功完成 |
| `"subagents:failed"` | 执行失败 |
| `"subagents:cancelled"` | 被用户取消或停止 |

### 3.3 SubAgentStatus

子代理运行状态枚举：`"queued" | "running" | "background" | "completed" | "failed" | "cancelled"`

### 3.4 AgentDefinition

子代理的完整定义，包含其身份、能力、行为约束和工作流绑定。

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 唯一标识符，如 `"deep-research"` |
| `displayName` | `string` | UI 显示名称，如 `"Deep Research"` |
| `description` | `string` | 功能描述 |
| `systemPrompt` | `string` | 该代理的系统提示词 |
| `tools` | `string[]` | 可用工具 ID 列表 |
| `model?` | `string` | 可选模型覆盖 |
| `thinkingLevel?` | `string` | 可选思考级别 |
| `maxTurns?` | `number` | 最大轮次限制 |
| `backgroundCapable` | `boolean` | 是否支持后台模式运行 |
| `defaultMode` | `"foreground" \| "background"` | 默认运行模式 |
| `icon` | `string` | UI 图标名称 |
| `color` | `string` | UI 主题色 |
| `workflowId` | `string` | 绑定的工作流 ID |
| `steps` | `string[]` | 步骤名称列表，用于进度事件 |

### 3.5 SpawnParams

调用方发起子代理生成时的参数。

| 字段 | 类型 | 说明 |
|------|------|------|
| `agent_type` | `string` | 目标子代理类型名（对应 `AgentDefinition.name`） |
| `prompt` | `string` | 任务描述 / 输入指令 |
| `background?` | `boolean` | 是否后台运行（默认跟随 definition.defaultMode） |
| `workspace_id?` | `string` | 关联的工作区 ID |
| `decision_id?` | `string` | 关联的决策 ID（paper-trade 必填） |
| `min_runtime_ms?` | `number` | 后台任务最小运行时间（ms），用于可取消等待 |

### 3.6 SubAgentEvent

子代理事件对象，通过 `subscribe()` 发布给监听者。

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `SubAgentLifecycleEventType` | 事件类型 |
| `payload` | `Record<string, unknown>` | 事件负载（因 type 而异） |
| `timestamp` | `number` | 事件时间戳 |

### 3.7 SubAgentSession

子代理的完整运行时会话记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 会话 ID（格式 `sag_<uuid>`） |
| `agentType` | `string` | 代理类型名 |
| `type` | `string` | 显示类型名 |
| `description` | `string` | 描述 |
| `prompt` | `string` | 原始 prompt |
| `status` | `SubAgentStatus` | 当前状态 |
| `isBackground` | `boolean` | 是否为后台任务 |
| `workspaceId?` | `string` | 关联工作区 |
| `decisionId?` | `string` | 关联决策 |
| `workflowId` | `string` | 执行的工作流 ID |
| `runId?` | `string` | 工作流运行 ID |
| `result?` | `unknown` | 完整结果 |
| `resultPreview?` | `string` | 截断预览（≤1200字符） |
| `error?` | `string` | 错误信息 |
| `toolUses` | `number` | 工具调用次数估算 |
| `tokens?` | `{ input?, output?, total? }` | Token 用量 |
| `startedAt?` | `number` | 开始时间戳 |
| `completedAt?` | `number` | 完成时间戳 |
| `durationMs?` | `number` | 运行时长（ms） |
| `events` | `SubAgentEvent[]` | 全量事件历史 |

### 3.8 SubAgentStatusView

对外暴露的状态视图，将全量 events 替换为最近 25 条。

```typescript
interface SubAgentStatusView extends Omit<SubAgentSession, "events"> {
  recentEvents: SubAgentEvent[]; // 最近 25 条事件
}
```

### 3.9 SubAgentManagerConfig

SubAgentManager 的运行时配置，必须在 spawn 之前设置。

```typescript
interface SubAgentManagerConfig {
  /** 工作流执行函数 */
  runWorkflow: (workflowId: string, input: unknown, context: WorkflowContext)
    => Promise<{ runId: string; output: unknown }>;
  /** 可选的上下文工厂 */
  createContext?: (params: SpawnParams) => WorkflowContext;
}
```

## 4. 核心类：TradingPiAgent

### 4.1 构造依赖

`TradingPiAgent` 采用依赖注入模式，构造时接收一个 deps 对象：

```typescript
constructor(private readonly deps: {
  env: TradingPiEnv;           // 环境变量（API key、模型等）
  repos: Repositories;         // 数据库仓库（timeline 等）
  sessions: SessionStore;      // 会话存储
  memory: MemoryStore;         // 记忆存储
  skills: SkillRegistry;       // 技能注册表
  workflows: WorkflowEngine;   // 工作流引擎
  artifacts: ArtifactEngine;   // 制品引擎
  approvals: ApprovalEngine;   // 审批引擎
})
```

### 4.2 公共方法

#### `prompt(input, onStreamEvent?, options?)`

主入口方法，处理用户消息并返回 agent 响应。

**签名**:
```typescript
async prompt(
  input: { message: string; sessionId?: string; parentSessionId?: string; name?: string },
  onStreamEvent?: (event: AgentEvent) => void,
  options?: PromptOptions,
): Promise<{
  sessionId: string;
  messages: AgentMessage[];
  text: string;
}>
```

**执行流程**:
1. **会话解析**: 若提供 `parentSessionId` 则 fork 出新会话；否则 ensure/create 会话
2. **消息写入**: 将 user message 追加到 SessionStore
3. **斜杠命令路由**: 调用 `routeSlashCommand()`，若匹配则直接走工作流并返回
4. **构建 Agent 实例**:
   - 从 `systemPrompt()` 获取系统提示词
   - 从 `SkillRegistry.toPiTools()` 获取可用工具列表
   - 解析 modelId（options > env default）和 thinking budget
   - 配置 `transformContext`: 注入压缩摘要 + MemoryStore 上下文
   - 配置 `prepareNextTurn`: 每轮刷新记忆上下文
   - 配置 `beforeToolCall`: 审批门控 + timeline 记录
   - 配置 `afterToolCall`: timeline 记录
5. **恢复历史消息**: 将 session 中已有的条目转为 AgentMessage 并恢复到 agent state
6. **订阅事件**: 每个 AgentEvent 同时写入 timeline 和回调 `onStreamEvent`
7. **执行 prompt**: 调用底层 `Agent.prompt()`
8. **自动压缩检查**: 当消息数 > 50 时，估算 token 数并在超限时触发压缩生成摘要
9. **返回结果**: 包含 sessionId、全量消息、最后一条 assistant 消息文本

### 4.3 私有方法

#### `systemPrompt(): string`

返回 TradingPi Agent 的系统提示词，定义了：
- 身份：本地优先个人交易 OS 中唯一的核心代理
- 能力范围：使用工具、工作流、子代理处理市场/研究/复盘/模拟交易/审批
- 约束：永不未经审批下单、结果需可追溯且制品就绪、不声称源在线除非当前确认成功
- 错误处理策略：未检测到的源说"可用"而非"在线"，失败则明确暴露

#### `routeSlashCommand(message, sessionId, context): Promise<... | undefined>`

解析并路由斜杠命令到对应工作流。支持的命令：

| 命令 | 格式 | 工作流 ID | 输入 |
|------|------|-----------|------|
| `/research <symbol>` | `/research ETH` | `research.asset` | `{ symbol }` |
| `/plan <symbol> [budget] [direction]` | `/plan ETH/USDT 100 spot` | `trade.plan` | `{ symbol, budgetUsd, direction }` |
| `/review-day` | — | `review.daily` | `{ period: "daily" }` |
| `/backtest <name> [symbol] [timeframe]` | — | `strategy.backtest` | `{ name, symbol, timeframe }` |
| `/browser <action> [value]` | — | `browser.evidence` | `{ action, query/url }` |
| `/evolve [focus]` | — | `evolution.propose` | `{ focus }` |
| `/bootstrap-os` | — | `os.bootstrap` | `{}` |

路由成功后：记录 timeline → 执行工作流 → 生成摘要文本 → 写入 session → 返回结果。

#### `handleEvent(sessionId, event): void`

处理每个 AgentEvent：
- 将所有事件写入 Repositories.timeline（type 为 `pi.<event.type>`）
- 当 `message_end` 且 role 为 `assistant` 时，追加消息到 SessionStore

### 4.4 生命周期流程图

```
用户消息
  │
  ├─→ SessionStore.ensureSession / createFork
  │     └─→ append(user message)
  │
  ├─→ routeSlashCommand()
  │     ├─ 匹配 → WorkflowEngine.run() → return workflow result
  │     └─ 不匹配 ↓
  │
  ├─→ new Agent({ systemPrompt, tools, model, callbacks })
  │     ├─ transformContext: 注入压缩摘要 + MemoryStore
  │     ├─ beforeToolCheck: ApprovalEngine 门控
  │     ├─ afterToolCall: Timeline 记录
  │     └─ subscribe: handleEvent → timeline + session
  │
  ├─→ Agent.prompt(message)  ← LLM 推理 + 工具调用循环
  │
  ├─→ autoCompaction check (messages > 50)
  │     └─ estimateTokens → shouldCompact → generateSummary
  │
  └─→ return { sessionId, messages, text }
```

### 4.5 Thinking Token 预算映射

```typescript
const THINKING_TOKEN_BUDGETS = {
  off: 0,
  minimal: 1024,
  low: 4096,
  medium: 8192,   // 默认值
  high: 16384,
  xhigh: 32768,
};
```

## 5. 子代理系统

### 5.1 SubAgentManager

子代理的管理中枢，负责定义加载、实例创建、执行调度和事件广播。

**关键特性**:
- 单例模式：通过 `getDefaultSubAgentManager()` 获取全局唯一实例
- 定义热加载：从 `.md` 文件读取 frontmatter 覆盖内置默认值
- 事件驱动：所有状态变更通过 `publish()` 广播给订阅者
- 前台/后台双模式：前台同步等待结果，后台 fire-and-forget

**公共方法**:

| 方法 | 签名 | 说明 |
|------|------|------|
| `configure(config)` | `(config: SubAgentManagerConfig) => void` | 设置工作流运行器（必须在使用前调用） |
| `loadDefinitions(dir?)` | `(directory?) => AgentDefinition[]` | 从目录加载 .md 定义文件，合并 fallback |
| `listDefinitions()` | `() => AgentDefinition[]` | 列出所有已注册的代理定义 |
| `spawn(params, context?)` | `(params, context?) => Promise<ToolResult>` | 创建并执行子代理 |
| `stop(agentId, reason?)` | `(string, string?) => StatusView?` | 停止正在运行的子代理 |
| `listActive()` | `() => SubAgentStatusView[]` | 列出所有活跃会话的状态视图 |
| `status(agentId)` | `(string) => SubAgentStatusView?` | 查询单个会话状态 |
| `subscribe(listener)` | `(fn) => unsubscribe` | 订阅子代理事件流 |

### 5.2 SubAgentSession 生命周期

```
created (queued)
    │
    ▼
started (running | background)
    │
    ├─→ step[1/N] ──→ step[2/N] ──→ ... ──→ step[N/N]
    │                                              │
    │                              ┌────────────────┼────────────────┐
    │                              ▼                ▼                ▼
    │                         completed          failed         cancelled
    │                         (success)        (error)         (user stop)
    │
    └─→ [background mode] → 立即返回 toolResult("background")
                            后台继续执行至终态
```

**生命周期详细说明**:

1. **created (`queued`)**: `spawn()` 调用 `createSession()` 生成 `SubAgentSession`，ID 格式为 `sag_<uuid>`，发布 `emitCreated` 事件
2. **started (`running` / `background`)**: `execute()` 方法将状态切换为 running/background，记录 `startedAt`，发布 `emitStarted` 事件
3. **step**: 按定义中的 `steps` 数组依次发布 `emitStep` 事件，携带 stepName、stepNumber、totalSteps、detail
4. **completed**: 工作流正常结束，计算 durationMs 和 resultPreview，发布 `emitCompleted`
5. **failed**: 工作流抛异常，记录 error 信息，发布 `emitFailed`
6. **cancelled**: 用户调用 `stop()` 或在 `waitForCancellableHold` 期间被取消，发布 `emitCancelled`

**后台模式的特殊行为**:
- 后台任务在 `started` 事件后立即返回 `toolResult("background")` 给调用方
- 后台任务支持 `min_runtime_ms` 参数，完成后会等待最短运行时间（上限 120s），期间轮询取消状态
- 后台任务的 execution catch 为空（`.catch(() => undefined)`），不会向上抛异常

### 5.3 事件协议 (protocol.ts)

`protocol.ts` 提供纯函数的事件构造器，每个对应一种生命周期事件：

| 函数 | 产出事件类型 | payload 关键字段 |
|------|-------------|------------------|
| `emitCreated(session)` | `subagents:created` | id, type, agentType, description, source, isBackground, status |
| `emitStarted(session)` | `subagents:started` | id, type, agentType, description, prompt, status |
| `emitStep(session, {stepName, stepNumber, totalSteps, detail})` | `subagents:step` | id, type, agentType, description, stepName, stepNumber, totalSteps, detail, status |
| `emitCompleted(session)` | `subagents:completed` | id, type, agentType, description, status, result, resultPreview, toolUses, durationMs, tokens |
| `emitFailed(session)` | `subagents:failed` | id, type, agentType, description, status, error, durationMs |
| `emitCancelled(session, reason?)` | `subagents:cancelled` | id, type, agentType, description, status, reason, durationMs |

基础构造器 `subAgentEvent(type, payload)` 统一附加 `timestamp: Date.now()`。

## 6. 代理定义

每个子代理由一个 `.md` 文件定义（frontmatter 格式），同时有 TypeScript 内置 fallback。以下为 5 个内置子代理：

### 6.1 Alpha Radar (`alpha-radar.md`)

| 属性 | 值 |
|------|-----|
| **用途** | 后台扫描预测市场和加密货币机会信号 |
| **工作流** | `alpha.radar.scan` |
| **思考级别** | medium |
| **最大轮次** | 5 |
| **后台能力** | ✅ 支持（默认后台模式） |
| **图标/颜色** | `radar` / `blue` |
| **工具** | `market.polymarket.markets`, `search.query`, `community.reddit`, `events.fred`, `events.coinmarketcal`, `market.coingecko.quote` |
| **步骤** | Fetch markets → Fetch news → Fetch community context → Fetch events → Score signals |

### 6.2 Deep Research (`deep-research.md`)

| 属性 | 值 |
|------|-----|
| **用途** | 前台研究代理，生成工作区研究报告 |
| **工作流** | `deep.research` |
| **思考级别** | **high** |
| **最大轮次** | **7** |
| **后台能力** | ❌ 仅前台 |
| **图标/颜色** | `microscope` / `cyan` |
| **工具** | `search.query`, `academic.semanticscholar`, `academic.crossref`, `academic.openalex`, `community.reddit`, `market.polymarket.search`, `market.coingecko.quote` |
| **步骤** | Plan research → Search web → Search academic sources → Read community context → Fetch market data → Analyze evidence → Synthesize report |

### 6.3 Paper Trade (`paper-trade.md`)

| 属性 | 值 |
|------|-----|
| **用途** | 前台模拟交易生命周期代理，从 DecisionCard 执行到结算 |
| **工作流** | `paper.trade.lifecycle` |
| **思考级别** | low |
| **最大轮次** | 5 |
| **后台能力** | ❌ 仅前台 |
| **图标/颜色** | `notebook` / `amber` |
| **工具** | `decision.record`, `market-price`, `journal`, `timeline` |
| **步骤** | Load decision → Resolve price → Create paper trade → Journal execution → Update timeline |
| **特殊要求** | spawn 时必须提供 `decision_id` |

### 6.4 Review (`review.md`)

| 属性 | 值 |
|------|-----|
| **用途** | 前台复盘代理，生成 7 段式 ReviewReport |
| **工作流** | `review.workspace` |
| **思考级别** | medium |
| **最大轮次** | 7 |
| **后台能力** | ❌ 仅前台 |
| **图标/颜色** | `chart` / `green` |
| **工具** | `decisions`, `journal`, `user_rules` |
| **步骤** | Overview → Trade analyses → Error summary → Suggestions → Emotion analysis → Rule compliance → Historical comparison |
| **特殊要求** | spawn 时必须提供 `workspace_id` |

### 6.5 Evolution (`evolution.md`)

| 属性 | 值 |
|------|-----|
| **用途** | 后台进化改进代理，基于复盘历史提出规则改进建议 |
| **工作流** | `evolution.propose` |
| **思考级别** | medium |
| **最大轮次** | 4 |
| **后台能力** | ✅ 支持（默认后台模式） |
| **图标/颜色** | `dna` / `purple` |
| **工具** | `reviews`, `evolution_suggestions`, `user_rules` |
| **步骤** | Load review history → Find patterns → Draft suggestions → Prepare approval gate |

## 7. 文件地图

### `agent/` 目录

| 文件 | 说明 |
|------|------|
| `trading-pi-agent.ts` | 核心主代理类 `TradingPiAgent`，含 PromptOptions 导出、斜杠命令路由、Agent 生命周期管理、自动压缩逻辑及辅助函数 |

### `agents/` 目录

| 文件 | 说明 |
|------|------|
| `types.ts` | 所有子代理相关类型定义：事件类型枚举、状态枚举、AgentDefinition、SpawnParams、SubAgentEvent、SubAgentSession、SubAgentStatusView、SubAgentManagerConfig |
| `protocol.ts` | 纯函数事件协议层：6 个 emit 函数（created/started/step/completed/failed/cancelled）+ 基础 subAgentEvent 构造器 |
| `manager.ts` | `SubAgentManager` 类实现：定义加载（.md frontmatter）、session 管理、spawn/stop/list/status 事件驱动执行、单例工厂 `getDefaultSubAgentManager()` |
| `index.ts` | barrel export，统一导出 types、protocol、manager |
| `alpha-radar.md` | Alpha Radar 子代理定义（frontmatter + 描述） |
| `deep-research.md` | Deep Research 子代理定义 |
| `paper-trade.md` | Paper Trade 子代理定义 |
| `review.md` | Review 子代理定义 |
| `evolution.md` | Evolution 子代理定义 |

## 8. 依赖关系

### 入向依赖（本模块导入）

| 来源包/路径 | 导入内容 | 用途 |
|-------------|----------|------|
| `@earendil-works/pi-agent-core` | `Agent`, `AgentEvent`, `AgentMessage`, `DEFAULT_COMPACTION_SETTINGS`, `estimateContextTokens`, `generateSummary`, `shouldCompact` | 底层 LLM Agent 运行时与上下文压缩 |
| `@earendil-works/pi-ai` | `fauxAssistantMessage` | 构造虚拟助手消息（斜杠命令路由结果） |
| `../ai/model.js` | `createTradingPiModel` | 创建模型实例 |
| `../config/env.js` | `TradingPiEnv` | 环境配置类型 |
| `../db/repositories.js` | `Repositories` | 数据库操作（timeline 写入） |
| `../approvals/approval-engine.js` | `ApprovalEngine` | 工具调用审批 |
| `../memory/memory-store.js` | `MemoryStore` | 上下文记忆注入 |
| `../sessions/session-store.js` | `SessionStore` | 会话读写与 fork |
| `../skills/registry.js` | `SkillRegistry` | 技能转工具、技能元数据查询 |
| `../artifacts/artifact-engine.js` | `ArtifactEngine` | 制品引擎（传递给 baseContext） |
| `../workflows/workflow-engine.js` | `WorkflowEngine` | 斜杠命令和子代理的工作流执行 |
| `../workflows/types.js` | `WorkflowContext` | 工作流上下文类型（agents 模块引用） |
| Node 内置 | `crypto`, `fs`, `path`, `url` | UUID 生成、文件系统读取（定义加载） |

### 出向依赖（谁导入了本模块）

| 消费者 | 导入内容 | 用途 |
|--------|----------|------|
| `src/index.ts` (package barrel) | `export * from "./agent/trading-pi-agent.js"` & `export * from "./agents/index.js"` | 对外暴露 Agent 系统 API |
| `src/skills/default-skills.ts` | `getDefaultSubAgentManager` | 在默认技能中获取子代理管理器实例（用于 sub-agent 相关 skill 实现） |

## 9. 交互模式

### 9.1 TradingPiAgent ↔ WorkflowEngine

- **斜杠命令路径**: `routeSlashCommand()` 解析用户消息 → 提取 `workflowId` + `input` → 调用 `this.deps.workflows.run(workflowId, input, context)` → 将输出序列化为自然语言摘要 → 写入 session
- **子代理路径**: `SubAgentManager.spawn()` → 内部通过 `config.runWorkflow(definition.workflowId, workflowInput, context)` 执行绑定工作流

### 9.2 TradingPiAgent ↔ SkillRegistry

- **工具转换**: `this.deps.skills.toPiTools(baseContext)` 将注册的技能转换为 pi-agent-core 可用的 `PiTool[]` 格式
- **审批查询**: `beforeToolCall` 回调中通过 `this.deps.skills.get(toolCall.name)` 获取技能元数据（name, id, riskLevel）以判断是否需要审批
- **baseContext 构建**: prompt 方法中构建包含 skills 引用的完整上下文对象，传给 toPiTools 和工作流

### 9.3 TradingPiAgent ↔ SessionStore

- **会话确保**: `ensureSession(id, name)` 获取或创建会话；`createFork(parentId)` 从父会话分叉
- **消息追加**: 用户消息（`"message"` 类型）、助手消息（`"pi_message"` 类型）、工作流结果（`"workflow_result"` 类型）、agent state 快照（`"agent_state"` 类型）
- **历史恢复**: `sessionEntriesToAgentMessages()` 将 session 条目转为 `AgentMessage[]` 以恢复 Agent state

### 9.4 TradingPiAgent ↔ MemoryStore

- **transformContext 注入**: 每次 Agent 调用时在消息前插入 `MemoryStore.contextBlock("user")` 作为上下文快照
- **prepareNextTurn 刷新**: 每轮新 turn 时重新获取最新记忆上下文注入 system prompt

### 9.5 TradingPiAgent ↔ ApprovalEngine

- **beforeToolCall 门控**: 每次工具调用前检查 `approvals.requiresApproval(skill.id, skill.riskLevel)`
- **需要审批时**: 调用 `approvals.request(...)` 生成 approvalId，返回 `{ block: true, reason }` 阻断执行
- **不需要审批时**: 返回 `undefined` 放行

### 9.6 TradingPiAgent ↔ ArtifactEngine

- **间接传递**: ArtifactEngine 作为 baseContext 的一部分传递给 SkillRegistry.toPiTools() 和 WorkflowEngine.run()
- **制品生成**: 由各工作流内部使用 ArtifactEngine 创建 Research Report、Trade Plan、Review Report 等制品

### 9.7 TradingPiAgent ↔ Repositories

- **Timeline 记录**: 在以下节点写入 timeline 条目：
  - 斜杠命令路由 (`agent.intent`)
  - 工具调用前预检 (`agent.tool.preflight`)
  - 工具调用后结果 (`agent.tool.result`)
  - 每个 AgentEvent (`pi.<event.type>`)
  - 自动压缩检查/完成 (`agent.compaction.check` / `agent.compaction.complete`)

## 10. 扩展点：如何添加新的子代理

按以下步骤添加一个新的子代理：

### Step 1: 创建定义文件

在 `packages/core/src/agents/` 下新建 `<agent-name>.md`，格式如下：

```markdown
---
name: my-agent
display_name: My Agent
description: 一句话描述该代理的功能。
system_prompt: 该代理的系统提示词。
tools: [tool.one, tool.two, tool.three]
thinking_level: medium
max_turns: 5
background_capable: false
default_mode: foreground
icon: star
color: indigo
---

更详细的描述（可选，不影响程序逻辑）。
```

### Step 2: 注册 Fallback Definition（可选但推荐）

在 `packages/core/src/agents/manager.ts` 的 `FALLBACK_DEFINITIONS` 数组中添加默认定义，作为 .md 文件不存在时的降级：

```typescript
{
  name: "my-agent",
  displayName: "My Agent",
  description: "...",
  systemPrompt: "...",
  tools: ["tool.one", "tool.two"],
  backgroundCapable: false,
  defaultMode: "foreground",
  icon: "star",
  color: "indigo",
  workflowId: "my.agent.workflow",   // ← 对应 workflows 中已存在的工作流 ID
  steps: ["Step 1", "Step 2", "Step 3"],
},
```

### Step 3: 添加工作流输入映射（如需要）

如果新代理的 spawn 参数到工作流输入的转换不是通用的，在 `SubAgentManager.workflowInput()` 方法中添加分支：

```typescript
if (definition.name === "my-agent") {
  return { topic: params.prompt, workspaceId: params.workspace_id };
}
```

### Step 4: 确保工作流存在

确保 `WorkflowEngine` 中已注册 `workflowId` 对应的工作流（通常在 `packages/core/src/workflows/` 目录下定义）。子代理本身不实现逻辑，它只是已知工作流的执行包装器。

### Step 5: 验证

- 调用 `SubAgentManager.loadDefinitions()` 应能看到新定义
- 调用 `spawn({ agent_type: "my-agent", prompt: "..." })` 应能正确创建会话并执行工作流
- 前台代理应同步返回结果，后台代理（若 `background_capable: true`）应立即返回并在后台完成
