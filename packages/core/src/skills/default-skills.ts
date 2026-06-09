import { readFileSync } from "node:fs";
import { complete } from "@earendil-works/pi-ai";
import { AioSandboxBrowserLayer } from "@trading-pi/browser-layer";
import { normalizeJournalInput } from "@trading-pi/journal";
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
        outputs.ccxtTicker = await fetchCcxtTicker(input.exchange ?? context.env.defaultExchange, input.symbol);
      } catch (error) {
        errors.ccxtTicker = error instanceof Error ? error.message : String(error);
      }
      try {
        outputs.ccxtOhlcv = await fetchCcxtOhlcv(input.exchange ?? context.env.defaultExchange, input.symbol, "1h", 24);
      } catch (error) {
        errors.ccxtOhlcv = error instanceof Error ? error.message : String(error);
      }
      return { symbol: input.symbol, exchange: input.exchange ?? context.env.defaultExchange, outputs, errors, observedAt: new Date().toISOString() };
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
        if (action === "search") return layer.search(input.query ?? "");
        if (action === "open") return layer.open(input.url ?? "");
        if (action === "extract") return layer.extract(input.url ?? "");
        if (action === "screenshot") return layer.screenshot(input.url ?? "");
        return layer.pdf(input.url ?? "");
      },
    });
  }

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
    }),
    execute: async (input, context) => {
      const snapshot = await registry.get("market.snapshot").execute(input, context);
      return {
        symbol: input.symbol,
        snapshot,
        search: await registry.get("search.query").execute({ query: `${input.symbol} market news risk catalyst`, limit: 5 }, context),
        memory: context.memory.contextBlock("user"),
        requestedAt: new Date().toISOString(),
      };
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
      return { journalId, artifact };
    },
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
    execute: async (input, context) => ({ workspaceId: context.repos.upsertWorkspace(input) }),
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
      const health = { status: input.url ? "configured" : "local-catalog", checkedAt: new Date().toISOString() };
      const serverId = context.repos.upsertMcpServer({
        id: input.id,
        name: input.name ?? "Local MCP Catalog",
        url: input.url,
        status: health.status,
        permission: "read",
        health,
      });
      context.repos.createAuditRecord({ category: "mcp", action: "mcp.health", status: health.status, payload: { serverId, health } });
      return { serverId, health };
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
        ["template", "BTC Workspace", "Default BTC workspace template."],
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
      return { backtestId, metrics };
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
