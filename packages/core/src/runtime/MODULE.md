# Config + AI Model + Telemetry 基础设施模块

> 本文档涵盖三个紧密关联的基础设施模块：**环境配置（Config）**、**AI 模型适配（AI Model）** 与 **遥测可观测性（Telemetry）**。三者共同构成 Trading Pi OS 运行时的核心基础设施层。

---

## Part A：环境配置（Config）

### 模块用途

提供统一的环境变量加载、本地路径解析与超时常量管理。所有运行时配置均从此模块流出，确保全局一致性。

源文件：

| 文件 | 职责 |
|------|------|
| `config/env.ts` | 环境变量加载、`TradingPiEnv` 接口定义 |
| `config/paths.ts` | 本地数据目录路径计算与自动创建 |
| `config/timeouts.ts` | 外部数据源超时与重试常量 |

---

### TradingPiEnv 接口（`env.ts`）

核心环境配置接口，所有字段均从 `.env` 文件或系统环境变量中读取。

#### AI / LLM 配置

| 字段 | 类型 | 环境变量 | 默认值 | 说明 |
|------|------|----------|--------|------|
| `openaiApiKey` | `string \| undefined` | `OPENAI_API_KEY` | — | OpenAI 兼容 API 密钥 |
| `openaiBaseUrl` | `string \| undefined` | `OPENAI_BASE_URL` | — | 自定义 API 端点（留空则使用 OpenAI 官方） |
| `openaiModel` | `string` | `OPENAI_MODEL` | `"gpt-4o-mini"` | 模型标识符 |

#### 外部数据源 API Key

| 字段 | 类型 | 环境变量 | 说明 |
|------|------|----------|------|
| `exaApiKey` | `string \| undefined` | `EXA_API_KEY` | Exa 搜索引擎 |
| `tavilyApiKey` | `string \| undefined` | `TAVILY_API_KEY` | Tavily 搜索 |
| `jinaApiKey` | `string \| undefined` | `JINA_API_KEY` | Jina Reader / 搜索 |
| `coinMarketCapApiKey` | `string \| undefined` | `COINMARKETCAP_API_KEY` | CoinMarketCap Pro |
| `fredApiKey` | `string \| undefined` | `FRED_API_KEY` | 联储经济数据 |
| `coinMarketCalApiKey` | `string \| undefined` | `COINMARKETCAL_API_KEY` | 加密日历事件 |

#### 遥测与沙箱

| 字段 | 类型 | 环境变量 | 说明 |
|------|------|----------|------|
| `aioSandboxBaseUrl` | `string \| undefined` | `AIO_SANDBOX_BASE_URL` | AIO 沙箱执行端点 |
| `langfusePublicKey` | `string \| undefined` | `LANGFUSE_PUBLIC_KEY` | Langfuse 公钥 |
| `langfuseSecretKey` | `string \| undefined` | `LANGFUSE_SECRET_KEY` | Langfuse 私钥 |
| `langfuseHost` | `string \| undefined` | `LANGFUSE_HOST` | Langfuse 服务地址 |

#### 本地服务配置

| 字段 | 类型 | 环境变量 | 默认值 | 说明 |
|------|------|----------|--------|------|
| `dataDir` | `string` | `TRADING_PI_DATA_DIR` | `".trading-pi"` | 数据根目录（相对或绝对路径） |
| `apiPort` | `number` | `TRADING_PI_API_PORT` | `8787` | 后端 API 监听端口 |
| `webPort` | `number` | `TRADING_PI_WEB_PORT` | `5173` | 前端开发服务器端口 |

#### 交易所配置

| 字段 | 类型 | 环境变量 | 默认值 | 说明 |
|------|------|----------|--------|------|
| `defaultExchange` | `string` | `TRADING_PI_DEFAULT_EXCHANGE` | `"binance"` | 默认交易所 |
| `exchangeFallbacks` | `string[]` | `TRADING_PI_EXCHANGE_FALLBACKS` | `["okx","bybit","coinbase","kraken"]` | 降级备选交易所列表（逗号分隔） |
| `tradingMode` | `"mock" \| "paper" \| "live_guarded"` | `TRADING_PI_TRADING_MODE` | `"paper"` | 交易模式：模拟 / 模拟盘 / 实盘保护 |

---

### loadEnv() 函数

```ts
export function loadEnv(cwd?: string): TradingPiEnv
```

**加载流程：**

1. **`.env` 级联查找** — 从以下位置按优先级依次查找 `.env` 文件，后加载的覆盖先加载的：
   - 调用方传入的 `cwd`（通常为 `INIT_CWD`）
   - `process.cwd()`（当前工作目录）
   - `cwd/apps/web`
   - `process.cwd()/apps/web`
   - 仓库根目录
   - 仓库根目录 `/apps/web`

2. **解析规则** — 手写轻量 `.env` 解析器：
   - 跳过空行和 `#` 注释
   - 按 `=` 分割键值对
   - 自动去除值两端的引号

3. **合并策略** — 系统环境变量（`process.env`）优先于文件中的值。

4. **导出函数** — `redactedEnv(env)` 返回脱敏版本，仅暴露布尔标志位（是否已配置），不泄露任何 API Key 明文。用于日志输出与健康检查。

---

### LocalPaths 接口（`paths.ts`）

基于 `dataDir` 计算出的完整本地路径集合：

| 字段 | 相对于 root 的路径 | 用途 |
|------|-------------------|------|
| `root` | `.` | 数据根目录本身 |
| `sqlitePath` | `./trading-pi.sqlite` | SQLite 数据库文件路径 |
| `artifactsDir` | `./artifacts` | 交易产物 / 报告存储 |
| `sessionsDir` | `./sessions` | Agent 会话持久化 |
| `memoryDir` | `./memory` | 长期记忆向量存储 |
| `logsDir` | `./logs` | 运行日志 |

### resolveLocalPaths()

```ts
export function resolveLocalPaths(env: TradingPiEnv, cwd?: string): LocalPaths
```

- 若 `env.dataDir` 为绝对路径则直接使用，否则相对于 `cwd`（默认 `INIT_CWD` 或 `process.cwd()`）解析。
- 所有子路径均通过 `path.resolve(root, ...)` 拼接为绝对路径。

### ensureLocalPaths()

```ts
export function ensureLocalPaths(paths: LocalPaths): LocalPaths
```

调用 `mkdirSync(..., { recursive: true })` 一次性创建全部 5 个目录（root、artifacts、sessions、memory、logs）。返回入参 `paths` 以支持链式调用。

---

### Timeout 常量（`timeouts.ts`）

集中管理所有外部数据源的 HTTP 超时时间。**所有对外 fetch 调用必须引用此处常量**，禁止硬编码毫秒数。

#### DATA_SOURCE_TIMEOUTS

| 常量名 | 值 (ms) | 目标数据源 | 备注 |
|--------|---------|-----------|------|
| `polymarket` | 30,000 | Polymarket Gamma/CLOB | 国内网络较慢，给予充裕超时 |
| `coingecko` | 15,000 | CoinGecko 公共 API | — |
| `coinmarketcap` | 15,000 | CoinMarketCap Pro API | — |
| `defillama` | 15,000 | DeFiLlama 价格 API | — |
| `fred` | 15,000 | FRED 联储宏观数据 | — |
| `reddit` | 20,000 | Reddit 公共 JSON API | 频繁限流，额外宽容 |
| `xueqiu` | 15,000 | 雪球股票 API | — |
| `github` | 15,000 | GitHub REST API | — |
| `rss` | 15,000 | RSS/Atom 订阅源解析 | — |

#### RETRY_CONFIG

针对不可靠数据源（Polymarket、Reddit）的重试策略：

| 参数 | 值 | 说明 |
|------|-----|------|
| `maxRetries` | `2` | 最多重试 2 次（即总共 3 次尝试） |
| `backoffMs` | `[1000, 3000]` | 指数退避：第 1 次重试等 1s，第 2 次等 3s |

---

## Part B：AI 模型适配（`ai/model.ts`）

### 模块用途

将 `TradingPiEnv` 中的 AI 提供商配置转换为符合 **pi-agent-core** (`@earendil-works/pi-ai`) `Model` 接口的模型实例，实现提供商无关的 LLM 调用抽象。

### createTradingPiModel()

```ts
export function createTradingPiModel(env: TradingPiEnv): Model<"openai-completions">
```

**输入：** `TradingPiEnv`（从中提取 `openaiModel`、`openaiBaseUrl`、`openaiApiKey`）

**输出：** 符合 `pi-agent-core` `Model<"openai-completions">` 接口的对象，包含以下固定字段：

| 字段 | 值来源 / 固定值 | 说明 |
|------|-----------------|------|
| `id` | `env.openaiModel` | 模型唯一标识 |
| `name` | `env.openaiModel` | 显示名称 |
| `api` | `"openai-completions"` (固定) | pi-agent-core 协议类型 |
| `provider` | `"trading-pi-openai-compatible"` (固定) | 提供商标识 |
| `baseUrl` | `env.openaiBaseUrl ?? "https://api.openai.com/v1"` | API 端点，未配置时回退到 OpenAI 官方 |
| `reasoning` | `false` (固定) | 不启用推理模式 |
| `input` | `["text"]` (固定) | 仅支持文本输入 |
| `cost` | 全零对象 | 内部使用不计费 |
| `contextWindow` | `128_000` | 上下文窗口 token 数 |
| `maxTokens` | `8_192` | 单次生成最大 token 数 |

### 与 pi-agent-core 的集成方式

- 导入 `complete` 函数与 `Model` 类型自 `@earendil-works/pi-ai`
- 返回的 model 对象可直接传给 `complete()` 进行补全调用
- 使用 `"openai-completions"` API 协议，兼容任何 OpenAI 格式的端点（OpenAI、Azure、vLLM、Ollama 等）

### aiPing() 健康检查

```ts
export async function aiPing(env: TradingPiEnv): Promise<{ model, baseUrl, text, usage, stopReason }>
```

- 发送一条极简 prompt 验证 API 连通性
- 未配置 `OPENAI_API_KEY` 时抛出明确错误
- 返回模型响应文本、token 用量及停止原因，用于启动诊断

---

## Part C：遥测可观测性（`telemetry/langfuse.ts`）

### 模块用途

基于 [Langfuse](https://langfuse.com) 实现 Agent 执行过程的分布式追踪与可观测性。记录每一次 Agent Prompt、工具调用与工作流执行，便于调试、审计与性能分析。

### LangfuseTelemetry 类

```ts
export class LangfuseTelemetry {
  constructor(private readonly env: TradingPiEnv)
}
```

#### 初始化逻辑

构造函数检查三个必要配置项是否齐全：

| 必需字段 | 环境变量 | 缺失时的行为 |
|----------|----------|-------------|
| Public Key | `LANGFUSE_PUBLIC_KEY` | 三者任一缺失 → **客户端为 `undefined`，整个模块变为 no-op（空操作）** |
| Secret Key | `LANGFUSE_SECRET_KEY" | 同上 |
| Host | `LANGFUSE_HOST` | 同上 |

初始化参数：

| 参数 | 值 | 说明 |
|------|-----|------|
| `flushAt` | `1` | 每条 trace 立即刷盘，确保不丢失 |

#### 核心方法

##### `trace(name, metadata?)`

创建一个 Langfuse Trace 对象。典型调用场景：

- **Agent Prompt 追踪** — 记录每次 Agent 收到的 system prompt 与用户消息
- **工具调用追踪** — 记录工具名称、输入参数、执行耗时、返回结果
- **工作流执行追踪** — 记录完整工作流（如信号生成 → 风控 → 下单）的起止与中间状态

支持通过 `metadata.sessionId` 关联到具体会话。

##### `configured`（只读属性）

返回 `boolean`，指示遥测是否已激活。上层代码可用此判断是否需要包装 trace 逻辑。

##### `flush()`

异步刷新缓冲区，将未发送的 trace 数据提交至 Langfuse 服务端。应在进程退出前调用。

#### 禁用条件（No-op 模式）

当以下任一条件满足时，整个模块降级为空操作，**零开销**：

1. `LANGFUSE_PUBLIC_KEY` 未设置
2. `LANGFUSE_SECRET_KEY` 未设置
3. `LANGFUSE_HOST` 未设置

此时 `client` 为 `undefined`，`trace()` 返回 `undefined`，`flush()` 为空操作。无需在业务代码中做防御性判断——模块内部已完全处理。

---

## 模块关系图

```
loadEnv() ──→ TradingPiEnv
                  │
       ┌─────────┼─────────┬──────────────┐
       ▼         ▼         ▼              ▼
resolveLocalPaths()  createTradingPiModel()  new LangfuseTelemetry()
       │              │                      │
       ▼              ▼                      ▼
  LocalPaths        Model object           Trace client
       │
       ▼
ensureLocalPaths() ──→ 目录就绪
```

**数据流向：** `TradingPiEnv` 是唯一的配置源头，向下分发至路径解析、模型创建与遥测初始化三个消费者。
