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
      const outputs: Record<string, unknown> = {};
      const errors: Record<string, string> = {};
      for (const [key, skillId, payload] of [
        ["coingecko", "market.coingecko.quote", { symbol: input.symbol }],
        ["ccxtTicker", "market.ccxt.ticker", { symbol: input.symbol, exchange: input.exchange }],
        ["ccxtOhlcv", "market.ccxt.ohlcv", { symbol: input.symbol, exchange: input.exchange, timeframe: "1h", limit: 24 }],
      ] as const) {
        try {
          outputs[key] = await runSkill(context, skillId, payload);
        } catch (error) {
          errors[key] = error instanceof Error ? error.message : String(error);
        }
      }
      const artifact = await runSkill(context, "artifact.create", {
        type: "market-snapshot",
        title: `Market Snapshot ${input.symbol}`,
        summary: `CoinGecko and CCXT snapshot for ${input.symbol}.`,
        markdown: `# Market Snapshot ${input.symbol}\n\n## Outputs\n\n\`\`\`json\n${JSON.stringify(outputs, null, 2)}\n\`\`\`\n\n## Errors\n\n\`\`\`json\n${JSON.stringify(errors, null, 2)}\n\`\`\`\n`,
      });
      return { symbol: input.symbol, outputs, errors, artifact };
    },
  });

  engine.register({
    id: "trade.plan",
    name: "Trade Plan",
    description: "Generate an AI-assisted trade plan from real market data and risk sizing.",
    riskLevel: "medium",
    execute: async (input: { symbol: string; budgetUsd: number; direction?: string; exchange?: string }, context) => {
      const market = await engine.get("market.snapshot").execute({ symbol: input.symbol, exchange: input.exchange }, context);
      const risk = await runSkill(context, "risk.positionSizing", {
        budgetUsd: input.budgetUsd,
        entry: extractPrice(market) ?? 1,
        stop: (extractPrice(market) ?? 1) * 0.97,
        riskPct: 1,
      });
      const plan = await runSkill<{ text: string }>(context, "ai.respond", {
        prompt: `Create a cautious trade plan for ${input.symbol}.
Direction: ${input.direction ?? "undecided"}.
Budget USD: ${input.budgetUsd}.
Market snapshot JSON: ${JSON.stringify(market)}.
Risk sizing JSON: ${JSON.stringify(risk)}.
Return sections: thesis, invalidation, entry, stop, take profit, risk, approval notes.`,
      });
      const artifact = await runSkill(context, "artifact.create", {
        type: "trade-plan",
        title: `Trade Plan ${input.symbol}`,
        summary: `AI-assisted trade plan for ${input.symbol}.`,
        markdown: `# Trade Plan ${input.symbol}\n\n${plan.text}\n\n## Market\n\n\`\`\`json\n${JSON.stringify(market, null, 2)}\n\`\`\`\n\n## Risk\n\n\`\`\`json\n${JSON.stringify(risk, null, 2)}\n\`\`\`\n`,
      });
      return { market, risk, plan, artifact };
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

