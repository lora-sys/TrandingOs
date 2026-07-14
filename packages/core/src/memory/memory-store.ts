import type { Repositories } from "../db/repositories.js";
import type { MemoryDomain } from "../memory/types.js";

export class MemoryStore {
  constructor(private readonly repos: Repositories) {}

  upsert(scope: string, key: string, value: string) {
    this.repos.upsertMemory(scope, key, value);
  }

  list(scope = "user") {
    return this.repos.db
      .prepare("SELECT * FROM memory_records WHERE scope = ? ORDER BY importance DESC, updated_at DESC")
      .all(scope) as Array<{ scope: string; key: string; value: string }>;
  }

  listAll(limit = 500) {
    return this.repos.queryMemory({ limit });
  }

  write(input: {
    domain: MemoryDomain;
    key: string;
    value: string;
    workspaceId?: string;
    importance?: number;
    sourceType?: string;
    sourceId?: string;
    metadata?: unknown;
  }) {
    return this.repos.writeMemory(input);
  }

  query(input: { domain?: MemoryDomain; workspaceId?: string; q?: string; limit?: number }) {
    return this.repos.queryMemory(input);
  }

  delete(id: string) {
    return this.repos.deleteMemory(id);
  }

  domainContext(domain: MemoryDomain, workspaceId?: string) {
    const records = this.query({ domain, workspaceId, limit: 12 }) as Array<{ key: string; value: string; importance?: number }>;
    if (records.length === 0) return `No saved ${domain} memory yet.`;
    return records.map((record) => `- ${record.key}: ${record.value}`).join("\n");
  }

  workspaceContext(workspaceId?: string) {
    if (!workspaceId) return "No active workspace selected.";
    const records = this.query({ workspaceId, limit: 24 }) as Array<{ domain?: string; key: string; value: string }>;
    if (records.length === 0) return `No saved memory for workspace ${workspaceId} yet.`;
    return records.map((record) => `- [${record.domain ?? "memory"}] ${record.key}: ${record.value}`).join("\n");
  }

  contextBlock(scope = "user", limit = 50) {
    // Use query() to get all relevant records (any domain), not just records
    // whose scope column equals `scope`. The scope arg is kept for backward
    // compatibility but is informational only at the moment — future versions
    // can use it to filter by workspace/user-scope.
    const records = this.query({ limit }) as Array<{ key: string; value: string }>;
    if (records.length === 0) return "No saved local memory yet.";
    return records
      .slice(0, limit)
      .map((record) => `- ${record.key}: ${record.value}`)
      .join("\n");
  }
}
