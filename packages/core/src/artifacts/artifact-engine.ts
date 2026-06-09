import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalPaths } from "../config/paths.js";
import type { Repositories } from "../db/repositories.js";

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export class ArtifactEngine {
  constructor(
    private readonly paths: LocalPaths,
    private readonly repos: Repositories,
  ) {}

  create(input: {
    type: string;
    title: string;
    summary: string;
    markdown: string;
    sessionId?: string;
    workflowRunId?: string;
    payload?: unknown;
  }) {
    const dir = resolve(this.paths.artifactsDir, input.type);
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${Date.now()}-${slug(input.title)}.md`);
    writeFileSync(path, input.markdown);
    const artifactId = this.repos.createArtifact({
      sessionId: input.sessionId,
      workflowRunId: input.workflowRunId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      path,
      payload: input.payload ?? {},
    });
    this.repos.createTimeline({
      sessionId: input.sessionId,
      workflowRunId: input.workflowRunId,
      type: "artifact",
      title: `Artifact created: ${input.title}`,
      detail: input.summary,
      status: "completed",
      payload: { artifactId, path, type: input.type },
    });
    return { id: artifactId, path };
  }
}

