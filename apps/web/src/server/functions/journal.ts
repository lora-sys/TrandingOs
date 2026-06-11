import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";
import { runApiSkill } from "../utils.js";

export const listJournal = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("journal_entries") as any[];
  },
);

export const createJournal = createServerFn({ method: "POST" })
  .validator(
    (input: {
      tradeId?: string;
      mood: string;
      disciplineScore: number;
      rulesViolated: string[];
      notes: string;
      sessionId?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "journal.entry.create", data, session.id)),
    };
  });

export const getReviews = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.repos.list("reviews") as any[];
});