// API client using fetch — not serverFn imports (server-only)
const BASE = `http://localhost:${(import.meta as any).env.TRADING_PI_API_PORT ?? 8787}`;

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

async function rpc(path: string, body?: unknown, method: "GET" | "POST" | "DELETE" = body ? "POST" : "GET") {
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

export const tradingPiApi = {
  health: () => rpc("/api/health"),
  status: () => rpc("/api/status"),
  aiPing: () => rpc("/api/ai/ping"),
  /** Runtime config (thinking level, model, auto-compaction) */
  config: () => rpc("/api/config"),
  setConfig: (body: { thinkingLevel?: string; modelId?: string; autoCompaction?: boolean }) =>
    rpc("/api/config", body),
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
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const lines = frame.split("\n");
          let eventType = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) dataStr = line.slice(6);
          }
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === "done") {
              target.dispatchEvent(new CustomEvent("done", { detail: parsed }));
            } else {
              target.dispatchEvent(new CustomEvent(eventType, { detail: parsed }));
            }
          } catch { /* skip malformed */ }
        }
      }
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
  deleteSession: (sessionId: string) => rpc(`/api/sessions/${sessionId}`, undefined, "DELETE"),
  messages: (sessionId: string) => rpc(`/api/messages?sessionId=${sessionId}`),
  skills: () => rpc("/api/skills"),
  workflows: () => rpc("/api/workflows"),
  timeline: () => rpc("/api/timeline"),
  audit: () => rpc("/api/audit"),
  cache: () => rpc("/api/cache"),
  artifacts: () => rpc("/api/artifacts"),
  artifact: (id: string) => rpc(`/api/artifacts/${id}`),
  artifactPreview: (id: string) => rpc(`/api/artifacts/${id}/preview`),
  approvals: () => rpc("/api/approvals"),
  marketplace: () => rpc("/api/marketplace"),
  seedMarketplace: (sessionId: string) => rpc("/api/marketplace/seed", { sessionId }),
  searchQuery: (input: any) => rpc("/api/search/query", input),
  runResearch: (input: any) => rpc("/api/workflows/research.asset/run", input),
  runMarketSnapshot: (input: any) => rpc("/api/workflows/market.snapshot/run", input),
  runWorkflow: (workflowId: string, input: any, sessionId?: string) => rpc(`/api/workflows/${workflowId}/run`, { input, sessionId }),
  runReviewDaily: (period: string = "daily") => rpc("/api/workflows/review.daily/run", { input: { period } }),
  createPaperOrder: (input: any, sessionId?: string) => rpc("/api/paper/orders", { input, sessionId }),
  portfolio: () => rpc("/api/portfolio"),
  trades: () => rpc("/api/trades"),
  strategies: () => rpc("/api/strategies"),
  backtests: () => rpc("/api/backtests"),
  evolution: () => rpc("/api/evolution/proposals"),
  evolutionProposals: () => rpc("/api/evolution/proposals"),
  journal: () => rpc("/api/journal"),
  createJournal: (input: any, sessionId?: string) => rpc("/api/journal", { input, sessionId }),
  reviews: () => rpc("/api/reviews"),
  workspaces: () => rpc("/api/workspaces"),
  workspaceMemory: (id: string) => rpc(`/api/workspaces/${id}/memory`),
  workspaceArtifacts: (id: string) => rpc(`/api/workspaces/${id}/artifacts`),
  createWorkspace: (input: any, sessionId?: string) => rpc("/api/workspaces", { ...input, sessionId }),
  mcpServers: () => rpc("/api/mcp/servers"),
  discoverMcp: (query: string, sessionId?: string) => rpc("/api/mcp/discover", { query, sessionId }),
  registerMcp: (input: any, sessionId?: string) => rpc("/api/mcp/servers", { ...input, sessionId }),
  checkMcp: (id: string, sessionId?: string) => rpc(`/api/mcp/servers/${id}/health`, { sessionId }),
  getMarketplace: () => rpc("/api/marketplace"),
  browserHealth: () => rpc("/api/browser/health"),
  memory: () => rpc("/api/memory"),
  queryMemory: (input: any) => rpc("/api/memory/query", input),
  writeMemory: (input: any) => rpc("/api/memory/write", input),
  ohlcv: (symbol: string, timeframe: string, limit: number) =>
    rpc(`/api/market/ohlcv?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`),
};