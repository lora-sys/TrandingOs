import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const getMcpServers = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("mcp_servers") as any[];
});

export const discoverMcp = createServerFn({ method: "GET" })
  .validator((query: string) => query)
  .handler(async ({ data: query }) => {
    const runtime = createRuntime();
    const { discoverMcpServers } = await import("@trading-pi/mcp-hub");
    return discoverMcpServers(query);
  });

export const registerMcp = createServerFn({ method: "POST" })
  .validator((input: { name: string; url?: string; permission: string; capabilities: string[]; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    const result = await runtime.skills.get("mcp.register").execute(data, { env: runtime.env, repos: runtime.repos, artifacts: runtime.artifacts, approvals: runtime.approvals, memory: runtime.memory, sessionId: session.id });
    return { sessionId: session.id, ...result };
  });

export const checkMcp = createServerFn({ method: "POST" })
  .validator((serverId: string) => serverId)
  .handler(async ({ data: serverId }) => {
    const runtime = createRuntime();
    const server = runtime.repos.db.prepare("SELECT * FROM mcp_servers WHERE id = ?").get(serverId) as any;
    if (!server) return { status: "unknown" };
    const { checkMcpHealth } = await import("@trading-pi/mcp-hub");
    return checkMcpHealth(server.manifest);
  });

export const seedMarketplace = createServerFn({ method: "GET" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(sessionId);
    const result = await runtime.skills.get("marketplace.catalog.seed").execute({}, { env: runtime.env, repos: runtime.repos, artifacts: runtime.artifacts, approvals: runtime.approvals, memory: runtime.memory, sessionId: session.id });
    return { sessionId: session.id, ...result };
  });

export const getMarketplace = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("marketplace_items") as any[];
});

export const getBrowserHealth = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return { configured: Boolean(runtime.env.aioSandboxBaseUrl), baseUrl: runtime.env.aioSandboxBaseUrl ?? null };
});
