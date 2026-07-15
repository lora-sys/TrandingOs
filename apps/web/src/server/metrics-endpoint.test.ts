import { describe, it, expect, vi } from "vitest";

/**
 * Contract tests for the metrics aggregator at /api/metrics/agent.
 * Mirrors the response builder from apps/web/server/api.ts so the
 * shape is locked down before the dashboard starts consuming it.
 */

interface TimelineRow {
  type?: string;
  status?: string;
  created_at?: string;
}
interface ApprovalRow {
  status?: string;
  created_at?: string;
}
interface SessionRow {
  created_at?: string;
}

function buildAgentMetrics(opts: {
  sessions: SessionRow[];
  timeline: TimelineRow[];
  approvals: ApprovalRow[];
  subAgentsActive: number;
  today: string;
}) {
  const isToday = (iso?: string) => Boolean(iso && iso.slice(0, 10) === opts.today);
  const promptEvents = opts.timeline.filter((t) => t.type === "pi.message_update" || t.type === "agent.tool.preflight").length;
  return {
    sessions: {
      total: opts.sessions.length,
      createdToday: opts.sessions.filter((s) => isToday(s.created_at)).length,
    },
    prompts: {
      total: promptEvents,
      today: opts.timeline.filter((t) => (t.type === "pi.message_update" || t.type === "agent.tool.preflight") && isToday(t.created_at)).length,
    },
    approvals: {
      pending: opts.approvals.filter((a) => a.status === "pending").length,
      approved: opts.approvals.filter((a) => a.status === "approved").length,
      denied: opts.approvals.filter((a) => a.status === "denied").length,
    },
    subAgents: { active: opts.subAgentsActive },
  };
}

describe("/api/metrics/agent contract", () => {
  const today = "2026-07-15";

  it("returns zero-shape on empty data", () => {
    const m = buildAgentMetrics({ sessions: [], timeline: [], approvals: [], subAgentsActive: 0, today });
    expect(m).toEqual({
      sessions: { total: 0, createdToday: 0 },
      prompts: { total: 0, today: 0 },
      approvals: { pending: 0, approved: 0, denied: 0 },
      subAgents: { active: 0 },
    });
  });

  it("separates today's sessions from total", () => {
    const m = buildAgentMetrics({
      sessions: [{ created_at: `${today}T10:00:00Z` }, { created_at: "2026-07-10T10:00:00Z" }],
      timeline: [],
      approvals: [],
      subAgentsActive: 0,
      today,
    });
    expect(m.sessions.total).toBe(2);
    expect(m.sessions.createdToday).toBe(1);
  });

  it("counts prompt events by type", () => {
    const m = buildAgentMetrics({
      sessions: [],
      timeline: [
        { type: "pi.message_update" },
        { type: "pi.message_update" },
        { type: "agent.tool.preflight" },
        { type: "unrelated" }, // not counted
      ],
      approvals: [],
      subAgentsActive: 0,
      today,
    });
    expect(m.prompts.total).toBe(3);
  });

  it("separates approvals by status", () => {
    const m = buildAgentMetrics({
      sessions: [],
      timeline: [],
      approvals: [
        { status: "pending" }, { status: "pending" },
        { status: "approved" },
        { status: "denied" }, { status: "denied" }, { status: "denied" },
      ],
      subAgentsActive: 0,
      today,
    });
    expect(m.approvals).toEqual({ pending: 2, approved: 1, denied: 3 });
  });

  it("includes sub-agent active count", () => {
    const m = buildAgentMetrics({ sessions: [], timeline: [], approvals: [], subAgentsActive: 4, today });
    expect(m.subAgents.active).toBe(4);
  });
});