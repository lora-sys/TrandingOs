import { createServer } from "node:http";
import { loadEnv, resolveLocalPaths } from "@trading-pi/core";
import { TradingPiDatabase, Repositories } from "@trading-pi/core";
import { SessionStore } from "@trading-pi/core";
import { MemoryStore } from "@trading-pi/core";
import { ArtifactEngine } from "@trading-pi/core";
import { ApprovalEngine } from "@trading-pi/core";
import { SkillRegistry, registerDefaultSkills } from "@trading-pi/core";
import { WorkflowEngine, registerDefaultWorkflows } from "@trading-pi/core";
import { TradingPiAgent } from "@trading-pi/core";
import { LangfuseTelemetry } from "@trading-pi/core";

const env = loadEnv();
const paths = resolveLocalPaths(env);
const db = new TradingPiDatabase(paths.sqlitePath);
db.migrate();
const repos = new Repositories(db);
const telemetry = new LangfuseTelemetry(env);
const sessions = new SessionStore(paths, repos);
const memory = new MemoryStore(repos);
const artifacts = new ArtifactEngine(paths, repos);
const approvals = new ApprovalEngine(repos);
const skills = new SkillRegistry(repos);
const workflows = new WorkflowEngine(skills, repos, artifacts, approvals, memory);
registerDefaultSkills(skills);
registerDefaultWorkflows(workflows);
const agent = new TradingPiAgent({ sessions, memory, skills, workflows, artifacts, approvals, repos, env });

function sendJson(res: any, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function toChatMessage(entry: any) {
  if (entry.type === "message") return { id: entry.id, role: entry.data?.role ?? "user", kind: "message", content: entry.data?.content ?? "", timestamp: entry.timestamp };
  if (entry.type === "pi_message") return { id: entry.id, role: "assistant", kind: "message", content: extractContent(entry.data), timestamp: entry.timestamp };
  return { id: entry.id, role: "system", kind: entry.type, content: entry.type.replace(/_/g, " "), timestamp: entry.timestamp };
}

function extractContent(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/health") return sendJson(res, { ok: true, name: "Trading Pi", localFirst: true, sqlitePath: paths.sqlitePath, time: new Date().toISOString() });
    if (url.pathname === "/api/status") return sendJson(res, { skills: skills.list().length, workflows: workflows.list().length, langfuseConfigured: telemetry.configured, paths });
    if (url.pathname === "/api/skills" && req.method === "GET") return sendJson(res, skills.list());
    if (url.pathname === "/api/workflows" && req.method === "GET") return sendJson(res, workflows.list());
    if (url.pathname === "/api/timeline" && req.method === "GET") return sendJson(res, repos.list("timeline_events"));
    if (url.pathname === "/api/sessions" && req.method === "GET") return sendJson(res, repos.list("sessions"));
    if (url.pathname === "/api/approvals" && req.method === "GET") return sendJson(res, repos.list("approvals"));

    if (url.pathname === "/api/mcp/servers" && req.method === "GET") return sendJson(res, repos.list("mcp_servers"));
    if (url.pathname === "/api/browser/health" && req.method === "GET") return sendJson(res, { configured: Boolean(env.aioSandboxBaseUrl), baseUrl: env.aioSandboxBaseUrl ?? null, provider: env.aioSandboxBaseUrl ? "aio-sandbox" : "playwright" });
    if (url.pathname === "/api/session/message" && req.method === "POST") {
      const body = await readBody(req);
      const result = await agent.prompt(body);
      return sendJson(res, result);
    }
    if (url.pathname === "/api/messages" && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const session = sessions.ensureSession(sessionId);
      return sendJson(res, { sessionId: session.id, messages: sessions.read(session.id).map(toChatMessage) });
    }
    if (url.pathname === "/api/artifacts" && req.method === "GET") return sendJson(res, repos.list("artifacts"));

    const wfMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)\/run$/);
    if (wfMatch && req.method === "POST") {
      const body = await readBody(req);
      const session = sessions.ensureSession(body.sessionId);
      const result = await workflows.run(wfMatch[1]!, body.input ?? {}, { env, repos, artifacts, approvals, memory, skills, sessionId: session.id });
      return sendJson(res, { sessionId: session.id, ...result });
    }

    if (url.pathname === "/api/paper/orders" && req.method === "POST") {
      const body = await readBody(req);
      const session = sessions.ensureSession(body.sessionId);
      const result = await skills.get("paper.order.create").execute(body.input ?? body, { env, repos, artifacts, approvals, memory, sessionId: session.id });
      return sendJson(res, { sessionId: session.id, ...result });
    }
    if (url.pathname === "/api/journal" && req.method === "GET") return sendJson(res, repos.list("journal_entries"));
    if (url.pathname === "/api/journal" && req.method === "POST") {
      const body = await readBody(req);
      const session = sessions.ensureSession(body.sessionId);
      const result = await skills.get("journal.entry.create").execute(body.input ?? body, { env, repos, artifacts, approvals, memory, sessionId: session.id });
      return sendJson(res, { sessionId: session.id, ...result });
    }
    if (url.pathname === "/api/portfolio" && req.method === "GET") return sendJson(res, repos.portfolioSnapshot());
    if (url.pathname === "/api/trades" && req.method === "GET") return sendJson(res, repos.list("trades"));
    if (url.pathname === "/api/reviews" && req.method === "GET") return sendJson(res, repos.list("reviews"));
    if (url.pathname === "/api/strategies" && req.method === "GET") return sendJson(res, repos.list("strategies"));

    if (url.pathname.startsWith("/api/")) return sendJson(res, { error: "Not found" }, 404);
    return sendJson(res, { ok: true, message: "Trading Pi API" });
  } catch (err: any) {
    return sendJson(res, { error: err.message }, 500);
  }
});

const port = Number(process.env.TRADING_PI_API_PORT ?? 8787);
server.listen(port, () => console.log(`Trading Pi API listening on http://localhost:${port}`));