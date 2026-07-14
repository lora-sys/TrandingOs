import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";

export class ApprovalRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
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

  updateApprovalStatus(id: string, status: string) {
    this.db.prepare("UPDATE approvals SET status = ?, decided_at = ? WHERE id = ?").run(status, nowIso(), id);
  }
}