import type { SkillContext } from "../skills/types.js";
import type { SkillRegistry } from "../skills/registry.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { WorkflowContext } from "./types.js";
import type { ResearchBundle } from "../research/bundle.js";
import { sourceQuality } from "../research/bundle.js";
import { alphaCategory, formatPercent, formatUsd, type AlphaSignal } from "../alpha/alpha-radar.js";
import { runDeepResearch } from "../research/deep-research.js";

async function runSkill<T>(context: WorkflowContext, skillId: string, input: unknown): Promise<T> {
  const skill = context.skills.get(skillId);
  const runId = context.repos.createSkillRun(context.workflowRunId, skillId, input);
  context.repos.createTimeline({
    sessionId: context.sessionId,
    workflowRunId: context.workflowRunId,
    skillRunId: runId,
    type: "skill",
    title: `Skill started: ${skill.name}`,
    status: "running",
    payload: input,
  });
  try {
    if (context.approvals.requiresApproval(skill.id, skill.riskLevel)) {
      const approvalId = context.approvals.request({
        action: skill.id,
        riskLevel: skill.riskLevel,
        reason: `${skill.name} requires approval before execution.`,
        payload: input,
        sessionId: context.sessionId,
        workflowRunId: context.workflowRunId,
      });
      const output = { blocked: true, approvalId };
      context.repos.finishSkillRun(runId, "blocked", output);
      return output as T;
    }
    const output = await skill.execute(input as never, context as SkillContext);
    context.repos.finishSkillRun(runId, "completed", output);
    context.repos.createTimeline({
      sessionId: context.sessionId,
      workflowRunId: context.workflowRunId,
      skillRunId: runId,
      type: "skill",
      title: `Skill completed: ${skill.name}`,
      status: "completed",
      payload: output,
    });
    return output as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.repos.finishSkillRun(runId, "failed", undefined, message);
    context.repos.createTimeline({
      sessionId: context.sessionId,
      workflowRunId: context.workflowRunId,
      skillRunId: runId,
      type: "skill",
      title: `Skill failed: ${skill.name}`,
      detail: message,
      status: "failed",
    });
    throw error;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function registerDefaultWorkflows(engine: WorkflowEngine, _skills: SkillRegistry) {
  engine.register({
    id: "chat.respond",
    name: "Chat Response",
    description: "Call Trading Pi AI for a normal chat response.",
    riskLevel: "low",
    execute: async (input: { prompt: string }, context) =>
      runSkill(context, "ai.respond", {
        prompt: input.prompt,
        systemPrompt: `You are Trading Pi, a single-agent local-first personal trading OS.
Never promise profits. Every dangerous action must require approval.
Saved local memory:
${context.memory.contextBlock("user")}`,
      }),
  });

  engine.register({
    id: "market.snapshot",
    name: "Market Snapshot",
    description: "Fetch both CoinGecko and CCXT market data for a symbol.",
    riskLevel: "low",
    execute: async (input: { symbol: string; exchange?: string }, context) => {
      const snapshot = await runSkill<{ symbol: string; outputs: Record<string, unknown>; errors: Record<string, string> }>(
        context,
        "market.snapshot",
        input,
      );
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "market-snapshot",
        title: `Market Snapshot ${input.symbol}`,
        summary: `CoinGecko and CCXT snapshot for ${input.symbol}.`,
        markdown: `# Market Snapshot ${input.symbol}\n\n## Outputs\n\n\`\`\`json\n${JSON.stringify(snapshot.outputs, null, 2)}\n\`\`\`\n\n## Errors\n\n\`\`\`json\n${JSON.stringify(snapshot.errors, null, 2)}\n\`\`\`\n`,
      });
      return { ...snapshot, artifact };
    },
  });

  engine.register({
    id: "research.asset",
    name: "Asset Research",
    description: "Generate an AI research report artifact from real market data.",
    riskLevel: "low",
    execute: async (input: { symbol: string; exchange?: string; workspaceId?: string }, context) => {
      const researchContext = await runSkill<ResearchBundle & { sourceQuality: ReturnType<typeof sourceQuality> }>(context, "research.asset", input);
      const report = await runSkill<{ text: string }>(context, "research.report", {
        symbol: input.symbol,
        researchContext,
      });
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "research-report",
        title: `Research Report ${input.symbol}`,
        summary: `AI research report for ${input.symbol}.`,
        workspaceId: input.workspaceId,
        markdown: `# Research Report ${input.symbol}\n\n${report.text}\n\n## Sources\n\n\`\`\`json\n${JSON.stringify(researchContext.sources ?? [], null, 2)}\n\`\`\`\n\n## Source Quality\n\n\`\`\`json\n${JSON.stringify(researchContext.sourceQuality ?? {}, null, 2)}\n\`\`\`\n\n## Observed Context\n\n\`\`\`json\n${JSON.stringify(researchContext, null, 2)}\n\`\`\`\n`,
      });
      if (input.workspaceId) {
        context.repos.linkWorkspace({ workspaceId: input.workspaceId, kind: "artifact", refId: artifact.id, metadata: { workflow: "research.asset" } });
      }
      return { symbol: input.symbol, researchContext, report, artifact };
    },
  });

  engine.register({
    id: "browser.evidence",
    name: "Browser Evidence",
    description: "Run a Browser Skill through AIO Sandbox and create previewable evidence artifacts.",
    riskLevel: "medium",
    execute: async (input: { action: "browser.search" | "browser.open" | "browser.extract" | "browser.screenshot" | "browser.pdf"; url?: string; query?: string }, context) =>
      runSkill(context, "browser.action", input),
  });

  engine.register({
    id: "alpha.radar.scan",
    name: "Alpha Radar Scan",
    description: "Scan prediction markets, news, and community sources for top opportunity signals.",
    riskLevel: "low",
    execute: async (input: { category?: string } = {}, context) => {
      const marketResult = await runSkill<{ markets?: any[] }>(context, "market.polymarket.markets", {
        active: true,
        closed: false,
        category: input.category,
        limit: 50,
      }).catch((error) => ({ markets: [], error: error instanceof Error ? error.message : String(error) }));
      const newsResult = await runSkill<any>(context, "search.query", {
        query: "breaking prediction markets crypto politics macro news last 24 hours",
        limit: 5,
      }).catch((error) => ({ results: [], error: error instanceof Error ? error.message : String(error) }));
      const redditResult = await runSkill<any>(context, "community.reddit", {
        method: "hot",
        subreddit: input.category === "sports" ? "soccer" : input.category === "politics" ? "politics" : "PredictionMarkets",
        limit: 10,
      }).catch((error) => ({ posts: [], error: error instanceof Error ? error.message : String(error) }));
      const eventResult = await Promise.allSettled([
        runSkill<any>(context, "events.fred", { method: "calendar", limit: 10 }),
        runSkill<any>(context, "events.coinmarketcal", { method: "events", days: 7 }),
      ]).then(([fred, coinmarketcal]) => ({ fred: settledWorkflowValue(fred), coinmarketcal: settledWorkflowValue(coinmarketcal) }));

      const newsUrls = extractUrls(newsResult);
      const redditUrls = ((redditResult as { posts?: Array<{ permalink?: string; url?: string }> }).posts ?? [])
        .map((post) => post.permalink ?? post.url)
        .filter((url): url is string => Boolean(url))
        .slice(0, 3);
      const markets = ((marketResult as { markets?: any[] }).markets ?? [])
        .filter((market) => Number(market.volume ?? 0) >= 50_000)
        .sort((a, b) => scoreMarket(b) - scoreMarket(a))
        .slice(0, 5);
      const signals: AlphaSignal[] = markets.map((market, index) => {
        const yesPrice = Number(market.outcomePrices?.[0] ?? market.tokens?.[0]?.price ?? 0);
        const probability = yesPrice > 1 ? yesPrice : yesPrice * 100;
        const category = alphaCategory(market.category);
        return {
          id: `alpha_${market.conditionId || market.id || index}`,
          title: String(market.question ?? "Polymarket opportunity"),
          category,
          source: "composite",
          currentValue: Number.isFinite(probability) && probability > 0 ? `YES ${probability.toFixed(0)}%` : "Odds pending",
          change24h: formatPercent(Number(market.change24h ?? 0)),
          volume: formatUsd(Number(market.volume ?? 0)),
          riskRating: riskFromMarket(market),
          reasoning: `High-volume ${category} market cross-checked with fresh news and community context.`,
          marketId: String(market.conditionId ?? market.id ?? ""),
          newsUrls,
          redditUrls,
          expiresAt: market.endDate ?? undefined,
        };
      });
      const top5 = signals.length ? signals : fallbackAlphaSignals(newsUrls, redditUrls);
      context.memory.write({
        domain: "alpha",
        key: "radar:top5",
        value: JSON.stringify(top5),
        importance: 0.72,
        sourceType: "workflow",
        sourceId: "alpha.radar.scan",
        metadata: { category: input.category ?? null, count: top5.length, generatedAt: new Date().toISOString() },
      });
      context.repos.setCache({ namespace: "alpha", key: "alpha:radar:top5", value: top5, source: "alpha.radar.scan", ttlMs: 5 * 60_000 });
      return { signals: top5, stale: false, generatedAt: new Date().toISOString(), sources: { marketResult, newsResult, redditResult, eventResult } };
    },
  });

  engine.register({
    id: "deep.research",
    name: "Deep Research",
    description: "Run built-in autonomous Deep Research and save a structured ResearchReport artifact.",
    riskLevel: "low",
    execute: async (input: { topic: string; workspaceId: string; maxIterations?: number; context?: string }, context) =>
      runDeepResearch(input, context, {
        onEvent: async (event) => {
          if (event.type === "research:step") {
            context.repos.createTimeline({
              sessionId: context.sessionId,
              workflowRunId: context.workflowRunId,
              type: "research",
              title: String(event.data.stepName ?? "Deep Research step"),
              detail: String(event.data.detail ?? ""),
              status: "running",
              payload: event.data,
            });
          }
        },
      }),
  });

  engine.register({
    id: "trade.plan",
    name: "Trade Plan",
    description: "Generate an AI-assisted trade plan from real market data and risk sizing.",
    riskLevel: "medium",
    execute: async (
      input: {
        symbol: string;
        budgetUsd: number;
        direction?: string;
        exchange?: string;
        entry?: number;
        stop?: number;
        takeProfit?: number;
        riskPct?: number;
      },
      context,
    ) => {
      const market = await engine.get("market.snapshot").execute({ symbol: input.symbol, exchange: input.exchange }, context);
      const observedPrice = extractPrice(market) ?? 1;
      const entry = input.entry ?? observedPrice;
      const stop = input.stop ?? entry * 0.97;
      const risk = await runSkill(context, "risk.positionSizing", {
        budgetUsd: input.budgetUsd,
        entry,
        stop,
        riskPct: input.riskPct ?? 1,
      });
      const tradeRisk = await runSkill(context, "risk.tradePlan", {
        symbol: input.symbol,
        budgetUsd: input.budgetUsd,
        direction: input.direction,
        entry,
        stop,
        takeProfit: input.takeProfit,
        riskPct: input.riskPct ?? 1,
      });
      const plan = await withTimeout(
        runSkill<{ text: string }>(context, "ai.respond", {
          maxTokens: 900,
          timeoutMs: 120_000,
          prompt: `Create a concise cautious trade plan for ${input.symbol}.
Direction: ${input.direction ?? "undecided"}.
Budget USD: ${input.budgetUsd}.
Entry: ${entry}.
Stop: ${stop}.
Take profit: ${input.takeProfit ?? "not provided"}.
Market snapshot summary: ${JSON.stringify({
  symbol: (market as any)?.symbol,
  observedAt: (market as any)?.observedAt,
  price: observedPrice,
  sources: Object.keys((market as any)?.outputs ?? {}),
  errors: Object.keys((market as any)?.errors ?? {}),
})}.
Position sizing: ${JSON.stringify(risk)}.
Trade risk: ${JSON.stringify(tradeRisk)}.
Return markdown with these headings only: Thesis, Invalidation, Entry, Stop, Take Profit, Risk, Approval Notes. Keep it under 450 words.`,
        }),
        150_000,
        "trade.plan ai.respond",
      );
      const tradePlanArtifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "trade-plan",
        title: `Trade Plan ${input.symbol}`,
        summary: `AI-assisted trade plan for ${input.symbol}.`,
        markdown: `# Trade Plan ${input.symbol}\n\n${plan.text}\n\n## Market\n\n\`\`\`json\n${JSON.stringify(market, null, 2)}\n\`\`\`\n\n## Risk\n\n\`\`\`json\n${JSON.stringify(tradeRisk, null, 2)}\n\`\`\`\n`,
      });
      const riskArtifact = await runSkill(context, "artifact.create", {
        type: "risk-report",
        title: `Risk Report ${input.symbol}`,
        summary: `Risk report for ${input.symbol} trade plan.`,
        markdown: `# Risk Report ${input.symbol}\n\n\`\`\`json\n${JSON.stringify({ positionSizing: risk, tradeRisk }, null, 2)}\n\`\`\`\n`,
      });
      context.memory.write({
        domain: "trade",
        key: `trade-plan:${input.symbol}:${Date.now()}`,
        value: `direction=${input.direction ?? "undecided"} entry=${entry} stop=${stop} budget=${input.budgetUsd}`,
        sourceType: "artifact",
        sourceId: tradePlanArtifact.id,
        importance: 0.7,
        metadata: { symbol: input.symbol, risk: tradeRisk },
      });
      return { market, risk, tradeRisk, plan, artifacts: { tradePlan: tradePlanArtifact, riskReport: riskArtifact } };
    },
  });

  engine.register({
    id: "paper.trade.lifecycle",
    name: "Paper Trade Lifecycle",
    description: "Execute, monitor, amend, cancel, partial close, or settle paper trades from structured decisions.",
    riskLevel: "low",
    execute: async (
      input:
        | { action: "execute"; decisionId: string; entryPrice?: number; asset?: string; settlementReason?: string }
        | { action: "monitor"; paperTradeId?: string; workspaceId?: string }
        | { action: "amend"; paperTradeId: string; stopLoss?: number; takeProfit?: number }
        | { action: "cancel"; paperTradeId: string; reason?: string }
        | { action: "partial_close"; paperTradeId: string; percentClose: number; price?: number }
        | { action: "close" | "settle"; paperTradeId: string; exitPrice?: number; settlementReason?: string },
      context,
    ) => {
      if (input.action === "execute") {
        const decision = context.repos.getDecision(input.decisionId);
        if (!decision) throw new Error(`Decision not found: ${input.decisionId}`);
        const workspaceId = decision.workspaceId;
        if (!workspaceId) throw new Error(`Decision has no workspaceId: ${input.decisionId}`);
        const asset = input.asset ?? inferDecisionAsset(decision.topic);
        const price: PaperTradePriceQuote =
          input.entryPrice !== undefined ? { price: input.entryPrice, source: "manual" } : await resolvePaperTradePrice(context, decision.direction, decision.topic, asset);
        const trade = context.repos.createPaperTrade({
          decisionId: decision.id,
          workspaceId,
          direction: decision.direction,
          asset,
          entryPrice: price.price,
          positionSize: decision.positionSize,
          settlementReason: input.settlementReason,
        });
        return { action: input.action, trade, priceSource: price.source, warning: price.warning };
      }
      if (input.action === "monitor") {
        const trades = input.paperTradeId
          ? [context.repos.getPaperTrade(input.paperTradeId)].filter(Boolean)
          : context.repos.listPaperTrades({ workspaceId: input.workspaceId, status: "open" });
        const annotated = await Promise.all(
          (trades as Array<NonNullable<ReturnType<typeof context.repos.getPaperTrade>>>).map(async (trade) => {
            if (trade.status !== "open") {
              return { ...trade, currentPnl: trade.pnl ?? trade.realizedPnl };
            }
            const price = await resolvePaperTradePrice(context, trade.direction, trade.asset, trade.asset);
            const sign = directionSign(trade.direction);
            const unrealizedPnl = (price.price - trade.entryPrice) * trade.positionSize * sign;
            return {
              ...trade,
              currentPnl: trade.realizedPnl + unrealizedPnl,
              currentPrice: price.price,
              priceSource: price.source,
              warning: price.warning,
            };
          }),
        );
        return { action: input.action, trades: annotated };
      }
      if (input.action === "amend") {
        const trade = context.repos.getPaperTrade(input.paperTradeId);
        if (!trade) throw new Error(`Paper trade not found: ${input.paperTradeId}`);
        const amended = context.repos.updatePaperTrade(input.paperTradeId, {
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
        });
        return { action: input.action, trade: amended };
      }
      if (input.action === "cancel") {
        const trade = context.repos.getPaperTrade(input.paperTradeId);
        if (!trade) throw new Error(`Paper trade not found: ${input.paperTradeId}`);
        const cancelled = context.repos.cancelPaperTrade(input.paperTradeId, input.reason ?? "cancelled");
        return { action: input.action, trade: cancelled };
      }
      if (input.action === "partial_close") {
        const trade = context.repos.getPaperTrade(input.paperTradeId);
        if (!trade) throw new Error(`Paper trade not found: ${input.paperTradeId}`);
        const price: PaperTradePriceQuote =
          input.price !== undefined ? { price: input.price, source: "manual" } : await resolvePaperTradePrice(context, trade.direction, trade.asset, trade.asset);
        const updated = context.repos.partialClosePaperTrade(input.paperTradeId, {
          percentClose: input.percentClose,
          exitPrice: price.price,
          settlementReason: "partial_close",
        });
        return { action: input.action, trade: updated, priceSource: price.source, warning: price.warning };
      }
      const trade = context.repos.getPaperTrade(input.paperTradeId);
      if (!trade) throw new Error(`Paper trade not found: ${input.paperTradeId}`);
      const price: PaperTradePriceQuote =
        input.exitPrice !== undefined ? { price: input.exitPrice, source: "manual" } : await resolvePaperTradePrice(context, trade.direction, trade.asset, trade.asset);
      const settled = context.repos.settlePaperTrade(input.paperTradeId, {
        exitPrice: price.price,
        settlementReason: input.settlementReason ?? input.action,
      });
      return { action: input.action, trade: settled, priceSource: price.source, warning: price.warning };
    },
  });

  engine.register({
    id: "review.workspace",
    name: "Workspace Review",
    description: "Generate a 7-section ReviewReport for one workspace from settled decisions, journal entries, and user rules.",
    riskLevel: "low",
    execute: async (input: { workspaceId: string; period?: string }, context) => {
      const period = input.period ?? "workspace";
      const decisions = context.repos.listDecisions(input.workspaceId).filter((decision) => decision.status === "settled_win" || decision.status === "settled_loss");
      const paperTrades = context.repos.listPaperTrades({ workspaceId: input.workspaceId });
      const journals = context.repos.db
        .prepare("SELECT * FROM journal_entries WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 200")
        .all(input.workspaceId) as Array<{ id: string; notes: string; discipline_score: number; rules_violated_json: string; created_at: string }>;
      const userRules = context.memory.query({ domain: "user_rules", limit: 100 }) as Array<{ key: string; value: string; workspace_id?: string | null }>;
      const workspaceRules = userRules.filter((rule) => !rule.workspace_id || rule.workspace_id === input.workspaceId);
      const previousReviews = context.repos.listReviews(input.workspaceId).slice(0, 5);
      const baseReport = buildWorkspaceReviewReport({
        workspaceId: input.workspaceId,
        period,
        decisions,
        paperTrades,
        journals,
        userRules: workspaceRules,
        previousReviews,
      });
      const aiReview = await runSkill<{ text: string; usage?: unknown; stopReason?: string }>(context, "ai.respond", {
        prompt: buildWorkspaceReviewAiPrompt(baseReport),
        systemPrompt:
          "You are Trading Pi Review Engine. Return only valid JSON. Review behavior and discipline, not financial outcomes. Never promise profits.",
      });
      const report = mergeWorkspaceReviewAi(baseReport, aiReview, context.env.openaiModel);
      const markdown = workspaceReviewMarkdown(report);
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "workspace-review",
        title: `Workspace Review ${input.workspaceId}`,
        summary: report.overview.summary,
        markdown,
        workspaceId: input.workspaceId,
        previewPayload: report,
      });
      const reviewId = context.repos.createReview({
        sessionId: context.sessionId,
        workspaceId: input.workspaceId,
        period,
        metrics: report.metadata.metrics,
        disciplineScore: report.metadata.disciplineScore,
        summary: report.overview.summary,
        report,
        artifactId: artifact.id,
      });
      for (const suggestion of report.suggestions.items.slice(0, 5)) {
        context.repos.createEvolutionSuggestion({
          workspaceId: input.workspaceId,
          reviewId,
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category,
          priority: suggestion.priority,
          ruleText: suggestion.ruleText,
          source: { workflow: "review.workspace", period },
        });
      }
      context.memory.write({
        domain: "review",
        workspaceId: input.workspaceId,
        key: `workspace:${reviewId}`,
        value: report.overview.summary,
        sourceType: "review",
        sourceId: reviewId,
        importance: 0.8,
        metadata: { artifactId: artifact.id, period },
      });
      return { reviewId, artifact, report };
    },
  });

  engine.register({
    id: "review.daily",
    name: "Daily Review",
    description: "Generate a daily review artifact from local paper trades and journal entries.",
    riskLevel: "low",
    execute: async (input: { period?: string }, context) => {
      const reviewContext = await runSkill<{ period: string; metrics: unknown; portfolio: unknown }>(context, "review.daily", input);
      const report = await runSkill<{ text: string }>(context, "ai.respond", {
        prompt: `Create a Trading Pi ${reviewContext.period} review from this local paper-trading data.
Metrics and portfolio JSON:
${JSON.stringify(reviewContext)}

Return sections: Scorecard, What Worked, Rule Breaks, Risk Notes, Tomorrow Focus.`,
        systemPrompt: "You are Trading Pi Agent. Review paper trading behavior with discipline-first language.",
      });
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "daily-review",
        title: `${capitalize(reviewContext.period)} Review`,
        summary: `Trading Pi ${reviewContext.period} review.`,
        markdown: `# ${capitalize(reviewContext.period)} Review\n\n${report.text}\n\n## Metrics\n\n\`\`\`json\n${JSON.stringify(reviewContext.metrics, null, 2)}\n\`\`\`\n`,
      });
      const reviewId = context.repos.createReview({
        sessionId: context.sessionId,
        period: reviewContext.period,
        metrics: reviewContext.metrics,
        disciplineScore: Number((reviewContext.metrics as { disciplineScore?: number }).disciplineScore ?? 0),
        summary: report.text.slice(0, 240),
        artifactId: artifact.id,
      });
      context.memory.write({
        domain: "review",
        key: `${reviewContext.period}:${reviewId}`,
        value: report.text.slice(0, 400),
        sourceType: "review",
        sourceId: reviewId,
        importance: 0.75,
        metadata: { artifactId: artifact.id, metrics: reviewContext.metrics },
      });
      return { reviewId, reviewContext, report, artifact };
    },
  });

  engine.register({
    id: "os.bootstrap",
    name: "OS Bootstrap",
    description: "Initialize local OS domains: MCP catalog, marketplace catalog, default workspaces, and audit trail.",
    riskLevel: "low",
    execute: async (_input: {}, context) => {
      const mcp = await runSkill(context, "mcp.health", { name: "Local MCP Catalog" });
      const mcpDiscovery = await runSkill(context, "mcp.discover", {});
      const marketplace = await runSkill(context, "marketplace.catalog.seed", {});
      const workspaces = await Promise.all([
        runSkill(context, "workspace.create", { id: "workspace_btc", name: "BTC Workspace", kind: "btc", context: { symbol: "BTC/USDT" } }),
        runSkill(context, "workspace.create", { id: "workspace_eth", name: "ETH Workspace", kind: "eth", context: { symbol: "ETH/USDT" } }),
        runSkill(context, "workspace.create", { id: "workspace_macro", name: "Macro Workspace", kind: "macro", context: { focus: "rates, dollar, liquidity" } }),
      ]);
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "os-bootstrap",
        title: "Trading Pi OS Bootstrap",
        summary: "Initialized MCP, marketplace, and workspace foundation domains.",
        markdown: `# Trading Pi OS Bootstrap\n\n## MCP\n\n\`\`\`json\n${JSON.stringify({ health: mcp, discovery: mcpDiscovery }, null, 2)}\n\`\`\`\n\n## Marketplace\n\n\`\`\`json\n${JSON.stringify(marketplace, null, 2)}\n\`\`\`\n\n## Workspaces\n\n\`\`\`json\n${JSON.stringify(workspaces, null, 2)}\n\`\`\`\n`,
      });
      return { mcp, mcpDiscovery, marketplace, workspaces, artifact };
    },
  });

  engine.register({
    id: "strategy.backtest",
    name: "Strategy Backtest",
    description: "Create a strategy record, run a real SMA-crossover backtest over historical candles, and generate a report artifact.",
    riskLevel: "medium",
    execute: async (
      input: {
        name: string;
        symbol: string;
        timeframe?: string;
        exchange?: string;
        startDate?: string;
        endDate?: string;
        initialCapitalUsd?: number;
        parameters?: unknown;
        strategy?: { fastPeriod?: number; slowPeriod?: number; stopLossPct?: number; takeProfitPct?: number; feePct?: number };
      },
      context,
    ) => {
      const strategy = await runSkill<{ strategyId: string; score: number }>(context, "strategy.create", {
        name: input.name,
        parameters: { ...(input.parameters as Record<string, unknown> | undefined), strategy: input.strategy ?? {} },
        status: "testing",
      });
      const backtest = await runSkill<{
        backtestId: string;
        metrics: Record<string, unknown>;
        result: {
          totalTrades: number;
          winningTrades: number;
          losingTrades: number;
          winRate: number;
          totalReturnPct: number;
          maxDrawdownPct: number;
          sharpeRatio: number;
          trades: unknown[];
          equityCurve: unknown[];
          warnings: string[];
        };
      }>(context, "backtest.run", {
        strategyId: strategy.strategyId,
        name: input.name,
        symbol: input.symbol,
        timeframe: input.timeframe,
        exchange: input.exchange,
        startDate: input.startDate,
        endDate: input.endDate,
        initialCapitalUsd: input.initialCapitalUsd,
        strategy: input.strategy,
      });
      const artifact = await runSkill<{ id: string; path: string }>(context, "artifact.create", {
        type: "backtest-report",
        title: `Backtest Report ${input.name}`,
        summary: `Backtest for ${input.name} on ${input.symbol}: ${backtest.result.totalTrades} trades, return ${backtest.result.totalReturnPct.toFixed(2)}%, max DD ${backtest.result.maxDrawdownPct.toFixed(2)}%.`,
        markdown: `# Backtest Report ${input.name}

- Symbol: ${input.symbol}
- Timeframe: ${input.timeframe ?? "1h"}
- Trades: ${backtest.result.totalTrades} (wins: ${backtest.result.winningTrades}, losses: ${backtest.result.losingTrades})
- Win rate: ${(backtest.result.winRate * 100).toFixed(2)}%
- Total return: ${backtest.result.totalReturnPct.toFixed(2)}%
- Max drawdown: ${backtest.result.maxDrawdownPct.toFixed(2)}%
- Sharpe ratio: ${backtest.result.sharpeRatio.toFixed(3)}
- Warnings: ${backtest.result.warnings.length ? backtest.result.warnings.join("; ") : "none"}

## Strategy

\`\`\`json
${JSON.stringify(input.strategy ?? input.parameters ?? {}, null, 2)}
\`\`\`

## Trades

\`\`\`json
${JSON.stringify(backtest.result.trades.slice(0, 20), null, 2)}
\`\`\`

## Equity Curve

\`\`\`json
${JSON.stringify(backtest.result.equityCurve, null, 2)}
\`\`\`
`,
        payload: { strategy, backtest: backtest.result },
      });
      return { strategy, backtest: backtest.result, backtestId: backtest.backtestId, artifact };
    },
  });

  engine.register({
    id: "evolution.propose",
    name: "Evolution Proposal",
    description: "Propose guarded strategy improvements from review, memory, journal, and backtest context.",
    riskLevel: "medium",
    execute: async (input: { strategyId?: string; focus?: string }, context) => runSkill(context, "evolution.propose", input),
  });

  engine.register({
    id: "evolution.apply",
    name: "Evolution Apply",
    description: "Adopt or reject an evolution suggestion. On approve, writes the rule into user_rules memory; on reject, records the decision only.",
    riskLevel: "medium",
    execute: async (
      input: { suggestionId: string; approvedByUser: boolean; finalRuleText?: string },
      context,
    ) => runSkill(context, "evolution.apply", input),
  });
}

function buildWorkspaceReviewReport(input: {
  workspaceId: string;
  period: string;
  decisions: Array<{ id: string; topic: string; direction: string; status: string; resultPnL?: number; ruleCompliance?: unknown; thesis: string }>;
  paperTrades: Array<{ id: string; decisionId: string; status: string; pnl?: number; pnlPercent?: number; settlementReason?: string }>;
  journals: Array<{ id: string; notes: string; discipline_score: number; rules_violated_json: string; created_at: string }>;
  userRules: Array<{ key: string; value: string }>;
  previousReviews: Array<{ id: string; summary: string; disciplineScore: number; createdAt: string }>;
}) {
  const settled = input.decisions;
  const wins = settled.filter((decision) => decision.status === "settled_win");
  const losses = settled.filter((decision) => decision.status === "settled_loss");
  const totalPnl = settled.reduce((sum, decision) => sum + Number(decision.resultPnL ?? 0), 0);
  const avgDiscipline = input.journals.length
    ? Math.round(input.journals.reduce((sum, journal) => sum + Number(journal.discipline_score ?? 0), 0) / input.journals.length)
    : 0;
  const ruleWarnings = settled.flatMap((decision) => ((decision.ruleCompliance as { warnings?: string[] })?.warnings ?? []).map((warning) => ({ decisionId: decision.id, warning })));
  const missedRules = input.journals.flatMap((journal) => parseRulesViolated(journal.rules_violated_json).map((rule) => ({ journalId: journal.id, rule })));
  const suggestions = buildReviewSuggestions({ losses: losses.length, ruleWarnings, missedRules, avgDiscipline, hasRules: input.userRules.length > 0 });
  return {
    overview: {
      workspaceId: input.workspaceId,
      period: input.period,
      summary: `${settled.length} settled decision(s), ${wins.length} win(s), ${losses.length} loss(es), total P&L ${totalPnl.toFixed(2)}.`,
      keyFinding: undefined as string | undefined,
      winRate: settled.length ? wins.length / settled.length : 0,
      totalPnl,
      disciplineScore: avgDiscipline,
    },
    tradeAnalyses: settled.map((decision) => ({
      decisionId: decision.id,
      topic: decision.topic,
      direction: decision.direction,
      outcome: decision.status,
      pnl: decision.resultPnL ?? 0,
      thesis: decision.thesis,
      lesson: decision.status === "settled_win" ? "Preserve the evidence pattern that made this work." : "Inspect timing, sizing, and invalidation discipline before repeating this setup.",
    })),
    errorSummary: {
      lossCount: losses.length,
      ruleWarningCount: ruleWarnings.length,
      journalRuleBreaks: missedRules,
      commonErrors: [
        ...(losses.length ? ["Losing decisions need a before/after thesis comparison."] : []),
        ...(ruleWarnings.length ? ["Decision-time rule warnings were present."] : []),
        ...(missedRules.length ? ["Journaled rule violations should become explicit pre-trade checks."] : []),
      ],
    },
    suggestions: {
      items: suggestions,
    },
    emotionAnalysis: {
      journalCount: input.journals.length,
      averageDisciplineScore: avgDiscipline,
      notes: input.journals.slice(0, 5).map((journal) => ({ journalId: journal.id, createdAt: journal.created_at, notePreview: journal.notes.slice(0, 180) })),
      aiNotes: undefined as string | undefined,
    },
    ruleCompliance: {
      totalRules: input.userRules.length,
      activeRules: input.userRules.map((rule) => ({ id: rule.key, text: rule.value })),
      decisionWarnings: ruleWarnings,
      journalViolations: missedRules,
    },
    historicalComparison: {
      previousReviewCount: input.previousReviews.length,
      previousDisciplineScores: input.previousReviews.map((review) => ({ reviewId: review.id, score: review.disciplineScore, createdAt: review.createdAt })),
      trend: input.previousReviews.length
        ? avgDiscipline >= input.previousReviews[0]!.disciplineScore
          ? "discipline_stable_or_improving"
          : "discipline_declining"
        : "baseline",
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      metrics: {
        settledDecisions: settled.length,
        wins: wins.length,
        losses: losses.length,
        totalPnl,
        paperTrades: input.paperTrades.length,
        journalEntries: input.journals.length,
        userRules: input.userRules.length,
      },
      disciplineScore: avgDiscipline,
      aiDriven: false,
      model: undefined as string | undefined,
      usage: undefined as unknown,
      stopReason: undefined as string | undefined,
    },
  };
}

function buildReviewSuggestions(input: { losses: number; ruleWarnings: Array<unknown>; missedRules: Array<unknown>; avgDiscipline: number; hasRules: boolean }) {
  const suggestions = [];
  if (!input.hasRules) {
    suggestions.push({
      title: "Create first user rule",
      description: "No user rules are configured, so DecisionCards cannot compare recommendations against your personal trading constraints.",
      category: "rule",
      priority: "high",
      ruleText: "Before every decision, define maximum position size and invalidation criteria.",
    });
  }
  if (input.ruleWarnings.length) {
    suggestions.push({
      title: "Tighten rule warning follow-through",
      description: "Decision-time warnings appeared in settled trades; add a confirmation checklist before paper execution.",
      category: "discipline",
      priority: "high",
      ruleText: "If a DecisionCard shows rule warnings, reduce size or write a reason before confirming.",
    });
  }
  if (input.losses) {
    suggestions.push({
      title: "Post-loss thesis audit",
      description: "Losing decisions should record which evidence changed and whether invalidation was respected.",
      category: "review",
      priority: "medium",
      ruleText: "After every settled loss, write one sentence comparing the original thesis with the final outcome.",
    });
  }
  if (input.avgDiscipline < 70) {
    suggestions.push({
      title: "Raise discipline baseline",
      description: "Average journal discipline score is below target; make sizing smaller until rule adherence improves.",
      category: "risk",
      priority: "medium",
      ruleText: "When 7-day discipline score is below 70, max position size is 1%.",
    });
  }
  return suggestions.length
    ? suggestions
    : [
        {
          title: "Preserve current process",
          description: "No major issues detected in this review window; keep tracking evidence quality and rule adherence.",
          category: "process",
          priority: "low",
          ruleText: "Keep a journal note for every confirmed decision.",
        },
      ];
}

function workspaceReviewMarkdown(report: ReturnType<typeof buildWorkspaceReviewReport>) {
  return `# Workspace Review

## Overview
${report.overview.summary}

## Trade Analyses
${report.tradeAnalyses.map((trade) => `- ${trade.topic} (${trade.direction}) ${trade.outcome}: P&L ${trade.pnl}. ${trade.lesson}`).join("\n") || "- No settled decisions yet."}

## Error Summary
${report.errorSummary.commonErrors.map((error) => `- ${error}`).join("\n") || "- No recurring errors detected."}

## Suggestions
${report.suggestions.items.map((item) => `- ${item.title}: ${item.description}`).join("\n")}

## Emotion Analysis
Average discipline score: ${report.emotionAnalysis.averageDisciplineScore}

## Rule Compliance
Active rules: ${report.ruleCompliance.totalRules}. Decision warnings: ${report.ruleCompliance.decisionWarnings.length}.

## Historical Comparison
Trend: ${report.historicalComparison.trend}

## Metadata
\`\`\`json
${JSON.stringify(report.metadata, null, 2)}
\`\`\`
`;
}

function buildWorkspaceReviewAiPrompt(report: ReturnType<typeof buildWorkspaceReviewReport>) {
  return `Create an AI review overlay for this Trading Pi workspace review.
Keep the same seven-section structure. Return ONLY JSON:
{
  "overviewSummary": "short discipline-first summary",
  "keyFindings": ["finding 1", "finding 2"],
  "tradeLessons": [{"decisionId": "id", "lesson": "specific lesson"}],
  "suggestions": [
    {
      "title": "short title",
      "description": "why this matters",
      "category": "risk|discipline|research|execution|review",
      "priority": "high|medium|low",
      "ruleText": "actionable rule"
    }
  ],
  "emotionNotes": "short behavioral note",
  "historicalTrend": "baseline|discipline_stable_or_improving|discipline_declining"
}

Base review JSON:
${JSON.stringify(report, null, 2)}`;
}

function mergeWorkspaceReviewAi(
  report: ReturnType<typeof buildWorkspaceReviewReport>,
  aiReview: { text: string; usage?: unknown; stopReason?: string },
  model?: string,
): ReturnType<typeof buildWorkspaceReviewReport> {
  const parsed = parseJsonFromText(aiReview.text);
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
        .map((item: any) => ({
          title: String(item?.title ?? "").trim(),
          description: String(item?.description ?? "").trim(),
          category: String(item?.category ?? "review").trim() || "review",
          priority: String(item?.priority ?? "medium").trim() || "medium",
          ruleText: String(item?.ruleText ?? item?.rule_text ?? item?.description ?? "").trim(),
        }))
        .filter((item: any) => item.title && item.ruleText)
        .slice(0, 5)
    : [];
  const tradeLessons = Array.isArray(parsed?.tradeLessons) ? parsed.tradeLessons : [];
  const overviewSummary = typeof parsed?.overviewSummary === "string" && parsed.overviewSummary.trim() ? parsed.overviewSummary.trim() : report.overview.summary;
  return {
    ...report,
    overview: {
      ...report.overview,
      summary: overviewSummary,
      keyFinding: Array.isArray(parsed?.keyFindings) ? parsed.keyFindings.filter((item: unknown) => typeof item === "string").slice(0, 5).join(" ") : undefined,
    },
    tradeAnalyses: report.tradeAnalyses.map((trade) => {
      const aiLesson = tradeLessons.find((item: any) => item?.decisionId === trade.decisionId)?.lesson;
      return typeof aiLesson === "string" && aiLesson.trim() ? { ...trade, lesson: aiLesson.trim() } : trade;
    }),
    suggestions: {
      items: suggestions.length ? suggestions : report.suggestions.items,
    },
    emotionAnalysis: {
      ...report.emotionAnalysis,
      aiNotes: typeof parsed?.emotionNotes === "string" ? parsed.emotionNotes : undefined,
    },
    historicalComparison: {
      ...report.historicalComparison,
      trend: typeof parsed?.historicalTrend === "string" && parsed.historicalTrend.trim() ? parsed.historicalTrend.trim() : report.historicalComparison.trend,
    },
    metadata: {
      ...report.metadata,
      aiDriven: true,
      model,
      usage: aiReview.usage,
      stopReason: aiReview.stopReason,
    },
  };
}

function parseJsonFromText(text: string): any {
  const candidates = [
    text,
    ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1] ?? ""),
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
  ].filter((candidate) => candidate.trim().length > 0);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // Continue with the next likely JSON candidate.
    }
  }
  return null;
}

function parseRulesViolated(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

type PaperTradePriceQuote = { price: number; source: string; warning?: string };

function directionSign(direction: string) {
  return direction === "SHORT" || direction === "NO" ? -1 : 1;
}

function extractPrice(market: any): number | undefined {
  return (
    market?.outputs?.ccxtTicker?.last ??
    market?.outputs?.coingecko?.priceUsd ??
    market?.outputs?.ccxtTicker?.bid ??
    undefined
  );
}

async function resolvePaperTradePrice(context: WorkflowContext, direction: string, topic: string, asset: string) {
  if (direction === "YES" || direction === "NO") {
    const result = await runSkill<any>(context, "market.polymarket.search", { query: topic, limit: 1 }).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    }));
    const market = Array.isArray(result?.markets) ? result.markets[0] : undefined;
    const yes = Number(market?.outcomePrices?.[0] ?? market?.tokens?.find?.((token: any) => String(token.outcome).toLowerCase() === "yes")?.price);
    const no = Number(market?.outcomePrices?.[1] ?? market?.tokens?.find?.((token: any) => String(token.outcome).toLowerCase() === "no")?.price);
    const price = direction === "NO" ? no : yes;
    if (Number.isFinite(price) && price > 0) return { price: price > 1 ? price / 100 : price, source: "polymarket" };
    return { price: 1, source: "fallback", warning: result?.error ?? "No Polymarket price available; used fallback entry price 1." };
  }
  const result = await runSkill<any>(context, "market.coingecko.quote", { symbol: asset }).catch((error) => ({
    error: error instanceof Error ? error.message : String(error),
  }));
  const price = Number(result?.priceUsd);
  if (Number.isFinite(price) && price > 0) return { price, source: "coingecko" };
  return { price: 1, source: "fallback", warning: result?.error ?? "No CoinGecko price available; used fallback entry price 1." };
}

function inferDecisionAsset(topic: string) {
  const upper = topic.toUpperCase();
  if (upper.includes("BTC") || upper.includes("BITCOIN")) return "BTC";
  if (upper.includes("SOL") || upper.includes("SOLANA")) return "SOL";
  if (upper.includes("ETH") || upper.includes("ETHEREUM")) return "ETH";
  const words = topic.match(/[A-Z]{2,6}/g);
  return words?.[0] ?? "PREDICTION";
}

function scoreMarket(market: any) {
  const volume = Number(market.volume ?? 0);
  const liquidity = Number(market.liquidity ?? 0);
  const change = Math.abs(Number(market.change24h ?? 0));
  return volume * 0.4 + liquidity * 0.2 + change * 1_000;
}

function riskFromMarket(market: any): 1 | 2 | 3 | 4 {
  const volume = Number(market.volume ?? 0);
  const liquidity = Number(market.liquidity ?? 0);
  if (volume > 1_000_000 && liquidity > 100_000) return 1;
  if (volume > 250_000) return 2;
  if (volume > 50_000) return 3;
  return 4;
}

function extractUrls(result: any): string[] {
  const rows = result?.results ?? result?.items ?? result?.data ?? [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => row.url ?? row.link)
    .filter((url: unknown): url is string => typeof url === "string" && url.startsWith("http"))
    .slice(0, 5);
}

function fallbackAlphaSignals(newsUrls: string[], redditUrls: string[]): AlphaSignal[] {
  return [
    {
      id: "alpha_fallback_research_backlog",
      title: "Market scan pending",
      category: "crypto",
      source: "composite",
      currentValue: "Data unavailable",
      change24h: "0%",
      volume: "$0",
      riskRating: 4,
      reasoning: "External data sources did not return enough market data; use this as a prompt to retry or start manual research.",
      newsUrls,
      redditUrls,
    },
  ];
}

function settledWorkflowValue(result: PromiseSettledResult<unknown>) {
  return result.status === "fulfilled" ? result.value : { error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
}

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
