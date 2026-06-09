import type { Artifact, ChatMessage, Portfolio, Row, SessionMessages, Status, TimelineEvent, Approval, WorkflowResult } from "./types.js";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? response.statusText);
  return json as T;
}

export const tradingPiApi = {
  status: () => api<Status>("/api/status"),
  timeline: () => api<TimelineEvent[]>("/api/timeline"),
  artifacts: () => api<Artifact[]>("/api/artifacts"),
  artifact: (id: string) => api<Artifact>(`/api/artifacts/${encodeURIComponent(id)}`),
  artifactPreview: (id: string) => api<{ output: Artifact }>(`/api/artifacts/${encodeURIComponent(id)}/preview`),
  approvals: () => api<Approval[]>("/api/approvals"),
  skills: () => api<Row[]>("/api/skills"),
  workflows: () => api<Row[]>("/api/workflows"),
  messages: (sessionId?: string) =>
    api<SessionMessages>(sessionId ? `/api/messages?sessionId=${encodeURIComponent(sessionId)}` : "/api/messages"),
  sendMessage: (message: string, sessionId?: string) =>
    api<{ sessionId: string; text: string; messages: ChatMessage[]; workflowResult?: WorkflowResult }>("/api/session/message", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  runWorkflow: (workflowId: string, input: unknown, sessionId?: string) =>
    api<WorkflowResult>(`/api/workflows/${encodeURIComponent(workflowId)}/run`, {
      method: "POST",
      body: JSON.stringify({ input, sessionId }),
    }),
  createPaperOrder: (input: unknown, sessionId?: string) =>
    api<{ sessionId: string; output: unknown }>("/api/paper/orders", {
      method: "POST",
      body: JSON.stringify({ input, sessionId }),
    }),
  portfolio: () => api<Portfolio>("/api/portfolio"),
  trades: () => api<Row[]>("/api/trades"),
  journal: () => api<Row[]>("/api/journal"),
  createJournal: (input: unknown, sessionId?: string) =>
    api<{ sessionId: string; output: unknown }>("/api/journal", {
      method: "POST",
      body: JSON.stringify({ input, sessionId }),
    }),
  reviews: () => api<Row[]>("/api/reviews"),
  workspaces: () => api<Row[]>("/api/workspaces"),
  createWorkspace: (input: unknown, sessionId?: string) =>
    api<{ sessionId: string; output: unknown }>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ input, sessionId }),
    }),
  marketplace: () => api<Row[]>("/api/marketplace"),
  seedMarketplace: (sessionId?: string) =>
    api<{ sessionId: string; output: unknown }>("/api/marketplace/seed", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),
  mcpServers: () => api<Row[]>("/api/mcp/servers"),
  browserHealth: () => api<Row>("/api/browser/health"),
  strategies: () => api<Row[]>("/api/strategies"),
  backtests: () => api<Row[]>("/api/backtests"),
};
