import { randomUUID } from "node:crypto";
import type { TradingPiDatabase } from "./database.js";

export type RunStatus = "pending" | "running" | "completed" | "failed" | "blocked";
export type DecisionDirection = "YES" | "NO" | "LONG" | "SHORT" | "HOLD";
export type DecisionConfidence = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
export type DecisionRiskLevel = "A" | "B" | "C" | "D";
export type DecisionStatus = "pending" | "executed" | "settled_win" | "settled_loss" | "invalidated" | "expired";
export type ResearchSessionStatus = "running" | "completed" | "failed" | "cancelled";
export type PaperTradeStatus = "open" | "closed" | "cancelled";

export interface DecisionRecord {
  id: string;
  workspaceId?: string;
  topic: string;
  direction: DecisionDirection;
  positionSize: number;
  confidence: DecisionConfidence;
  riskLevel: DecisionRiskLevel;
  supportingReasons: string[];
  againstReasons: string[];
  thesis: string;
  invalidationCriteria: string;
  ruleCompliance?: unknown;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  settledAt?: string;
  resultPnL?: number;
  reviewId?: string;
}

export interface ReviewRecord {
  id: string;
  sessionId?: string;
  workspaceId?: string;
  period: string;
  metrics: unknown;
  disciplineScore: number;
  summary: string;
  report: unknown;
  artifactId?: string;
  createdAt: string;
}

export interface EvolutionSuggestionRecord {
  id: string;
  workspaceId?: string;
  reviewId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  ruleText?: string;
  source: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  kind: string;
  topicType?: string;
  topicRef?: string;
  creatorSessionId?: string;
  isDefault: boolean;
  context: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSessionRecord {
  id: string;
  workspaceId?: string;
  topic: string;
  mode: "builtin";
  status: ResearchSessionStatus;
  totalIterations: number;
  completedIterations: number;
  reportArtifactId?: string;
  tokenUsage: unknown;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PaperTradeRecord {
  id: string;
  decisionId: string;
  workspaceId: string;
  direction: string;
  asset: string;
  entryPrice: number;
  exitPrice?: number;
  positionSize: number;
  pnl?: number;
  pnlPercent?: number;
  entryTime: string;
  exitTime?: string;
  status: PaperTradeStatus;
  settlementReason?: string;
  journalEntryId?: string;
}

interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  topic_type: string | null;
  topic_ref: string | null;
  creator_session_id: string | null;
  is_default: number;
  context_json: string;
  created_at: string;
  updated_at: string;
}

interface DecisionRow {
  id: string;
  workspace_id: string | null;
  topic: string;
  direction: DecisionDirection;
  position_size: number;
  confidence: DecisionConfidence;
  risk_level: DecisionRiskLevel;
  supporting_reasons_json: string;
  against_reasons_json: string;
  thesis: string;
  invalidation_criteria: string;
  rule_compliance_json: string;
  status: DecisionStatus;
  executed_at: string | null;
  settled_at: string | null;
  result_pnl: number | null;
  review_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  session_id: string | null;
  workspace_id: string | null;
  period: string;
  metrics_json: string;
  discipline_score: number;
  summary: string;
  report_json: string;
  artifact_id: string | null;
  created_at: string;
}

interface EvolutionSuggestionRow {
  id: string;
  workspace_id: string | null;
  review_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  rule_text: string | null;
  source_json: string;
  created_at: string;
  updated_at: string;
}

interface ResearchSessionRow {
  id: string;
  workspace_id: string | null;
  topic: string;
  mode: "builtin";
  status: ResearchSessionStatus;
  total_iterations: number;
  completed_iterations: number;
  report_artifact_id: string | null;
  token_usage_json: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface PaperTradeRow {
  id: string;
  decision_id: string;
  workspace_id: string;
  direction: string;
  asset: string;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  pnl: number | null;
  pnl_percent: number | null;
  entry_time: string;
  exit_time: string | null;
  status: PaperTradeStatus;
  settlement_reason: string | null;
  journal_entry_id: string | null;
}

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export class Repositories {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
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

  list(
    table:
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
      | "evolution_suggestions",
  ) {
    const order = table === "skills" || table === "workflows" ? "id ASC" : table === "positions" ? "updated_at DESC" : "created_at DESC";
    return this.db.prepare(`SELECT * FROM ${table} ORDER BY ${order} LIMIT 100`).all();
  }

  createTimeline(event: {
    sessionId?: string;
    workflowRunId?: string;
    skillRunId?: string;
    type: string;
    title: string;
    detail?: string;
    status: RunStatus | "info";
    payload?: unknown;
  }) {
    const eventId = id("evt");
    this.db.prepare(`
      INSERT INTO timeline_events
      (id, session_id, workflow_run_id, skill_run_id, type, title, detail, status, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      event.sessionId ?? null,
      event.workflowRunId ?? null,
      event.skillRunId ?? null,
      event.type,
      event.title,
      event.detail ?? null,
      event.status,
      JSON.stringify(event.payload ?? null),
      nowIso(),
    );
    return eventId;
  }

  createSessionFork(id: string, parentId: string, title: string) {
    const createdAt = nowIso();
    const path = `fork:${parentId}`;
    this.db
      .prepare("INSERT INTO sessions (id, name, path, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, 'active')")
      .run(id, title, path, createdAt, createdAt);
    return { id, name: title, path, createdAt, parentId };
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

  createArtifact(artifact: {
    sessionId?: string;
    workflowRunId?: string;
    workspaceId?: string;
    type: string;
    title: string;
    summary: string;
    path: string;
    contentType?: string;
    content?: string;
    previewReady?: boolean;
    previewPayload?: unknown;
    payload: unknown;
  }) {
    const artifactId = id("art");
    this.db.prepare(`
      INSERT INTO artifacts
      (id, session_id, workflow_run_id, workspace_id, type, title, summary, path, content_type, content, preview_ready, preview_payload_json, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifactId,
      artifact.sessionId ?? null,
      artifact.workflowRunId ?? null,
      artifact.workspaceId ?? null,
      artifact.type,
      artifact.title,
      artifact.summary,
      artifact.path,
      artifact.contentType ?? "text/markdown",
      artifact.content ?? null,
      artifact.previewReady ? 1 : 0,
      JSON.stringify(artifact.previewPayload ?? null),
      JSON.stringify(artifact.payload),
      nowIso(),
    );
    return artifactId;
  }

  // --- Plans ---
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

  createApproval(approval: {
    sessionId?: string;
    workflowRunId?: string;
    action: string;
    riskLevel: string;
    input: unknown;
    reason: string;
  }) {
    const approvalId = id("app");
    this.db.prepare(`
      INSERT INTO approvals (id, session_id, workflow_run_id, action, risk_level, status, input_json, reason, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      approvalId,
      approval.sessionId ?? null,
      approval.workflowRunId ?? null,
      approval.action,
      approval.riskLevel,
      JSON.stringify(approval.input),
      approval.reason,
      nowIso(),
    );
    return approvalId;
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
    this.createAuditRecord({ category: "memory", action: "memory.write", status: "completed", payload: { scope, key: input.key } });
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
      this.createAuditRecord({ category: "memory", action: "memory.delete", status: "completed", payload: { memoryId } });
      return true;
    }
    return false;
  }

  getArtifact(artifactId: string) {
    return this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId) as
      | {
          id: string;
          session_id: string | null;
          workflow_run_id: string | null;
          workspace_id: string | null;
          type: string;
          title: string;
          summary: string;
          path: string;
          content_type: string;
          content: string | null;
          preview_ready: number;
          preview_payload_json: string | null;
          payload_json: string;
          created_at: string;
        }
      | undefined;
  }

  createPaperOrder(input: {
    sessionId?: string;
    symbol: string;
    side: "buy" | "sell";
    orderType?: string;
    quantity: number;
    price: number;
    sourcePlanArtifactId?: string;
    payload?: unknown;
  }) {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const timestamp = nowIso();
      const orderId = id("ord");
      const tradeId = id("trd");
      const symbol = input.symbol.toUpperCase();
      this.db.prepare(`
        INSERT INTO orders
        (id, session_id, symbol, side, order_type, quantity, price, status, mode, source_plan_artifact_id, payload_json, created_at, filled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'filled', 'paper', ?, ?, ?, ?)
      `).run(
        orderId,
        input.sessionId ?? null,
        symbol,
        input.side,
        input.orderType ?? "market",
        input.quantity,
        input.price,
        input.sourcePlanArtifactId ?? null,
        JSON.stringify(input.payload ?? {}),
        timestamp,
        timestamp,
      );
      this.db.prepare(`
        INSERT INTO trades
        (id, order_id, session_id, symbol, side, quantity, entry_price, pnl, status, opened_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open', ?)
      `).run(tradeId, orderId, input.sessionId ?? null, symbol, input.side, input.quantity, input.price, timestamp);
      const sign = input.side === "buy" ? 1 : -1;
      const existing = this.db.prepare("SELECT * FROM positions WHERE symbol = ?").get(symbol) as
        | { quantity: number; avg_price: number; realized_pnl: number }
        | undefined;
      const nextQuantity = (existing?.quantity ?? 0) + sign * input.quantity;
      const nextAvg =
        !existing || existing.quantity === 0
          ? input.price
          : Math.abs((existing.quantity * existing.avg_price + sign * input.quantity * input.price) / (nextQuantity || 1));
      this.db.prepare(`
        INSERT INTO positions (symbol, quantity, avg_price, realized_pnl, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          quantity=excluded.quantity,
          avg_price=excluded.avg_price,
          updated_at=excluded.updated_at
      `).run(symbol, nextQuantity, nextAvg, existing?.realized_pnl ?? 0, timestamp);
      this.createTimeline({
        sessionId: input.sessionId,
        type: "paper.order",
        title: `Paper order filled: ${input.side.toUpperCase()} ${symbol}`,
        status: "completed",
        payload: { orderId, tradeId, mode: "paper", quantity: input.quantity, price: input.price },
      });
      this.db.exec("COMMIT;");
      return { orderId, tradeId, mode: "paper", status: "filled" as const };
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  updateApprovalStatus(id: string, status: string) {
    this.db.prepare("UPDATE approvals SET status = ?, decided_at = ? WHERE id = ?").run(status, nowIso(), id);
  }

  createAuditRecord(input: { category: string; action: string; status: string; actor?: string; payload?: unknown }) {
    const auditId = id("aud");
    this.db.prepare(`
      INSERT INTO audit_records (id, category, action, status, actor, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(auditId, input.category, input.action, input.status, input.actor ?? "system", JSON.stringify(input.payload ?? {}), nowIso());
    return auditId;
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
    const memory = this.queryMemory({ workspaceId, limit: 50 });
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

  createDecision(input: {
    id?: string;
    workspaceId?: string;
    topic: string;
    direction: DecisionDirection;
    positionSize: number;
    confidence: DecisionConfidence;
    riskLevel: DecisionRiskLevel;
    supportingReasons: string[];
    againstReasons: string[];
    thesis: string;
    invalidationCriteria: string;
    ruleCompliance?: unknown;
    status?: DecisionStatus;
  }) {
    const decisionId = input.id ?? id("dec");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO decisions
      (id, workspace_id, topic, direction, position_size, confidence, risk_level, supporting_reasons_json,
       against_reasons_json, thesis, invalidation_criteria, rule_compliance_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decisionId,
      input.workspaceId ?? null,
      input.topic,
      input.direction,
      input.positionSize,
      input.confidence,
      input.riskLevel,
      JSON.stringify(input.supportingReasons),
      JSON.stringify(input.againstReasons),
      input.thesis,
      input.invalidationCriteria,
      JSON.stringify(input.ruleCompliance ?? {}),
      input.status ?? "pending",
      timestamp,
      timestamp,
    );
    this.createTimeline({
      type: "decision",
      title: `Decision recorded: ${input.topic}`,
      status: "completed",
      payload: { decisionId, workspaceId: input.workspaceId ?? null, direction: input.direction, status: input.status ?? "pending" },
    });
    return this.getDecision(decisionId)!;
  }

  updateDecisionStatus(
    decisionId: string,
    status: DecisionStatus,
    input: { resultPnL?: number; reviewId?: string; executedAt?: string; settledAt?: string } = {},
  ) {
    const existing = this.getDecision(decisionId);
    if (!existing) return undefined;
    const timestamp = nowIso();
    const executedAt = input.executedAt ?? (status === "executed" ? timestamp : existing.executedAt ?? null);
    const settledAt = input.settledAt ?? (status === "settled_win" || status === "settled_loss" ? timestamp : existing.settledAt ?? null);
    this.db.prepare(`
      UPDATE decisions
      SET status = ?, result_pnl = COALESCE(?, result_pnl), review_id = COALESCE(?, review_id),
          executed_at = ?, settled_at = ?, updated_at = ?
      WHERE id = ?
    `).run(status, input.resultPnL ?? null, input.reviewId ?? null, executedAt, settledAt, timestamp, decisionId);
    this.createTimeline({ type: "decision", title: `Decision status updated: ${status}`, status: "completed", payload: { decisionId, status } });
    return this.getDecision(decisionId);
  }

  listDecisions(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM decisions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").all(workspaceId)
      : this.db.prepare("SELECT * FROM decisions ORDER BY created_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapDecision(row as unknown as DecisionRow));
  }

  getDecision(decisionId: string) {
    const row = this.db.prepare("SELECT * FROM decisions WHERE id = ?").get(decisionId) as DecisionRow | undefined;
    return row ? this.mapDecision(row) : undefined;
  }

  createResearchSession(input: { workspaceId?: string; topic: string; mode?: "builtin"; totalIterations?: number }) {
    const sessionId = id("rs");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO research_sessions
      (id, workspace_id, topic, mode, status, total_iterations, completed_iterations, token_usage_json, started_at)
      VALUES (?, ?, ?, ?, 'running', ?, 0, '{}', ?)
    `).run(sessionId, input.workspaceId ?? null, input.topic, input.mode ?? "builtin", input.totalIterations ?? 0, timestamp);
    this.createTimeline({
      type: "research",
      title: `Deep Research started: ${input.topic}`,
      status: "running",
      payload: { researchSessionId: sessionId, workspaceId: input.workspaceId ?? null, mode: input.mode ?? "builtin" },
    });
    return this.getResearchSession(sessionId)!;
  }

  updateResearchSession(
    sessionId: string,
    input: Partial<{
      status: ResearchSessionStatus;
      totalIterations: number;
      completedIterations: number;
      reportArtifactId: string;
      tokenUsage: unknown;
      errorMessage: string;
      completedAt: string;
    }>,
  ) {
    const existing = this.getResearchSession(sessionId);
    if (!existing) return undefined;
    const completedAt =
      input.completedAt ??
      (input.status === "completed" || input.status === "failed" || input.status === "cancelled" ? nowIso() : existing.completedAt ?? null);
    this.db.prepare(`
      UPDATE research_sessions
      SET status = ?, total_iterations = ?, completed_iterations = ?, report_artifact_id = ?,
          token_usage_json = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `).run(
      input.status ?? existing.status,
      input.totalIterations ?? existing.totalIterations,
      input.completedIterations ?? existing.completedIterations,
      input.reportArtifactId ?? existing.reportArtifactId ?? null,
      JSON.stringify(input.tokenUsage ?? existing.tokenUsage ?? {}),
      input.errorMessage ?? existing.errorMessage ?? null,
      completedAt,
      sessionId,
    );
    return this.getResearchSession(sessionId);
  }

  listResearchSessions(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM research_sessions WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 100").all(workspaceId)
      : this.db.prepare("SELECT * FROM research_sessions ORDER BY started_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapResearchSession(row as unknown as ResearchSessionRow));
  }

  getResearchSession(sessionId: string) {
    const row = this.db.prepare("SELECT * FROM research_sessions WHERE id = ?").get(sessionId) as ResearchSessionRow | undefined;
    return row ? this.mapResearchSession(row) : undefined;
  }

  createPaperTrade(input: {
    decisionId: string;
    workspaceId: string;
    direction: string;
    asset: string;
    entryPrice: number;
    positionSize: number;
    settlementReason?: string;
  }) {
    const paperTradeId = id("ptr");
    const timestamp = nowIso();
    this.db.exec("BEGIN TRANSACTION;");
    try {
      this.db.prepare(`
        INSERT INTO paper_trades
        (id, decision_id, workspace_id, direction, asset, entry_price, position_size, entry_time, status, settlement_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
      `).run(
        paperTradeId,
        input.decisionId,
        input.workspaceId,
        input.direction,
        input.asset,
        input.entryPrice,
        input.positionSize,
        timestamp,
        input.settlementReason ?? null,
      );
      const journalId = id("jnl");
      const notes = JSON.stringify(
        {
          dimension1TradeData: {
            direction: input.direction,
            asset: input.asset,
            entryPrice: input.entryPrice,
            positionSize: input.positionSize,
            entryTime: timestamp,
            status: "open",
          },
          dimension2Reasoning: {
            decisionId: input.decisionId,
            source: "paper.trade.lifecycle",
          },
        },
        null,
        2,
      );
      this.db.prepare(`
        INSERT INTO journal_entries
        (id, session_id, workspace_id, decision_id, paper_trade_id, trade_id, plan_artifact_id, mood, discipline_score, rules_violated_json, notes, screenshot_path, artifact_id, created_at)
        VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, 0, '[]', ?, NULL, NULL, ?)
      `).run(journalId, input.workspaceId, input.decisionId, paperTradeId, notes, timestamp);
      this.db.prepare("UPDATE paper_trades SET journal_entry_id = ? WHERE id = ?").run(journalId, paperTradeId);
      this.db.prepare("UPDATE decisions SET status = 'executed', executed_at = COALESCE(executed_at, ?), updated_at = ? WHERE id = ?").run(
        timestamp,
        timestamp,
        input.decisionId,
      );
      this.createTimeline({
        type: "paper_trade",
        title: `Paper trade opened: ${input.asset}`,
        status: "completed",
        payload: { paperTradeId, decisionId: input.decisionId, workspaceId: input.workspaceId, entryPrice: input.entryPrice },
      });
      this.db.exec("COMMIT;");
      return this.getPaperTrade(paperTradeId)!;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  settlePaperTrade(paperTradeId: string, input: { exitPrice: number; settlementReason?: string; exitTime?: string }) {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    if (existing.status !== "open") return existing;
    const exitTime = input.exitTime ?? nowIso();
    const pnl = (input.exitPrice - existing.entryPrice) * existing.positionSize * directionSign(existing.direction);
    const notional = Math.abs(existing.entryPrice * existing.positionSize);
    const pnlPercent = notional === 0 ? 0 : (pnl / notional) * 100;
    const decisionStatus: DecisionStatus = pnl >= 0 ? "settled_win" : "settled_loss";
    this.db.exec("BEGIN TRANSACTION;");
    try {
      this.db.prepare(`
        UPDATE paper_trades
        SET exit_price = ?, pnl = ?, pnl_percent = ?, exit_time = ?, status = 'closed', settlement_reason = ?
        WHERE id = ?
      `).run(input.exitPrice, pnl, pnlPercent, exitTime, input.settlementReason ?? "manual_settlement", paperTradeId);
      this.db.prepare(`
        UPDATE decisions
        SET status = ?, result_pnl = ?, settled_at = ?, updated_at = ?
        WHERE id = ?
      `).run(decisionStatus, pnl, exitTime, exitTime, existing.decisionId);
      if (existing.journalEntryId) {
        const current = this.db.prepare("SELECT notes FROM journal_entries WHERE id = ?").get(existing.journalEntryId) as { notes: string } | undefined;
        const notes = appendSettlementNotes(current?.notes ?? "", {
          exitPrice: input.exitPrice,
          exitTime,
          pnl,
          pnlPercent,
          settlementReason: input.settlementReason ?? "manual_settlement",
        });
        this.db.prepare("UPDATE journal_entries SET notes = ? WHERE id = ?").run(notes, existing.journalEntryId);
      }
      this.createTimeline({
        type: "paper_trade_settled",
        title: `Paper trade settled: ${existing.asset}`,
        status: "completed",
        payload: { paperTradeId, decisionId: existing.decisionId, pnl, pnlPercent, exitPrice: input.exitPrice },
      });
      this.db.exec("COMMIT;");
      return this.getPaperTrade(paperTradeId);
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  cancelPaperTrade(paperTradeId: string, reason = "cancelled") {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    const timestamp = nowIso();
    this.db
      .prepare("UPDATE paper_trades SET status = 'cancelled', exit_time = ?, settlement_reason = ? WHERE id = ?")
      .run(timestamp, reason, paperTradeId);
    return this.getPaperTrade(paperTradeId);
  }

  listPaperTrades(input: { workspaceId?: string; status?: PaperTradeStatus } = {}) {
    const clauses: string[] = [];
    const params: string[] = [];
    if (input.workspaceId) {
      clauses.push("workspace_id = ?");
      params.push(input.workspaceId);
    }
    if (input.status) {
      clauses.push("status = ?");
      params.push(input.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM paper_trades ${where} ORDER BY entry_time DESC LIMIT 100`)
      .all(...params)
      .map((row) => this.mapPaperTrade(row as unknown as PaperTradeRow));
  }

  getPaperTrade(paperTradeId: string) {
    const row = this.db.prepare("SELECT * FROM paper_trades WHERE id = ?").get(paperTradeId) as PaperTradeRow | undefined;
    return row ? this.mapPaperTrade(row) : undefined;
  }

  upsertStrategy(input: { id?: string; name: string; version?: string; status?: string; parameters?: unknown; score?: number }) {
    const timestamp = nowIso();
    const strategyId = input.id ?? id("str");
    this.db.prepare(`
      INSERT INTO strategies (id, name, version, status, parameters_json, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, version=excluded.version, status=excluded.status,
        parameters_json=excluded.parameters_json, score=excluded.score, updated_at=excluded.updated_at
    `).run(strategyId, input.name, input.version ?? "1.0.0", input.status ?? "draft", JSON.stringify(input.parameters ?? {}), input.score ?? 0, timestamp, timestamp);
    return strategyId;
  }

  createBacktest(input: { strategyId?: string; status: string; metrics?: unknown; artifactId?: string }) {
    const backtestId = id("bkt");
    this.db.prepare(`
      INSERT INTO backtests (id, strategy_id, status, metrics_json, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(backtestId, input.strategyId ?? null, input.status, JSON.stringify(input.metrics ?? {}), input.artifactId ?? null, nowIso());
    return backtestId;
  }

  createEvolutionProposal(input: { strategyId?: string; status?: string; proposal: unknown; artifactId?: string; approvalId?: string }) {
    const proposalId = id("evo");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO evolution_proposals (id, strategy_id, status, proposal_json, artifact_id, approval_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposalId,
      input.strategyId ?? null,
      input.status ?? "proposed",
      JSON.stringify(input.proposal),
      input.artifactId ?? null,
      input.approvalId ?? null,
      timestamp,
      timestamp,
    );
    return proposalId;
  }

  createJournalEntry(input: {
    sessionId?: string;
    workspaceId?: string;
    decisionId?: string;
    paperTradeId?: string;
    tradeId?: string;
    planArtifactId?: string;
    mood?: string;
    disciplineScore?: number;
    rulesViolated?: string[];
    notes: string;
    screenshotPath?: string;
    artifactId?: string;
  }) {
    const journalId = id("jnl");
    this.db.prepare(`
      INSERT INTO journal_entries
      (id, session_id, workspace_id, decision_id, paper_trade_id, trade_id, plan_artifact_id, mood, discipline_score, rules_violated_json, notes, screenshot_path, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      journalId,
      input.sessionId ?? null,
      input.workspaceId ?? null,
      input.decisionId ?? null,
      input.paperTradeId ?? null,
      input.tradeId ?? null,
      input.planArtifactId ?? null,
      input.mood ?? null,
      input.disciplineScore ?? 0,
      JSON.stringify(input.rulesViolated ?? []),
      input.notes,
      input.screenshotPath ?? null,
      input.artifactId ?? null,
      nowIso(),
    );
    return journalId;
  }

  attachJournalArtifact(journalId: string, artifactId: string) {
    this.db.prepare("UPDATE journal_entries SET artifact_id = ? WHERE id = ?").run(artifactId, journalId);
  }

  createReview(input: {
    sessionId?: string;
    workspaceId?: string;
    period: string;
    metrics: unknown;
    disciplineScore: number;
    summary: string;
    report?: unknown;
    artifactId?: string;
  }) {
    const reviewId = id("rev");
    this.db.prepare(`
      INSERT INTO reviews (id, session_id, workspace_id, period, metrics_json, discipline_score, summary, report_json, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId,
      input.sessionId ?? null,
      input.workspaceId ?? null,
      input.period,
      JSON.stringify(input.metrics),
      input.disciplineScore,
      input.summary,
      JSON.stringify(input.report ?? {}),
      input.artifactId ?? null,
      nowIso(),
    );
    return reviewId;
  }

  attachReviewArtifact(reviewId: string, artifactId: string) {
    this.db.prepare("UPDATE reviews SET artifact_id = ? WHERE id = ?").run(artifactId, reviewId);
  }

  listReviews(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM reviews WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").all(workspaceId)
      : this.db.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapReview(row as unknown as ReviewRow));
  }

  getReview(reviewId: string) {
    const row = this.db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId) as ReviewRow | undefined;
    return row ? this.mapReview(row) : undefined;
  }

  createEvolutionSuggestion(input: {
    workspaceId?: string;
    reviewId?: string;
    title: string;
    description: string;
    category?: string;
    priority?: string;
    status?: string;
    ruleText?: string;
    source?: unknown;
  }) {
    const suggestionId = id("evs");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO evolution_suggestions
      (id, workspace_id, review_id, title, description, category, priority, status, rule_text, source_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestionId,
      input.workspaceId ?? null,
      input.reviewId ?? null,
      input.title,
      input.description,
      input.category ?? "rule",
      input.priority ?? "medium",
      input.status ?? "proposed",
      input.ruleText ?? null,
      JSON.stringify(input.source ?? {}),
      timestamp,
      timestamp,
    );
    return this.getEvolutionSuggestion(suggestionId)!;
  }

  listEvolutionSuggestions(input: { workspaceId?: string; status?: string; limit?: number } = {}) {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (input.workspaceId) {
      clauses.push("workspace_id = ?");
      params.push(input.workspaceId);
    }
    if (input.status) {
      clauses.push("status = ?");
      params.push(input.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(input.limit ?? 100);
    return this.db
      .prepare(`SELECT * FROM evolution_suggestions ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params)
      .map((row) => this.mapEvolutionSuggestion(row as unknown as EvolutionSuggestionRow));
  }

  getEvolutionSuggestion(suggestionId: string) {
    const row = this.db.prepare("SELECT * FROM evolution_suggestions WHERE id = ?").get(suggestionId) as EvolutionSuggestionRow | undefined;
    return row ? this.mapEvolutionSuggestion(row) : undefined;
  }

  updateEvolutionSuggestionStatus(suggestionId: string, status: string) {
    this.db.prepare("UPDATE evolution_suggestions SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), suggestionId);
    return this.getEvolutionSuggestion(suggestionId);
  }

  portfolioSnapshot() {
    return {
      positions: this.db.prepare("SELECT * FROM positions ORDER BY updated_at DESC LIMIT 100").all(),
      orders: this.db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all(),
      trades: this.db.prepare("SELECT * FROM trades ORDER BY opened_at DESC LIMIT 100").all(),
    };
  }

  reviewMetrics() {
    const trades = this.db.prepare("SELECT * FROM trades ORDER BY opened_at DESC LIMIT 200").all() as Array<{ pnl: number; status: string }>;
    const journals = this.db
      .prepare("SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 200")
      .all() as Array<{ discipline_score: number; rules_violated_json: string }>;
    const closed = trades.filter((trade) => trade.status === "closed");
    const wins = closed.filter((trade) => trade.pnl > 0).length;
    const ruleBreaks = journals.reduce((sum, entry) => {
      try {
        return sum + (JSON.parse(entry.rules_violated_json) as string[]).length;
      } catch {
        return sum;
      }
    }, 0);
    const avgDiscipline = journals.length
      ? Math.round(journals.reduce((sum, entry) => sum + entry.discipline_score, 0) / journals.length)
      : 0;
    return {
      trades: trades.length,
      openTrades: trades.filter((trade) => trade.status === "open").length,
      closedTrades: closed.length,
      winRate: closed.length ? wins / closed.length : 0,
      realizedPnl: closed.reduce((sum, trade) => sum + trade.pnl, 0),
      journalEntries: journals.length,
      ruleBreaks,
      disciplineScore: avgDiscipline,
    };
  }

  // Market Prices
  async upsertMarketPrice(data: { symbol: string; exchange?: string; source: string; price_usd?: number; change_24h?: number; bid?: number; ask?: number; last?: number; high?: number; low?: number; volume?: number; extra_json?: string }) {
    const priceId = `mp_${data.symbol}_${data.source}`;
    const fetchedAt = nowIso();
    this.db.prepare(`
      INSERT INTO market_prices (id, symbol, exchange, source, price_usd, change_24h, bid, ask, last, high, low, volume, extra_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        symbol=excluded.symbol, exchange=excluded.exchange, source=excluded.source,
        price_usd=excluded.price_usd, change_24h=excluded.change_24h, bid=excluded.bid,
        ask=excluded.ask, last=excluded.last, high=excluded.high, low=excluded.low,
        volume=excluded.volume, extra_json=excluded.extra_json, fetched_at=excluded.fetched_at
    `).run(
      priceId,
      data.symbol,
      data.exchange ?? null,
      data.source,
      data.price_usd ?? null,
      data.change_24h ?? null,
      data.bid ?? null,
      data.ask ?? null,
      data.last ?? null,
      data.high ?? null,
      data.low ?? null,
      data.volume ?? null,
      data.extra_json ?? null,
      fetchedAt,
    );
    return priceId;
  }

  async getLatestMarketPrice(symbol: string, source?: string): Promise<any | null> {
    const query = source
      ? "SELECT * FROM market_prices WHERE symbol = ? AND source = ? ORDER BY fetched_at DESC LIMIT 1"
      : "SELECT * FROM market_prices WHERE symbol = ? ORDER BY fetched_at DESC LIMIT 1";
    const params = source ? [symbol, source] : [symbol];
    return this.db.prepare(query).get(...params) ?? null;
  }

  async listMarketPrices(symbol: string): Promise<any[]> {
    return this.db.prepare("SELECT * FROM market_prices WHERE symbol = ? ORDER BY fetched_at DESC LIMIT 50").all(symbol);
  }

  // OHLCV
  async upsertOhlcvCandles(candles: Array<{ symbol: string; exchange?: string; timeframe: string; timestamp: number; open: number; high: number; low: number; close: number; volume?: number }>) {
    const fetchedAt = nowIso();
    const insert = this.db.prepare(`
      INSERT INTO market_ohlcv (id, symbol, exchange, timeframe, timestamp, open, high, low, close, volume, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        symbol=excluded.symbol, exchange=excluded.exchange, timeframe=excluded.timeframe,
        timestamp=excluded.timestamp, open=excluded.open, high=excluded.high,
        low=excluded.low, close=excluded.close, volume=excluded.volume, fetched_at=excluded.fetched_at
    `);
    for (const row of candles) {
      const candleId = `ohlcv_${row.symbol}_${row.timeframe}_${row.timestamp}`;
      insert.run(
        candleId,
        row.symbol,
        row.exchange ?? null,
        row.timeframe,
        row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume ?? 0,
        fetchedAt,
      );
    }
  }

  async getOhlcvCandles(symbol: string, timeframe: string, limit?: number): Promise<any[]> {
    const rows = this.db.prepare(
      "SELECT * FROM market_ohlcv WHERE symbol = ? AND timeframe = ? ORDER BY timestamp DESC LIMIT ?"
    ).all(symbol, timeframe, limit ?? 100) as any[];
    return rows;
  }

  // Search Cache
  async getCachedSearchResults(query: string, provider: string): Promise<any | null> {
    const row = this.db.prepare(
      "SELECT * FROM search_cache WHERE query = ? AND provider = ? ORDER BY fetched_at DESC LIMIT 1"
    ).get(query, provider) as any | undefined;
    if (!row) return null;
    if (row.expires_at && Date.parse(row.expires_at) < Date.now()) return null;
    return { ...row, results: JSON.parse(row.results_json) };
  }

  async cacheSearchResults(query: string, provider: string, results: any, ttlMinutes?: number) {
    const cacheId = id("sc");
    const fetchedAt = nowIso();
    const expiresAt = ttlMinutes ? new Date(Date.now() + ttlMinutes * 60_000).toISOString() : null;
    this.db.prepare(`
      INSERT INTO search_cache (id, query, provider, results_json, fetched_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        query=excluded.query, provider=excluded.provider, results_json=excluded.results_json,
        fetched_at=excluded.fetched_at, expires_at=excluded.expires_at
    `).run(cacheId, query, provider, JSON.stringify(results), fetchedAt, expiresAt);
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

  private mapDecision(row: DecisionRow): DecisionRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      topic: row.topic,
      direction: row.direction,
      positionSize: row.position_size,
      confidence: row.confidence,
      riskLevel: row.risk_level,
      supportingReasons: parseJson<string[]>(row.supporting_reasons_json, []),
      againstReasons: parseJson<string[]>(row.against_reasons_json, []),
      thesis: row.thesis,
      invalidationCriteria: row.invalidation_criteria,
      ruleCompliance: parseJson(row.rule_compliance_json, {}),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      executedAt: row.executed_at ?? undefined,
      settledAt: row.settled_at ?? undefined,
      resultPnL: row.result_pnl ?? undefined,
      reviewId: row.review_id ?? undefined,
    };
  }

  private mapReview(row: ReviewRow): ReviewRecord {
    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      workspaceId: row.workspace_id ?? undefined,
      period: row.period,
      metrics: parseJson(row.metrics_json, {}),
      disciplineScore: row.discipline_score,
      summary: row.summary,
      report: parseJson(row.report_json, {}),
      artifactId: row.artifact_id ?? undefined,
      createdAt: row.created_at,
    };
  }

  private mapEvolutionSuggestion(row: EvolutionSuggestionRow): EvolutionSuggestionRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      reviewId: row.review_id ?? undefined,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      ruleText: row.rule_text ?? undefined,
      source: parseJson(row.source_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapResearchSession(row: ResearchSessionRow): ResearchSessionRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      topic: row.topic,
      mode: row.mode,
      status: row.status,
      totalIterations: row.total_iterations,
      completedIterations: row.completed_iterations,
      reportArtifactId: row.report_artifact_id ?? undefined,
      tokenUsage: parseJson(row.token_usage_json, {}),
      errorMessage: row.error_message ?? undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
    };
  }

  private mapPaperTrade(row: PaperTradeRow): PaperTradeRecord {
    return {
      id: row.id,
      decisionId: row.decision_id,
      workspaceId: row.workspace_id,
      direction: row.direction,
      asset: row.asset,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price ?? undefined,
      positionSize: row.position_size,
      pnl: row.pnl ?? undefined,
      pnlPercent: row.pnl_percent ?? undefined,
      entryTime: row.entry_time,
      exitTime: row.exit_time ?? undefined,
      status: row.status,
      settlementReason: row.settlement_reason ?? undefined,
      journalEntryId: row.journal_entry_id ?? undefined,
    };
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function directionSign(direction: string) {
  return direction === "SHORT" || direction === "NO" ? -1 : 1;
}

function appendSettlementNotes(existing: string, settlement: { exitPrice: number; exitTime: string; pnl: number; pnlPercent: number; settlementReason: string }) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(existing) as Record<string, unknown>;
  } catch {
    parsed = { notes: existing };
  }
  parsed.dimension1TradeData = {
    ...((parsed.dimension1TradeData as Record<string, unknown>) ?? {}),
    exitPrice: settlement.exitPrice,
    exitTime: settlement.exitTime,
    pnl: settlement.pnl,
    pnlPercent: settlement.pnlPercent,
    settlementReason: settlement.settlementReason,
    status: "closed",
  };
  return JSON.stringify(parsed, null, 2);
}
