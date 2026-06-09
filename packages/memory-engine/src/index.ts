export type MemoryDomain = "conversation" | "market" | "trade" | "review" | "skill";

export interface MemoryRecord {
  domain: MemoryDomain;
  workspaceId?: string;
  key: string;
  value: string;
  importance?: number;
}

export function memoryScope(domain: MemoryDomain, workspaceId = "global") {
  return `${domain}:${workspaceId}`;
}
