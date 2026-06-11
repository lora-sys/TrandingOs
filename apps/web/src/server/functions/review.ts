import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const getReviews = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("reviews") as any[];
  },
);

export const runDailyReview = createServerFn({ method: "POST" })
  .validator((sessionId?: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(sessionId);
    const trace = runtime.telemetry.trace("review.daily", {
      sessionId: session.id,
    });
    const result = await runtime.workflows.run(
      "review.daily",
      { period: "daily" },
      runtime.workflowContext(session.id),
    );
    trace?.span({
      name: "review.daily",
      input: { period: "daily" },
      output: result.output,
    });
    await runtime.telemetry.flush();
    return { sessionId: session.id, ...result };
  });