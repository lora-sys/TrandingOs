import type { TradingPiDatabase } from "../database.js";
import {
  appendSettlementNotes,
  directionSign,
  id,
  nowIso,
  parseJson,
  type PaperTradeRow,
} from "./_helpers.js";
import type { PaperTradeStatus, DecisionStatus, PaperTradeRecord } from "./_types.js";
import type { TimelineRepo } from "./timeline-repo.js";

export class PaperTradingRepo {
  constructor(
    private readonly database: TradingPiDatabase,
    private readonly timeline: TimelineRepo,
  ) {}

  get db() {
    return this.database.db;
  }

  createPaperOrder(input: {
    sessionId?: string;
    symbol: string;
    side: "buy" | "sell";
    orderType?: string;
    quantity: number;
    price: number;
    sourcePlanArtifactId?: string;
    payload?: unknown;
  }) {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const timestamp = nowIso();
      const orderId = id("ord");
      const tradeId = id("trd");
      const symbol = input.symbol.toUpperCase();
      this.db.prepare(`
        INSERT INTO orders
        (id, session_id, symbol, side, order_type, quantity, price, status, mode, source_plan_artifact_id, payload_json, created_at, filled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'filled', 'paper', ?, ?, ?, ?)
      `).run(
        orderId,
        input.sessionId ?? null,
        symbol,
        input.side,
        input.orderType ?? "market",
        input.quantity,
        input.price,
        input.sourcePlanArtifactId ?? null,
        JSON.stringify(input.payload ?? {}),
        timestamp,
        timestamp,
      );
      this.db.prepare(`
        INSERT INTO trades
        (id, order_id, session_id, symbol, side, quantity, entry_price, pnl, status, opened_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open', ?)
      `).run(tradeId, orderId, input.sessionId ?? null, symbol, input.side, input.quantity, input.price, timestamp);
      const sign = input.side === "buy" ? 1 : -1;
      const existing = this.db.prepare("SELECT * FROM positions WHERE symbol = ?").get(symbol) as
        | { quantity: number; avg_price: number; realized_pnl: number }
        | undefined;
      const nextQuantity = (existing?.quantity ?? 0) + sign * input.quantity;
      const nextAvg =
        !existing || existing.quantity === 0
          ? input.price
          : Math.abs((existing.quantity * existing.avg_price + sign * input.quantity * input.price) / (nextQuantity || 1));
      this.db.prepare(`
        INSERT INTO positions (symbol, quantity, avg_price, realized_pnl, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          quantity=excluded.quantity,
          avg_price=excluded.avg_price,
          updated_at=excluded.updated_at
      `).run(symbol, nextQuantity, nextAvg, existing?.realized_pnl ?? 0, timestamp);
      this.timeline.createTimeline({
        sessionId: input.sessionId,
        type: "paper.order",
        title: `Paper order filled: ${input.side.toUpperCase()} ${symbol}`,
        status: "completed",
        payload: { orderId, tradeId, mode: "paper", quantity: input.quantity, price: input.price },
      });
      this.db.exec("COMMIT;");
      return { orderId, tradeId, mode: "paper", status: "filled" as const };
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  createPaperTrade(input: {
    decisionId: string;
    workspaceId: string;
    direction: string;
    asset: string;
    entryPrice: number;
    positionSize: number;
    settlementReason?: string;
  }) {
    const paperTradeId = id("ptr");
    const timestamp = nowIso();
    this.db.exec("BEGIN TRANSACTION;");
    try {
      this.db.prepare(`
        INSERT INTO paper_trades
        (id, decision_id, workspace_id, direction, asset, entry_price, position_size, entry_time, status, settlement_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
      `).run(
        paperTradeId,
        input.decisionId,
        input.workspaceId,
        input.direction,
        input.asset,
        input.entryPrice,
        input.positionSize,
        timestamp,
        input.settlementReason ?? null,
      );
      const journalId = id("jnl");
      const notes = JSON.stringify(
        {
          dimension1TradeData: {
            direction: input.direction,
            asset: input.asset,
            entryPrice: input.entryPrice,
            positionSize: input.positionSize,
            entryTime: timestamp,
            status: "open",
          },
          dimension2Reasoning: {
            decisionId: input.decisionId,
            source: "paper.trade.lifecycle",
          },
        },
        null,
        2,
      );
      this.db.prepare(`
        INSERT INTO journal_entries
        (id, session_id, workspace_id, decision_id, paper_trade_id, trade_id, plan_artifact_id, mood, discipline_score, rules_violated_json, notes, screenshot_path, artifact_id, created_at)
        VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, 0, '[]', ?, NULL, NULL, ?)
      `).run(journalId, input.workspaceId, input.decisionId, paperTradeId, notes, timestamp);
      this.db.prepare("UPDATE paper_trades SET journal_entry_id = ? WHERE id = ?").run(journalId, paperTradeId);
      this.db.prepare("UPDATE decisions SET status = 'executed', executed_at = COALESCE(executed_at, ?), updated_at = ? WHERE id = ?").run(
        timestamp,
        timestamp,
        input.decisionId,
      );
      this.timeline.createTimeline({
        type: "paper_trade",
        title: `Paper trade opened: ${input.asset}`,
        status: "completed",
        payload: { paperTradeId, decisionId: input.decisionId, workspaceId: input.workspaceId, entryPrice: input.entryPrice },
      });
      this.db.exec("COMMIT;");
      return this.getPaperTrade(paperTradeId)!;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  settlePaperTrade(paperTradeId: string, input: { exitPrice: number; settlementReason?: string; exitTime?: string }) {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    if (existing.status !== "open") return existing;
    const exitTime = input.exitTime ?? nowIso();
    const pnl = (input.exitPrice - existing.entryPrice) * existing.positionSize * directionSign(existing.direction);
    const notional = Math.abs(existing.entryPrice * existing.positionSize);
    const pnlPercent = notional === 0 ? 0 : (pnl / notional) * 100;
    const decisionStatus: DecisionStatus = pnl >= 0 ? "settled_win" : "settled_loss";
    this.db.exec("BEGIN TRANSACTION;");
    try {
      this.db.prepare(`
        UPDATE paper_trades
        SET exit_price = ?, pnl = ?, pnl_percent = ?, exit_time = ?, status = 'closed', settlement_reason = ?
        WHERE id = ?
      `).run(input.exitPrice, pnl, pnlPercent, exitTime, input.settlementReason ?? "manual_settlement", paperTradeId);
      this.db.prepare(`
        UPDATE decisions
        SET status = ?, result_pnl = ?, settled_at = ?, updated_at = ?
        WHERE id = ?
      `).run(decisionStatus, pnl, exitTime, exitTime, existing.decisionId);
      if (existing.journalEntryId) {
        const current = this.db.prepare("SELECT notes FROM journal_entries WHERE id = ?").get(existing.journalEntryId) as { notes: string } | undefined;
        const notes = appendSettlementNotes(current?.notes ?? "", {
          exitPrice: input.exitPrice,
          exitTime,
          pnl,
          pnlPercent,
          settlementReason: input.settlementReason ?? "manual_settlement",
        });
        this.db.prepare("UPDATE journal_entries SET notes = ? WHERE id = ?").run(notes, existing.journalEntryId);
      }
      this.timeline.createTimeline({
        type: "paper_trade_settled",
        title: `Paper trade settled: ${existing.asset}`,
        status: "completed",
        payload: { paperTradeId, decisionId: existing.decisionId, pnl, pnlPercent, exitPrice: input.exitPrice },
      });
      this.db.exec("COMMIT;");
      return this.getPaperTrade(paperTradeId);
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  cancelPaperTrade(paperTradeId: string, reason = "cancelled") {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    const timestamp = nowIso();
    this.db
      .prepare("UPDATE paper_trades SET status = 'cancelled', exit_time = ?, settlement_reason = ? WHERE id = ?")
      .run(timestamp, reason, paperTradeId);
    return this.getPaperTrade(paperTradeId);
  }

  updatePaperTrade(
    paperTradeId: string,
    input: { stopLoss?: number; takeProfit?: number },
  ) {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    if (existing.status !== "open") return existing;
    const timestamp = nowIso();
    this.db
      .prepare("UPDATE paper_trades SET stop_loss = ?, take_profit = ?, amended_at = ? WHERE id = ?")
      .run(
        input.stopLoss ?? existing.stopLoss ?? null,
        input.takeProfit ?? existing.takeProfit ?? null,
        timestamp,
        paperTradeId,
      );
    this.timeline.createTimeline({
      type: "paper_trade_amended",
      title: `Paper trade amended: ${existing.asset}`,
      status: "completed",
      payload: {
        paperTradeId,
        decisionId: existing.decisionId,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
      },
    });
    return this.getPaperTrade(paperTradeId);
  }

  partialClosePaperTrade(
    paperTradeId: string,
    input: { percentClose: number; exitPrice: number; settlementReason?: string },
  ) {
    const existing = this.getPaperTrade(paperTradeId);
    if (!existing) return undefined;
    if (existing.status !== "open") return existing;
    if (input.percentClose <= 0 || input.percentClose > 100) {
      throw new Error(`partialClose percentClose must be in (0, 100], got ${input.percentClose}`);
    }
    const fraction = input.percentClose / 100;
    const closedSize = existing.positionSize * fraction;
    const remainingSize = existing.positionSize - closedSize;
    const closedPnl = (input.exitPrice - existing.entryPrice) * closedSize * directionSign(existing.direction);
    const notional = Math.abs(existing.entryPrice * closedSize);
    const closedPnlPercent = notional === 0 ? 0 : (closedPnl / notional) * 100;
    const timestamp = nowIso();
    const newRealizedPnl = existing.realizedPnl + closedPnl;
    const settlementReason = input.settlementReason ?? `partial_close_${input.percentClose}`;
    const newStatus = remainingSize <= 0 ? "closed" : "open";
    this.db.prepare(`
      UPDATE paper_trades
      SET position_size = ?, pnl = ?, pnl_percent = ?, realized_pnl = ?, exit_time = ?, status = ?, settlement_reason = ?
      WHERE id = ?
    `).run(
      remainingSize,
      closedPnl,
      closedPnlPercent,
      newRealizedPnl,
      newStatus === "closed" ? timestamp : null,
      newStatus,
      settlementReason,
      paperTradeId,
    );
    this.timeline.createTimeline({
      type: "paper_trade_partial_close",
      title: `Paper trade partial close: ${existing.asset} (${input.percentClose}%)`,
      status: "completed",
      payload: {
        paperTradeId,
        decisionId: existing.decisionId,
        percentClose: input.percentClose,
        exitPrice: input.exitPrice,
        realizedPnl: closedPnl,
        remainingSize,
        status: newStatus,
      },
    });
    return this.getPaperTrade(paperTradeId);
  }

  listPaperTrades(input: { workspaceId?: string; status?: PaperTradeStatus } = {}) {
    const clauses: string[] = [];
    const params: string[] = [];
    if (input.workspaceId) {
      clauses.push("workspace_id = ?");
      params.push(input.workspaceId);
    }
    if (input.status) {
      clauses.push("status = ?");
      params.push(input.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM paper_trades ${where} ORDER BY entry_time DESC LIMIT 100`)
      .all(...params)
      .map((row) => this.mapPaperTrade(row as unknown as PaperTradeRow));
  }

  getPaperTrade(paperTradeId: string) {
    const row = this.db.prepare("SELECT * FROM paper_trades WHERE id = ?").get(paperTradeId) as PaperTradeRow | undefined;
    return row ? this.mapPaperTrade(row) : undefined;
  }

  private mapPaperTrade(row: PaperTradeRow): PaperTradeRecord {
    return {
      id: row.id,
      decisionId: row.decision_id,
      workspaceId: row.workspace_id,
      direction: row.direction,
      asset: row.asset,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price ?? undefined,
      positionSize: row.position_size,
      pnl: row.pnl ?? undefined,
      pnlPercent: row.pnl_percent ?? undefined,
      entryTime: row.entry_time,
      exitTime: row.exit_time ?? undefined,
      status: row.status,
      settlementReason: row.settlement_reason ?? undefined,
      journalEntryId: row.journal_entry_id ?? undefined,
      stopLoss: row.stop_loss ?? undefined,
      takeProfit: row.take_profit ?? undefined,
      amendedAt: row.amended_at ?? undefined,
      realizedPnl: row.realized_pnl,
    };
  }
}