// API client using fetch — not serverFn imports (server-only)
const BASE = `http://localhost:${(import.meta as any).env.TRADING_PI_API_PORT ?? 8787}`;

async function rpc(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export const tradingPiApi = {
  health: () => rpc("/api/health"),
  status: () => rpc("/api/status"),
  aiPing: () => rpc("/api/ai/ping"),
  sendMessage: (message: string, sessionId?: string) => rpc("/api/session/message", { message, sessionId }),
  /** SSE streaming: returns an EventTarget that emits agent events + 'done' */
  sendMessageStream: (message: string, sessionId?: string) => {
    const target = new EventTarget();
    const body = JSON.stringify({ message, sessionId });
    fetch(`${BASE}/api/session/message/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).then(async (res) => {
      if (!res.ok) {
        target.dispatchEvent(new CustomEvent("error", { detail: new Error(`SSE ${res.status}`) }));
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
        // Parse SSE frames: event: xxx\ndata: {...}\n\n
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
    }).catch((err) => target.dispatchEvent(new CustomEvent("error", { detail: err })));
    return target;
  },
  sessions: () => rpc("/api/sessions"),
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
};