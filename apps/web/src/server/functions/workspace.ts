import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const createWorkspace = createServerFn({ method: "POST" })
  .validator((input: { name: string; kind: string; context: Record<string, unknown>; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    const result = await runtime.skills.get("workspace.create").execute(data, { env: runtime.env, repos: runtime.repos, artifacts: runtime.artifacts, approvals: runtime.approvals, memory: runtime.memory, sessionId: session.id });
    return { sessionId: session.id, ...result };
  });

export const getWorkspaces = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("workspaces") as any[];
});

export const getWorkspaceContext = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const runtime = createRuntime();
    return runtime.repos.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as any;
  });

export const getWorkspaceMemory = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const runtime = createRuntime();
    return runtime.memory.query({ workspaceId: id });
  });

export const getWorkspaceArtifacts = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const runtime = createRuntime();
    return runtime.repos.db.prepare("SELECT a.* FROM artifacts a JOIN workspace_links wl ON wl.artifact_id = a.id WHERE wl.workspace_id = ?").all(id) as any[];
  });
