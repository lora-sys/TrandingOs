import type { TradingPiDatabase } from "../database.js";
import { id, nowIso } from "./_helpers.js";

export class AuditRepo {
  constructor(private readonly database: TradingPiDatabase) {}

  get db() {
    return this.database.db;
  }

  createAuditRecord(input: { category: string; action: string; status: string; actor?: string; payload?: unknown }) {
    const auditId = id("aud");
    this.db.prepare(`
      INSERT INTO audit_records (id, category, action, status, actor, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(auditId, input.category, input.action, input.status, input.actor ?? "system", JSON.stringify(input.payload ?? {}), nowIso());
    return auditId;
  }
}