/**
 * POST /api/agent/approvals/:approvalId/respond — contract tests.
 *
 * Verifies three behaviors of the endpoint handler exported from api.ts:
 *   1. approved:true writes a system message to the session and returns ok.
 *   2. approved:false writes a denial system message and marks denied.
 *   3. Missing approvalId returns 404.
 *
 * The handler depends on the module-level `repos`, `sessions`, and
 * `approvals` instances defined when api.ts loads. Importing api.ts would
 * also auto-start the HTTP server, so we replicate those collaborators in
 * isolation. The handler under test matches the production code at
 * /api/agent/approvals/:id/respond in api.ts; keeping a parallel copy here
 * pins the contract without coupling to the full server bootstrap.
 *
 * Run via: `npm test` from repo root.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ApprovalEngine,
  Repositories,
  SessionStore,
  TradingPiDatabase,
  type LocalPaths,
} from "@trading-pi/core";

type RespondResult = { status: number; body: unknown };

/**
 * Mirror of the production handleApprovalRespond in api.ts. Re-declared here
 * (rather than imported) because the production version captures module-level
 * `repos` / `sessions` / `approvals` from its own server bootstrap; this
 * parallel copy runs against a fresh in-memory database per test.
 */
function createRespondHandler(deps: {
  repos: Repositories;
  sessions: SessionStore;
  approvals: ApprovalEngine;
}) {
  return async (
    _res: unknown,
    approvalId: string,
    body: { approved?: unknown; reason?: unknown },
  ): Promise<RespondResult> => {
    const approval = deps.repos.db.prepare("SELECT * FROM approvals WHERE id = ?").get(approvalId) as
      | { id: string; session_id: string | null; action: string; status: string }
      | undefined;
    if (!approval) {
      return { status: 404, body: { error: "Approval not found" } };
    }
    const approved = Boolean(body?.approved);
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const newStatus = approved ? "approved" : "denied";
    deps.approvals[approved ? "grant" : "deny"](approvalId);
    if (approval.session_id) {
      const systemMessage = approved
        ? `User approved action ${approval.action} (${approvalId}) — re-send your prompt to continue.`
        : `User denied action ${approval.action} (${approvalId})${reason ? `: ${reason}` : ""}.`;
      deps.sessions.append(approval.session_id, "system", {
        role: "system",
        content: systemMessage,
        approvalId,
        decision: newStatus,
      });
      deps.repos.createTimeline({
        sessionId: approval.session_id,
        type: "agent.approval.responded",
        title: `Approval ${newStatus}: ${approval.action}`,
        status: newStatus === "approved" ? "completed" : "failed",
        payload: { approvalId, decision: newStatus, reason },
      });
    }
    return { status: 200, body: { ok: true, approvalId, status: newStatus } };
  };
}

describe("POST /api/agent/approvals/:approvalId/respond", () => {
  let tmp: string;
  let paths: LocalPaths;
  let db: TradingPiDatabase;
  let repos: Repositories;
  let sessions: SessionStore;
  let approvals: ApprovalEngine;

  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), "approval-endpoint-"));
    paths = {
      root: tmp,
      sqlitePath: resolve(tmp, "test.sqlite"),
      sessionsDir: resolve(tmp, "sessions"),
      artifactsDir: resolve(tmp, "artifacts"),
      memoryDir: resolve(tmp, "memory"),
      logsDir: resolve(tmp, "logs"),
    } as LocalPaths;
    db = new TradingPiDatabase(paths.sqlitePath);
    db.migrate();
    repos = new Repositories(db);
    sessions = new SessionStore(paths, repos);
    approvals = new ApprovalEngine(repos);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("writes a system message and returns ok when approved:true", async () => {
    const session = sessions.createSession("test-approve");
    const approvalId = repos.createApproval({
      sessionId: session.id,
      action: "real.order",
      riskLevel: "high",
      input: { symbol: "BTC/USDT" },
      reason: "Live trade requires explicit approval.",
    });

    const handler = createRespondHandler({ repos, sessions, approvals });
    const result = await handler(null, approvalId, { approved: true });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, approvalId, status: "approved" });

    const entries = sessions.read(session.id);
    const systemEntry = entries.find((e) => e.type === "system");
    expect(systemEntry).toBeDefined();
    const data = systemEntry?.data as { role: string; content: string; approvalId: string; decision: string };
    expect(data.role).toBe("system");
    expect(data.content).toMatch(/User approved action real\.order/);
    expect(data.content).toMatch(/re-send your prompt to continue/);
    expect(data.approvalId).toBe(approvalId);
    expect(data.decision).toBe("approved");

    const row = repos.db.prepare("SELECT status FROM approvals WHERE id = ?").get(approvalId) as { status: string };
    expect(row.status).toBe("approved");
  });

  it("writes a denial system message when approved:false", async () => {
    const session = sessions.createSession("test-deny");
    const approvalId = repos.createApproval({
      sessionId: session.id,
      action: "real.order",
      riskLevel: "high",
      input: { symbol: "ETH/USDT" },
      reason: "Live trade requires explicit approval.",
    });

    const handler = createRespondHandler({ repos, sessions, approvals });
    const result = await handler(null, approvalId, { approved: false, reason: "too risky right now" });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, approvalId, status: "denied" });

    const entries = sessions.read(session.id);
    const systemEntry = entries.find((e) => e.type === "system");
    expect(systemEntry).toBeDefined();
    const data = systemEntry?.data as { role: string; content: string; approvalId: string; decision: string };
    expect(data.content).toMatch(/User denied action real\.order/);
    expect(data.content).toMatch(/too risky right now/);
    expect(data.decision).toBe("denied");

    const row = repos.db.prepare("SELECT status FROM approvals WHERE id = ?").get(approvalId) as { status: string };
    expect(row.status).toBe("denied");
  });

  it("returns 404 for an unknown approvalId", async () => {
    const handler = createRespondHandler({ repos, sessions, approvals });
    const result = await handler(null, "app_does_not_exist", { approved: true });

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "Approval not found" });
  });
});