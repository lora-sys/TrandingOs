import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";
import { toChatMessage } from "../utils.js";

export const getHealth = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return {
      ok: true,
      name: "Trading Pi",
      localFirst: true,
      sqlitePath: runtime.paths.sqlitePath,
      time: new Date().toISOString(),
    };
  },
);

export const getStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return {
      env: runtime.envStatus as any,
      paths: runtime.paths,
      langfuseConfigured: runtime.telemetry.configured,
      skills: runtime.skills.list().length,
      workflows: runtime.workflows.list().length,
      mcpServers: runtime.repos.list("mcp_servers").length,
      memoryDomains: runtime.repos.db
        .prepare(
          "SELECT DISTINCT COALESCE(domain, scope) AS domain FROM memory_records LIMIT 20",
        )
        .all(),
      browserSessions: runtime.repos.list("browser_sessions").length,
    };
  },
);

export const aiPing = createServerFn({ method: "POST" }).handler(
  async () => {
    const runtime = createRuntime();
    const trace = runtime.telemetry.trace("ai.ping", { source: "api" });
    const result = await runtime.aiPing();
    trace?.generation({
      name: "ai.ping",
      model: runtime.env.openaiModel,
      input: "health check",
      output: result.text,
    });
    await runtime.telemetry.flush();
    return result as any;
  },
);

export const sendMessage = createServerFn({ method: "POST" })
  .validator(
    (input: { message: string; sessionId?: string }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const result = await runtime.agent.prompt(data);
    return {
      sessionId: result.sessionId,
      text: result.text,
      workflowResult: (result as any).workflowResult ?? null,
      messages: result.messages?.map((m: any) => ({
        id: m.id ?? "",
        role: m.role ?? "",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        timestamp: m.timestamp ?? Date.now(),
      })) ?? [],
    };
  });

export const getSessionMessages = createServerFn({ method: "GET" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(sessionId);
    return {
      sessionId: session.id,
      messages: runtime.sessions.read(session.id).map(toChatMessage),
    };
  });

export const getSessions = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("sessions") as any[];
  },
);

export const getSkills = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.skills.list();
  },
);

export const getWorkflows = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.workflows.list();
  },
);

export const getTimeline = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("timeline_events") as any[];
  },
);

export const getAudit = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("audit_records") as any[];
  },
);

export const getCache = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("data_cache") as any[];
  },
);