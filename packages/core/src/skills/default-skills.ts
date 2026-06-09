import { readFileSync } from "node:fs";
import { complete } from "@earendil-works/pi-ai";
import { AioSandboxBrowserLayer, type BrowserAction, type BrowserLayerActionResult } from "@trading-pi/browser-layer";
import { normalizeJournalInput } from "@trading-pi/journal";
import { checkMcpHealth, discoverMcpServers, requiresMcpApproval } from "@trading-pi/mcp-hub";
import { buildResearchBundle, researchQueryFor } from "@trading-pi/research-hub";
import { SearchHub } from "@trading-pi/search-hub";
import { scoreStrategy } from "@trading-pi/strategy-engine";
import { Type } from "typebox";
import { createTradingPiModel } from "../ai/model.js";
import { fetchCcxtOhlcv, fetchCcxtTicker } from "../market/ccxt.js";
import { fetchCoinGeckoQuote } from "../market/coingecko.js";
import type { SkillRegistry } from "./registry.js";
import type { SkillContext } from "./types.js";

export function registerDefaultSkills(registry: SkillRegistry) {
  const searchHub = (context: SkillContext) =>
    new SearchHub({
      exaApiKey: context.env.exaApiKey,
      tavilyApiKey: context.env.tavilyApiKey,
      jinaApiKey: context.env.jinaApiKey,
    });
  const browserLayer = (context: SkillContext) => new AioSandboxBrowserLayer({ aioSandboxBaseUrl: context.env.aioSandboxBaseUrl });

  registry.register({
    id: "ai.respond",
    name: "AI Response",
    description: "Call the configured OpenAI-compatible model for Trading Pi reasoning.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      prompt: Type.String(),
      systemPrompt: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      if (!context.env.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");
      const response = await complete(
        createTradingPiModel(context.env),
        {
          systemPrompt: input.systemPrompt ?? "You are Trading Pi, a local-first personal trading OS.",
          messages: [{ role: "user", content: input.prompt, timestamp: Date.now() }],
        },
        { apiKey: context.env.openaiApiKey },
      );
      return {
        text: response.content.filter((block) => block.type === "text").map((block) => block.text).join(""),
        usage: response.usage,
        stopReason: response.stopReason,
      };
    },
  });

  registry.register({
    id: "market.coingecko.quote",
    name: "CoinGecko Quote",
    description: "Fetch a public no-key USD quote from CoinGecko.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ symbol: Type.String() }),
    execute: async (input) => fetchCoinGeckoQuote(input.symbol),
  });

  registry.register({
    id: "market.ccxt.ticker",
    name: "CCXT Ticker",
    description: "Fetch an exchange ticker through CCXT.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => fetchCcxtTicker(input.exchange ?? context.env.defaultExchange, input.symbol),
  });

  registry.register({
    id: "market.ccxt.ohlcv",
    name: "CCXT OHLCV",
    description: "Fetch exchange OHLCV candles through CCXT.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
      timeframe: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) =>
      fetchCcxtOhlcv(input.exchange ?? context.env.defaultExchange, input.symbol, input.timeframe ?? "1h", input.limit ?? 24),
  });

  registry.register({
    id: "market.snapshot",
    name: "Market Snapshot",
    description: "Fetch a dual-source market snapshot from CoinGecko and CCXT, preserving source failures.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const outputs: Record<string, unknown> = {};
      const errors: Record<string, string> = {};
      try {
        outputs.coingecko = await fetchCoinGeckoQuote(input.symbol);
      } catch (error) {
        errors.coingecko = error instanceof Error ? error.message : String(error);
      }
      try {
        outputs.coinMarketCap = await fetchCoinMarketCapQuote(context.env.coinMarketCapApiKey, input.symbol);
      } catch (error) {
        errors.coinMarketCap = error instanceof Error ? error.message : String(error);
      }
      try {
        outputs.defiLlama = await fetchDefiLlamaPrice(input.symbol);
      } catch (error) {
        errors.defiLlama = error instanceof Error ? error.message : String(error);
      }
      try {
        outputs.ccxtTicker = await fetchCcxtTicker(input.exchange ?? context.env.defaultExchange, input.symbol);
      } catch (error) {
        errors.ccxtTicker = error instanceof Error ? error.message : String(error);
      }
      try {
        outputs.ccxtOhlcv = await fetchCcxtOhlcv(input.exchange ?? context.env.defaultExchange, input.symbol, "1h", 24);
      } catch (error) {
        errors.ccxtOhlcv = error instanceof Error ? error.message : String(error);
      }
      const result = {
        symbol: input.symbol,
        exchange: input.exchange ?? context.env.defaultExchange,
        layer: "market-data-layer",
        router: "ccxt-fallback-only",
        outputs,
        errors,
        observedAt: new Date().toISOString(),
      };
      context.repos.setCache({ namespace: "market", key: `market:${input.symbol}:${input.exchange ?? context.env.defaultExchange}`, value: result, source: "market-data-layer", ttlMs: 60_000 });
      context.repos.createAuditRecord({ category: "market", action: "market.snapshot", status: Object.keys(outputs).length ? "completed" : "failed", payload: { symbol: input.symbol, errors } });
      return result;
    },
  });

  registry.register({
    id: "market.router.health",
    name: "Exchange Router Health",
    description: "Check configured CCXT fallback exchanges and record availability without aggregating.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const symbol = input.symbol ?? "ETH/USDT";
      const exchanges = [context.env.defaultExchange, ...context.env.exchangeFallbacks];
      const checks = [];
      for (const exchange of [...new Set(exchanges)]) {
        try {
          const ticker = await fetchCcxtTicker(exchange, symbol);
          checks.push({ exchange, status: "available", last: ticker.last ?? ticker.bid ?? null });
        } catch (error) {
          checks.push({ exchange, status: "unavailable", reason: error instanceof Error ? error.message : String(error) });
        }
      }
      return { symbol, checks, router: "fallback-only", observedAt: new Date().toISOString() };
    },
  });

  registry.register({
    id: "search.query",
    name: "Search Query",
    description: "Run a configured Search Hub query through Exa/Jina/Tavily/free provider selection.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) => {
      const cacheKey = `search:${input.query}:${input.limit ?? 5}`;
      const cached = context.repos.getCache(cacheKey);
      if (cached) return { cached: true, ...cached.value as Record<string, unknown> };
      const result = await searchHub(context).query({ query: input.query, limit: input.limit });
      context.repos.setCache({ namespace: "search", key: cacheKey, value: result, source: "search-hub", ttlMs: 15 * 60_000 });
      return { cached: false, ...result };
    },
  });

  registry.register({
    id: "search.extract",
    name: "Search Extract",
    description: "Extract web page content through Search Hub extraction providers.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ url: Type.String() }),
    execute: async (input, context) => searchHub(context).extract(input),
  });

  registry.register({
    id: "search.summarize",
    name: "Search Summarize",
    description: "Summarize extracted content locally for Research Hub context.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ content: Type.String(), maxChars: Type.Optional(Type.Number()) }),
    execute: async (input, context) => searchHub(context).summarize(input),
  });

  for (const action of ["search", "open", "extract", "screenshot", "pdf"] as const) {
    registry.register({
      id: `browser.${action}`,
      name: `Browser ${action}`,
      description: `Run browser.${action} through the AIO Sandbox Browser Layer.`,
      riskLevel: action === "open" ? "medium" : "low",
      permission: "read",
      parameters: Type.Object({
        url: Type.Optional(Type.String()),
        query: Type.Optional(Type.String()),
      }),
      execute: async (input, context) => {
        const layer = browserLayer(context);
        const result =
          action === "search"
            ? await layer.search(input.query ?? "")
            : action === "open"
              ? await layer.open(input.url ?? "")
              : action === "extract"
                ? await layer.extract(input.url ?? "")
                : action === "screenshot"
                  ? await layer.screenshot(input.url ?? "")
                  : await layer.pdf(input.url ?? "");
        const artifact = await createBrowserArtifact(action, input, result, context);
        context.repos.createBrowserSession({
          id: result.sessionId,
          provider: result.provider,
          status: result.status,
          action: result.action,
          url: result.url,
          payload: input,
          result,
          artifactId: artifact?.id,
        });
        context.repos.createAuditRecord({ category: "browser", action: result.action, status: result.status, payload: redactBrowserResult(result) });
        return { ...result, artifact };
      },
    });
  }

  registry.register({
    id: "browser.action",
    name: "Browser Action",
    description: "Run a normalized Browser Layer action through AIO Sandbox and persist evidence.",
    riskLevel: "medium",
    permission: "read",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("browser.search"),
        Type.Literal("browser.open"),
        Type.Literal("browser.extract"),
        Type.Literal("browser.screenshot"),
        Type.Literal("browser.pdf"),
      ]),
      url: Type.Optional(Type.String()),
      query: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const payload = input.action === "browser.search" ? { query: input.query ?? "" } : { url: input.url ?? "" };
      const result = await browserLayer(context).action(input.action as BrowserAction, payload);
      const artifact = await createBrowserArtifact(input.action.replace("browser.", ""), payload, result, context);
      context.repos.createBrowserSession({
        id: result.sessionId,
        provider: result.provider,
        status: result.status,
        action: result.action,
        url: result.url,
        payload,
        result,
        artifactId: artifact?.id,
      });
      context.repos.createAuditRecord({ category: "browser", action: result.action, status: result.status, payload: redactBrowserResult(result) });
      return { ...result, artifact };
    },
  });

  registry.register({
    id: "risk.positionSizing",
    name: "Position Sizing",
    description: "Calculate simple position size from budget and stop distance.",
    riskLevel: "medium",
    permission: "read",
    parameters: Type.Object({
      budgetUsd: Type.Number(),
      riskPct: Type.Optional(Type.Number()),
      entry: Type.Number(),
      stop: Type.Number(),
    }),
    execute: async (input) => {
      const riskPct = input.riskPct ?? 1;
      const riskUsd = input.budgetUsd * (riskPct / 100);
      const stopDistance = Math.abs(input.entry - input.stop);
      const quantity = stopDistance === 0 ? 0 : riskUsd / stopDistance;
      return { riskPct, riskUsd, stopDistance, quantity, notionalUsd: quantity * input.entry };
    },
  });

  registry.register({
    id: "risk.tradePlan",
    name: "Trade Plan Risk",
    description: "Calculate risk metrics for a proposed trade plan.",
    riskLevel: "medium",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      budgetUsd: Type.Number(),
      direction: Type.Optional(Type.String()),
      entry: Type.Number(),
      stop: Type.Number(),
      takeProfit: Type.Optional(Type.Number()),
      riskPct: Type.Optional(Type.Number()),
    }),
    execute: async (input) => {
      const riskPct = input.riskPct ?? 1;
      const riskUsd = input.budgetUsd * (riskPct / 100);
      const stopDistance = Math.abs(input.entry - input.stop);
      const rewardDistance = input.takeProfit ? Math.abs(input.takeProfit - input.entry) : null;
      const quantity = stopDistance === 0 ? 0 : riskUsd / stopDistance;
      return {
        symbol: input.symbol,
        direction: input.direction ?? "undecided",
        budgetUsd: input.budgetUsd,
        riskPct,
        riskUsd,
        entry: input.entry,
        stop: input.stop,
        takeProfit: input.takeProfit ?? null,
        stopDistance,
        rewardDistance,
        quantity,
        notionalUsd: quantity * input.entry,
        rewardRiskRatio: rewardDistance === null || stopDistance === 0 ? null : rewardDistance / stopDistance,
      };
    },
  });

  registry.register({
    id: "research.asset",
    name: "Asset Research Context",
    description: "Prepare market and memory context for asset research.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      symbol: Type.String(),
      exchange: Type.Optional(Type.String()),
      workspaceId: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const snapshot = await registry.get("market.snapshot").execute(input, context);
      const search = await registry.get("search.query").execute({ query: researchQueryFor(input.symbol), limit: 5 }, context);
      const browser = await registry.get("browser.search").execute({ query: researchQueryFor(input.symbol) }, context);
      const memory = input.workspaceId ? context.memory.workspaceContext(input.workspaceId) : context.memory.domainContext("research");
      const bundle = buildResearchBundle({
        symbol: input.symbol,
        workspaceId: input.workspaceId,
        marketSnapshot: snapshot,
        searchResult: search,
        browserResult: browser,
        memoryContext: memory,
      });
      context.memory.write({
        domain: "research",
        workspaceId: input.workspaceId,
        key: `${input.symbol}:latest-research-context`,
        value: `Source quality ${bundle.sourceQuality.score}/100 with ${bundle.sourceQuality.completed}/${bundle.sourceQuality.total} sources completed.`,
        sourceType: "skill",
        sourceId: "research.asset",
        importance: 0.72,
        metadata: { symbol: input.symbol, sourceQuality: bundle.sourceQuality },
      });
      context.repos.createAuditRecord({ category: "research", action: "research.asset", status: "completed", payload: { symbol: input.symbol, sourceQuality: bundle.sourceQuality } });
      return bundle;
    },
  });

  registry.register({
    id: "research.report",
    name: "Research Report",
    description: "Generate a real AI research report from observed market context.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      symbol: Type.String(),
      researchContext: Type.Any(),
    }),
    execute: async (input, context) =>
      registry.get("ai.respond").execute(
        {
          prompt: `Create a concise Trading Pi research report for ${input.symbol}.
Use only the observed context below. If a source failed, cite the failure plainly.
Observed context JSON:
${JSON.stringify(input.researchContext)}

Return sections: Market Snapshot, Source Quality, Thesis, Key Risks, Watchlist Levels, Next Actions.`,
          systemPrompt: "You are Trading Pi Agent. Produce cautious research artifacts, not financial advice.",
        },
        context,
      ),
  });

  registry.register({
    id: "artifact.create",
    name: "Create Artifact",
    description: "Create a local markdown artifact and persist artifact metadata.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      type: Type.String(),
      title: Type.String(),
      summary: Type.String(),
      markdown: Type.String(),
      contentType: Type.Optional(Type.String()),
      previewReady: Type.Optional(Type.Boolean()),
      previewPayload: Type.Optional(Type.Any()),
    }),
    execute: async (input, context) =>
      context.artifacts.create({
        ...input,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
        payload: input,
      }),
  });

  registry.register({
    id: "artifact.read",
    name: "Read Artifact",
    description: "Read a persisted local artifact by id.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ artifactId: Type.String() }),
    execute: async (input, context) => {
      const artifact = context.repos.getArtifact(input.artifactId);
      if (!artifact) throw new Error(`Artifact not found: ${input.artifactId}`);
      return {
        ...artifact,
        payload: JSON.parse(artifact.payload_json),
        previewPayload: artifact.preview_payload_json ? JSON.parse(artifact.preview_payload_json) : null,
        markdown: readFileSync(artifact.path, "utf8"),
      };
    },
  });

  registry.register({
    id: "artifact.preview",
    name: "Artifact Preview",
    description: "Read artifact preview metadata and content for the frontend preview panel.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ artifactId: Type.String() }),
    execute: async (input, context) => {
      const artifact = context.repos.getArtifact(input.artifactId);
      if (!artifact) throw new Error(`Artifact not found: ${input.artifactId}`);
      return {
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        contentType: artifact.content_type,
        content: artifact.content ?? readFileSync(artifact.path, "utf8"),
        previewReady: Boolean(artifact.preview_ready),
        previewPayload: artifact.preview_payload_json ? JSON.parse(artifact.preview_payload_json) : null,
      };
    },
  });

  registry.register({
    id: "paper.order.create",
    name: "Create Paper Order",
    description: "Create a local simulated paper order. This never calls a live exchange.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      symbol: Type.String(),
      side: Type.Union([Type.Literal("buy"), Type.Literal("sell")]),
      quantity: Type.Number(),
      price: Type.Number(),
      orderType: Type.Optional(Type.String()),
      sourcePlanArtifactId: Type.Optional(Type.String()),
    }),
    execute: async (input, context) =>
      context.repos.createPaperOrder({
        ...input,
        sessionId: context.sessionId,
        payload: { createdBy: "paper.order.create", liveTrading: false },
      }),
  });

  registry.register({
    id: "journal.entry.create",
    name: "Create Journal Entry",
    description: "Create a local trade journal entry and artifact.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      tradeId: Type.Optional(Type.String()),
      planArtifactId: Type.Optional(Type.String()),
      mood: Type.Optional(Type.String()),
      disciplineScore: Type.Optional(Type.Number()),
      rulesViolated: Type.Optional(Type.Array(Type.String())),
      notes: Type.String(),
      screenshotPath: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const normalized = normalizeJournalInput(input);
      const journalId = context.repos.createJournalEntry({ ...normalized, sessionId: context.sessionId });
      const artifact = context.artifacts.create({
        type: "trade-journal",
        title: `Trade Journal ${journalId}`,
        summary: normalized.notes.slice(0, 160),
        markdown: `# Trade Journal ${journalId}

- Trade: ${normalized.tradeId ?? "unlinked"}
- Plan artifact: ${normalized.planArtifactId ?? "unlinked"}
- Mood: ${normalized.mood ?? "not recorded"}
- Discipline score: ${normalized.disciplineScore ?? 0}
- Rules violated: ${normalized.rulesViolated.join(", ") || "none"}

## Notes

${normalized.notes}
`,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
        payload: normalized,
      });
      context.repos.attachJournalArtifact(journalId, artifact.id);
      context.memory.write({
        domain: "trade",
        key: `journal:${journalId}`,
        value: `${normalized.mood ?? "mood unknown"} discipline=${normalized.disciplineScore ?? 0}: ${normalized.notes.slice(0, 220)}`,
        sourceType: "journal",
        sourceId: journalId,
        importance: 0.65,
        metadata: { rulesViolated: normalized.rulesViolated, artifactId: artifact.id },
      });
      return { journalId, artifact };
    },
  });

  registry.register({
    id: "memory.write",
    name: "Write Memory",
    description: "Persist domain memory for conversation, trade, review, skill, research, strategy, and workspace context.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      domain: Type.String(),
      key: Type.String(),
      value: Type.String(),
      workspaceId: Type.Optional(Type.String()),
      importance: Type.Optional(Type.Number()),
      sourceType: Type.Optional(Type.String()),
      sourceId: Type.Optional(Type.String()),
      metadata: Type.Optional(Type.Any()),
    }),
    execute: async (input, context) => context.memory.write(input as never),
  });

  registry.register({
    id: "memory.query",
    name: "Query Memory",
    description: "Read long-term Trading Pi memory by domain, workspace, or search text.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      domain: Type.Optional(Type.String()),
      workspaceId: Type.Optional(Type.String()),
      q: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) => context.memory.query(input as never),
  });

  registry.register({
    id: "workspace.create",
    name: "Create Workspace",
    description: "Create or update a Trading Pi workspace as context + memory + artifacts + workflows.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.String(),
      kind: Type.Union([Type.Literal("btc"), Type.Literal("eth"), Type.Literal("macro"), Type.Literal("custom")]),
      context: Type.Optional(Type.Any()),
    }),
    execute: async (input, context) => {
      const workspaceId = context.repos.upsertWorkspace(input);
      context.memory.write({
        domain: "workspace",
        workspaceId,
        key: "workspace.context",
        value: JSON.stringify(input.context ?? {}),
        sourceType: "skill",
        sourceId: "workspace.create",
        importance: 0.8,
        metadata: { kind: input.kind, name: input.name },
      });
      context.repos.createAuditRecord({ category: "workspace", action: "workspace.create", status: "completed", payload: { workspaceId, kind: input.kind } });
      return { workspaceId };
    },
  });

  registry.register({
    id: "workspace.context",
    name: "Workspace Context",
    description: "Read workspace as context + memory + linked artifacts/workflows.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ workspaceId: Type.String() }),
    execute: async (input, context) => context.repos.workspaceContext(input.workspaceId),
  });

  registry.register({
    id: "mcp.discover",
    name: "MCP Discovery",
    description: "Discover MCP candidates through the local MCP Hub catalog.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ query: Type.Optional(Type.String()) }),
    execute: async (input, context) => {
      const discovery = discoverMcpServers(input.query ?? "");
      const discoveryId = context.repos.createMcpDiscovery({ query: input.query ?? "", provider: discovery.provider, candidates: discovery.candidates });
      context.repos.createAuditRecord({ category: "mcp", action: "mcp.discover", status: "completed", payload: { discoveryId, count: discovery.candidates.length } });
      return { discoveryId, ...discovery };
    },
  });

  registry.register({
    id: "mcp.register",
    name: "MCP Register",
    description: "Register an MCP server as a Skill Registry extension layer.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.String(),
      command: Type.Optional(Type.String()),
      url: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      permission: Type.Optional(Type.String()),
      capabilities: Type.Optional(Type.Array(Type.String())),
    }),
    execute: async (input, context) => {
      if (requiresMcpApproval(input.permission)) {
        const approvalId = context.approvals.request({
          action: "mcp.register",
          riskLevel: "high",
          reason: `MCP ${input.name} requests ${input.permission} permission.`,
          payload: input,
          sessionId: context.sessionId,
          workflowRunId: context.workflowRunId,
        });
        const serverId = context.repos.upsertMcpServer({ ...input, status: "testing", permission: input.permission ?? "read", manifest: input });
        const permissionId = context.repos.upsertMcpPermission({ serverId, permission: input.permission ?? "read", status: "pending", approvalId });
        return { blocked: true, approvalId, serverId, permissionId };
      }
      const health = checkMcpHealth(input as never);
      const serverId = context.repos.upsertMcpServer({ ...input, status: health.status, permission: input.permission ?? "read", health, manifest: input });
      context.repos.upsertMarketplaceItem({
        id: `market_${serverId}`,
        kind: "mcp",
        name: input.name,
        description: input.description ?? "Registered MCP server.",
        status: "installed",
        permission: input.permission ?? "read",
        manifest: input,
      });
      context.repos.createAuditRecord({ category: "mcp", action: "mcp.register", status: "completed", payload: { serverId, health } });
      return { serverId, health };
    },
  });

  registry.register({
    id: "mcp.health",
    name: "MCP Health Check",
    description: "Record MCP registry health as a Skill Registry extension layer.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      url: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const health = checkMcpHealth({ id: input.id, name: input.name ?? "Local MCP Catalog", url: input.url });
      const serverId = context.repos.upsertMcpServer({
        id: input.id,
        name: input.name ?? "Local MCP Catalog",
        url: input.url,
        status: health.status,
        permission: "read",
        health,
        manifest: { id: input.id, name: input.name ?? "Local MCP Catalog", url: input.url },
      });
      context.repos.createAuditRecord({ category: "mcp", action: "mcp.health", status: health.status, payload: { serverId, health } });
      return { serverId, health };
    },
  });

  registry.register({
    id: "mcp.permission.request",
    name: "MCP Permission Request",
    description: "Create an approval gate for enabling MCP permissions.",
    riskLevel: "high",
    permission: "dangerous",
    parameters: Type.Object({ serverId: Type.String(), permission: Type.String(), reason: Type.Optional(Type.String()) }),
    execute: async (input, context) => {
      const approvalId = context.approvals.request({
        action: "mcp.permission",
        riskLevel: "high",
        reason: input.reason ?? `Enable MCP ${input.serverId} with ${input.permission} permission.`,
        payload: input,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
      });
      const permissionId = context.repos.upsertMcpPermission({ serverId: input.serverId, permission: input.permission, status: "pending", approvalId });
      return { blocked: true, approvalId, permissionId };
    },
  });

  registry.register({
    id: "marketplace.catalog.seed",
    name: "Seed Marketplace Catalog",
    description: "Seed local Skills/Workflow/MCP/Template marketplace items without network installs.",
    riskLevel: "low",
    permission: "write",
    parameters: Type.Object({}),
    execute: async (_input, context) => {
      const items = [
        ["skill", "Search Hub", "Unified Exa/Tavily/Jina/free search skills."],
        ["workflow", "Research Hub", "Research workflow entry via Search/Browser/Market context."],
        ["mcp", "Local MCP Catalog", "MCP registry, discovery, health, and permissions."],
        ["mcp", "AIO Sandbox Browser", "Browser search/open/extract/screenshot/pdf through sandbox skills."],
        ["workflow", "Evolution Loop", "Review strategies, run backtests, and propose guarded improvements."],
        ["template", "BTC Workspace", "Default BTC workspace template."],
        ["template", "Beginner Journey", "Learning route from mock mode to paper review and guarded readiness."],
      ] as const;
      return {
        items: items.map(([kind, name, description]) =>
          context.repos.upsertMarketplaceItem({ kind, name, description, status: "available", permission: "read" }),
        ),
      };
    },
  });

  registry.register({
    id: "strategy.create",
    name: "Create Strategy",
    description: "Create or update a strategy definition with lifecycle and score metadata.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      name: Type.String(),
      version: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
      parameters: Type.Optional(Type.Any()),
      winRate: Type.Optional(Type.Number()),
      rewardRisk: Type.Optional(Type.Number()),
      disciplineScore: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) => {
      const score = scoreStrategy(input);
      const strategyId = context.repos.upsertStrategy({
        name: input.name,
        version: input.version,
        status: input.status,
        parameters: input.parameters,
        score,
      });
      return { strategyId, score };
    },
  });

  registry.register({
    id: "strategy.lifecycle",
    name: "Strategy Lifecycle",
    description: "Update strategy lifecycle status through draft/testing/verified/deprecated.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.String(),
      version: Type.Optional(Type.String()),
      status: Type.Union([Type.Literal("draft"), Type.Literal("testing"), Type.Literal("verified"), Type.Literal("deprecated")]),
      parameters: Type.Optional(Type.Any()),
      score: Type.Optional(Type.Number()),
    }),
    execute: async (input, context) => {
      const strategyId = context.repos.upsertStrategy(input);
      context.repos.createAuditRecord({ category: "strategy", action: "strategy.lifecycle", status: input.status, payload: { strategyId } });
      context.memory.write({
        domain: "strategy",
        key: `strategy:${strategyId}`,
        value: `${input.name} ${input.version ?? "1.0.0"} is ${input.status} score=${input.score ?? 0}`,
        sourceType: "skill",
        sourceId: "strategy.lifecycle",
        importance: 0.7,
        metadata: { strategyId, status: input.status },
      });
      return { strategyId };
    },
  });

  registry.register({
    id: "backtest.run",
    name: "Run Backtest",
    description: "Create a sandbox backtest record linking Strategy Engine and Evolution Engine.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      strategyId: Type.Optional(Type.String()),
      symbol: Type.String(),
      timeframe: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const metrics = { symbol: input.symbol, timeframe: input.timeframe ?? "1h", mode: "sandbox", note: "Backtest bridge foundation record." };
      const backtestId = context.repos.createBacktest({ strategyId: input.strategyId, status: "completed", metrics });
      context.repos.createAuditRecord({ category: "backtest", action: "backtest.run", status: "completed", payload: { backtestId, metrics } });
      return { backtestId, metrics };
    },
  });

  registry.register({
    id: "backtest.compare",
    name: "Compare Backtests",
    description: "Compare recent sandbox backtest bridge records for Strategy/Evolution.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({ strategyId: Type.Optional(Type.String()) }),
    execute: async (input, context) => {
      const rows = input.strategyId
        ? context.repos.db.prepare("SELECT * FROM backtests WHERE strategy_id = ? ORDER BY created_at DESC LIMIT 20").all(input.strategyId)
        : context.repos.list("backtests");
      return { strategyId: input.strategyId ?? null, rows, comparedAt: new Date().toISOString() };
    },
  });

  registry.register({
    id: "evolution.propose",
    name: "Evolution Proposal",
    description: "Create a guarded strategy/workflow improvement proposal from review, journal, memory, and backtests.",
    riskLevel: "medium",
    permission: "write",
    parameters: Type.Object({
      strategyId: Type.Optional(Type.String()),
      focus: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => {
      const review = context.repos.reviewMetrics();
      const strategyMemory = context.memory.domainContext("strategy");
      const reviewMemory = context.memory.domainContext("review");
      const proposal = {
        focus: input.focus ?? "discipline and risk consistency",
        strategyId: input.strategyId ?? null,
        review,
        memory: { strategy: strategyMemory, review: reviewMemory },
        recommendedLifecycle: "testing",
        guardrail: "Proposal only. Applying strategy changes requires explicit approval.",
        proposedAt: new Date().toISOString(),
      };
      const artifact = context.artifacts.create({
        type: "evolution-proposal",
        title: "Evolution Proposal",
        summary: `Strategy improvement proposal focused on ${proposal.focus}.`,
        markdown: `# Evolution Proposal\n\n\`\`\`json\n${JSON.stringify(proposal, null, 2)}\n\`\`\`\n`,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
        payload: proposal,
      });
      const approvalId = context.approvals.request({
        action: "evolution.apply",
        riskLevel: "high",
        reason: "Applying an evolution proposal changes strategy behavior and requires guarded approval.",
        payload: proposal,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
      });
      const proposalId = context.repos.createEvolutionProposal({ strategyId: input.strategyId, proposal, artifactId: artifact.id, approvalId });
      context.repos.createAuditRecord({ category: "evolution", action: "evolution.propose", status: "blocked", payload: { proposalId, approvalId } });
      return { proposalId, proposal, artifact, blocked: true, approvalId };
    },
  });

  registry.register({
    id: "review.daily",
    name: "Daily Review Metrics",
    description: "Calculate local daily review metrics from paper trades and journal entries.",
    riskLevel: "low",
    permission: "read",
    parameters: Type.Object({
      period: Type.Optional(Type.String()),
    }),
    execute: async (input, context) => ({
      period: input.period ?? "daily",
      metrics: context.repos.reviewMetrics(),
      portfolio: context.repos.portfolioSnapshot(),
      memory: context.memory.domainContext("trade"),
      generatedAt: new Date().toISOString(),
    }),
  });

  registry.register({
    id: "approval.request",
    name: "Request Approval",
    description: "Create a runtime approval gate for dangerous actions.",
    riskLevel: "high",
    permission: "dangerous",
    parameters: Type.Object({
      action: Type.String(),
      riskLevel: Type.String(),
      reason: Type.String(),
      payload: Type.Any(),
    }),
    execute: async (input, context) => ({
      approvalId: context.approvals.request({
        action: input.action,
        riskLevel: input.riskLevel,
        reason: input.reason,
        payload: input.payload,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
      }),
      blocked: true,
    }),
  });
}

async function fetchCoinMarketCapQuote(apiKey: string | undefined, symbol: string) {
  if (!apiKey) throw new Error("CoinMarketCap is not configured. Set COINMARKETCAP_API_KEY to enable this source.");
  const base = symbol.split("/")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const url = new URL("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest");
  url.searchParams.set("symbol", base);
  const response = await fetch(url, { headers: { "X-CMC_PRO_API_KEY": apiKey } });
  if (!response.ok) throw new Error(`CoinMarketCap HTTP ${response.status}`);
  const json = (await response.json()) as any;
  const quote = json.data?.[base]?.quote?.USD;
  if (!quote) throw new Error(`CoinMarketCap did not return USD quote for ${base}`);
  return {
    source: "coinmarketcap",
    symbol,
    priceUsd: quote.price,
    change24h: quote.percent_change_24h ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchDefiLlamaPrice(symbol: string) {
  const base = symbol.split("/")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const ids: Record<string, string> = {
    BTC: "coingecko:bitcoin",
    ETH: "coingecko:ethereum",
    SOL: "coingecko:solana",
    BNB: "coingecko:binancecoin",
    XRP: "coingecko:ripple",
    DOGE: "coingecko:dogecoin",
  };
  const coinId = ids[base];
  if (!coinId) throw new Error(`DefiLlama price mapping is not configured for ${base}`);
  const response = await fetch(`https://coins.llama.fi/prices/current/${encodeURIComponent(coinId)}`);
  if (!response.ok) throw new Error(`DefiLlama HTTP ${response.status}`);
  const json = (await response.json()) as any;
  const price = json.coins?.[coinId];
  if (!price) throw new Error(`DefiLlama did not return price for ${coinId}`);
  return { source: "defillama", symbol, coinId, priceUsd: price.price, confidence: price.confidence ?? null, fetchedAt: new Date().toISOString() };
}

async function createBrowserArtifact(action: string, input: unknown, result: BrowserLayerActionResult, context: SkillContext) {
  const kind = result.artifactKind ?? "markdown";
  const title = `Browser ${action} ${result.url ?? (input as any)?.url ?? (input as any)?.query ?? ""}`.trim();
  const contentType = kind === "html" ? "text/html" : kind === "pdf" ? "application/pdf" : kind === "png" ? "image/png" : "text/markdown";
  const content = result.content ?? JSON.stringify(redactBrowserResult(result), null, 2);
  const markdown = `# ${title}

- Status: ${result.status}
- Provider: ${result.provider}
- Session: ${result.sessionId}
- Reason: ${result.reason ?? "none"}

## Result

\`\`\`${kind === "html" ? "html" : "json"}
${content}
\`\`\`
`;
  if (result.status === "unavailable" || action === "open" || action === "search" || action === "extract" || action === "screenshot" || action === "pdf") {
    return context.artifacts.create({
      type: `browser-${action}`,
      title,
      summary: result.reason ?? `Browser ${action} evidence from ${result.provider}.`,
      markdown,
      contentType,
      previewReady: true,
      previewPayload: { kind, provider: result.provider, sessionId: result.sessionId, status: result.status, url: result.url },
      sessionId: context.sessionId,
      workflowRunId: context.workflowRunId,
      payload: { input, result: redactBrowserResult(result) },
    });
  }
  return undefined;
}

function redactBrowserResult(result: BrowserLayerActionResult) {
  return {
    status: result.status,
    action: result.action,
    sessionId: result.sessionId,
    provider: result.provider,
    observedAt: result.observedAt,
    contentType: result.contentType,
    artifactKind: result.artifactKind,
    url: result.url,
    reason: result.reason,
  };
}
