import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";
import { runApiSkill } from "../utils.js";

export const runResearch = createServerFn({ method: "POST" })
  .validator(
    (input: { symbol: string; exchange?: string; sessionId?: string }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "research.asset", data, session.id)),
    };
  });

export const runMarketSnapshot = createServerFn({ method: "POST" })
  .validator(
    (input: { symbol: string; exchange?: string; sessionId?: string }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "market.snapshot", data, session.id)),
    };
  });