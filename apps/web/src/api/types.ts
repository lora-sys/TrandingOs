export type Status = {
  env: {
    openai: { configured: boolean; model: string; baseUrl: string | null };
    integrations?: Record<string, boolean>;
    local: { dataDir: string; defaultExchange: string; exchangeFallbacks?: string[]; tradingMode?: string };
  };
  paths: Record<string, string>;
  langfuseConfigured: boolean;
  skills: number;
  workflows: number;
  mcpServers?: number;
  memoryDomains?: Row[];
  browserSessions?: number;
};

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  status: "pending" | "running" | "completed" | "failed" | "blocked" | "info";
  payload_json?: string | null;
  created_at: string;
};

export type Artifact = {
  id: string;
  type: string;
  title: string;
  summary: string;
  path: string;
  created_at: string;
  markdown?: string;
  content?: string;
  contentType?: string;
  previewReady?: boolean;
  previewPayload?: unknown;
};

export type Approval = {
  id: string;
  action: string;
  risk_level: string;
  status: string;
  reason: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind: string;
  content: string;
  timestamp: string;
  raw: unknown;
};

export type SessionMessages = {
  sessionId: string;
  messages: ChatMessage[];
};

export type WorkflowResult = {
  sessionId: string;
  runId: string;
  output: unknown;
};

export type Portfolio = {
  positions: Row[];
  orders: Row[];
  trades: Row[];
};

export type Row = Record<string, string | number | boolean | null | undefined | string[]>;
