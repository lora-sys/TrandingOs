import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";
import { runApiSkill } from "../utils.js";
import { readFileSync } from "node:fs";

export const getArtifacts = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("artifacts") as any[];
  },
);

export const getArtifact = createServerFn({ method: "GET" })
  .validator((artifactId: string) => artifactId)
  .handler(async ({ data: artifactId }) => {
    const runtime = createRuntime();
    const artifact = runtime.repos.getArtifact(artifactId);
    if (!artifact) {
      return { error: "Artifact not found" };
    }
    return {
      ...artifact,
      payload: JSON.parse(artifact.payload_json),
      content:
        artifact.content ?? readFileSync(artifact.path, "utf8"),
      contentType: artifact.content_type,
      previewReady: Boolean(artifact.preview_ready),
      previewPayload: artifact.preview_payload_json
        ? JSON.parse(artifact.preview_payload_json)
        : null,
      markdown: readFileSync(artifact.path, "utf8"),
    };
  });

export const getArtifactPreview = createServerFn({ method: "GET" })
  .validator((artifactId: string) => artifactId)
  .handler(async ({ data: artifactId }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(undefined);
    return runApiSkill(runtime, "artifact.preview", { artifactId }, session.id);
  });

export const getApprovals = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("approvals") as any[];
  },
);

export const getMarketplace = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = createRuntime();
    return runtime.repos.list("marketplace_items") as any[];
  },
);

export const seedMarketplace = createServerFn({ method: "POST" })
  .validator((sessionId?: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "marketplace.catalog.seed", {}, session.id)),
    };
  });

export const searchQuery = createServerFn({ method: "POST" })
  .validator((input: { query: string; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    return {
      sessionId: session.id,
      ...(await runApiSkill(runtime, "search.query", data, session.id)),
    };
  });