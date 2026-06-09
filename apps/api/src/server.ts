import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntime } from "./runtime.js";

const runtime = createRuntime();
const port = runtime.env.apiPort;

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return {};
  return JSON.parse(body);
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/health") {
      return sendJson(res, {
        ok: true,
        name: "Trading Pi",
        localFirst: true,
        sqlitePath: runtime.paths.sqlitePath,
        time: new Date().toISOString(),
      });
    }
    if (url.pathname === "/api/status") {
      return sendJson(res, {
        env: runtime.envStatus,
        paths: runtime.paths,
        langfuseConfigured: runtime.telemetry.configured,
        skills: runtime.skills.list().length,
        workflows: runtime.workflows.list().length,
        mcpServers: runtime.repos.list("mcp_servers").length,
        memoryDomains: runtime.repos.db.prepare("SELECT DISTINCT COALESCE(domain, scope) AS domain FROM memory_records LIMIT 20").all(),
        browserSessions: runtime.repos.list("browser_sessions").length,
      });
    }
    if (url.pathname === "/api/ai/ping" && req.method === "POST") {
      const trace = runtime.telemetry.trace("ai.ping", { source: "api" });
      const result = await runtime.aiPing();
      trace?.generation({ name: "ai.ping", model: runtime.env.openaiModel, input: "health check", output: result.text });
      await runtime.telemetry.flush();
      return sendJson(res, result);
    }
    if (url.pathname === "/api/skills") return sendJson(res, runtime.skills.list());
    if (url.pathname === "/api/workflows") return sendJson(res, runtime.workflows.list());
    if (url.pathname === "/api/timeline") return sendJson(res, runtime.repos.list("timeline_events"));
    if (url.pathname === "/api/artifacts") return sendJson(res, runtime.repos.list("artifacts"));
    const artifactMatch = url.pathname.match(/^\/api\/artifacts\/([^/]+)$/);
    if (artifactMatch && req.method === "GET") {
      const artifactId = decodeURIComponent(artifactMatch[1] ?? "");
      const artifact = runtime.repos.getArtifact(artifactId);
      if (!artifact) return sendJson(res, { error: "Artifact not found" }, 404);
      return sendJson(res, {
        ...artifact,
        payload: JSON.parse(artifact.payload_json),
        content: artifact.content ?? readFileSync(artifact.path, "utf8"),
        contentType: artifact.content_type,
        previewReady: Boolean(artifact.preview_ready),
        previewPayload: artifact.preview_payload_json ? JSON.parse(artifact.preview_payload_json) : null,
        markdown: readFileSync(artifact.path, "utf8"),
      });
    }
    const artifactPreviewMatch = url.pathname.match(/^\/api\/artifacts\/([^/]+)\/preview$/);
    if (artifactPreviewMatch && req.method === "GET") {
      const artifactId = decodeURIComponent(artifactPreviewMatch[1] ?? "");
      const result = await runApiSkill("artifact.preview", { artifactId }, runtime.sessions.ensureSession().id);
      return sendJson(res, result);
    }
    if (url.pathname === "/api/approvals") return sendJson(res, runtime.repos.list("approvals"));
    if (url.pathname === "/api/sessions") return sendJson(res, runtime.repos.list("sessions"));
    if (url.pathname === "/api/messages" && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      const session = runtime.sessions.ensureSession(sessionId ?? undefined);
      return sendJson(res, {
        sessionId: session.id,
        messages: runtime.sessions.read(session.id).map(toChatMessage),
      });
    }
    if (url.pathname === "/api/memory" && req.method === "GET") return sendJson(res, runtime.memory.list("user"));
    if (url.pathname === "/api/memory" && req.method === "POST") {
      const body = await readBody(req);
      runtime.memory.upsert(body.scope ?? "user", body.key, body.value);
      return sendJson(res, { ok: true });
    }
    if (url.pathname === "/api/memory/query" && req.method === "POST") {
      const body = await readBody(req);
      return sendJson(res, { output: runtime.memory.query(body.input ?? body) });
    }
    if (url.pathname === "/api/memory/write" && req.method === "POST") {
      const body = await readBody(req);
      return sendJson(res, { output: runtime.memory.write(body.input ?? body) });
    }
    if (url.pathname === "/api/session/message" && req.method === "POST") {
      const body = await readBody(req);
      const result = await runtime.agent.prompt({ message: body.message, sessionId: body.sessionId });
      return sendJson(res, result);
    }
    if (url.pathname === "/api/paper/orders" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      const result = await runApiSkill("paper.order.create", body.input ?? body, session.id);
      return sendJson(res, { sessionId: session.id, ...result });
    }
    if (url.pathname === "/api/portfolio" && req.method === "GET") {
      return sendJson(res, runtime.repos.portfolioSnapshot());
    }
    if (url.pathname === "/api/trades" && req.method === "GET") {
      return sendJson(res, runtime.repos.list("trades"));
    }
    if (url.pathname === "/api/journal" && req.method === "GET") {
      return sendJson(res, runtime.repos.list("journal_entries"));
    }
    if (url.pathname === "/api/journal" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      const result = await runApiSkill("journal.entry.create", body.input ?? body, session.id);
      return sendJson(res, { sessionId: session.id, ...result });
    }
    if (url.pathname === "/api/reviews" && req.method === "GET") {
      return sendJson(res, runtime.repos.list("reviews"));
    }
    if (url.pathname === "/api/workspaces" && req.method === "GET") return sendJson(res, runtime.repos.list("workspaces"));
    if (url.pathname === "/api/workspaces" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("workspace.create", body.input ?? body, session.id)) });
    }
    const workspaceContextMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/context$/);
    if (workspaceContextMatch && req.method === "GET") {
      return sendJson(res, runtime.repos.workspaceContext(decodeURIComponent(workspaceContextMatch[1] ?? "")));
    }
    const workspaceMemoryMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/memory$/);
    if (workspaceMemoryMatch && req.method === "GET") {
      return sendJson(res, runtime.memory.query({ workspaceId: decodeURIComponent(workspaceMemoryMatch[1] ?? ""), limit: 100 }));
    }
    const workspaceArtifactsMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/artifacts$/);
    if (workspaceArtifactsMatch && req.method === "GET") {
      const workspaceId = decodeURIComponent(workspaceArtifactsMatch[1] ?? "");
      return sendJson(
        res,
        runtime.repos.db
          .prepare("SELECT artifacts.* FROM workspace_links JOIN artifacts ON artifacts.id = workspace_links.ref_id WHERE workspace_links.workspace_id = ? AND workspace_links.kind = 'artifact' ORDER BY workspace_links.created_at DESC")
          .all(workspaceId),
      );
    }
    const workspaceWorkflowsMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/workflows$/);
    if (workspaceWorkflowsMatch && req.method === "GET") {
      const workspaceId = decodeURIComponent(workspaceWorkflowsMatch[1] ?? "");
      return sendJson(
        res,
        runtime.repos.db
          .prepare("SELECT * FROM workspace_links WHERE workspace_id = ? AND kind = 'workflow' ORDER BY created_at DESC LIMIT 100")
          .all(workspaceId),
      );
    }
    if (url.pathname === "/api/mcp/discover" && req.method === "GET") {
      const session = runtime.sessions.ensureSession(url.searchParams.get("sessionId") ?? undefined);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("mcp.discover", { query: url.searchParams.get("q") ?? "" }, session.id)) });
    }
    if (url.pathname === "/api/mcp/servers" && req.method === "GET") return sendJson(res, runtime.repos.list("mcp_servers"));
    if (url.pathname === "/api/mcp/servers" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("mcp.register", body.input ?? body, session.id)) });
    }
    const mcpServerMatch = url.pathname.match(/^\/api\/mcp\/servers\/([^/]+)$/);
    if (mcpServerMatch && req.method === "PATCH") {
      const body = await readBody(req);
      runtime.repos.updateMcpServer({ id: decodeURIComponent(mcpServerMatch[1] ?? ""), ...(body.input ?? body) });
      return sendJson(res, { ok: true });
    }
    const mcpServerHealthMatch = url.pathname.match(/^\/api\/mcp\/servers\/([^/]+)\/health$/);
    if (mcpServerHealthMatch && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      const id = decodeURIComponent(mcpServerHealthMatch[1] ?? "");
      const row = runtime.repos.db.prepare("SELECT * FROM mcp_servers WHERE id = ?").get(id) as any;
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("mcp.health", { id, name: row?.name ?? id, url: row?.url ?? undefined }, session.id)) });
    }
    const mcpApprovalMatch = url.pathname.match(/^\/api\/mcp\/servers\/([^/]+)\/approval$/);
    if (mcpApprovalMatch && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, {
        sessionId: session.id,
        ...(await runApiSkill("mcp.permission.request", { serverId: decodeURIComponent(mcpApprovalMatch[1] ?? ""), ...(body.input ?? body) }, session.id)),
      });
    }
    if (url.pathname === "/api/mcp/health" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("mcp.health", body.input ?? body, session.id)) });
    }
    if (url.pathname === "/api/marketplace" && req.method === "GET") return sendJson(res, runtime.repos.list("marketplace_items"));
    if (url.pathname === "/api/marketplace/seed" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("marketplace.catalog.seed", body.input ?? {}, session.id)) });
    }
    if (url.pathname === "/api/strategies" && req.method === "GET") return sendJson(res, runtime.repos.list("strategies"));
    if (url.pathname === "/api/backtests" && req.method === "GET") return sendJson(res, runtime.repos.list("backtests"));
    if (url.pathname === "/api/evolution/proposals" && req.method === "GET") return sendJson(res, runtime.repos.list("evolution_proposals"));
    if (url.pathname === "/api/audit" && req.method === "GET") return sendJson(res, runtime.repos.list("audit_records"));
    if (url.pathname === "/api/cache" && req.method === "GET") return sendJson(res, runtime.repos.list("data_cache"));
    if (url.pathname === "/api/search/query" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("search.query", body.input ?? body, session.id)) });
    }
    if (url.pathname === "/api/browser/health" && req.method === "GET") {
      return sendJson(res, {
        provider: "aio-sandbox",
        configured: Boolean(runtime.env.aioSandboxBaseUrl),
        baseUrl: runtime.env.aioSandboxBaseUrl ?? null,
        capabilities: ["browser.search", "browser.open", "browser.extract", "browser.screenshot", "browser.pdf"],
      });
    }
    if (url.pathname === "/api/browser/actions" && req.method === "POST") {
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      return sendJson(res, { sessionId: session.id, ...(await runApiSkill("browser.action", body.input ?? body, session.id)) });
    }
    const browserSessionMatch = url.pathname.match(/^\/api\/browser\/sessions\/([^/]+)$/);
    if (browserSessionMatch && req.method === "GET") {
      const sessionId = decodeURIComponent(browserSessionMatch[1] ?? "");
      const row = runtime.repos.db.prepare("SELECT * FROM browser_sessions WHERE id = ?").get(sessionId);
      if (!row) return sendJson(res, { error: "Browser session not found" }, 404);
      return sendJson(res, row);
    }
    const browserArtifactMatch = url.pathname.match(/^\/api\/browser\/artifacts\/([^/]+)$/);
    if (browserArtifactMatch && req.method === "GET") {
      const artifactId = decodeURIComponent(browserArtifactMatch[1] ?? "");
      const artifact = runtime.repos.getArtifact(artifactId);
      if (!artifact) return sendJson(res, { error: "Browser artifact not found" }, 404);
      return sendJson(res, {
        ...artifact,
        payload: JSON.parse(artifact.payload_json),
        content: artifact.content ?? readFileSync(artifact.path, "utf8"),
        previewPayload: artifact.preview_payload_json ? JSON.parse(artifact.preview_payload_json) : null,
      });
    }
    const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)\/run$/);
    if (workflowMatch && req.method === "POST") {
      const workflowId = decodeURIComponent(workflowMatch[1] ?? "");
      const body = await readBody(req);
      const session = runtime.sessions.ensureSession(body.sessionId);
      const trace = runtime.telemetry.trace(`workflow.${workflowId}`, { sessionId: session.id, input: body.input ?? body });
      const result = await runtime.workflows.run(workflowId, body.input ?? body, runtime.workflowContext(session.id));
      trace?.span({ name: `workflow.${workflowId}`, input: body.input ?? body, output: result.output });
      await runtime.telemetry.flush();
      return sendJson(res, { sessionId: session.id, ...result });
    }
    if (url.pathname.startsWith("/api/")) return sendJson(res, { error: "Not found" }, 404);
    return serveStatic(url.pathname, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendJson(res, { error: message }, 500);
  }
}

async function runApiSkill(skillId: string, input: unknown, sessionId: string) {
  const skill = runtime.skills.get(skillId);
  const runId = runtime.repos.createSkillRun(undefined, skillId, input);
  runtime.repos.createTimeline({
    sessionId,
    skillRunId: runId,
    type: "api.skill",
    title: `API skill started: ${skill.name}`,
    status: "running",
    payload: input,
  });
  try {
    const output = await skill.execute(input as never, runtime.workflowContext(sessionId));
    runtime.repos.finishSkillRun(runId, "completed", output);
    runtime.repos.createTimeline({
      sessionId,
      skillRunId: runId,
      type: "api.skill",
      title: `API skill completed: ${skill.name}`,
      status: "completed",
      payload: output,
    });
    return { output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtime.repos.finishSkillRun(runId, "failed", undefined, message);
    throw error;
  }
}

function toChatMessage(entry: { type: string; id: string; timestamp: string; data: any }) {
  if (entry.type === "message") {
    return {
      id: entry.id,
      role: entry.data.role ?? "user",
      kind: "message",
      content: entry.data.content ?? "",
      timestamp: entry.timestamp,
      raw: entry,
    };
  }
  if (entry.type === "pi_message") {
    return {
      id: entry.id,
      role: entry.data.role ?? "assistant",
      kind: "message",
      content: extractContent(entry.data),
      timestamp: entry.timestamp,
      raw: entry,
    };
  }
  return {
    id: entry.id,
    role: "system",
    kind: entry.type,
    content: entry.type.replace(/_/g, " "),
    timestamp: entry.timestamp,
    raw: entry,
  };
}

function extractContent(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("");
}

function serveStatic(pathname: string, res: ServerResponse) {
  const apiDistDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.env.INIT_CWD ?? process.cwd(), "apps/web/dist"),
    resolve(process.cwd(), "../../apps/web/dist"),
    resolve(apiDistDir, "../../../web/dist"),
    resolve(apiDistDir, "../../../apps/web/dist"),
  ];
  const webDist = candidates.find((candidate) => existsSync(join(candidate, "index.html"))) ?? candidates[0]!;
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = resolve(webDist, requested);
  if (!filePath.startsWith(webDist) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(webDist, "index.html");
  }
  if (!existsSync(filePath)) {
    return sendJson(res, { ok: true, message: "API is running. Build web assets for static UI." });
  }
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
  res.writeHead(200, { "Content-Type": types[extname(filePath)] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  void route(req, res);
});

server.listen(port, () => {
  console.log(`Trading Pi API listening on http://localhost:${port}`);
});
