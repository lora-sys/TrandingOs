import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";

export class JournalRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createJournalEntry(input: {
    sessionId?: string;
    workspaceId?: string;
    decisionId?: string;
    paperTradeId?: string;
    tradeId?: string;
    planArtifactId?: string;
    mood?: string;
    disciplineScore?: number;
    rulesViolated?: string[];
    notes: string;
    screenshotPath?: string;
    artifactId?: string;
  }) {
    const journalId = id("jnl");
    this.db.prepare(`
      INSERT INTO journal_entries
      (id, session_id, workspace_id, decision_id, paper_trade_id, trade_id, plan_artifact_id, mood, discipline_score, rules_violated_json, notes, screenshot_path, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      journalId,
      input.sessionId ?? null,
      input.workspaceId ?? null,
      input.decisionId ?? null,
      input.paperTradeId ?? null,
      input.tradeId ?? null,
      input.planArtifactId ?? null,
      input.mood ?? null,
      input.disciplineScore ?? 0,
      JSON.stringify(input.rulesViolated ?? []),
      input.notes,
      input.screenshotPath ?? null,
      input.artifactId ?? null,
      nowIso(),
    );
    return journalId;
  }

  attachJournalArtifact(journalId: string, artifactId: string) {
    this.db.prepare("UPDATE journal_entries SET artifact_id = ? WHERE id = ?").run(artifactId, journalId);
  }
}