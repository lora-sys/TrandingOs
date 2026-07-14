import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson, type WorkspaceRow } from "./_helpers.js";
import type { WorkspaceRecord } from "./_types.js";
import type { MemoryRepo } from "./memory-repo.js";

export class WorkspaceRepo {
  constructor(
    private readonly database: TradingPiDatabase,
    private readonly memory: MemoryRepo,
  ) {}

  get db() {
    return this.database.db;
  }

  upsertWorkspace(input: {
    id?: string;
    name: string;
    kind?: string;
    description?: string;
    topicType?: string;
    topicRef?: string;
    creatorSessionId?: string;
    isDefault?: boolean;
    context?: unknown;
  }) {
    const timestamp = nowIso();
    const workspaceId = input.id ?? id("wrk");
    this.db.prepare(`
      INSERT INTO workspaces
      (id, name, description, kind, topic_type, topic_ref, creator_session_id, is_default, context_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        description=excluded.description,
        kind=excluded.kind,
        topic_type=excluded.topic_type,
        topic_ref=excluded.topic_ref,
        creator_session_id=excluded.creator_session_id,
        is_default=excluded.is_default,
        context_json=excluded.context_json,
        updated_at=excluded.updated_at
    `).run(
      workspaceId,
      input.name,
      input.description ?? null,
      input.kind ?? input.topicType ?? "custom",
      input.topicType ?? input.kind ?? "custom",
      input.topicRef ?? null,
      input.creatorSessionId ?? null,
      input.isDefault ? 1 : 0,
      JSON.stringify(input.context ?? {}),
      timestamp,
      timestamp,
    );
    return workspaceId;
  }

  createWorkspace(input: {
    id?: string;
    name: string;
    description?: string;
    topicType?: string;
    topicRef?: string;
    creatorSessionId?: string;
    isDefault?: boolean;
    context?: unknown;
  }) {
    const workspaceId = this.upsertWorkspace({
      ...input,
      kind: input.topicType ?? "custom",
    });
    return this.getWorkspace(workspaceId)!;
  }

  listWorkspaces(sessionId?: string) {
    const rows = sessionId
      ? this.db.prepare("SELECT * FROM workspaces WHERE creator_session_id = ? OR is_default = 1 ORDER BY updated_at DESC LIMIT 100").all(sessionId)
      : this.db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapWorkspace(row as unknown as WorkspaceRow));
  }

  getWorkspace(workspaceId: string) {
    const row = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId) as WorkspaceRow | undefined;
    return row ? this.mapWorkspace(row) : undefined;
  }

  updateWorkspace(
    workspaceId: string,
    input: Partial<{
      name: string;
      description: string;
      topicType: string;
      topicRef: string;
      creatorSessionId: string;
      isDefault: boolean;
      context: unknown;
    }>,
  ) {
    const existing = this.getWorkspace(workspaceId);
    if (!existing) return undefined;
    this.upsertWorkspace({
      id: workspaceId,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      kind: input.topicType ?? existing.kind,
      topicType: input.topicType ?? existing.topicType,
      topicRef: input.topicRef ?? existing.topicRef,
      creatorSessionId: input.creatorSessionId ?? existing.creatorSessionId,
      isDefault: input.isDefault ?? existing.isDefault,
      context: input.context ?? existing.context,
    });
    return this.getWorkspace(workspaceId);
  }

  deleteWorkspace(workspaceId: string) {
    const result = this.db.prepare("DELETE FROM workspaces WHERE id = ? AND is_default = 0").run(workspaceId);
    return result.changes > 0;
  }

  linkWorkspace(input: { workspaceId: string; kind: string; refId: string; metadata?: unknown }) {
    const linkId = id("wlk");
    this.db.prepare(`
      INSERT INTO workspace_links (id, workspace_id, kind, ref_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(linkId, input.workspaceId, input.kind, input.refId, JSON.stringify(input.metadata ?? {}), nowIso());
    return linkId;
  }

  workspaceContext(workspaceId: string) {
    const workspace = this.getWorkspace(workspaceId);
    const memory = this.memory.queryMemory({ workspaceId, limit: 50 });
    const links = this.db.prepare("SELECT * FROM workspace_links WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").all(workspaceId);
    return { workspace, memory, links };
  }

  ensureDefaultWorkspace(sessionId?: string) {
    const existing = this.db.prepare("SELECT * FROM workspaces WHERE is_default = 1 ORDER BY created_at ASC LIMIT 1").get() as WorkspaceRow | undefined;
    if (existing) return this.mapWorkspace(existing);
    return this.createWorkspace({
      id: "workspace_general",
      name: "General",
      description: "Default workspace for uncategorized research.",
      topicType: "general",
      creatorSessionId: sessionId,
      isDefault: true,
      context: { purpose: "general research" },
    });
  }

  private mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      kind: row.kind,
      topicType: row.topic_type ?? undefined,
      topicRef: row.topic_ref ?? undefined,
      creatorSessionId: row.creator_session_id ?? undefined,
      isDefault: Boolean(row.is_default),
      context: parseJson(row.context_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}