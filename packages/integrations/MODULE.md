# External Integrations — 模块文档

> 本文档覆盖 Trading Pi OS 的 6 个外部集成模块，每个模块提供与外部服务/平台的对接能力。

---

## 目录

1. [Browser Layer（浏览器层）](#1-browser-layer浏览器层)
2. [MCP Hub（MCP 协议中心）](#2-mcp-hubmcp-协议中心)
3. [Search Hub（搜索中心）](#3-search-hub搜索中心)
4. [Academic Search（学术搜索）](#4-academic-search学术搜索)
5. [Community（社区数据）](#5-community社区数据)
6. [Reach（多源数据访问）](#6-reach多源数据访问)

---

## 1. Browser Layer（浏览器层）

**用途：** 提供统一的浏览器操作抽象层，支持通过 AIO Sandbox 远程浏览器或本地 Playwright 执行网页导航、内容提取、截图和 PDF 生成等操作。

### 1.1 类型定义

| 类型 | 说明 |
|------|------|
| `BrowserLayerConfig` | 配置接口，包含可选的 `aioSandboxBaseUrl` |
| `BrowserAction` | 联合类型，支持 5 种操作：`browser.search` / `browser.open` / `browser.extract` / `browser.screenshot` / `browser.pdf` |
| `BrowserLayerActionResult` | 操作结果，包含状态、会话 ID、载荷、提供者、时间戳、内容类型、产物类型等字段 |

### 1.2 核心类：`AioSandboxBrowserLayer`

构造函数接收 `BrowserLayerConfig`，自动检测是否配置了 AIO Sandbox 地址：

```typescript
new AioSandboxBrowserLayer(config?: BrowserLayerConfig)
```

#### 公开方法

| 方法签名 | 说明 |
|----------|------|
| `health(): { configured, baseUrl, provider, capabilities }` | 健康检查，返回当前配置状态和能力列表 |
| `search(query: string): Promise<BrowserLayerActionResult>` | 通过 Google 搜索指定关键词 |
| `open(url: string): Promise<BrowserLayerActionResult>` | 打开指定 URL |
| `extract(url: string): Promise<BrowserLayerActionResult>` | 提取页面文本内容（Markdown 格式） |
| `screenshot(url: string): Promise<BrowserLayerActionResult>` | 对指定 URL 截图（PNG base64） |
| `pdf(url: string): Promise<BrowserLayerActionResult>` | 生成指定 URL 的 PDF（A4 格式，base64） |
| `action(action: BrowserAction, payload: unknown): Promise<BrowserLayerActionResult>` | 通用操作入口 |

### 1.3 AIO Sandbox 适配器 (`AioSandboxAdapter`)

AIO Sandbox 是一个运行在 Docker 容器中的远程浏览器服务，默认监听 **`:8080`** 端口。

适配器支持两种通信模式：

| 操作 | 通信方式 | API 端点 |
|------|----------|----------|
| 导航 (navigate) | HTTP POST | `{baseUrl}/v1/browser/actions` |
| 截图 (screenshot) | CDP 优先 → HTTP 回退 | `{baseUrl}/v1/browser/screenshot` |
| 内容提取 (extract) | **必须 CDP** | 通过 Chrome DevTools Protocol 连接 |
| PDF 生成 (pdf) | **必须 CDP** | 通过 Chrome DevTools Protocol 连接 |
| CDP 发现 | HTTP GET | `{baseUrl}/v1/browser/info`（返回 `cdpUrl`） |

CDP 连接使用 Playwright 的 `chromium.connectOverCDP()` 实现。

### 1.4 路由策略

```
请求进入
  ├─ 已配置 AIO Sandbox → 走 AioSandboxAdapter
  │   ├─ 成功 → 返回 completed
  │   └─ 失败 → 返回 failed（含 reason）
  └─ 未配置 → 回退到本地 Playwright（headless Chromium）
      ├─ 成功 → 返回 completed
      └─ 失败 → 返回 unavailable
```

### 1.5 配置要求

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| `aioSandboxBaseUrl` | `AIO_SANDBOX_BASE_URL` | `null` | AIO Sandbox 服务地址（如 `http://localhost:8080`） |

> 未配置时自动回退到本地 Playwright（需安装 `playwright` 包及浏览器）。

### 1.6 错误处理

- **AIO Sandbox 路径**：捕获异常后返回 `status: "failed"`，附带 `reason` 和 `raw` 错误信息
- **Playwright 回退路径**：捕获异常后返回 `status: "unavailable"`，标记为不可用
- 所有结果均包含 `sessionId`（格式：`br_{timestamp}_{random}`）用于追踪

### 1.7 使用方

- `agent-browser` skill — 浏览器自动化任务
- 需要网页截图/提取/PDF 生成的 research 工作流

---

## 2. MCP Hub（MCP 协议中心）

**用途：** 提供 Model Context Protocol (MCP) 的完整客户端实现，支持通过 stdio 和 SSE 两种传输方式连接 MCP 服务器，实现工具发现、调用和管理。

### 2.1 类型定义

| 类型 | 说明 |
|------|------|
| `McpLifecycleStatus` | 服务器生命周期状态：`discovered` / `registered` / `enabled` / `disabled` / `testing` / `failed` |
| `McpPermission` | 权限级别：`read` / `write` / `dangerous` |
| `McpServerManifest` | 服务器清单（向后兼容用） |
| `McpServerConfig` | 服务器连接配置（id, name, transport, command/args/url） |
| `McpToolDefinition` | 工具定义（name, description, inputSchema） |
| `McpConnection` | 连接实例（config, connected, tools） |
| `McpHealthResult` | 健康检查结果 |

### 2.2 核心类：`McpHub`

```typescript
new McpHub(options?: { requestTimeoutMs?: number })  // 默认超时 30s
```

#### 公开方法

| 方法签名 | 说明 |
|----------|------|
| `connect(config: McpServerConfig): Promise<void>` | 连接 MCP 服务器（自动选择 stdio 或 SSE 传输） |
| `disconnect(id: string): Promise<void>` | 断开指定服务器连接 |
| `disconnectAll(): void` | 断开所有连接 |
| `getConnections(): McpConnection[]` | 获取所有连接列表 |
| `getConnection(id: string): McpConnection \| undefined` | 获取单个连接 |
| `getTools(serverId: string): McpToolDefinition[]` | 获取指定服务器的工具列表 |
| `callTool(serverId: string, toolName: string, args: unknown): Promise<unknown>` | 调用指定工具 |
| `initialize(config: McpServerConfig): Promise<McpConnection>` | 一键连接+初始化并返回连接对象 |

### 2.3 传输协议

#### Stdio 传输

适用于本地进程式 MCP 服务器。通过 `child_process.spawn()` 启动子进程，使用 stdin/stdout 进行 JSON-RPC 通信。

**初始化握手流程：**
1. 发送 `initialize` 请求（protocolVersion: `2024-11-05`）
2. 发送 `notifications/initialized` 通知
3. 调用 `tools/list` 获取可用工具

**配置示例：**
```typescript
{ id: "exa", name: "Exa Search", transport: "stdio", command: "npx", args: ["@exa/mcp-server"] }
```

#### SSE 传输

适用于远程 HTTP 式 MCP 服务器。使用 Server-Sent Events 接收消息，HTTP POST 发送请求。

**SSE 流解析：**
- `event: endpoint` → 更新 POST 端点地址
- `event: message` + `data:` → 解析 JSON-RPC 响应

**配置示例：**
```typescript
{ id: "remote-mcp", name: "Remote MCP", transport: "sse", url: "https://example.com/mcp" }
```

### 2.4 JSON-RPC 2.0 协议

完整实现了 JSON-RPC 2.0 规范：

| 消息类型 | 结构 |
|----------|------|
| Request | `{ jsonrpc: "2.0", id, method, params? }` |
| Notification | `{ jsonrpc: "2.0", method, params? }` |
| Success Response | `{ jsonrpc: "2.0", id, result }` |
| Error Response | `{ jsonrpc: "2.0", id, error: { code, message, data? } }` |

请求超时机制：每个请求有独立的 `requestTimeoutMs` 计时器（默认 30s），超时自动 reject 并清理 pending 状态。

### 2.5 内置发现目录

预注册了 3 个候选 MCP 服务器：

| ID | 名称 | 权限 | 能力 |
|----|------|------|------|
| `mcp_exa_search` | Exa Search MCP | read | search.query, search.extract |
| `mcp_aio_sandbox` | AIO Sandbox MCP | write | browser.open, browser.screenshot, browser.pdf |
| `mcp_local_files` | Local Files MCP | read | artifact.read, document.extract |

#### 辅助函数

| 函数签名 | 说明 |
|----------|------|
| `discoverMcpServers(query?: string)` | 按名称/描述/能力搜索已注册的 MCP 服务器 |
| `checkMcpHealth(manifest): McpHealthResult` | 检查 MCP 服务器健康状态（是否配置了 command/url） |
| `requiresMcpApproval(permission): boolean` | 判断是否需要用户审批（write/dangerous 权限需要） |

### 2.6 配置要求

| 传输方式 | 必需配置 |
|----------|----------|
| stdio | `command`（可执行命令），可选 `args` |
| SSE | `url`（SSE 端点地址） |

无需全局 API Key——各 MCP 服务器自行管理认证。

### 2.7 错误处理

- **重复连接**：抛出 `"already connected"` 错误
- **缺少配置**：stdio 缺少 command / SSE 缺少 url 时抛出明确错误
- **请求超时**：30s 后 reject，携带超时信息
- **进程退出**：自动 cleanup pending requests，从 connections map 中移除
- **HTTP 错误**：SSE 传输中非 2xx 响应抛出错误
- **JSON-RPC error**：将 error.code 和 error.message 封装为 Error 对象

### 2.8 使用方

- 需要调用外部 MCP 工具的 agent-reach skill
- 工具扩展和集成工作流

---

## 3. Search Hub（搜索中心）

**用途：** 统一的多搜索引擎聚合层，支持 Exa、Jina、Tavily 三种商业搜索提供商，以及免费回退模式，同时提供网页内容提取和摘要能力。

### 3.1 类型定义

| 类型 | 说明 |
|------|------|
| `SearchProvider` | 搜索提供商：`"exa"` / `"tavily"` / `"jina"` / `"free"` |
| `SearchHubConfig` | 配置接口，包含三个可选 API Key |
| `SearchResult` | 搜索结果条目（title, url, snippet, provider） |

### 3.2 核心类：`SearchHub`

```typescript
new SearchHub(config?: SearchHubConfig)
```

#### 公开方法

| 方法签名 | 说明 |
|----------|------|
| `query(input: { query, limit?, providers? }): Promise<{provider, status, results[], reason?}>` | 执行搜索查询，自动选择最佳可用提供商 |
| `extract(input: { url }): Promise<{status, url, content, reason?}>` | 通过 Jina Reader 提取网页正文内容 |
| `summarize(input: { content, maxChars? }): Promise<{summary, truncated}>` | 客户端文本截断摘要（默认 1200 字符） |

### 3.3 搜索提供商详情

#### Exa（首选）

| 属性 | 值 |
|------|-----|
| API 端点 | `https://api.exa.ai/search`（POST） |
| 认证方式 | Header: `x-api-key` |
| 请求体 | `{ query, numResults }` |
| 响应结构 | `{ results: [{ title, url, text }] }` |
| 特点 | 语义搜索，返回相关文本片段 |

#### Jina（备选）

| 属性 | 值 |
|------|-----|
| API 端点 | `https://s.jina.ai/`（GET） |
| 认证方式 | 无需 API Key（公开可用） |
| 参数 | `q=查询词` |
| 响应格式 | 纯文本，按双换行分割结果块 |
| 特点 | 免费可用，但返回格式较原始 |

#### Tavily（备选）

| 属性 | 值 |
|------|-----|
| API 端点 | （未在代码中实现具体调用） |
| 认证方式 | API Key |
| 当前状态 | 仅在选择逻辑中占位，实际调用返回 `unavailable` |

### 3.4 提供商选择逻辑

```
selectProvider(providers?)
  │
  ├─ 用户指定了 providers 列表？
  │    └─ 是 → 按列表顺序检查 API Key 可用性
  └─ 否 → 使用默认优先级 ["free", "exa", "jina", "tavily"]
       │
       ├─ exa 有 key？→ 用 exa
       ├─ jina 有 key？→ 用 jina
       ├─ tavily 有 key？→ 用 tavily
       └─ 都没有？→ 返回 free（unavailable）
```

### 3.5 Jina 内容提取

通过 Jina Reader API 提取网页正文：

```
GET https://r.jina.ai/http://{url}
```

返回原始 Markdown 文本。

### 3.6 配置要求

| 配置项 | 环境变量建议 | 是否必需 | 说明 |
|--------|-------------|----------|------|
| `exaApiKey` | `EXA_API_KEY` | 可选 | Exa 搜索 API 密钥 |
| `tavilyApiKey` | `TAVILY_API_KEY` | 可选 | Tavily 搜索 API 密钥 |
| `jinaApiKey` | `JINA_API_KEY` | 可选 | Jina API 密钥（搜索和提取共用） |

> 至少配置一个 API Key 才能进行有效搜索；全部未配置时返回 `unavailable` 状态。

### 3.7 错误处理

- **API 调用失败**：直接 throw Error（包含 HTTP status 和响应文本）
- **未配置提供商**：不抛错，返回 `{ status: "unavailable", reason: "..." }`
- **Jina 提取未配置**：返回 `{ status: "unavailable", reason: "Jina extraction is not configured." }`

### 3.8 使用方

- `agent-reach` skill — 互联网搜索任务
- research 工作流中的实时信息获取
- 网页内容提取（配合 Jina Reader）

---

## 4. Academic Search（学术搜索）

**用途：** 提供学术论文搜索能力，整合 arXiv、Semantic Scholar、Crossref、OpenAlex 四大学术数据源，覆盖 AI/量化金融/密码学等领域。

### 4.1 arXiv 模块 (`academic/arxiv.ts`)

免费的 arXiv API 客户端，**无需 API Key**，返回 Atom XML 并解析为结构化对象。

#### 预定义分类集合

| 分类键 | 包含的 arXiv 分类 | 适用领域 |
|--------|-------------------|----------|
| `ai` | cs.AI, cs.LG, cs.CL, stat.ML | 人工智能/机器学习 |
| `quant` | q-fin.CP, q-fin.GN, q-fin.PM, q-fin.TR, q-fin.ST | 量化金融 |
| `crypto` | cs.CR | 密码学与安全 |
| `all` | *(空，不过滤)* | 全部领域 |

#### 类型定义

| 类型 | 字段 |
|------|------|
| `ArxivPaper` | id, title, summary, authors[], categories[], published, updated, pdfUrl?, comment?, journalRef? |
| `ArxivSearchResult` | papers[], totalResults, startIndex, itemsPerPage |

#### 公开函数

| 函数签名 | 说明 |
|----------|------|
| `searchPapers(query, options?, signal?): Promise<ArxivSearchResult>` | 搜索论文（支持 ti:/au:/abs:/cat:/all: 字段前缀） |
| `getPaperById(arxivId, signal?): Promise<ArxivPaper \| null>` | 按 arXiv ID 获取单篇论文 |
| `getRecentPapers(days?, categories?, signal?): Promise<ArxivSearchResult>` | 获取最近 N 天的新论文 |
| `getTrendingPapers(limit?, signal?): Promise<ArxivPaper[]>` | 获取热门论文（AI+量化+密码学交叉领域） |
| `checkArxivHealth(signal?): Promise<{status, message}>` | 健康检查 |

**searchPapers options 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| maxResults | number | 10 | 最大返回数量（上限 200） |
| sortBy | "relevance" \| "lastUpdatedDate" \| "submittedDate" | "submittedDate" | 排序方式 |
| sortOrder | "ascending" \| "descending" | "descending" | 排序方向 |
| start | number | 0 | 分页起始偏移 |
| categories | string[] | undefined | 分类过滤（AND 逻辑） |

**API 端点：** `http://export.arxiv.org/api/query`
**超时时间：** 15 秒

### 4.2 多源学术搜索 (`academic/search.ts`)

提供 Semantic Scholar、Crossref、OpenAlex 三大数据源的搜索和详情查询。

#### 类型定义

| 类型 | 关键字段 |
|------|----------|
| `SemanticScholarPaper` | paperId, title, authors[], abstract, tldr, citationCount, url, openAccessPdf, venue, year |
| `CrossrefWork` | DOI, title[], authors[], published, containerTitle[], ISSN, type, link[], url |
| `OpenAlexWork` | id, title, publicationYear, citedByCount, concepts[], openAccess, url |

#### Semantic Scholar 函数

| 函数签名 | API 端点 |
|----------|----------|
| `searchSemanticScholar(query, options?, signal?)` | `https://api.semanticscholar.org/graph/v1/paper/search` |
| `getSemanticScholarPaper(paperId, signal?)` | `https://api.semanticscholar.org/graph/v1/paper/{id}` |
| `getSemanticScholarCitations(paperId, limit?, signal?)` | `.../paper/{id}/citations` |
| `getSemanticScholarReferences(paperId, limit?, signal?)` | `.../paper/{id}/references` |

> **无需 API Key**，但有限速（建议生产环境控制频率）。

#### Crossref 函数

| 函数签名 | API 端点 |
|----------|----------|
| `searchCrossref(query, options?, signal?)` | `https://api.crossref.org/works` |
| `getCrossrefByDoi(doi, signal?)` | `https://api.crossref.org/works/{doi}` |

> 需要 User-Agent header（已设置 `TradingPi/0.1`）。**无需 API Key**。

#### OpenAlex 函数

| 函数签名 | API 端点 |
|----------|----------|
| `searchOpenAlex(query, options?, signal?)` | `https://api.openalex.org/works` |
| `getOpenAlexWork(workId, signal?)` | `https://api.openalex.org/works/{id}` |

> 支持 OpenAlex ID 或完整 URL 作为 workId。**无需 API Key**（有礼貌性限速）。

### 4.3 配置要求

| 数据源 | API Key | 说明 |
|--------|---------|------|
| arXiv | **不需要** | 免费公开 API |
| Semantic Scholar | **不需要** | 免费，有限速 |
| Crossref | **不需要** | 需要 User-Agent（已内置） |
| OpenAlex | **不需要** | 礼貌性使用即可 |

### 4.4 错误处理

- **统一超时**：10 秒（`DEFAULT_TIMEOUT_MS`），支持外部 `AbortSignal`
- **HTTP 错误**：统一封装为 `Error("Academic source HTTP {status} for {host}{path}")`
- **XML 解析**：arXiv 返回的 Atom XML 由 DOMParser 解析，缺失字段安全降级为空字符串
- **数据归一化**：所有返回值经过 normalize 函数处理，null/undefined 安全

### 4.5 使用方

- 学术研究类工作流
- AI 论文追踪和趋势分析
- 量化金融文献调研
- `agent-reach` skill 的学术搜索通道

---

## 5. Community（社区数据）

**用途：** 通过 Reddit 公开 JSON API 获取加密货币、预测市场、股票等社区的帖子和评论数据，无需 OAuth 认证。

### 5.1 支持的子版块

| 子版块 | 说明 |
|--------|------|
| `CryptoCurrency` | 加密货币讨论 |
| `PredictionMarkets` | 预测市场讨论 |
| `soccer` | 足球讨论 |
| `politics` | 政治讨论 |
| `wallstreetbets` | WallStreetBets（美股 meme 板） |

> 传入不在白名单中的 subreddit 会抛出 `Error("Unsupported subreddit")`。

### 5.2 类型定义

| 类型 | 字段 |
|------|------|
| `RedditPost` | id, subreddit, title, selftext, score, comments, url, permalink, created, author |
| `RedditComment` | id, author, body, score, created, permalink |

### 5.3 公开函数

| 函数签名 | 说明 |
|----------|------|
| `getRedditHot(subreddit, limit?, signal?): Promise<RedditPost[]>` | 获取指定子版块热帖 |
| `searchReddit(query, subreddit?, sort?, limit?, signal?): Promise<RedditPost[]>` | 搜索帖子（支持限定子版块） |
| `getRedditComments(postIdOrPermalink, limit?, signal?): Promise<RedditComment[]>` | 获取帖子评论 |

**searchReddit 参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| query | *(必填)* | 搜索关键词 |
| subreddit | undefined | 限定子版块（不传则全站搜索） |
| sort | `"relevance"` | 排序方式 |
| limit | 10 | 最大返回数量 |

### 5.4 API 详情

| 属性 | 值 |
|------|-----|
| Base URL | `https://www.reddit.com` |
| 认证方式 | 无（纯 JSON API） |
| User-Agent | `TradingPi/0.1 research bot (local user agent)` |
| 超时时间 | 10 秒 |
| 速率限制处理 | 429 自动重试（最多 2 次，退避 750ms × attempt） |

### 5.5 速率限制策略

```
收到 HTTP 429
  ├─ attempt < 2 → 等待 750ms × (attempt + 1) 后重试
  └─ attempt >= 2 → 抛出错误
```

### 5.6 配置要求

| 配置项 | 是否必需 | 说明 |
|--------|----------|------|
| Reddit OAuth | **不需要** | 使用公开 JSON API |
| API Key | **不需要** | 无 |
| User-Agent | **内置** | 已设置固定 UA |

> 注意：Reddit 可能对频繁请求返回 403 或提高速率限制门槛。

### 5.7 错误处理

- **不支持 subreddit**：立即抛出 Error（含允许列表）
- **429 Too Many Requests**：自动重试 + 指数退避
- **其他 HTTP 错误**：抛出 `Error("Reddit HTTP {status} for {path}")`
- **超时**：AbortController 10 秒超时
- **数据归一化**：score/num_comments/created_utc 等 null 安全处理

### 5.8 使用方

- `agent-reach` skill — Reddit 数据通道
- 加密货币情绪分析工作流
- 预测市场舆情监控
- 社区趋势调研

---

## 6. Reach（多源数据访问）

**用途：** 提供中国金融市场数据接入能力（雪球 Xueqiu），以及全部外部数据源的聚合健康检查（Doctor）。

### 6.1 雪球 (Xueqiu) 集成 (`reach/xueqiu.ts`)

雪球是中国领先的投资者社区和行情平台，本模块提供其纯 HTTP API 的 TypeScript 封装。

#### 类型定义

| 类型 | 关键字段 |
|------|----------|
| `XueqiuStockQuote` | symbol, name, current, percent, chg, high, low, open, last_close, volume, amount, market_capital, turnover_rate, pe_ttm, timestamp |
| `XueqiuSearchResult` | symbol, name, exchange |
| `XueqiuHotPost` | id, title, text, author, likes, url |
| `XueqiuHotStock` | symbol, name, current, percent, rank |

#### 公开函数

| 函数签名 | 说明 | API 端点 |
|----------|------|----------|
| `setXueqiuCookie(cookieStr: string)` | 设置认证 Cookie（需 xq_a_token） | — |
| `getStockQuote(symbol, signal?)` | 获取实时行情 | `stock.xueqiu.com/v5/stock/batch/quote.json` |
| `searchStock(query, limit?, signal?)` | 搜索股票（代码或名称） | `xueqiu.com/stock/search.json` |
| `getHotPosts(limit?, signal?)` | 获取社区热门动态 | `xueqiu.com/v4/statuses/public_timeline_by_category.json` |
| `getHotStocks(limit?, stockType?, signal?)` | 获取热门股票排行 | `stock.xueqiu.com/v5/stock/hot_stock/list.json` |
| `checkXueqiuHealth(signal?)` | 健康检查 | 查询上证指数 SH000001 |

**股票代码格式说明：**

| 市场 | 代码前缀 | 示例 |
|------|----------|------|
| 上海证券交易所 | SH | SH600519（贵州茅台） |
| 深圳证券交易所 | SZ | SZ000858（五粮液） |
| 美股 | 纯代码 | AAPL |
| 港股 | 纯数字 | 00700（腾讯） |

#### Cookie 认证

```typescript
// 在调用需要认证的 API 之前设置
setXueqiuCookie("xq_a_token=your_token_here; ...");
```

> 未设置 Cookie 时仍可调用公开 API（如行情查询），但部分功能可能受限。

#### 请求头

| Header | 值 |
|--------|-----|
| User-Agent | Chrome 120 UA |
| Referer | `https://xueqiu.com/` |
| Cookie | （设置后附加） |

**超时时间：** 15 秒

### 6.2 Doctor 健康检查 (`reach/doctor.ts`)

对所有外部数据源进行并行探活检测，生成统一的健康报告。

#### 类型定义

| 类型 | 说明 |
|------|------|
| `SourceStatus` | `"ok"` / `"warn"` / `"error"` / `"off"` / `"rate_limited"` |
| `DataSourceStatus` | 单个数据源状态（id, name, status, latencyMs, message） |
| `DoctorReport` | 完整报告（checkedAt, overall, sources[]） |
| `DoctorOptions` | 检查选项（fredApiKey, coinMarketCapApiKey, fastMode, signal） |

#### 公开函数

| 函数签名 | 说明 |
|----------|------|
| `runDoctor(options?: DoctorOptions): Promise<DoctorReport>` | 运行全部数据源健康检查 |

#### 检测的数据源

| 数据源 | ID | 检测端点 | 是否需要 API Key | 默认超时 |
|--------|-----|----------|------------------|----------|
| Polymarket (Gamma API) | `polymarket` | `/markets?limit=1&active=true` | 否 | 30s |
| CoinGecko | `coingecko` | `/simple/price?ids=bitcoin&vs_currencies=usd` | 否 | 15s |
| CoinMarketCap | `coinmarketcap` | `/cryptocurrency/quotes/latest?symbol=BTC` | **是** (`X-CMC_PRO_API_KEY`) | 15s |
| DefiLlama | `defillama` | `/prices/current/coingecko:bitcoin` | 否 | 15s |
| FRED (美联储) | `fred` | `/series?series_id=FEDFUNDS` | **是** (query param) | 15s |
| Reddit | `reddit` | `/r/CryptoCurrency/hot.json?limit=1` | 否 | 20s |

#### 整体状态判定规则

```
overall = "healthy"     ← 所有源均为 ok
overall = "degraded"    ← 存在 warn / rate_limited / off
overall = "critical"    ← 任一源为 error
```

#### 快速模式 (`fastMode: true`)

跳过 Polymarket 检测（该源在中国网络环境下通常较慢），仅检测其余 5 个数据源。

#### HTTP 状态码特殊处理

| 状态码 | 映射的 SourceStatus | 说明 |
|--------|---------------------|------|
| 200 + JSON 可解析 | `ok` | 正常 |
| 200 + 非 JSON | `ok` | 正常（标注 non-JSON body） |
| 401 | `off` | 未认证 |
| 403 | `error` | 被禁止/封禁 |
| 429 | `rate_limited` | 限流 |
| 其他 4xx/5xx | `error` | 一般错误 |
| 超时/DNS 失败 | `error` | 网络问题 |

> Reddit 的 403 被特殊降级为 `warn`（因为 Reddit 日益收紧公开 API 访问）。

### 6.3 配置要求

| 配置项 | 环境变量 | 是否必需 | 说明 |
|--------|----------|----------|------|
| 雪球 Cookie | 手动调用 `setXueqiuCookie()` | 推荐 | 包含 `xq_a_token` |
| FRED API Key | `FRED_API_KEY` | 可选 | 不配则 warn 模式运行 |
| CoinMarketCap API Key | `COINMARKETCAP_API_KEY` | 可选 | 不配则 off 状态 |

### 6.4 错误处理

- **雪球模块**：HTTP 非 2xx 抛出 `Error("Xueqiu HTTP {status}")`； malformed 条目静默跳过
- **Doctor 模块**：所有错误均捕获并转换为 `DataSourceStatus`，不会向上抛异常
- **超时**：统一使用 AbortController，雪球 15s / Doctor 各源独立超时
- **网络错误**：区分 ECONNREFUSED、ENOTFOUND、fetch failed 等情况

### 6.5 使用方

- `agent-reach` skill — 中国股市数据通道
- Doctor 被 `reach doctor --json` CLI 命令直接调用
- 全局系统健康仪表盘
- 交易决策前的数据源可用性检查

---

## 架构总览

```
┌──────────────────────────────────────────────────────┐
│                  Trading Pi OS Agent                  │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ agent-reach │  │ agent-browser│  │  research   │ │
│  │   (skill)   │  │   (skill)    │  │ (workflow)  │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                 │          │
│  ┌──────▼────────────────▼─────────────────▼──────┐  │
│  │              External Integrations              │  │
│  │                                                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │ Browser  │ │  MCP Hub │ │ Search Hub   │   │  │
│  │  │  Layer   │ │          │ │              │   │  │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘   │  │
│  │       │            │              │            │  │
│  │  ┌────▼────────────▼──────────────▼────────┐  │  │
│  │  │        Academic / Community / Reach     │  │  │
│  │  │  arXiv · S2 · Crossref · OpenAlex      │  │  │
│  │  │  Reddit · Xueqiu · Doctor              │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  外部服务:                                             │
│  🌐 AIO Sandbox(:8080)  📡 Exa/Jina/Tavily           │
│  📄 arXiv/S2/Crossref/OpenAlex  💬 Reddit(JSON API)  │
│  📈 Xueqiu  🩺 Polymarket/CoinGecko/FRED/CMC/DeFiLL  │
└──────────────────────────────────────────────────────┘
```
