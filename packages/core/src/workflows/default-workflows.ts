import type { SkillContext } from "../skills/types.js";
import type { SkillRegistry } from "../skills/registry.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { WorkflowContext } from "./types.js";

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
      const artifact = await runSkill(context, "artifact.create", {
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
    execute: async (input: { symbol: string; exchange?: string }, context) => {
      const researchContext = await runSkill(context, "research.asset", input);
      const report = await runSkill<{ text: string }>(context, "research.report", {
        symbol: input.symbol,
        researchContext,
      });
      const artifact = await runSkill(context, "artifact.create", {
        type: "research-report",
        title: `Research Report ${input.symbol}`,
        summary: `AI research report for ${input.symbol}.`,
        markdown: `# Research Report ${input.symbol}\n\n${report.text}\n\n## Observed Context\n\n\`\`\`json\n${JSON.stringify(researchContext, null, 2)}\n\`\`\`\n`,
      });
      return { symbol: input.symbol, researchContext, report, artifact };
    },
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
      const plan = await runSkill<{ text: string }>(context, "ai.respond", {
        prompt: `Create a cautious trade plan for ${input.symbol}.
Direction: ${input.direction ?? "undecided"}.
Budget USD: ${input.budgetUsd}.
Entry: ${entry}.
Stop: ${stop}.
Take profit: ${input.takeProfit ?? "not provided"}.
Market snapshot JSON: ${JSON.stringify(market)}.
Position sizing JSON: ${JSON.stringify(risk)}.
Trade risk JSON: ${JSON.stringify(tradeRisk)}.
Return sections: thesis, invalidation, entry, stop, take profit, risk, approval notes.`,
      });
      const tradePlanArtifact = await runSkill(context, "artifact.create", {
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
      return { market, risk, tradeRisk, plan, artifacts: { tradePlan: tradePlanArtifact, riskReport: riskArtifact } };
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
      return { reviewId, reviewContext, report, artifact };
    },
  });
}

function extractPrice(market: any): number | undefined {
  return (
    market?.outputs?.ccxtTicker?.last ??
    market?.outputs?.coingecko?.priceUsd ??
    market?.outputs?.ccxtTicker?.bid ??
    undefined
  );
}

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
