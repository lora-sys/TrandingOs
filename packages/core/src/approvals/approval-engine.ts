import type { Repositories } from "../db/repositories.js";

export interface PermissionRequest {
  id: string;
  toolName: string;
  description: string;
  riskLevel: string;
  sessionId?: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  resolvedAt?: string;
}

const dangerousActions = new Set([
  "real.order",
  "strategy.patch.apply",
  "api.key.update",
  "skill.install",
  "mcp.enable",
  "sandbox.export",
]);

export class ApprovalEngine {
  private readonly autoApproveSessions = new Set<string>();

  constructor(private readonly repos: Repositories) {}

  requiresApproval(action: string, riskLevel?: string, sessionId?: string) {
    if (sessionId && this.autoApproveSessions.has(sessionId)) return false;
    return dangerousActions.has(action) || riskLevel === "high" || riskLevel === "critical";
  }

  request(input: {
    action: string;
    riskLevel: string;
    reason: string;
    payload: unknown;
    sessionId?: string;
    workflowRunId?: string;
  }) {
    const approvalId = this.repos.createApproval({
      action: input.action,
      riskLevel: input.riskLevel,
      reason: input.reason,
      input: input.payload,
      sessionId: input.sessionId,
      workflowRunId: input.workflowRunId,
    });
    this.repos.createTimeline({
      sessionId: input.sessionId,
      workflowRunId: input.workflowRunId,
      type: "approval",
      title: `Approval required: ${input.action}`,
      detail: input.reason,
      status: "blocked",
      payload: { approvalId, riskLevel: input.riskLevel },
    });
    return approvalId;
  }

  grant(approvalId: string) {
    this.repos.updateApprovalStatus(approvalId, "approved");
    this.repos.createTimeline({
      type: "approval",
      title: `Approval granted: ${approvalId}`,
      status: "completed",
      payload: { approvalId, resolution: "approved" },
    });
  }

  deny(approvalId: string) {
    this.repos.updateApprovalStatus(approvalId, "denied");
    this.repos.createTimeline({
      type: "approval",
      title: `Approval denied: ${approvalId}`,
      status: "failed",
      payload: { approvalId, resolution: "denied" },
    });
  }

  autoApproveSession(sessionId: string) {
    this.autoApproveSessions.add(sessionId);
  }
}

