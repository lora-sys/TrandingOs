import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson, type DecisionRow } from "./_helpers.js";
import type { DecisionDirection, DecisionConfidence, DecisionRiskLevel, DecisionStatus, DecisionRecord } from "./_types.js";
import type { TimelineRepo } from "./timeline-repo.js";

export class DecisionRepo {
  constructor(
    private readonly database: TradingPiDatabase,
    private readonly timeline: TimelineRepo,
  ) {}

  get db() {
    return this.database.db;
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
    this.timeline.createTimeline({
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
    this.timeline.createTimeline({ type: "decision", title: `Decision status updated: ${status}`, status: "completed", payload: { decisionId, status } });
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
}