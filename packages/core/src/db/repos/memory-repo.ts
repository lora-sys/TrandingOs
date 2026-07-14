import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";
import type { AuditRepo } from "./audit-repo.js";

export class MemoryRepo {
  constructor(
    private readonly database: TradingPiDatabase,
    private readonly audit: AuditRepo,
  ) {}

  get db() {
    return this.database.db;
  }

  upsertMemory(scope: string, key: string, value: string) {
    const memoryId = id("mem");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO memory_records (id, scope, key, value, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    `).run(memoryId, scope, key, value, timestamp, timestamp);
  }

  writeMemory(input: {
    domain: string;
    key: string;
    value: string;
    workspaceId?: string;
    importance?: number;
    sourceType?: string;
    sourceId?: string;
    metadata?: unknown;
  }) {
    const scope = `${input.domain}:${input.workspaceId ?? "global"}`;
    const memoryId = id("mem");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO memory_records
      (id, scope, key, value, domain, workspace_id, source_type, source_id, importance, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope, key) DO UPDATE SET
        value=excluded.value,
        domain=excluded.domain,
        workspace_id=excluded.workspace_id,
        source_type=excluded.source_type,
        source_id=excluded.source_id,
        importance=excluded.importance,
        metadata_json=excluded.metadata_json,
        updated_at=excluded.updated_at
    `).run(
      memoryId,
      scope,
      input.key,
      input.value,
      input.domain,
      input.workspaceId ?? null,
      input.sourceType ?? null,
      input.sourceId ?? null,
      input.importance ?? 0.5,
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp,
    );
    this.audit.createAuditRecord({ category: "memory", action: "memory.write", status: "completed", payload: { scope, key: input.key } });
    return { scope, key: input.key };
  }

  queryMemory(input: { domain?: string; workspaceId?: string; q?: string; limit?: number }) {
    const clauses: string[] = [];
    const params: Array<string | number | null> = [];
    if (input.domain) {
      clauses.push("domain = ?");
      params.push(input.domain);
    }
    if (input.workspaceId) {
      clauses.push("workspace_id = ?");
      params.push(input.workspaceId);
    }
    if (input.q) {
      clauses.push("(key LIKE ? OR value LIKE ?)");
      params.push(`%${input.q}%`, `%${input.q}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(input.limit ?? 50);
    return this.db.prepare(`SELECT * FROM memory_records ${where} ORDER BY importance DESC, updated_at DESC LIMIT ?`).all(...params);
  }

  deleteMemory(memoryId: string) {
    const result = this.db.prepare("DELETE FROM memory_records WHERE id = ?").run(memoryId);
    if (result.changes > 0) {
      this.audit.createAuditRecord({ category: "memory", action: "memory.delete", status: "completed", payload: { memoryId } });
      return true;
    }
    return false;
  }
}