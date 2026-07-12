import { createServer } from "node:http";
import { loadEnv, resolveLocalPaths, ensureLocalPaths, type TradingPiEnv, type LocalPaths } from "@trading-pi/core";
import { TradingPiDatabase, Repositories } from "@trading-pi/core";
import { SessionStore } from "@trading-pi/core";
import { MemoryStore } from "@trading-pi/core";
import { ArtifactEngine } from "@trading-pi/core";
import { ApprovalEngine } from "@trading-pi/core";
import { SkillRegistry, registerDefaultSkills } from "@trading-pi/core";
import { WorkflowEngine, registerDefaultWorkflows } from "@trading-pi/core";
import { TradingPiAgent } from "@trading-pi/core";
import { LangfuseTelemetry } from "@trading-pi/core";
import { runDeepResearch } from "@trading-pi/core";
import { getDefaultSubAgentManager } from "@trading-pi/core";
import { aiPing } from "@trading-pi/core";

const env = loadEnv();
const paths = ensureLocalPaths(resolveLocalPaths(env));
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
const subAgents = getDefaultSubAgentManager();
subAgents.configure({
  runWorkflow: (workflowId, input, context) => workflows.run(workflowId, input, context),
  createContext: () => ({ env, repos, artifacts, approvals, memory, skills, sessionId: "" }),
});
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

function evolutionSummary(workspaceId?: string) {
  const decisions = repos.listDecisions(workspaceId);
  const trades = repos.listPaperTrades({ workspaceId });
  const reviews = repos.listReviews(workspaceId);
  const suggestions = repos.listEvolutionSuggestions({ workspaceId });
  const rules = (memory.query({ domain: "user_rules", limit: 100 }) as Array<{ workspace_id?: string | null }>).filter(
    (rule) => !workspaceId || !rule.workspace_id || rule.workspace_id === workspaceId,
  );
  const settled = decisions.filter((decision) => decision.status === "settled_win" || decision.status === "settled_loss");
  const wins = settled.filter((decision) => decision.status === "settled_win").length;
  const pnl = settled.reduce((sum, decision) => sum + Number(decision.resultPnL ?? 0), 0);
  return {
    metrics: {
      decisions: decisions.length,
      settled: settled.length,
      winRate: settled.length ? wins / settled.length : 0,
      totalPnl: pnl,
      paperTrades: trades.length,
      reviews: reviews.length,
      activeRules: rules.length,
      openSuggestions: suggestions.filter((suggestion) => suggestion.status === "proposed").length,
      adoptedSuggestions: suggestions.filter((suggestion) => suggestion.status === "adopted").length,
    },
    patternHighlights: [
      settled.length ? `${settled.length} settled decisions available for review.` : "No settled decisions yet.",
      suggestions.length ? `${suggestions.length} improvement suggestions tracked.` : "No evolution suggestions yet.",
      rules.length ? `${rules.length} user rule(s) active.` : "No user rules configured.",
    ],
    recentReviews: reviews.slice(0, 7),
    recentSuggestions: suggestions.slice(0, 10),
  };
}

function buildEvolutionRulesPrompt(input: {
  workspaceId?: string;
  reviews: any[];
  decisions: any[];
  trades: any[];
  journals: any[];
  rules: any[];
}) {
  return `Analyze this Trading Pi local behavior history and propose 3-5 new trading discipline rules.
Use the provided local data only. Return ONLY JSON with this exact shape:
{
  "suggestions": [
    {
      "title": "short rule title",
      "description": "why this rule matters for the observed behavior",
      "category": "risk|discipline|research|execution|review",
      "priority": "high|medium|low",
      "ruleText": "the rule written as an actionable checklist item"
    }
  ]
}

Local context JSON:
${JSON.stringify(
  {
    workspaceId: input.workspaceId ?? null,
    reviews: input.reviews,
    decisions: input.decisions,
    paperTrades: input.trades,
    journalEntries: input.journals,
    activeRules: input.rules,
  },
  null,
  2,
)}`;
}

function parseEvolutionRuleSuggestions(text: string) {
  const parsed = parseJsonFromAiText(text);
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  return items
    .map((item: any) => ({
      title: String(item?.title ?? "").trim(),
      description: String(item?.description ?? "").trim(),
      category: String(item?.category ?? "rule").trim() || "rule",
      priority: String(item?.priority ?? "medium").trim() || "medium",
      ruleText: String(item?.ruleText ?? item?.rule_text ?? item?.description ?? "").trim(),
    }))
    .filter((item) => item.title && item.ruleText)
    .slice(0, 5);
}

function parseJsonFromAiText(text: string): any {
  const candidates = [
    text,
    ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1] ?? ""),
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    text.slice(text.indexOf("["), text.lastIndexOf("]") + 1),
  ].filter((candidate) => candidate.trim().length > 0);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      // Try the next likely JSON span.
    }
  }
  return null;
}

function parseJsonField(value: string | null | undefined, fallback: unknown = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function fallbackPredictionMarkets(category?: string) {
  const markets = [
    {
      id: "fallback-fed-cuts-2026",
      question: "Will the Federal Reserve cut rates at least twice before December 2026?",
      outcomePrices: [0.58, 0.42],
      volume: 2_450_000,
      oneDayPriceChange: 2.4,
      endDate: "2026-12-18T00:00:00.000Z",
      category: "Macro",
      source: "fallback",
    },
    {
      id: "fallback-btc-100k-2026",
      question: "Will Bitcoin trade above $100,000 before the end of 2026?",
      outcomePrices: [0.64, 0.36],
      volume: 4_900_000,
      oneDayPriceChange: -1.1,
      endDate: "2026-12-31T00:00:00.000Z",
      category: "Crypto",
      source: "fallback",
    },
    {
      id: "fallback-us-election-turnout",
      question: "Will US national election turnout exceed 65% in the next major cycle?",
      outcomePrices: [0.47, 0.53],
      volume: 1_850_000,
      oneDayPriceChange: 0.7,
      endDate: "2026-11-04T00:00:00.000Z",
      category: "Politics",
      source: "fallback",
    },
    {
      id: "fallback-nba-finals-game-seven",
      question: "Will the next NBA Finals include a Game 7?",
      outcomePrices: [0.31, 0.69],
      volume: 820_000,
      oneDayPriceChange: 1.6,
      endDate: "2026-06-30T00:00:00.000Z",
      category: "Sports",
      source: "fallback",
    },
    {
      id: "fallback-ai-film-box-office",
      question: "Will an AI-themed film top the domestic box office for two weekends in 2026?",
      outcomePrices: [0.39, 0.61],
      volume: 610_000,
      oneDayPriceChange: -0.4,
      endDate: "2026-12-31T00:00:00.000Z",
      category: "Entertainment",
      source: "fallback",
    },
  ];
  if (!category) return markets;
  return markets.filter((market) => market.category.toLowerCase() === category.toLowerCase());
}

function fallbackEvolutionRuleSuggestions(latest: any) {
  const rawItems =
    latest?.suggestions?.items ??
    [
      {
        title: "Add a pre-decision rule",
        description: "Use recent reviews to convert recurring lessons into a concrete checklist rule.",
        category: "rule",
        priority: "medium",
        ruleText: "Before confirming a decision, write the invalidation criterion and maximum position size.",
      },
    ];
  return rawItems.slice(0, 5).map((item: any) => ({
    title: String(item.title ?? "Rule suggestion"),
    description: String(item.description ?? item.ruleText ?? "Suggested rule from review history."),
    category: String(item.category ?? "rule"),
    priority: String(item.priority ?? "medium"),
    ruleText: String(item.ruleText ?? item.description ?? item.title ?? "Review rule suggestion"),
  }));
}

function toChatMessage(entry: any) {
  if (entry.type === "message") return { id: entry.id, role: entry.data?.role ?? "user", kind: "message", content: entry.data?.content ?? "", timestamp: entry.timestamp };
  if (entry.type === "pi_message") return { id: entry.id, role: "assistant", kind: "message", content: extractContent(entry.data), timestamp: entry.timestamp };
  return { id: entry.id, role: "system", kind: entry.type, content: entry.type.replace(/_/g, " "), timestamp: entry.timestamp };
}

/* ── Runtime config (mutable by frontend via /api/config) ── */
const agentConfig = {
  thinkingLevel: "medium" as string,
  modelId: env.openaiModel ?? "default",
  autoCompaction: true,
  showThinking: true,
  deepResearch: {
    enabled: true,
    mode: "builtin" as "builtin" | "openrouter",
    maxSteps: 5,
  },
  apiKeys: {
    openai: env.openaiApiKey ?? "",
    exa: env.exaApiKey ?? "",
    jina: env.jinaApiKey ?? "",
    reddit: "",
    polymarket: "",
    openrouter: "",
  },
};

function publicAgentConfig() {
  return {
    thinkingLevel: agentConfig.thinkingLevel,
    modelId: agentConfig.modelId,
    autoCompaction: agentConfig.autoCompaction,
    showThinking: agentConfig.showThinking,
    deepResearch: agentConfig.deepResearch,
    apiKeys: Object.fromEntries(
      Object.entries(agentConfig.apiKeys).map(([key, value]) => [key, { configured: Boolean(value) }]),
    ),
  };
}


/* ── Available models (used by /api/config/models) ── */
function listAvailableModels() {
  const baseUrl = env.openaiBaseUrl ?? "";
  const isOpenAICompatible = baseUrl.includes("/v1") || baseUrl.includes("openai") || baseUrl.length > 0;

  const models: Array<{ id: string; name: string; reasoning?: boolean; contextWindow: number; provider: string }> = [];

  // Always include the currently configured model as the primary option
  models.push({
    id: env.openaiModel,
    name: env.openaiModel,
    reasoning: env.openaiModel.toLowerCase().includes("reasoning") || env.openaiModel.toLowerCase().includes("longcat"),
    contextWindow: 128_000,
    provider: "trading-pi-openai-compatible",
  });

  // Include default OpenAI-compatible models only if baseUrl matches the schema
  if (isOpenAICompatible) {
    const defaults: Array<{ id: string; name: string; reasoning?: boolean; contextWindow: number; provider: string }> = [
      { id: "LongCat-2.0", name: "LongCat-2.0", reasoning: true, contextWindow: 128_000, provider: "trading-pi-openai-compatible" },
      { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128_000, provider: "trading-pi-openai-compatible" },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128_000, provider: "trading-pi-openai-compatible" },
    ];

    for (const candidate of defaults) {
      if (candidate.id === env.openaiModel) continue; // Already added as primary
      models.push(candidate);
    }
  }

  return {
    models,
    current: env.openaiModel,
  };
}

/* ── Forward complete AgentEvent — no stripping ── */
function forwardStreamEvent(event: any) {
  // message_update: forward full structured message with all content blocks
  if (event.type === "message_update") {
    return {
      type: event.type,
      message: event.message,           // Full PiMessage with content blocks (text/thinking/toolCall)
      assistantMessageEvent: event.assistantMessageEvent, // { type, delta }
    };
  }
  // tool events: forward with full context
  if (event.type === "tool_execution_start") {
    return {
      type: event.type,
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
    };
  }
  if (event.type === "tool_execution_end") {
    return {
      type: event.type,
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      isError: event.isError,
      result: event.result,
      partialResult: event.partialResult,
    };
  }
  // artifact events
  if (event.type === "artifact_update") {
    return {
      type: event.type,
      artifactId: event.artifactId,
      content: event.content,
      title: event.title,
    };
  }
  // Everything else: forward as-is (message_end, etc.)
  return { type: event.type, ...event };
}

function extractContent(message: any) {
  if (!message || !message.content) return "";

  let text = "";
  if (typeof message.content === "string") {
    text = message.content;
  } else if (Array.isArray(message.content)) {
    text = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
  }

  // Aggressively remove common JSON patterns that leak from tool-using models
  return text
    .replace(/```json[\s\S]*?```/g, "") // Remove JSON code blocks
    .replace(/\{[\s\n]*"action"[\s\S]*?\}/g, "") // Remove raw action JSON
    .replace(/\{[\s\n]*"tool"[\s\S]*?\}/g, "") // Remove raw tool JSON
    .replace(/\{[\s\n]*"type"[\s\n]*:[\s\n]*"artifact"[\s\S]*?\}/g, "") // Remove artifact JSON
    .trim();
}

let agentStatus: "idle" | "running" = "idle";

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/health") return sendJson(res, { ok: true, name: "Trading Pi", localFirst: true, sqlitePath: paths.sqlitePath, time: new Date().toISOString() });
    if (url.pathname === "/api/status") return sendJson(res, { status: agentStatus, skills: skills.list().length, workflows: workflows.list().length, langfuseConfigured: telemetry.configured, paths, config: agentConfig });

	    // ── /api/config: runtime configuration (frontend → backend) ──
	    if (url.pathname === "/api/config" && req.method === "GET") {
	      return sendJson(res, publicAgentConfig());
	    }
	    if (url.pathname === "/api/config" && req.method === "POST") {
	      const body = await readBody(req);
	      if (body.thinkingLevel !== undefined) agentConfig.thinkingLevel = String(body.thinkingLevel);
	      if (body.modelId !== undefined) agentConfig.modelId = String(body.modelId);
	      if (body.autoCompaction !== undefined) agentConfig.autoCompaction = Boolean(body.autoCompaction);
	      if (body.showThinking !== undefined) agentConfig.showThinking = Boolean(body.showThinking);
	      if (body.deepResearch && typeof body.deepResearch === "object") {
	        if (body.deepResearch.enabled !== undefined) agentConfig.deepResearch.enabled = Boolean(body.deepResearch.enabled);
	        if (body.deepResearch.mode === "builtin" || body.deepResearch.mode === "openrouter") {
	          agentConfig.deepResearch.mode = body.deepResearch.mode;
	        }
	        if (body.deepResearch.maxSteps !== undefined) {
	          agentConfig.deepResearch.maxSteps = Math.max(3, Math.min(10, Number(body.deepResearch.maxSteps) || 5));
	        }
	      }
	      if (body.apiKeys && typeof body.apiKeys === "object") {
	        for (const key of Object.keys(agentConfig.apiKeys) as Array<keyof typeof agentConfig.apiKeys>) {
	          if (body.apiKeys[key] !== undefined) {
	            agentConfig.apiKeys[key] = String(body.apiKeys[key] ?? "");
	          }
	        }
	      }
	      return sendJson(res, publicAgentConfig());
	    }
	    if (url.pathname === "/api/config/models" && req.method === "GET") {
	      return sendJson(res, listAvailableModels());
	    }
    if (url.pathname === "/api/skills" && req.method === "GET") return sendJson(res, skills.list());
    if (url.pathname === "/api/workflows" && req.method === "GET") return sendJson(res, workflows.list());
    if (url.pathname === "/api/sub-agents" && req.method === "GET") {
      return sendJson(res, { agents: subAgents.listActive(), definitions: subAgents.listDefinitions() });
    }
    if (url.pathname === "/api/sub-agents" && req.method === "POST") {
      const body = await readBody(req);
      const result = await subAgents.spawn(
        {
        agent_type: body.agent_type ?? body.agentType,
        prompt: body.prompt ?? "",
        background: body.background,
        workspace_id: body.workspace_id ?? body.workspaceId,
        decision_id: body.decision_id ?? body.decisionId,
        min_runtime_ms: body.min_runtime_ms ?? body.minRuntimeMs,
      },
        { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId ?? "" },
      );
      return sendJson(res, result, 201);
    }
    const subAgentMatch = url.pathname.match(/^\/api\/sub-agents\/([^/]+)$/);
    if (subAgentMatch && req.method === "GET") {
      const status = subAgents.status(subAgentMatch[1]!);
      if (!status) return sendJson(res, { error: "Sub-agent not found" }, 404);
      return sendJson(res, status);
    }
    const stopSubAgentMatch = url.pathname.match(/^\/api\/sub-agents\/([^/]+)\/stop$/);
    if (stopSubAgentMatch && req.method === "POST") {
      const body = await readBody(req);
      const status = subAgents.stop(stopSubAgentMatch[1]!, body.reason ?? "API stop requested");
      if (!status) return sendJson(res, { error: "Sub-agent not found" }, 404);
      return sendJson(res, status);
    }
    if (url.pathname === "/api/timeline" && req.method === "GET") return sendJson(res, repos.list("timeline_events"));
    if (url.pathname === "/api/sessions" && req.method === "GET") return sendJson(res, repos.list("sessions"));
    if (url.pathname.startsWith("/api/sessions/") && req.method === "DELETE") {
      const sessionId = url.pathname.replace(/^\/api\/sessions\//, "");
      const deleted = sessions.deleteSession(sessionId);
      if (!deleted) return sendJson(res, { error: "Session not found" }, 404);
      return sendJson(res, { success: true, deleted: sessionId });
    }
    if (url.pathname === "/api/approvals" && req.method === "GET") return sendJson(res, repos.list("approvals"));

    if (url.pathname === "/api/mcp/servers" && req.method === "GET") return sendJson(res, repos.list("mcp_servers"));
    if (url.pathname === "/api/browser/health" && req.method === "GET") return sendJson(res, { configured: Boolean(env.aioSandboxBaseUrl), baseUrl: env.aioSandboxBaseUrl ?? null, provider: env.aioSandboxBaseUrl ? "aio-sandbox" : "playwright" });
    if (url.pathname === "/api/ai/ping" && req.method === "GET") {
      try {
        return sendJson(res, await aiPing(env));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return sendJson(res, { error: message }, 500);
      }
    }
    if (url.pathname === "/api/session/message" && req.method === "POST") {
      const body = await readBody(req);
      const result = await agent.prompt(body, undefined, {
        thinkingLevel: agentConfig.thinkingLevel,
        modelId: agentConfig.modelId,
        autoCompaction: agentConfig.autoCompaction,
      });
      return sendJson(res, result);
    }

    // ─── SSE streaming endpoint ───
    if (url.pathname === "/api/session/message/stream" && req.method === "POST") {
      const body = await readBody(req);
      const { message, sessionId } = body as { message: string; sessionId?: string };

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.flushHeaders();

      agentStatus = "running";
      const unsubscribeSubAgents = subAgents.subscribe((event) => {
        try {
          res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        } catch { /* client may have disconnected */ }
      });
      try {
        const result = await agent.prompt({ message, sessionId }, (event) => {
          try {
            const forwarded = forwardStreamEvent(event);
            const data = JSON.stringify(forwarded);
            res.write(`event: ${event.type}\ndata: ${data}\n\n`);
          } catch { /* client may have disconnected */ }
        }, {
          thinkingLevel: agentConfig.thinkingLevel,
          modelId: agentConfig.modelId,
          autoCompaction: agentConfig.autoCompaction,
        });

        // Auto-update session name if it was a new session or still has the default name
        const existingSession = sessions.getSession(result.sessionId);
        if (existingSession && (existingSession.name === "Trading Pi Session" || existingSession.name === "新对话")) {
          const newName = message.slice(0, 40).replace(/[^\w\u4e00-\u9fff\s]/g, "").trim() || "新对话";
          sessions.updateSessionName(result.sessionId, newName);
        }

        const transformed = {
          sessionId: result.sessionId,
          text: result.text,
          messages: (result.messages ?? []).map((m: any) => ({
            id: m.id,
            role: m.role ?? "assistant",
            kind: "pi_message",
            content: extractContent(m),
            timestamp: m.timestamp ?? Date.now(),
          })),
          workflowResult: result.workflowResult,
        };
        res.write(`event: done\ndata: ${JSON.stringify(transformed)}\n\n`);
      } catch (err: any) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      } finally {
        unsubscribeSubAgents();
        agentStatus = "idle";
      }
      res.end();
      return;
    }
    if (url.pathname === "/api/messages" && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const session = sessions.ensureSession(sessionId);
      return sendJson(res, { sessionId: session.id, messages: sessions.read(session.id).map(toChatMessage) });
    }
    if (url.pathname === "/api/artifacts" && req.method === "GET") return sendJson(res, repos.list("artifacts"));
    const artifactMatch = url.pathname.match(/^\/api\/artifacts\/([^/]+)$/);
    if (artifactMatch && req.method === "GET") {
      const artifact = repos.getArtifact(decodeURIComponent(artifactMatch[1]!));
      if (!artifact) return sendJson(res, { error: "Artifact not found" }, 404);
      return sendJson(res, {
        id: artifact.id,
        sessionId: artifact.session_id ?? undefined,
        workflowRunId: artifact.workflow_run_id ?? undefined,
        workspaceId: artifact.workspace_id ?? undefined,
        type: artifact.type,
        title: artifact.title,
        summary: artifact.summary,
        path: artifact.path,
        contentType: artifact.content_type,
        content: artifact.content ?? "",
        previewReady: Boolean(artifact.preview_ready),
        previewPayload: parseJsonField(artifact.preview_payload_json),
        payload: parseJsonField(artifact.payload_json, {}),
        createdAt: artifact.created_at,
      });
    }

    if (url.pathname === "/api/workspaces" && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      repos.ensureDefaultWorkspace(sessionId);
      return sendJson(res, repos.listWorkspaces(sessionId));
    }
    if (url.pathname === "/api/workspaces" && req.method === "POST") {
      const body = await readBody(req);
      const session = sessions.ensureSession(body.sessionId);
      const workspace = repos.createWorkspace({
        name: body.name,
        description: body.description,
        topicType: body.topicType ?? body.topic_type,
        topicRef: body.topicRef ?? body.topic_ref,
        creatorSessionId: session.id,
        context: body.context ?? {},
      });
      return sendJson(res, { sessionId: session.id, workspace }, 201);
    }
    const workspaceMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)$/);
    if (workspaceMatch && req.method === "GET") {
      const workspace = repos.getWorkspace(workspaceMatch[1]!);
      if (!workspace) return sendJson(res, { error: "Workspace not found" }, 404);
      return sendJson(res, workspace);
    }
    if (workspaceMatch && req.method === "PATCH") {
      const body = await readBody(req);
      const workspace = repos.updateWorkspace(workspaceMatch[1]!, {
        name: body.name,
        description: body.description,
        topicType: body.topicType ?? body.topic_type,
        topicRef: body.topicRef ?? body.topic_ref,
        context: body.context,
      });
      if (!workspace) return sendJson(res, { error: "Workspace not found" }, 404);
      return sendJson(res, workspace);
    }
    if (workspaceMatch && req.method === "DELETE") {
      const deleted = repos.deleteWorkspace(workspaceMatch[1]!);
      if (!deleted) return sendJson(res, { error: "Workspace not found or default workspace cannot be deleted" }, 404);
      return sendJson(res, { success: true, deleted: workspaceMatch[1] });
    }

    if (url.pathname === "/api/decisions" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      return sendJson(res, repos.listDecisions(workspaceId));
    }
    if (url.pathname === "/api/decisions/analyze" && req.method === "POST") {
      const body = await readBody(req);
      const context = { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId ?? "" };
      const result = body.report || body.artifactId
        ? await skills.get("decision.fromReport").execute(
            {
              topic: body.topic,
              workspaceId: body.workspaceId ?? body.workspace_id,
              report: body.report,
              artifactId: body.artifactId ?? body.artifact_id,
            },
            context,
          )
        : await skills.get("decision.analyze").execute(
            {
              topic: body.topic,
              workspaceId: body.workspaceId ?? body.workspace_id,
              direction: body.direction,
              positionSize: body.positionSize ?? body.position_size,
              reportContext: body.reportContext,
            },
            context,
          );
      return sendJson(res, {
        decision: result,
        aiDriven: Boolean(env.openaiApiKey),
        model: env.openaiModel,
      });
    }
    if (url.pathname === "/api/decisions" && req.method === "POST") {
      const body = await readBody(req);
      const decision = repos.createDecision({
        workspaceId: body.workspaceId ?? body.workspace_id,
        topic: body.topic,
        direction: body.direction,
        positionSize: Number(body.positionSize ?? body.position_size ?? 0),
        confidence: body.confidence,
        riskLevel: body.riskLevel ?? body.risk_level,
        supportingReasons: body.supportingReasons ?? body.supporting_reasons ?? [],
        againstReasons: body.againstReasons ?? body.against_reasons ?? [],
        thesis: body.thesis,
        invalidationCriteria: body.invalidationCriteria ?? body.invalidation_criteria,
        status: body.status,
      });
      return sendJson(res, decision, 201);
    }
    const decisionMatch = url.pathname.match(/^\/api\/decisions\/([^/]+)$/);
    if (decisionMatch && req.method === "GET") {
      const decision = repos.getDecision(decisionMatch[1]!);
      if (!decision) return sendJson(res, { error: "Decision not found" }, 404);
      return sendJson(res, decision);
    }
    if (decisionMatch && req.method === "PATCH") {
      const body = await readBody(req);
      const decision = repos.updateDecisionStatus(decisionMatch[1]!, body.status, {
        resultPnL: body.resultPnL ?? body.result_pnl,
        reviewId: body.reviewId ?? body.review_id,
        executedAt: body.executedAt ?? body.executed_at,
        settledAt: body.settledAt ?? body.settled_at,
      });
      if (!decision) return sendJson(res, { error: "Decision not found" }, 404);
      return sendJson(res, decision);
    }
    const decisionStatusMatch = url.pathname.match(/^\/api\/decisions\/([^/]+)\/status$/);
    if (decisionStatusMatch && req.method === "PATCH") {
      const body = await readBody(req);
      const decision = repos.updateDecisionStatus(decisionStatusMatch[1]!, body.status, {
        resultPnL: body.resultPnL ?? body.result_pnl,
        reviewId: body.reviewId ?? body.review_id,
      });
      if (!decision) return sendJson(res, { error: "Decision not found" }, 404);
      return sendJson(res, decision);
    }

    if (url.pathname === "/api/paper-trades" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      const status = url.searchParams.get("status") ?? undefined;
      return sendJson(res, repos.listPaperTrades({ workspaceId, status: status as any }));
    }
    if (url.pathname === "/api/paper-trades" && req.method === "POST") {
      const body = await readBody(req);
      const result = await workflows.run(
        "paper.trade.lifecycle",
        {
          action: "execute",
          decisionId: body.decisionId ?? body.decision_id,
          entryPrice: body.entryPrice ?? body.entry_price,
          asset: body.asset,
          settlementReason: body.settlementReason ?? body.settlement_reason,
        },
        { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId },
      );
      return sendJson(res, result.output, 201);
    }
    const paperTradeMatch = url.pathname.match(/^\/api\/paper-trades\/([^/]+)$/);
    if (paperTradeMatch && req.method === "GET") {
      const trade = repos.getPaperTrade(paperTradeMatch[1]!);
      if (!trade) return sendJson(res, { error: "Paper trade not found" }, 404);
      return sendJson(res, trade);
    }
    const paperTradeCloseMatch = url.pathname.match(/^\/api\/paper-trades\/([^/]+)\/close$/);
    if (paperTradeCloseMatch && req.method === "PATCH") {
      const body = await readBody(req);
      const result = await workflows.run(
        "paper.trade.lifecycle",
        {
          action: "close",
          paperTradeId: paperTradeCloseMatch[1],
          exitPrice: body.exitPrice ?? body.exit_price,
          settlementReason: body.settlementReason ?? body.settlement_reason ?? "manual_close",
        },
        { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId },
      );
      return sendJson(res, result.output);
    }
    const paperTradeSettleMatch = url.pathname.match(/^\/api\/paper-trades\/([^/]+)\/settle$/);
    if (paperTradeSettleMatch && req.method === "POST") {
      const body = await readBody(req);
      const result = await workflows.run(
        "paper.trade.lifecycle",
        {
          action: "settle",
          paperTradeId: paperTradeSettleMatch[1],
          exitPrice: body.exitPrice ?? body.exit_price,
          settlementReason: body.settlementReason ?? body.settlement_reason ?? "settlement",
        },
        { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId },
      );
      return sendJson(res, result.output);
    }

    // Plans API
    if (url.pathname === "/api/plans" && req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      const plans = repos.listPlans(sessionId ?? undefined);
      return sendJson(res, plans);
    }
    if (url.pathname === "/api/plan" && req.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return sendJson(res, { error: "Missing id" }, 400);
      const plan = repos.getPlan(id);
      if (!plan) return sendJson(res, { error: "Plan not found" }, 404);
      return sendJson(res, plan);
    }

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
    if (url.pathname === "/api/alpha/radar" && req.method === "GET") {
      const cached = repos.getCache("alpha:radar:top5");
      try {
        const category = url.searchParams.get("category") ?? undefined;
        const result = await workflows.run("alpha.radar.scan", { category }, { env, repos, artifacts, approvals, memory, skills, sessionId: "" });
        return sendJson(res, result.output ?? result);
      } catch (err: any) {
        if (cached) return sendJson(res, { signals: cached.value, stale: true, error: err.message });
        return sendJson(res, { signals: [], stale: true, error: err.message }, 200);
      }
    }
    if (url.pathname === "/api/events/reminders" && req.method === "GET") {
      const days = Number(url.searchParams.get("days") ?? 7);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      const context = { env, repos, artifacts, approvals, memory, sessionId: "" };
      const [macro, crypto] = await Promise.all([
        skills.get("events.fred").execute({ method: "calendar", limit }, context).catch((err: any) => ({
          events: [],
          warning: err.message,
        })),
        skills.get("events.coinmarketcal").execute({ method: "events", days }, context).catch((err: any) => ({
          events: [],
          warning: err.message,
        })),
      ]);
      return sendJson(res, {
        macro,
        crypto,
        generatedAt: new Date().toISOString(),
        cacheTtlSeconds: 30 * 60,
      });
    }
    if (url.pathname === "/api/research/sessions" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      return sendJson(res, repos.listResearchSessions(workspaceId));
    }
    const researchSessionMatch = url.pathname.match(/^\/api\/research\/sessions\/([^/]+)$/);
    if (researchSessionMatch && req.method === "GET") {
      const session = repos.getResearchSession(researchSessionMatch[1]!);
      if (!session) return sendJson(res, { error: "Research session not found" }, 404);
      const artifact = session.reportArtifactId ? repos.getArtifact(session.reportArtifactId) : undefined;
      return sendJson(res, { session, artifact });
    }
    if (url.pathname === "/api/research/deep" && req.method === "POST") {
      const body = await readBody(req);
      if (!body.topic || !body.workspaceId) return sendJson(res, { error: "topic and workspaceId are required" }, 400);
      const controller = new AbortController();
      res.on?.("close", () => controller.abort());
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.flushHeaders?.();
      const writeEvent = (type: string, data: unknown) => {
        try {
          res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          controller.abort();
        }
      };
      try {
        await runDeepResearch(
          { topic: body.topic, workspaceId: body.workspaceId, maxIterations: body.maxIterations, context: body.context },
          { env, repos, artifacts, approvals, memory, skills, sessionId: body.sessionId },
          {
            signal: controller.signal,
            onEvent: (event) => writeEvent(event.type, event.data),
          },
        );
      } catch (err: any) {
        if (!controller.signal.aborted) writeEvent("research:error", { message: err.message });
      } finally {
        res.end();
      }
      return;
    }
    if (url.pathname === "/api/markets" && req.method === "GET") {
      const source = url.searchParams.get("source") ?? "crypto";
      if (source === "polymarket") {
        const q = url.searchParams.get("q") ?? "";
        const category = url.searchParams.get("category") ?? undefined;
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const context = { env, repos, artifacts, approvals, memory, sessionId: "" };
        try {
          const result = q
            ? await skills.get("market.polymarket.search").execute({ query: q, limit }, context)
            : await skills.get("market.polymarket.markets").execute({ active: true, closed: false, category, limit, offset }, context);
          return sendJson(res, result);
        } catch (err: any) {
          const fallbackMarkets = fallbackPredictionMarkets(category).filter((market) =>
            q ? market.question.toLowerCase().includes(q.toLowerCase()) || market.category.toLowerCase().includes(q.toLowerCase()) : true,
          );
          return sendJson(
            res,
            {
              markets: fallbackMarkets.slice(0, limit),
              stale: true,
              error: err.message ?? String(err),
              source: "polymarket",
              fallback: true,
            },
            200,
          );
        }
      }
      return sendJson(res, { error: `Unsupported markets source: ${source}` }, 400);
    }
    if (url.pathname === "/api/market/ohlcv" && req.method === "GET") {
      const symbol = url.searchParams.get("symbol") ?? "ETH/USDT";
      const timeframe = url.searchParams.get("timeframe") ?? "1d";
      const limit = Number(url.searchParams.get("limit") ?? 120);
      try {
        const result = await skills.get("market.ccxt.ohlcv").execute({ symbol, timeframe, limit }, { env, repos, artifacts, approvals, memory, sessionId: "" });
        return sendJson(res, result.rows);
      } catch (err: any) {
        return sendJson(res, { rows: [], error: err.message, symbol, timeframe, limit }, 200);
      }
    }
    if (url.pathname === "/api/portfolio" && req.method === "GET") return sendJson(res, repos.portfolioSnapshot());
    if (url.pathname === "/api/trades" && req.method === "GET") {
      try {
        return sendJson(res, repos.list("trades"));
      } catch {
        // trades table has no created_at column, fall back to opened_at
        return sendJson(res, repos.db.prepare("SELECT * FROM trades ORDER BY opened_at DESC LIMIT 100").all());
      }
    }
    if (url.pathname === "/api/reviews" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      return sendJson(res, repos.listReviews(workspaceId));
    }
    if (url.pathname === "/api/evolution/summary" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      return sendJson(res, evolutionSummary(workspaceId));
    }
    if (url.pathname === "/api/evolution/suggestions" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      const status = url.searchParams.get("status") ?? undefined;
      return sendJson(res, repos.listEvolutionSuggestions({ workspaceId, status }));
    }
    if (url.pathname === "/api/evolution/suggest-rules" && req.method === "POST") {
      const body = await readBody(req);
      const workspaceId = body.workspaceId ?? body.input?.workspaceId;
      const reviews = repos.listReviews(workspaceId).slice(0, 5);
      const decisions = repos.listDecisions(workspaceId).slice(0, 20);
      const trades = repos.listPaperTrades({ workspaceId }).slice(0, 20);
      const journals = (repos.list("journal_entries") as Array<{ workspace_id?: string | null; workspaceId?: string | null }>).filter(
        (entry) => !workspaceId || entry.workspace_id === workspaceId || entry.workspaceId === workspaceId,
      ).slice(0, 20);
      const rules = (memory.query({ domain: "user_rules", limit: 50 }) as Array<{ workspace_id?: string | null }>).filter(
        (rule) => !workspaceId || !rule.workspace_id || rule.workspace_id === workspaceId,
      );
      const latest = reviews[0]?.report as any;
      let aiResult: any | undefined;
      let aiError: string | undefined;
      let parsedItems: Array<{ title: string; description: string; category: string; priority: string; ruleText: string }> = [];
      try {
        aiResult = await skills.get("ai.respond").execute(
          {
            prompt: buildEvolutionRulesPrompt({ workspaceId, reviews, decisions, trades, journals, rules }),
            systemPrompt:
              "You are Trading Pi Evolution Engine. Return only valid JSON. Suggest cautious discipline rules from observed local behavior. Do not give financial advice.",
          },
          { env, repos, artifacts, approvals, memory, sessionId: "api:evolution:suggest-rules" },
        );
        parsedItems = parseEvolutionRuleSuggestions(String(aiResult?.text ?? ""));
      } catch (error) {
        aiError = error instanceof Error ? error.message : String(error);
      }
      if (aiResult && parsedItems.length === 0) aiError = "AI response did not include parseable rule suggestions.";
      const items = parsedItems.length ? parsedItems : fallbackEvolutionRuleSuggestions(latest);
      const suggestions = items.map((item: any) =>
        repos.createEvolutionSuggestion({
          workspaceId,
          reviewId: reviews[0]?.id,
          title: item.title,
          description: item.description,
          category: item.category,
          priority: item.priority,
          ruleText: item.ruleText,
          source: {
            endpoint: "/api/evolution/suggest-rules",
            aiDriven: Boolean(aiResult && parsedItems.length),
            model: env.openaiModel,
            usage: aiResult?.usage,
            stopReason: aiResult?.stopReason,
            aiError,
            reviewCount: reviews.length,
            decisionCount: decisions.length,
            journalCount: journals.length,
            ruleCount: rules.length,
          },
        }),
      );
      return sendJson(res, { suggestions, ai: { driven: Boolean(aiResult && parsedItems.length), model: env.openaiModel, usage: aiResult?.usage, error: aiError } });
    }
    const adoptRuleMatch = url.pathname.match(/^\/api\/evolution\/rules\/([^/]+)\/adopt$/);
    if (adoptRuleMatch && req.method === "POST") {
      const body = await readBody(req);
      const suggestion = repos.getEvolutionSuggestion(adoptRuleMatch[1]!);
      if (!suggestion) return sendJson(res, { error: "Suggestion not found" }, 404);
      const ruleText = body.ruleText ?? suggestion.ruleText ?? suggestion.description;
      const workspaceId = body.workspaceId ?? suggestion.workspaceId;
      memory.write({
        domain: "user_rules",
        workspaceId,
        key: `rule:${suggestion.id}`,
        value: ruleText,
        sourceType: "manual",
        sourceId: suggestion.id,
        importance: 0.85,
        metadata: { adoptedFrom: "evolution", title: suggestion.title },
      });
      const updated = repos.updateEvolutionSuggestionStatus(suggestion.id, "adopted");
      return sendJson(res, { suggestion: updated, rule: { key: `rule:${suggestion.id}`, value: ruleText, workspaceId } });
    }
    const dismissRuleMatch = url.pathname.match(/^\/api\/evolution\/rules\/([^/]+)\/dismiss$/);
    if (dismissRuleMatch && req.method === "POST") {
      const suggestion = repos.getEvolutionSuggestion(dismissRuleMatch[1]!);
      if (!suggestion) return sendJson(res, { error: "Suggestion not found" }, 404);
      const updated = repos.updateEvolutionSuggestionStatus(suggestion.id, "dismissed");
      return sendJson(res, { suggestion: updated });
    }
    if (url.pathname === "/api/user-rules" && req.method === "GET") {
      const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
      const rules = (memory.query({ domain: "user_rules", limit: 100 }) as Array<{ workspace_id?: string | null }>).filter(
        (rule) => !workspaceId || !rule.workspace_id || rule.workspace_id === workspaceId,
      );
      return sendJson(res, rules);
    }
    if (url.pathname === "/api/user-rules" && req.method === "POST") {
      const body = await readBody(req);
      const key = body.key ?? `rule:${Date.now()}`;
      const value = body.value ?? body.text;
      if (!value) return sendJson(res, { error: "Missing rule text" }, 400);
      const result = memory.write({
        domain: "user_rules",
        workspaceId: body.workspaceId,
        key,
        value,
        sourceType: "manual",
        importance: body.importance ?? 0.75,
        metadata: body.metadata ?? {},
      });
      return sendJson(res, result);
    }
    if (url.pathname === "/api/strategies" && req.method === "GET") return sendJson(res, repos.list("strategies"));

    if (url.pathname === "/api/memory" && req.method === "GET") return sendJson(res, memory.listAll());
    if (url.pathname === "/api/memory/query" && req.method === "POST") {
      const body = await readBody(req);
      return sendJson(res, memory.query(body));
    }
    if (url.pathname === "/api/memory/write" && req.method === "POST") {
      const body = await readBody(req);
      return sendJson(res, memory.write(body));
    }
    const memoryMatch = url.pathname.match(/^\/api\/memory\/([^/]+)$/);
    if (memoryMatch && req.method === "DELETE") {
      const deleted = memory.delete(memoryMatch[1]!);
      if (!deleted) return sendJson(res, { error: "Memory record not found" }, 404);
      return sendJson(res, { success: true, deleted: memoryMatch[1] });
    }

    if (url.pathname.startsWith("/api/")) return sendJson(res, { error: "Not found" }, 404);
    return sendJson(res, { ok: true, message: "Trading Pi API" });
  } catch (err: any) {
    return sendJson(res, { error: err.message }, 500);
  }
});

const port = env.apiPort;
server.listen(port, () => console.log(`Trading Pi API listening on http://localhost:${port}`));

process.on("uncaughtException", (err) => console.error("Uncaught:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err));
