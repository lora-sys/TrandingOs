import type { TradingPiDatabase } from "../database.js";
import { id, nowIso, parseJson, type ResearchSessionRow } from "./_helpers.js";
import type { ResearchSessionStatus, ResearchSessionRecord } from "./_types.js";
import type { TimelineRepo } from "./timeline-repo.js";

export class AlphaRepo {
  constructor(
    private readonly database: TradingPiDatabase,
    private readonly timeline: TimelineRepo,
  ) {}

  get db() {
    return this.database.db;
  }

  createResearchSession(input: { workspaceId?: string; topic: string; mode?: "builtin"; totalIterations?: number }) {
    const sessionId = id("rs");
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO research_sessions
      (id, workspace_id, topic, mode, status, total_iterations, completed_iterations, token_usage_json, started_at)
      VALUES (?, ?, ?, ?, 'running', ?, 0, '{}', ?)
    `).run(sessionId, input.workspaceId ?? null, input.topic, input.mode ?? "builtin", input.totalIterations ?? 0, timestamp);
    this.timeline.createTimeline({
      type: "research",
      title: `Deep Research started: ${input.topic}`,
      status: "running",
      payload: { researchSessionId: sessionId, workspaceId: input.workspaceId ?? null, mode: input.mode ?? "builtin" },
    });
    return this.getResearchSession(sessionId)!;
  }

  updateResearchSession(
    sessionId: string,
    input: Partial<{
      status: ResearchSessionStatus;
      totalIterations: number;
      completedIterations: number;
      reportArtifactId: string;
      tokenUsage: unknown;
      errorMessage: string;
      completedAt: string;
    }>,
  ) {
    const existing = this.getResearchSession(sessionId);
    if (!existing) return undefined;
    const completedAt =
      input.completedAt ??
      (input.status === "completed" || input.status === "failed" || input.status === "cancelled" ? nowIso() : existing.completedAt ?? null);
    this.db.prepare(`
      UPDATE research_sessions
      SET status = ?, total_iterations = ?, completed_iterations = ?, report_artifact_id = ?,
          token_usage_json = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `).run(
      input.status ?? existing.status,
      input.totalIterations ?? existing.totalIterations,
      input.completedIterations ?? existing.completedIterations,
      input.reportArtifactId ?? existing.reportArtifactId ?? null,
      JSON.stringify(input.tokenUsage ?? existing.tokenUsage ?? {}),
      input.errorMessage ?? existing.errorMessage ?? null,
      completedAt,
      sessionId,
    );
    return this.getResearchSession(sessionId);
  }

  listResearchSessions(workspaceId?: string) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM research_sessions WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 100").all(workspaceId)
      : this.db.prepare("SELECT * FROM research_sessions ORDER BY started_at DESC LIMIT 100").all();
    return rows.map((row) => this.mapResearchSession(row as unknown as ResearchSessionRow));
  }

  getResearchSession(sessionId: string) {
    const row = this.db.prepare("SELECT * FROM research_sessions WHERE id = ?").get(sessionId) as ResearchSessionRow | undefined;
    return row ? this.mapResearchSession(row) : undefined;
  }

  upsertStrategy(input: { id?: string; name: string; version?: string; status?: string; parameters?: unknown; score?: number }) {
    const timestamp = nowIso();
    const strategyId = input.id ?? id("str");
    this.db.prepare(`
      INSERT INTO strategies (id, name, version, status, parameters_json, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, version=excluded.version, status=excluded.status,
        parameters_json=excluded.parameters_json, score=excluded.score, updated_at=excluded.updated_at
    `).run(strategyId, input.name, input.version ?? "1.0.0", input.status ?? "draft", JSON.stringify(input.parameters ?? {}), input.score ?? 0, timestamp, timestamp);
    return strategyId;
  }

  createBacktest(input: { strategyId?: string; status: string; metrics?: unknown; artifactId?: string }) {
    const backtestId = id("bkt");
    this.db.prepare(`
      INSERT INTO backtests (id, strategy_id, status, metrics_json, artifact_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(backtestId, input.strategyId ?? null, input.status, JSON.stringify(input.metrics ?? {}), input.artifactId ?? null, nowIso());
    return backtestId;
  }

  portfolioSnapshot() {
    return {
      positions: this.db.prepare("SELECT * FROM positions ORDER BY updated_at DESC LIMIT 100").all(),
      orders: this.db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all(),
      trades: this.db.prepare("SELECT * FROM trades ORDER BY opened_at DESC LIMIT 100").all(),
    };
  }

  async upsertMarketPrice(data: { symbol: string; exchange?: string; source: string; price_usd?: number; change_24h?: number; bid?: number; ask?: number; last?: number; high?: number; low?: number; volume?: number; extra_json?: string }) {
    const priceId = `mp_${data.symbol}_${data.source}`;
    const fetchedAt = nowIso();
    this.db.prepare(`
      INSERT INTO market_prices (id, symbol, exchange, source, price_usd, change_24h, bid, ask, last, high, low, volume, extra_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        symbol=excluded.symbol, exchange=excluded.exchange, source=excluded.source,
        price_usd=excluded.price_usd, change_24h=excluded.change_24h, bid=excluded.bid,
        ask=excluded.ask, last=excluded.last, high=excluded.high, low=excluded.low,
        volume=excluded.volume, extra_json=excluded.extra_json, fetched_at=excluded.fetched_at
    `).run(
      priceId,
      data.symbol,
      data.exchange ?? null,
      data.source,
      data.price_usd ?? null,
      data.change_24h ?? null,
      data.bid ?? null,
      data.ask ?? null,
      data.last ?? null,
      data.high ?? null,
      data.low ?? null,
      data.volume ?? null,
      data.extra_json ?? null,
      fetchedAt,
    );
    return priceId;
  }

  async getLatestMarketPrice(symbol: string, source?: string): Promise<unknown | null> {
    const query = source
      ? "SELECT * FROM market_prices WHERE symbol = ? AND source = ? ORDER BY fetched_at DESC LIMIT 1"
      : "SELECT * FROM market_prices WHERE symbol = ? ORDER BY fetched_at DESC LIMIT 1";
    const params = source ? [symbol, source] : [symbol];
    return this.db.prepare(query).get(...params) ?? null;
  }

  async listMarketPrices(symbol: string): Promise<unknown[]> {
    return this.db.prepare("SELECT * FROM market_prices WHERE symbol = ? ORDER BY fetched_at DESC LIMIT 50").all(symbol);
  }

  async upsertOhlcvCandles(candles: Array<{ symbol: string; exchange?: string; timeframe: string; timestamp: number; open: number; high: number; low: number; close: number; volume?: number }>) {
    const fetchedAt = nowIso();
    const insert = this.db.prepare(`
      INSERT INTO market_ohlcv (id, symbol, exchange, timeframe, timestamp, open, high, low, close, volume, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        symbol=excluded.symbol, exchange=excluded.exchange, timeframe=excluded.timeframe,
        timestamp=excluded.timestamp, open=excluded.open, high=excluded.high,
        low=excluded.low, close=excluded.close, volume=excluded.volume, fetched_at=excluded.fetched_at
    `);
    for (const row of candles) {
      const candleId = `ohlcv_${row.symbol}_${row.timeframe}_${row.timestamp}`;
      insert.run(
        candleId,
        row.symbol,
        row.exchange ?? null,
        row.timeframe,
        row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume ?? 0,
        fetchedAt,
      );
    }
  }

  async getOhlcvCandles(symbol: string, timeframe: string, limit?: number): Promise<unknown[]> {
    const rows = this.db.prepare(
      "SELECT * FROM market_ohlcv WHERE symbol = ? AND timeframe = ? ORDER BY timestamp DESC LIMIT ?"
    ).all(symbol, timeframe, limit ?? 100);
    return rows;
  }

  async getCachedSearchResults(query: string, provider: string): Promise<unknown | null> {
    const row = this.db.prepare(
      "SELECT * FROM search_cache WHERE query = ? AND provider = ? ORDER BY fetched_at DESC LIMIT 1"
    ).get(query, provider) as { results_json: string; expires_at: string | null } | undefined;
    if (!row) return null;
    if (row.expires_at && Date.parse(row.expires_at) < Date.now()) return null;
    return { results: JSON.parse(row.results_json) };
  }

  async cacheSearchResults(query: string, provider: string, results: unknown, ttlMinutes?: number) {
    const cacheId = id("sc");
    const fetchedAt = nowIso();
    const expiresAt = ttlMinutes ? new Date(Date.now() + ttlMinutes * 60_000).toISOString() : null;
    this.db.prepare(`
      INSERT INTO search_cache (id, query, provider, results_json, fetched_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        query=excluded.query, provider=excluded.provider, results_json=excluded.results_json,
        fetched_at=excluded.fetched_at, expires_at=excluded.expires_at
    `).run(cacheId, query, provider, JSON.stringify(results), fetchedAt, expiresAt);
  }

  private mapResearchSession(row: ResearchSessionRow): ResearchSessionRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id ?? undefined,
      topic: row.topic,
      mode: row.mode,
      status: row.status,
      totalIterations: row.total_iterations,
      completedIterations: row.completed_iterations,
      reportArtifactId: row.report_artifact_id ?? undefined,
      tokenUsage: parseJson(row.token_usage_json, {}),
      errorMessage: row.error_message ?? undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
    };
  }
}