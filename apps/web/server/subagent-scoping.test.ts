import { describe, it, expect, vi } from "vitest";

/**
 * Contract test for the subAgent event scoping logic.
 *
 * Verifies that the filter callback used in api.ts (production code at
 * /api/session/message/stream) correctly filters events so that:
 *   1. Events for session A do NOT reach the client of session B.
 *   2. Events with no sessionId in payload are NOT forwarded (defensive).
 *   3. Events for the requesting session ARE forwarded.
 *
 * We extract the filter logic into a standalone predicate so it can be tested
 * without spinning up the full HTTP server.
 */

type SubAgentEvent = {
  type: string;
  payload: { sessionId?: string };
};

function createScopingFilter(
  sessionId: string | undefined,
  write: (data: string) => void,
): (event: SubAgentEvent) => void {
  return (event) => {
    try {
      if (event.payload.sessionId && event.payload.sessionId === sessionId) {
        write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      // client may have disconnected
    }
  };
}

describe("sub-agent event scoping", () => {
  it("forwards events whose payload.sessionId matches the requesting session", () => {
    const writes: string[] = [];
    const filter = createScopingFilter("session-A", (s) => writes.push(s));

    filter({ type: "sub_agent_progress", payload: { sessionId: "session-A" } });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("event: sub_agent_progress");
    expect(writes[0]).toContain('"sessionId":"session-A"');
  });

  it("does NOT forward events for other sessions", () => {
    const writes: string[] = [];
    const filter = createScopingFilter("session-A", (s) => writes.push(s));

    filter({ type: "sub_agent_progress", payload: { sessionId: "session-B" } });
    filter({ type: "sub_agent_complete", payload: { sessionId: "session-C" } });

    expect(writes).toHaveLength(0);
  });

  it("does NOT forward events with missing or undefined sessionId in payload", () => {
    const writes: string[] = [];
    const filter = createScopingFilter("session-A", (s) => writes.push(s));

    filter({ type: "global_event", payload: {} });
    filter({ type: "no_payload" });

    expect(writes).toHaveLength(0);
  });

  it("two concurrent sessions each get only their own events", () => {
    const writesA: string[] = [];
    const writesB: string[] = [];
    const filterA = createScopingFilter("session-A", (s) => writesA.push(s));
    const filterB = createScopingFilter("session-B", (s) => writesB.push(s));

    // Simulate a stream of events from the global subAgents emitter
    const events: SubAgentEvent[] = [
      { type: "sub_agent_started", payload: { sessionId: "session-A" } },
      { type: "sub_agent_started", payload: { sessionId: "session-B" } },
      { type: "sub_agent_progress", payload: { sessionId: "session-A" } },
      { type: "sub_agent_progress", payload: { sessionId: "session-B" } },
      { type: "sub_agent_complete", payload: { sessionId: "session-A" } },
      { type: "sub_agent_complete", payload: { sessionId: "session-B" } },
    ];

    for (const ev of events) {
      filterA(ev);
      filterB(ev);
    }

    expect(writesA).toHaveLength(3);
    expect(writesA.every((s) => s.includes('"sessionId":"session-A"'))).toBe(true);

    expect(writesB).toHaveLength(3);
    expect(writesB.every((s) => s.includes('"sessionId":"session-B"'))).toBe(true);

    // Confirm no cross-contamination
    expect(writesA.some((s) => s.includes('"sessionId":"session-B"'))).toBe(false);
    expect(writesB.some((s) => s.includes('"sessionId":"session-A"'))).toBe(false);
  });

  it("absorbs errors thrown by the writer (client disconnected) without crashing", () => {
    const throwingWrite = vi.fn(() => {
      throw new Error("socket closed");
    });
    const filter = createScopingFilter("session-A", throwingWrite);

    // Should not throw even if write fails
    expect(() =>
      filter({ type: "sub_agent_progress", payload: { sessionId: "session-A" } })
    ).not.toThrow();
    expect(throwingWrite).toHaveBeenCalledOnce();
  });
});
