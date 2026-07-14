import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson } from "./_helpers.js";
import type { RunStatus } from "./_types.js";

type ListTable =
  | "skills"
  | "workflows"
  | "timeline_events"
  | "artifacts"
  | "plans"
  | "approvals"
  | "sessions"
  | "memory_records"
  | "orders"
  | "trades"
  | "positions"
  | "journal_entries"
  | "reviews"
  | "audit_records"
  | "data_cache"
  | "mcp_servers"
  | "mcp_discoveries"
  | "mcp_permissions"
  | "browser_sessions"
  | "marketplace_items"
  | "workspaces"
  | "workspace_links"
  | "decisions"
  | "research_sessions"
  | "paper_trades"
  | "strategies"
  | "backtests"
  | "evolution_proposals"
  | "evolution_suggestions";

export class InfrastructureRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  list(table: ListTable) {
    const order = table === "skills" || table === "workflows" ? "id ASC" : table === "positions" ? "updated_at DESC" : "created_at DESC";
    return this.db.prepare(`SELECT * FROM ${table} ORDER BY ${order} LIMIT 100`).all();
  }

  upsertSkill(skill: { id: string; name: string; description: string; riskLevel: string; permission: string }) {
    this.db.prepare(`
      INSERT INTO skills (id, name, description, risk_level, permission)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
        risk_level=excluded.risk_level, permission=excluded.permission
    `).run(skill.id, skill.name, skill.description, skill.riskLevel, skill.permission);
  }

  upsertWorkflow(workflow: { id: string; name: string; description: string; riskLevel: string }) {
    this.db.prepare(`
      INSERT INTO workflows (id, name, description, risk_level)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
        risk_level=excluded.risk_level
    `).run(workflow.id, workflow.name, workflow.description, workflow.riskLevel);
  }

  createWorkflowRun(workflowId: string, input: unknown, sessionId?: string) {
    const runId = id("wfr");
    this.db.prepare(`
      INSERT INTO workflow_runs (id, workflow_id, session_id, input_json, status, started_at)
      VALUES (?, ?, ?, ?, 'running', ?)
    `).run(runId, workflowId, sessionId ?? null, JSON.stringify(input), nowIso());
    return runId;
  }

  finishWorkflowRun(runId: string, status: RunStatus, output?: unknown, error?: string) {
    this.db.prepare(`
      UPDATE workflow_runs SET status = ?, output_json = ?, error = ?, finished_at = ? WHERE id = ?
    `).run(status, JSON.stringify(output ?? null), error ?? null, nowIso(), runId);
  }

  createSkillRun(workflowRunId: string | undefined, skillId: string, input: unknown) {
    const runId = id("skr");
    this.db.prepare(`
      INSERT INTO skill_runs (id, workflow_run_id, skill_id, input_json, status, started_at)
      VALUES (?, ?, ?, ?, 'running', ?)
    `).run(runId, workflowRunId ?? null, skillId, JSON.stringify(input), nowIso());
    return runId;
  }

  finishSkillRun(runId: string, status: RunStatus, output?: unknown, error?: string) {
    this.db.prepare(`
      UPDATE skill_runs SET status = ?, output_json = ?, error = ?, finished_at = ? WHERE id = ?
    `).run(status, JSON.stringify(output ?? null), error ?? null, nowIso(), runId);
  }

  createPlan(plan: {
    id: string;
    sessionId: string;
    title: string;
    description?: string;
    status?: string;
    steps?: Array<{ id: string; title: string; status: string; content?: string }>;
    content?: string;
  }) {
    const planId = id("pln");
    const timestamp = nowIso();
    this.db.prepare(
      `INSERT INTO plans (id, session_id, title, description, status, steps, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      plan.id, plan.sessionId, plan.title, plan.description || "",
      plan.status || "draft",
      JSON.stringify(plan.steps || []),
      plan.content || "",
      timestamp, timestamp
    );
    return plan.id;
  }

  updatePlanStatus(id: string, status: string, result?: string) {
    this.db.prepare(
      `UPDATE plans SET status = ?, result = COALESCE(?, result), updated_at = ? WHERE id = ?`
    ).run(status, result ?? null, nowIso(), id);
  }

  listPlans(sessionId?: string) {
    if (sessionId) {
      return this.db.prepare(`SELECT * FROM plans WHERE session_id = ? ORDER BY created_at DESC`).all(sessionId);
    }
    return this.db.prepare(`SELECT * FROM plans ORDER BY created_at DESC LIMIT 50`).all();
  }

  getPlan(id: string) {
    return this.db.prepare(`SELECT * FROM plans WHERE id = ?`).get(id);
  }

  setCache(input: { namespace: string; key: string; value: unknown; source: string; ttlMs?: number }) {
    const createdAt = nowIso();
    const expiresAt = input.ttlMs ? new Date(Date.now() + input.ttlMs).toISOString() : null;
    this.db.prepare(`
      INSERT INTO data_cache (key, namespace, value_json, source, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, source=excluded.source, expires_at=excluded.expires_at, created_at=excluded.created_at
    `).run(input.key, input.namespace, JSON.stringify(input.value), input.source, expiresAt, createdAt);
  }

  getCache(key: string) {
    const row = this.db.prepare("SELECT * FROM data_cache WHERE key = ?").get(key) as
      | { value_json: string; expires_at: string | null; source: string }
      | undefined;
    if (!row) return undefined;
    if (row.expires_at && Date.parse(row.expires_at) < Date.now()) return undefined;
    return { value: JSON.parse(row.value_json), source: row.source };
  }

  upsertMcpServer(input: {
    id?: string;
    name: string;
    command?: string;
    url?: string;
    status?: string;
    permission?: string;
    health?: unknown;
    manifest?: unknown;
  }) {
    const timestamp = nowIso();
    const serverId = input.id ?? id("mcp");
    this.db.prepare(`
      INSERT INTO mcp_servers (id, name, command, url, status, permission, health_json, manifest_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, command=excluded.command, url=excluded.url, status=excluded.status,
        permission=excluded.permission, health_json=excluded.health_json, manifest_json=excluded.manifest_json, updated_at=excluded.updated_at
    `).run(
      serverId,
      input.name,
      input.command ?? null,
      input.url ?? null,
      input.status ?? "registered",
      input.permission ?? "read",
      JSON.stringify(input.health ?? {}),
      JSON.stringify(input.manifest ?? {}),
      timestamp,
      timestamp,
    );
    return serverId;
  }

  createMcpDiscovery(input: { query: string; provider: string; candidates: unknown }) {
    const discoveryId = id("mcpd");
    this.db.prepare(`
      INSERT INTO mcp_discoveries (id, query, provider, candidates_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(discoveryId, input.query, input.provider, JSON.stringify(input.candidates), nowIso());
    return discoveryId;
  }

  updateMcpServer(input: { id: string; status?: string; permission?: string; health?: unknown }) {
    const existing = this.db.prepare("SELECT * FROM mcp_servers WHERE id = ?").get(input.id) as
      | { status: string; permission: string; health_json: string }
      | undefined;
    if (!existing) throw new Error(`MCP server not found: ${input.id}`);
    this.db.prepare(`
      UPDATE mcp_servers SET status = ?, permission = ?, health_json = ?, updated_at = ? WHERE id = ?
    `).run(
      input.status ?? existing.status,
      input.permission ?? existing.permission,
      JSON.stringify(input.health ?? JSON.parse(existing.health_json)),
      nowIso(),
      input.id,
    );
  }

  upsertMcpPermission(input: { serverId: string; permission: string; status: string; approvalId?: string }) {
    const permissionId = id("mcpp");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO mcp_permissions (id, server_id, permission, status, approval_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(permissionId, input.serverId, input.permission, input.status, input.approvalId ?? null, timestamp, timestamp);
    return permissionId;
  }

  createBrowserSession(input: {
    id: string;
    provider: string;
    status: string;
    action: string;
    url?: string;
    payload: unknown;
    result: unknown;
    artifactId?: string;
  }) {
    this.db.prepare(`
      INSERT INTO browser_sessions (id, provider, status, action, url, payload_json, result_json, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.provider,
      input.status,
      input.action,
      input.url ?? null,
      JSON.stringify(input.payload),
      JSON.stringify(input.result),
      input.artifactId ?? null,
      nowIso(),
    );
    return input.id;
  }

  upsertMarketplaceItem(input: { id?: string; kind: string; name: string; description: string; status?: string; permission?: string; manifest?: unknown }) {
    const timestamp = nowIso();
    const itemId = input.id ?? id("market");
    this.db.prepare(`
      INSERT INTO marketplace_items (id, kind, name, description, status, permission, manifest_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind=excluded.kind, name=excluded.name, description=excluded.description, status=excluded.status,
        permission=excluded.permission, manifest_json=excluded.manifest_json, updated_at=excluded.updated_at
    `).run(
      itemId,
      input.kind,
      input.name,
      input.description,
      input.status ?? "available",
      input.permission ?? "read",
      JSON.stringify(input.manifest ?? {}),
      timestamp,
      timestamp,
    );
    return itemId;
  }
}