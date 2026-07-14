// API client using fetch — not serverFn imports (server-only)
const API_PORT = (import.meta as any).env.VITE_TRADING_PI_API_PORT ?? (import.meta as any).env.TRADING_PI_API_PORT ?? 8787;
const BASE = `http://localhost:${API_PORT}`;

// Connection health tracking
let _isOnline = false;
let _healthCheckTimer: ReturnType<typeof setInterval> | null = null;
const _listeners = new Set<(online: boolean) => void>();

export function isApiOnline(): boolean { return _isOnline; }
export function onApiStatusChange(fn: (online: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    _isOnline = res.ok;
  } catch {
    _isOnline = false;
  }
  _listeners.forEach(fn => fn(_isOnline));
}

// Start health check loop
if (typeof window !== 'undefined') {
  checkHealth();
  _healthCheckTimer = setInterval(checkHealth, 10000);
}

async function rpc(path: string, body?: unknown, method: "GET" | "POST" | "PATCH" | "DELETE" = body ? "POST" : "GET") {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      ...(body && method !== "DELETE" ? {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      } : {}),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  } catch (err) {
    _isOnline = false;
    _listeners.forEach(fn => fn(false));
    throw err;
  }
}

// ══════════════════════════════════════════════════
// Shared SSE stream parser — used by sendMessageStream
// and startDeepResearchStream (was duplicated before)
// ══════════════════════════════════════════════════
async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  target: EventTarget,
  options?: {
    eventPrefix?: string;       // e.g. "research:" for deep research events
    errorEventName?: string;   // default: "error"
    doneEventName?: string;     // default: "done"
  },
): Promise<void> {
  const { eventPrefix = "", errorEventName = "error", doneEventName = "done" } = options ?? {};
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatchFrame = (frame: string) => {
    const lines = frame.split("\n");
    let eventType = "";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    const dataStr = dataLines.join("\n");
    if (!dataStr) return;
    try {
      const parsed = JSON.parse(dataStr);
      const resolvedType = eventPrefix ? `${eventPrefix}${eventType}` : eventType;
      if (eventType === "done") {
        target.dispatchEvent(new CustomEvent(doneEventName, { detail: parsed }));
      } else if (eventType === "error") {
        target.dispatchEvent(new CustomEvent(errorEventName, { detail: parsed }));
      } else {
        target.dispatchEvent(new CustomEvent(resolvedType, { detail: parsed }));
      }
    } catch { /* skip malformed */ }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      dispatchFrame(frame);
    }
  }
  if (buffer.trim()) dispatchFrame(buffer);
}

export const tradingPiApi = {
  health: () => rpc("/api/health"),
  status: () => rpc("/api/status"),
  aiPing: () => rpc("/api/ai/ping"),
  /** Agent readiness — checks API key + provider config. Safe to poll. */
  agentHealth: () => rpc("/api/agent/health") as Promise<{
    ok: boolean;
    ready: boolean;
    checks: Record<string, unknown>;
    message: string;
  }>,
  /** Runtime config (thinking level, model, auto-compaction) */
  config: () => rpc("/api/config"),
  setConfig: (body: {
    thinkingLevel?: string;
    modelId?: string;
    autoCompaction?: boolean;
    showThinking?: boolean;
    deepResearch?: { enabled?: boolean; mode?: "builtin" | "openrouter"; maxSteps?: number };
    apiKeys?: Record<string, string>;
    reasoning?: boolean;
  }) =>
    rpc("/api/config", body),
  /** Available model list + currently-selected model id */
  configModels: () => rpc("/api/config/models") as Promise<{
    models: Array<{
      id: string;
      name: string;
      reasoning?: boolean;
      contextWindow: number;
      provider: string;
    }>;
    current: string;
  }>,
  sendMessage: (message: string, sessionId?: string) => rpc("/api/session/message", { message, sessionId }),
  /** SSE streaming: returns an EventTarget that emits agent events + 'done' */
  sendMessageStream: (message: string, sessionId?: string, files?: File[]) => {
    const target = new EventTarget();
    const controller = new AbortController();

    (target as any)._controller = controller;

    let body: string | FormData;
    let headers: Record<string, string> = {};

    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append("message", message);
      if (sessionId) formData.append("sessionId", sessionId);
      files.forEach((file) => formData.append("files", file));
      body = formData;
    } else {
      body = JSON.stringify({ message, sessionId });
      headers["Content-Type"] = "application/json";
    }

    fetch(`${BASE}/api/session/message/stream`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) {
        target.dispatchEvent(new CustomEvent("error", { detail: { message: `Connection failed (${res.status})` } }));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { target.dispatchEvent(new CustomEvent("error", { detail: new Error("No body") })); return; }

      await parseSSEStream(reader, target);
    }).catch((err) => {
      if (err.name === "AbortError") {
        target.dispatchEvent(new CustomEvent("done", { detail: { aborted: true } }));
      } else {
        target.dispatchEvent(new CustomEvent("error", { detail: { message: err.message || "Connection failed" } }));
      }
    });

    (target as any).abort = () => controller.abort();

    return target;
  },
  sessions: () => rpc("/api/sessions"),
  exportSession: (sessionId: string) => rpc(`/api/sessions/${encodeURIComponent(sessionId)}/export`) as Promise<{
    session: { id: string; name?: string; createdAt?: string };
    entries: Array<{ type: string; data?: unknown }>;
    exportedAt: string;
    version?: string;
  }>,
  deleteSession: (sessionId: string) => rpc(`/api/sessions/${sessionId}`, undefined, "DELETE"),
  messages: (sessionId: string) => rpc(`/api/messages?sessionId=${sessionId}`),
  skills: () => rpc("/api/skills"),
  workflows: () => rpc("/api/workflows"),
  alphaRadar: (category?: string) => rpc(`/api/alpha/radar${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  reminders: () => rpc("/api/events/reminders"),
  markets: (input: { source?: string; q?: string; category?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (input.source) params.set("source", input.source);
    if (input.q) params.set("q", input.q);
    if (input.category) params.set("category", input.category);
    if (input.limit) params.set("limit", String(input.limit));
    return rpc(`/api/markets${params.size ? `?${params.toString()}` : ""}`);
  },
  decisions: (workspaceId?: string) => rpc(`/api/decisions${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  analyzeDecision: (input: any) => rpc("/api/decisions/analyze", input),
  createDecision: (input: any) => rpc("/api/decisions", input),
  paperTrades: (workspaceId?: string) => rpc(`/api/paper-trades${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  createPaperTrade: (input: any) => rpc("/api/paper-trades", input),
  closePaperTrade: (id: string, input: any) => rpc(`/api/paper-trades/${id}/close`, input, "PATCH" as any),
  researchSessions: (workspaceId?: string) => rpc(`/api/research/sessions${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  researchSession: (id: string) => rpc(`/api/research/sessions/${encodeURIComponent(id)}`),
  startDeepResearchStream: (input: { topic: string; workspaceId: string; maxIterations?: number }) => {
    const target = new EventTarget();
    fetch(`${BASE}/api/research/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(async (res) => {
      if (!res.ok) {
        target.dispatchEvent(new CustomEvent("research:error", { detail: { message: `Research failed (${res.status})` } }));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;

      await parseSSEStream(reader, target, {
        eventPrefix: "research:",
        errorEventName: "research:error",
      });
    }).catch((error) => target.dispatchEvent(new CustomEvent("research:error", { detail: { message: error.message } })));
    return target;
  },
  evolutionSummary: (workspaceId?: string) => rpc(`/api/evolution/summary${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  evolutionSuggestions: (workspaceId?: string) => rpc(`/api/evolution/suggestions${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  suggestRules: (workspaceId?: string) => rpc("/api/evolution/suggest-rules", { workspaceId }),
  adoptRule: (id: string, workspaceId?: string) => rpc(`/api/evolution/rules/${id}/adopt`, { workspaceId }),
  dismissRule: (id: string, workspaceId?: string) => rpc(`/api/evolution/rules/${id}/dismiss`, { workspaceId }),
  applyEvolutionSuggestion: (id: string, body: { finalRuleText?: string; approvedByUser?: boolean } = {}) =>
    rpc(`/api/evolution/suggestions/${encodeURIComponent(id)}/apply`, body),
  rejectEvolutionSuggestion: (id: string) =>
    rpc(`/api/evolution/suggestions/${encodeURIComponent(id)}/reject`, {}),
  applyEvolutionSuggestion: (id: string, input: { approvedByUser: boolean; finalRuleText?: string; sessionId?: string } = { approvedByUser: true }) =>
    rpc(`/api/evolution/suggestions/${encodeURIComponent(id)}/apply`, input),
  userRules: (workspaceId?: string) => rpc(`/api/user-rules${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  createUserRule: (input: { key?: string; value: string; workspaceId?: string }) => rpc("/api/user-rules", input),
  subAgents: () => rpc("/api/sub-agents"),
  spawnSubAgent: (input: { agent_type: string; prompt?: string; background?: boolean; workspace_id?: string; decision_id?: string }) => rpc("/api/sub-agents", input),
  subAgent: (id: string) => rpc(`/api/sub-agents/${encodeURIComponent(id)}`),
  stopSubAgent: (id: string, reason?: string) => rpc(`/api/sub-agents/${encodeURIComponent(id)}/stop`, { reason }),
  timeline: () => rpc("/api/timeline"),
  audit: () => rpc("/api/audit"),
  cache: () => rpc("/api/cache"),
  agentMetrics: () => rpc("/api/metrics/agent") as Promise<{
    ok: boolean;
    version?: string;
    generatedAt: string;
    sessions: { total: number; createdToday: number };
    prompts: { total: number; today: number };
    approvals: { pending: number; approved: number; denied: number };
    subAgents: { active: number };
  }>,
  agentPrompts: (limit = 20) => rpc(`/api/agent/prompts?limit=${limit}`) as Promise<{
    prompts: Array<{ id: string; sessionId: string; role: string; text: string; createdAt: number }>;
    count: number;
    limit: number;
  }>,
  rateLimits: () => rpc("/api/util/rate-limits") as Promise<{
    sources: string[];
    buckets: Record<string, { tokens: number; capacity: number; ratePerMinute: number } | null>;
  }>,
  artifacts: () => rpc("/api/artifacts"),
  artifact: (id: string) => rpc(`/api/artifacts/${id}`),
  artifactPreview: (id: string) => rpc(`/api/artifacts/${id}/preview`),
  approvals: () => rpc("/api/approvals"),
  respondApproval: (approvalId: string, body: { approved: boolean; reason?: string }) =>
    rpc(`/api/agent/approvals/${encodeURIComponent(approvalId)}/respond`, body),
  marketplace: () => rpc("/api/marketplace"),
  seedMarketplace: (sessionId: string) => rpc("/api/marketplace/seed", { sessionId }),
  searchQuery: (input: any) => rpc("/api/search/query", input),
  runResearch: (input: any) => rpc("/api/workflows/research.asset/run", input),
  runMarketSnapshot: (input: any) => rpc("/api/workflows/market.snapshot.run", input),
  runWorkflow: (workflowId: string, input: any, sessionId?: string) => rpc(`/api/workflows/${workflowId}/run`, { input, sessionId }),
  runReviewDaily: (period: string = "daily") => rpc("/api/workflows/review.daily/run", { input: { period } }),
  createPaperOrder: (input: any, sessionId?: string) => rpc("/api/paper/orders", { input, sessionId }),
  portfolio: () => rpc("/api/portfolio"),
  trades: () => rpc("/api/trades"),
  strategies: () => rpc("/api/strategies"),
  backtests: () => rpc("/api/backtests"),
  evolution: () => rpc("/api/evolution/suggestions"),
  evolutionProposals: () => rpc("/api/evolution/suggestions"),
  journal: () => rpc("/api/journal"),
  createJournal: (input: any, sessionId?: string) => rpc("/api/journal", { input, sessionId }),
  reviews: (workspaceId?: string) => rpc(`/api/reviews${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`),
  workspaces: () => rpc("/api/workspaces"),
  workspace: (id: string) => rpc(`/api/workspaces/${id}`),
  workspaceMemory: (id: string) => rpc(`/api/workspaces/${id}/memory`),
  workspaceArtifacts: (id: string) => rpc(`/api/workspaces/${id}/artifacts`),
  createWorkspace: (input: any, sessionId?: string) => rpc("/api/workspaces", { ...input, sessionId }),
  updateWorkspace: (id: string, input: any) => rpc(`/api/workspaces/${encodeURIComponent(id)}`, input, "PATCH"),
  deleteWorkspace: (id: string) => rpc(`/api/workspaces/${encodeURIComponent(id)}`, undefined, "DELETE"),
  mcpServers: () => rpc("/api/mcp/servers"),
  discoverMcp: (query: string, sessionId?: string) => rpc("/api/mcp/discover", { query, sessionId }),
  registerMcp: (input: any, sessionId?: string) => rpc("/api/mcp/servers", { ...input, sessionId }),
  checkMcp: (id: string, sessionId?: string) => rpc(`/api/mcp/servers/${id}/health`, { sessionId }),
  getMarketplace: () => rpc("/api/marketplace"),
  browserHealth: () => rpc("/api/browser/health"),
  memory: () => rpc("/api/memory"),
  queryMemory: (input: any) => rpc("/api/memory/query", input),
  writeMemory: (input: any) => rpc("/api/memory/write", input),
  deleteMemory: (id: string) => rpc(`/api/memory/${encodeURIComponent(id)}`, undefined, "DELETE"),
  searchMemory: (q: string, limit = 25) => rpc(`/api/memory/query`, { q, limit }),
  ohlcv: (symbol: string, timeframe: string, limit: number) =>
    rpc(`/api/market/ohlcv?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`),
};
