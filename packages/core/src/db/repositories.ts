import { randomUUID } from "node:crypto";
import type { TradingPiDatabase } from "./database.js";

export type RunStatus = "pending" | "running" | "completed" | "failed" | "blocked";

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
      | "strategies"
      | "backtests"
      | "evolution_proposals",
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
      (id, session_id, workflow_run_id, type, title, summary, path, content_type, content, preview_ready, preview_payload_json, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifactId,
      artifact.sessionId ?? null,
      artifact.workflowRunId ?? null,
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

  getArtifact(artifactId: string) {
    return this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId) as
      | {
          id: string;
          session_id: string | null;
          workflow_run_id: string | null;
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

  upsertWorkspace(input: { id?: string; name: string; kind: string; context?: unknown }) {
    const timestamp = nowIso();
    const workspaceId = input.id ?? id("wrk");
    this.db.prepare(`
      INSERT INTO workspaces (id, name, kind, context_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, context_json=excluded.context_json, updated_at=excluded.updated_at
    `).run(workspaceId, input.name, input.kind, JSON.stringify(input.context ?? {}), timestamp, timestamp);
    return workspaceId;
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
    const workspace = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(workspaceId);
    const memory = this.queryMemory({ workspaceId, limit: 50 });
    const links = this.db.prepare("SELECT * FROM workspace_links WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").all(workspaceId);
    return { workspace, memory, links };
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
      (id, session_id, trade_id, plan_artifact_id, mood, discipline_score, rules_violated_json, notes, screenshot_path, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      journalId,
      input.sessionId ?? null,
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
    period: string;
    metrics: unknown;
    disciplineScore: number;
    summary: string;
    artifactId?: string;
  }) {
    const reviewId = id("rev");
    this.db.prepare(`
      INSERT INTO reviews (id, session_id, period, metrics_json, discipline_score, summary, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId,
      input.sessionId ?? null,
      input.period,
      JSON.stringify(input.metrics),
      input.disciplineScore,
      input.summary,
      input.artifactId ?? null,
      nowIso(),
    );
    return reviewId;
  }

  attachReviewArtifact(reviewId: string, artifactId: string) {
    this.db.prepare("UPDATE reviews SET artifact_id = ? WHERE id = ?").run(artifactId, reviewId);
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
}
