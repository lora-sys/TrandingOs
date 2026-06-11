// Compatibility shim: forwards old api/types imports
export type ChatMessage = { id: string; role: string; kind: string; content: string; timestamp: string };
export type TimelineEvent = { id: string; type: string; title: string; status: string; sessionId: string; payload: unknown };
export type Artifact = { id: string; type: string; title: string; summary: string; path: string; previewReady: boolean; contentType: string; created_at: string };
export type Approval = { id: string; action: string; riskLevel: string; reason: string; status: string; sessionId: string; created_at: string };
export type WorkflowResult = { runId: string; status: string; output: unknown };
export type Portfolio = { positions: any[]; summary: any };
export type Row = Record<string, string | number | boolean | null | undefined | string[]>;
export type Status = { env: any; paths: any; skills: number; workflows: number; mcpServers: number; browserSessions: number; memoryDomains: any[] };
export type SessionMessages = { sessionId: string; messages: ChatMessage[] };
