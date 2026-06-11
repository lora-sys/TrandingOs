import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";
import { runApiSkill } from "../utils.js";

export const createPaperOrder = createServerFn({ method: "POST" })
  .validator(
    (input: {
      symbol: string;
      side: string;
      quantity: number;
      price?: number;
      sessionId?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "paper.order.create", data, session.id)),
    };
  });

export const getPortfolio = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.portfolioSnapshot();
  },
);

export const getTrades = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("trades") as any[];
  },
);

export const runTradePlan = createServerFn({ method: "POST" })
  .validator(
    (input: {
      symbol: string;
      budgetUsd: number;
      direction: string;
      entry?: number;
      stop?: number;
      takeProfit?: number;
      sessionId?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "trade.plan", data, session.id)),
    };
  });