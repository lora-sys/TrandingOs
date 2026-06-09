import type { Repositories } from "../db/repositories.js";

export class MemoryStore {
  constructor(private readonly repos: Repositories) {}

  upsert(scope: string, key: string, value: string) {
    this.repos.upsertMemory(scope, key, value);
  }

  list(scope = "user") {
    return this.repos.db
      .prepare("SELECT id, scope, key, value, created_at, updated_at FROM memory_records WHERE scope = ? ORDER BY updated_at DESC")
      .all(scope) as Array<{ scope: string; key: string; value: string }>;
  }

  contextBlock(scope = "user") {
    const records = this.list(scope);
    if (records.length === 0) return "No saved local memory yet.";
    return records.map((record) => `- ${record.key}: ${record.value}`).join("\n");
  }
}

