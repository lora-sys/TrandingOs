/**
 * classifyError — unit tests
 *
 * Pins the category-mapping contract used by the SSE error path in api.ts.
 * No I/O, no network — pure function over Error.message substrings.
 *
 * Run via: `npm test` from repo root.
 */
import { describe, expect, it } from "vitest";
import { classifyError, type AgentErrorCategory } from "./error-classify.js";

const cases: Array<{ category: AgentErrorCategory; message: string; label: string }> = [
  { category: "network", message: "fetch failed: ECONNREFUSED 127.0.0.1:443", label: "ECONNREFUSED" },
  { category: "auth", message: "401 Unauthorized: invalid api key", label: "401 invalid key" },
  { category: "rate_limit", message: "429 Too Many Requests: rate limit exceeded", label: "rate limit" },
  { category: "context_overflow", message: "context length exceeded maximum tokens", label: "context overflow" },
  { category: "validation", message: "Validation failed: invalid input shape", label: "validation" },
  { category: "internal", message: "Unexpected token in JSON at position 12", label: "internal fallback" },
];

describe("classifyError", () => {
  for (const { category, message, label } of cases) {
    it(`maps "${label}" -> ${category}`, () => {
      expect(classifyError(new Error(message))).toBe(category);
    });
  }

  it("returns network for ETIMEDOUT", () => {
    expect(classifyError(new Error("connect ETIMEDOUT 10.0.0.1:80"))).toBe("network");
  });

  it("returns network for ENOTFOUND", () => {
    expect(classifyError(new Error("getaddrinfo ENOTFOUND api.example.com"))).toBe("network");
  });

  it("returns auth for authentication failures", () => {
    expect(classifyError(new Error("Authentication required"))).toBe("auth");
  });

  it("returns context_overflow when message says 'context too long'", () => {
    expect(classifyError(new Error("context too long for model window"))).toBe("context_overflow");
  });

  it("falls back to internal for unrecognized messages", () => {
    expect(classifyError(new Error("some unknown thing happened"))).toBe("internal");
  });
});