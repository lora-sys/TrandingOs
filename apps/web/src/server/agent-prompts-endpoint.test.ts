import { describe, it, expect, vi } from "vitest";

/**
 * Contract tests for the recent-prompt formatter used by
 * /api/agent/prompts. Mirrors the JSON parsing + slicing logic
 * from apps/web/server/api.ts.
 */

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  parts?: string;
  created_at: number;
}

function formatRecentPrompts(messages: MessageRow[], limit: number) {
  return messages
    .filter((m) => m.role === "user")
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, Math.min(Math.max(limit, 1), 100))
    .map((m) => {
      let text = "";
      try {
        const parts = m.parts ? JSON.parse(m.parts) : [];
        text = Array.isArray(parts)
          ? parts.map((p: { text?: string }) => p.text ?? "").filter(Boolean).join("\n")
          : "";
      } catch {
        // parts is opaque; skip text extraction
      }
      return { id: m.id, sessionId: m.session_id, role: m.role, text, createdAt: m.created_at };
    });
}

describe("/api/agent/prompts contract", () => {
  const sample: MessageRow[] = [
    { id: "m1", session_id: "ses_a", role: "user", parts: JSON.stringify([{ text: "first prompt" }]), created_at: 1000 },
    { id: "m2", session_id: "ses_a", role: "assistant", parts: JSON.stringify([{ text: "AI response" }]), created_at: 1100 },
    { id: "m3", session_id: "ses_b", role: "user", parts: JSON.stringify([{ text: "second prompt" }]), created_at: 2000 },
    { id: "m4", session_id: "ses_a", role: "user", parts: JSON.stringify([{ text: "third prompt" }]), created_at: 3000 },
  ];

  it("filters to user role only", () => {
    const out = formatRecentPrompts(sample, 10);
    expect(out.length).toBe(3);
    for (const p of out) expect(p.role).toBe("user");
  });

  it("sorts by createdAt descending", () => {
    const out = formatRecentPrompts(sample, 10);
    expect(out.map((p) => p.id)).toEqual(["m4", "m3", "m1"]);
  });

  it("respects limit", () => {
    const out = formatRecentPrompts(sample, 2);
    expect(out.length).toBe(2);
    expect(out.map((p) => p.id)).toEqual(["m4", "m3"]);
  });

  it("clamps limit to [1, 100]", () => {
    const out1 = formatRecentPrompts(sample, 0);
    expect(out1.length).toBe(1);
    const out2 = formatRecentPrompts(sample, 999);
    expect(out2.length).toBeLessThanOrEqual(100);
  });

  it("handles broken parts JSON gracefully", () => {
    const broken: MessageRow[] = [
      { id: "b1", session_id: "ses_x", role: "user", parts: "not-json", created_at: 500 },
    ];
    const out = formatRecentPrompts(broken, 10);
    expect(out.length).toBe(1);
    expect(out[0]?.text).toBe("");
  });
});