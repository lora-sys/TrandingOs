import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { LocalPaths } from "../config/paths.js";
import type { Repositories } from "../db/repositories.js";
import { nowIso } from "../db/repositories.js";

export interface SessionEntry {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
  data: unknown;
}

export class SessionStore {
  constructor(
    private readonly paths: LocalPaths,
    private readonly repos: Repositories,
  ) {}

  createSession(name = "Trading Pi Session") {
    const sessionId = `ses_${randomUUID()}`;
    const createdAt = nowIso();
    const path = resolve(this.paths.sessionsDir, `${createdAt.replace(/[:.]/g, "-")}_${sessionId}.jsonl`);
    writeFileSync(
      path,
      `${JSON.stringify({ type: "session", version: 1, id: sessionId, timestamp: createdAt, name })}\n`,
    );
    this.repos.db
      .prepare("INSERT INTO sessions (id, name, path, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, 'active')")
      .run(sessionId, name, path, createdAt, createdAt);
    return { id: sessionId, name, path, createdAt };
  }

  getSession(sessionId: string) {
    return this.repos.db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as
      | { id: string; name: string; path: string }
      | undefined;
  }

  ensureSession(sessionId?: string) {
    if (sessionId) {
      const session = this.getSession(sessionId);
      if (session) return session;
    }
    return this.createSession();
  }

  append(sessionId: string, type: string, data: unknown) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    const entries = this.read(sessionId);
    const previous = entries.at(-1);
    const entry: SessionEntry = {
      type,
      id: `ent_${randomUUID().slice(0, 8)}`,
      parentId: previous?.id ?? null,
      timestamp: nowIso(),
      data,
    };
    appendFileSync(session.path, `${JSON.stringify(entry)}\n`);
    this.repos.db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(entry.timestamp, sessionId);
    return entry;
  }

  read(sessionId: string): SessionEntry[] {
    const session = this.getSession(sessionId);
    if (!session || !existsSync(session.path)) return [];
    return readFileSync(session.path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.type !== "session");
  }
}

