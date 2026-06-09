export type MemoryDomain = "conversation" | "market" | "trade" | "review" | "skill" | "workspace" | "research" | "strategy";

export interface MemoryRecord {
  domain: MemoryDomain;
  workspaceId?: string;
  key: string;
  value: string;
  importance?: number;
  sourceType?: "session" | "artifact" | "trade" | "journal" | "review" | "skill" | "manual";
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export function memoryScope(domain: MemoryDomain, workspaceId = "global") {
  return `${domain}:${workspaceId}`;
}

export function memoryKey(input: Pick<MemoryRecord, "domain" | "workspaceId" | "key">) {
  return `${memoryScope(input.domain, input.workspaceId)}:${input.key}`;
}

export function formatMemoryRecord(record: MemoryRecord) {
  const source = record.sourceType ? ` source=${record.sourceType}${record.sourceId ? `:${record.sourceId}` : ""}` : "";
  const importance = typeof record.importance === "number" ? ` importance=${record.importance}` : "";
  return `[${record.domain}/${record.workspaceId ?? "global"}${source}${importance}] ${record.key}: ${record.value}`;
}
