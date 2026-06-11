import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const getStrategies = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("strategies") as any[];
});

export const getBacktests = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("backtests") as any[];
});

export const getEvolutionProposals = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("evolution_proposals") as any[];
});

export const runWorkflow = createServerFn({ method: "POST" })
  .validator((input: { workflowId: string; input?: Record<string, unknown>; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    const trace = runtime.telemetry.trace(`workflow.${data.workflowId}`, { sessionId: session.id });
    const result = await runtime.workflows.run(data.workflowId, data.input ?? {}, { env: runtime.env, repos: runtime.repos, artifacts: runtime.artifacts, approvals: runtime.approvals, memory: runtime.memory, skills: runtime.skills, sessionId: session.id });
    trace?.span({ name: `workflow.${data.workflowId}`, input: data.input, output: result.output });
    await runtime.telemetry.flush();
    return { sessionId: session.id, ...result };
  });

export const createPaperOrder = createServerFn({ method: "POST" })
  .validator((input: Record<string, unknown> & { sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    const result = await runtime.skills.get("paper.order.create").execute(data, { env: runtime.env, repos: runtime.repos, artifacts: runtime.artifacts, approvals: runtime.approvals, memory: runtime.memory, sessionId: session.id });
    return { sessionId: session.id, ...result };
  });

export const getPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.portfolioSnapshot();
});

export const getTrades = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("trades") as any[];
});