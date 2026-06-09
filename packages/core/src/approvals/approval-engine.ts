import type { Repositories } from "../db/repositories.js";

const dangerousActions = new Set([
  "real.order",
  "strategy.patch.apply",
  "api.key.update",
  "skill.install",
  "mcp.enable",
  "sandbox.export",
]);

export class ApprovalEngine {
  constructor(private readonly repos: Repositories) {}

  requiresApproval(action: string, riskLevel?: string) {
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
}

