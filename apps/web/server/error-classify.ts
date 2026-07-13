import type { ServerResponse } from "node:http";

/**
 * Categories of errors that can arise when the agent invokes an LLM provider.
 *
 * Used to surface user-friendly, actionable feedback in the UI and to keep
 * generic "internal" errors from masking transient infrastructure problems.
 */
export type AgentErrorCategory =
  | "network"
  | "auth"
  | "rate_limit"
  | "context_overflow"
  | "validation"
  | "internal";

/**
 * Best-effort classification of an LLM-call error based on its message text.
 *
 * Order of checks matters: more specific signals (auth, rate_limit,
 * context_overflow) are tested before the catch-all `internal` bucket.
 * Substring matching is used because upstream SDKs vary widely in how they
 * wrap these errors.
 */
export function classifyError(err: Error): AgentErrorCategory {
  const msg = err.message.toLowerCase();

  if (
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed")
  ) {
    return "network";
  }

  if (
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid api key") ||
    msg.includes("authentication")
  ) {
    return "auth";
  }

  if (msg.includes("429") || msg.includes("rate limit")) {
    return "rate_limit";
  }

  if (
    msg.includes("context") &&
    (msg.includes("overflow") || msg.includes("too long") || msg.includes("maximum"))
  ) {
    return "context_overflow";
  }

  if (msg.includes("validation") || msg.includes("invalid input")) {
    return "validation";
  }

  return "internal";
}

/**
 * Emit a structured `agent.error` SSE frame so the frontend can distinguish
 * categorized provider failures from generic transport errors.
 *
 * The frame shape mirrors the other event payloads sent through
 * `parseSSEStream` on the client (custom event type + JSON detail payload).
 */
export function sendErrorEvent(
  res: ServerResponse,
  category: AgentErrorCategory,
  message: string,
): void {
  res.write(
    `event: agent.error\ndata: ${JSON.stringify({ type: "agent.error", payload: { category, message } })}\n\n`,
  );
}