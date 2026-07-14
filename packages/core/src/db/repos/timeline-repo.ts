import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";
import type { RunStatus } from "./_types.js";

export class TimelineRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createTimeline(event: {
    sessionId?: string;
    workflowRunId?: string;
    skillRunId?: string;
    type: string;
    title: string;
    detail?: string;
    status: RunStatus | "info";
    payload?: unknown;
  }) {
    const eventId = id("evt");
    this.db.prepare(`
      INSERT INTO timeline_events
      (id, session_id, workflow_run_id, skill_run_id, type, title, detail, status, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      event.sessionId ?? null,
      event.workflowRunId ?? null,
      event.skillRunId ?? null,
      event.type,
      event.title,
      event.detail ?? null,
      event.status,
      JSON.stringify(event.payload ?? null),
      nowIso(),
    );
    return eventId;
  }

  createSessionFork(id: string, parentId: string, title: string) {
    const createdAt = nowIso();
    const path = `fork:${parentId}`;
    this.db
      .prepare("INSERT INTO sessions (id, name, path, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, 'active')")
      .run(id, title, path, createdAt, createdAt);
    return { id, name: title, path, createdAt, parentId };
  }
}