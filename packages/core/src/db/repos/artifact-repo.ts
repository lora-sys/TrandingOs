import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";

export class ArtifactRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createArtifact(artifact: {
    sessionId?: string;
    workflowRunId?: string;
    workspaceId?: string;
    type: string;
    title: string;
    summary: string;
    path: string;
    contentType?: string;
    content?: string;
    previewReady?: boolean;
    previewPayload?: unknown;
    payload: unknown;
  }) {
    const artifactId = id("art");
    this.db.prepare(`
      INSERT INTO artifacts
      (id, session_id, workflow_run_id, workspace_id, type, title, summary, path, content_type, content, preview_ready, preview_payload_json, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifactId,
      artifact.sessionId ?? null,
      artifact.workflowRunId ?? null,
      artifact.workspaceId ?? null,
      artifact.type,
      artifact.title,
      artifact.summary,
      artifact.path,
      artifact.contentType ?? "text/markdown",
      artifact.content ?? null,
      artifact.previewReady ? 1 : 0,
      JSON.stringify(artifact.previewPayload ?? null),
      JSON.stringify(artifact.payload),
      nowIso(),
    );
    return artifactId;
  }

  getArtifact(artifactId: string) {
    return this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId) as
      | {
          id: string;
          session_id: string | null;
          workflow_run_id: string | null;
          workspace_id: string | null;
          type: string;
          title: string;
          summary: string;
          path: string;
          content_type: string;
          content: string | null;
          preview_ready: number;
          preview_payload_json: string | null;
          payload_json: string;
          created_at: string;
        }
      | undefined;
  }
}