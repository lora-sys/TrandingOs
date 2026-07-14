import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson, type EvolutionSuggestionRow } from "./_helpers.js";
import type { EvolutionSuggestionRecord } from "./_types.js";

export class EvolutionRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createEvolutionProposal(input: { strategyId?: string; status?: string; proposal: unknown; artifactId?: string; approvalId?: string }) {
    const proposalId = id("evo");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO evolution_proposals (id, strategy_id, status, proposal_json, artifact_id, approval_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proposalId,
      input.strategyId ?? null,
      input.status ?? "proposed",
      JSON.stringify(input.proposal),
      input.artifactId ?? null,
      input.approvalId ?? null,
      timestamp,
      timestamp,
    );
    return proposalId;
  }

  createEvolutionSuggestion(input: {
    workspaceId?: string;
    reviewId?: string;
    title: string;
    description: string;
    category?: string;
    priority?: string;
    status?: string;
    ruleText?: string;
    source?: unknown;
  }) {
    const suggestionId = id("evs");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO evolution_suggestions
      (id, workspace_id, review_id, title, description, category, priority, status, rule_text, source_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestionId,
      input.workspaceId ?? null,
      input.reviewId ?? null,
      input.title,
      input.description,
      input.category ?? "rule",
      input.priority ?? "medium",
      input.status ?? "proposed",
      input.ruleText ?? null,
      JSON.stringify(input.source ?? {}),
      timestamp,
      timestamp,
    );
    return this.getEvolutionSuggestion(suggestionId)!;
  }

  listEvolutionSuggestions(input: { workspaceId?: string; status?: string; limit?: number } = {}) {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (input.workspaceId) {
      clauses.push("workspace_id = ?");
      params.push(input.workspaceId);
    }
    if (input.status) {
      clauses.push("status = ?");
      params.push(input.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(input.limit ?? 100);
    return this.db
      .prepare(`SELECT * FROM evolution_suggestions ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params)
      .map((row) => this.mapEvolutionSuggestion(row as unknown as EvolutionSuggestionRow));
  }

  getEvolutionSuggestion(suggestionId: string) {
    const row = this.db.prepare("SELECT * FROM evolution_suggestions WHERE id = ?").get(suggestionId) as EvolutionSuggestionRow | undefined;
    return row ? this.mapEvolutionSuggestion(row) : undefined;
  }

  updateEvolutionSuggestionStatus(suggestionId: string, status: string) {
    this.db.prepare("UPDATE evolution_suggestions SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), suggestionId);
    return this.getEvolutionSuggestion(suggestionId);
  }

  private mapEvolutionSuggestion(row: EvolutionSuggestionRow): EvolutionSuggestionRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      reviewId: row.review_id ?? undefined,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      ruleText: row.rule_text ?? undefined,
      source: parseJson(row.source_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}