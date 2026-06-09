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
      | "reviews",
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
    payload: unknown;
  }) {
    const artifactId = id("art");
    this.db.prepare(`
      INSERT INTO artifacts (id, session_id, workflow_run_id, type, title, summary, path, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifactId,
      artifact.sessionId ?? null,
      artifact.workflowRunId ?? null,
      artifact.type,
      artifact.title,
      artifact.summary,
      artifact.path,
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
    return { orderId, tradeId, mode: "paper", status: "filled" };
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
}
