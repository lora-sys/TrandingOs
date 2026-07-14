import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson, type ReviewRow } from "./_helpers.js";
import type { ReviewRecord } from "./_types.js";

export class ReviewRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createReview(input: {
    sessionId?: string;
    workspaceId?: string;
    period: string;
    metrics: unknown;
    disciplineScore: number;
    summary: string;
    report?: unknown;
    artifactId?: string;
  }) {
    const reviewId = id("rev");
    this.db.prepare(`
      INSERT INTO reviews (id, session_id, workspace_id, period, metrics_json, discipline_score, summary, report_json, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId,
      input.sessionId ?? null,
      input.workspaceId ?? null,
      input.period,
      JSON.stringify(input.metrics),
      input.disciplineScore,
      input.summary,
      JSON.stringify(input.report ?? {}),
      input.artifactId ?? null,
      nowIso(),
    );
    return reviewId;
  }

  attachReviewArtifact(reviewId: string, artifactId: string) {
    this.db.prepare("UPDATE reviews SET artifact_id = ? WHERE id = ?").run(artifactId, reviewId);
  }

  listReviews(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM reviews WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").all(workspaceId)
      : this.db.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapReview(row as unknown as ReviewRow));
  }

  getReview(reviewId: string) {
    const row = this.db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId) as ReviewRow | undefined;
    return row ? this.mapReview(row) : undefined;
  }

  reviewMetrics() {
    const trades = this.db.prepare("SELECT * FROM trades ORDER BY opened_at DESC LIMIT 200").all() as Array<{ pnl: number; status: string }>;
    const journals = this.db
      .prepare("SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 200")
      .all() as Array<{ discipline_score: number; rules_violated_json: string }>;
    const closed = trades.filter((trade) => trade.status === "closed");
    const wins = closed.filter((trade) => trade.pnl > 0).length;
    const ruleBreaks = journals.reduce((sum, entry) => {
      try {
        return sum + (JSON.parse(entry.rules_violated_json) as string[]).length;
      } catch {
        return sum;
      }
    }, 0);
    const avgDiscipline = journals.length
      ? Math.round(journals.reduce((sum, entry) => sum + entry.discipline_score, 0) / journals.length)
      : 0;
    return {
      trades: trades.length,
      openTrades: trades.filter((trade) => trade.status === "open").length,
      closedTrades: closed.length,
      winRate: closed.length ? wins / closed.length : 0,
      realizedPnl: closed.reduce((sum, trade) => sum + trade.pnl, 0),
      journalEntries: journals.length,
      ruleBreaks,
      disciplineScore: avgDiscipline,
    };
  }

  private mapReview(row: ReviewRow): ReviewRecord {
    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      workspaceId: row.workspace_id ?? undefined,
      period: row.period,
      metrics: parseJson(row.metrics_json, {}),
      disciplineScore: row.discipline_score,
      summary: row.summary,
      report: parseJson(row.report_json, {}),
      artifactId: row.artifact_id ?? undefined,
      createdAt: row.created_at,
    };
  }
}