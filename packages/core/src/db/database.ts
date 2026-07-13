import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export class TradingPiDatabase {
  readonly db: DatabaseSync;

  constructor(readonly sqlitePath: string) {
    mkdirSync(dirname(sqlitePath), { recursive: true });
    this.db = new DatabaseSync(sqlitePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        parts TEXT NOT NULL DEFAULT '[]',
        model TEXT,
        created_at INTEGER NOT NULL,
        finished_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        workflow_run_id TEXT,
        skill_run_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT,
        status TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memory_records (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        domain TEXT,
        workspace_id TEXT,
        source_type TEXT,
        source_id TEXT,
        importance REAL NOT NULL DEFAULT 0.5,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(scope, key)
      );

      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        risk_level TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        session_id TEXT,
        input_json TEXT NOT NULL,
        output_json TEXT,
        status TEXT NOT NULL,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        permission TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS skill_runs (
        id TEXT PRIMARY KEY,
        workflow_run_id TEXT,
        skill_id TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_json TEXT,
        status TEXT NOT NULL,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        workflow_run_id TEXT,
        workspace_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        path TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text/markdown',
        content TEXT,
        preview_ready INTEGER NOT NULL DEFAULT 0,
        preview_payload_json TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft',
          steps TEXT,
          content TEXT,
          result TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        workflow_run_id TEXT,
        action TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL,
        input_json TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        decided_at TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        order_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'paper',
        source_plan_artifact_id TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        filled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        session_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        pnl REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS positions (
        symbol TEXT PRIMARY KEY,
        quantity REAL NOT NULL,
        avg_price REAL NOT NULL,
        realized_pnl REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        workspace_id TEXT,
        decision_id TEXT,
        paper_trade_id TEXT,
        trade_id TEXT,
        plan_artifact_id TEXT,
        mood TEXT,
        discipline_score INTEGER NOT NULL DEFAULT 0,
        rules_violated_json TEXT NOT NULL,
        notes TEXT NOT NULL,
        screenshot_path TEXT,
        artifact_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        workspace_id TEXT,
        period TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        discipline_score INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL,
        report_json TEXT NOT NULL DEFAULT '{}',
        artifact_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system',
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS data_cache (
        key TEXT PRIMARY KEY,
        namespace TEXT NOT NULL,
        value_json TEXT NOT NULL,
        source TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT,
        url TEXT,
        status TEXT NOT NULL,
        permission TEXT NOT NULL,
        health_json TEXT NOT NULL,
        manifest_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mcp_discoveries (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        provider TEXT NOT NULL,
        candidates_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mcp_permissions (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        status TEXT NOT NULL,
        approval_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_sessions (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        action TEXT NOT NULL,
        url TEXT,
        payload_json TEXT NOT NULL,
        result_json TEXT NOT NULL,
        artifact_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspace_links (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS marketplace_items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        permission TEXT NOT NULL,
        manifest_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        kind TEXT NOT NULL,
        topic_type TEXT,
        topic_ref TEXT,
        creator_session_id TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        context_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        topic TEXT NOT NULL,
        direction TEXT NOT NULL,
        position_size REAL NOT NULL DEFAULT 0,
        confidence TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        supporting_reasons_json TEXT NOT NULL,
        against_reasons_json TEXT NOT NULL,
        thesis TEXT NOT NULL,
        invalidation_criteria TEXT NOT NULL,
        rule_compliance_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        executed_at TEXT,
        settled_at TEXT,
        result_pnl REAL,
        review_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS research_sessions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        topic TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'builtin',
        status TEXT NOT NULL,
        total_iterations INTEGER NOT NULL DEFAULT 0,
        completed_iterations INTEGER NOT NULL DEFAULT 0,
        report_artifact_id TEXT,
        token_usage_json TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS paper_trades (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        asset TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        position_size REAL NOT NULL,
        pnl REAL,
        pnl_percent REAL,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        settlement_reason TEXT,
        journal_entry_id TEXT,
        stop_loss REAL,
        take_profit REAL,
        amended_at TEXT,
        realized_pnl REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        parameters_json TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backtests (
        id TEXT PRIMARY KEY,
        strategy_id TEXT,
        status TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        artifact_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evolution_proposals (
        id TEXT PRIMARY KEY,
        strategy_id TEXT,
        status TEXT NOT NULL,
        proposal_json TEXT NOT NULL,
        artifact_id TEXT,
        approval_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evolution_suggestions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        review_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'proposed',
        rule_text TEXT,
        source_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Market price cache
      CREATE TABLE IF NOT EXISTS market_prices (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        exchange TEXT,
        source TEXT NOT NULL,
        price_usd REAL,
        change_24h REAL,
        bid REAL,
        ask REAL,
        last REAL,
        high REAL,
        low REAL,
        volume REAL,
        extra_json TEXT,
        fetched_at TEXT NOT NULL
      );

      -- OHLCV candle persistence
      CREATE TABLE IF NOT EXISTS market_ohlcv (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        exchange TEXT,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL DEFAULT 0,
        fetched_at TEXT NOT NULL
      );

      -- Search results cache
      CREATE TABLE IF NOT EXISTS search_cache (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        provider TEXT NOT NULL,
        results_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        expires_at TEXT
      );
    `);

    // Upgrade older local databases before creating indexes that reference new columns.
    this.addColumnIfMissing("memory_records", "domain", "TEXT");
    this.addColumnIfMissing("memory_records", "workspace_id", "TEXT");
    this.addColumnIfMissing("artifacts", "workspace_id", "TEXT");
    this.addColumnIfMissing("journal_entries", "workspace_id", "TEXT");
    this.addColumnIfMissing("journal_entries", "decision_id", "TEXT");
    this.addColumnIfMissing("journal_entries", "paper_trade_id", "TEXT");
    this.addColumnIfMissing("workspaces", "description", "TEXT");
    this.addColumnIfMissing("workspaces", "topic_type", "TEXT");
    this.addColumnIfMissing("workspaces", "topic_ref", "TEXT");
    this.addColumnIfMissing("workspaces", "creator_session_id", "TEXT");
    this.addColumnIfMissing("workspaces", "is_default", "INTEGER NOT NULL DEFAULT 0");
    this.addColumnIfMissing("decisions", "workspace_id", "TEXT");
    this.addColumnIfMissing("decisions", "rule_compliance_json", "TEXT NOT NULL DEFAULT '{}'");
    this.addColumnIfMissing("research_sessions", "workspace_id", "TEXT");
    this.addColumnIfMissing("paper_trades", "workspace_id", "TEXT");
    this.addColumnIfMissing("paper_trades", "decision_id", "TEXT");
    this.addColumnIfMissing("paper_trades", "stop_loss", "REAL");
    this.addColumnIfMissing("paper_trades", "take_profit", "REAL");
    this.addColumnIfMissing("paper_trades", "amended_at", "TEXT");
    this.addColumnIfMissing("paper_trades", "realized_pnl", "REAL NOT NULL DEFAULT 0");
    this.addColumnIfMissing("reviews", "workspace_id", "TEXT");
    this.addColumnIfMissing("reviews", "report_json", "TEXT NOT NULL DEFAULT '{}'");

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_symbol ON market_prices(symbol, fetched_at DESC);
      CREATE INDEX IF NOT EXISTS idx_market_ohlcv_symbol ON market_ohlcv(symbol, timeframe, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol, status);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_memory_domain ON memory_records(domain, workspace_id);
      CREATE INDEX IF NOT EXISTS idx_timeline_session ON timeline_events(session_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_artifacts_workspace ON artifacts(workspace_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_workspaces_updated ON workspaces(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_decisions_workspace ON decisions(workspace_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_research_sessions_workspace ON research_sessions(workspace_id, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_paper_trades_workspace ON paper_trades(workspace_id, entry_time DESC);
      CREATE INDEX IF NOT EXISTS idx_paper_trades_decision ON paper_trades(decision_id);
      CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades(status, entry_time DESC);
      CREATE INDEX IF NOT EXISTS idx_reviews_workspace ON reviews(workspace_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_evolution_suggestions_status ON evolution_suggestions(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_evolution_suggestions_workspace ON evolution_suggestions(workspace_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(query, provider, fetched_at);
    `);
    this.addColumnIfMissing("sessions", "parent_session_id", "TEXT REFERENCES sessions(id)");
    this.addColumnIfMissing("sessions", "message_count", "INTEGER DEFAULT 0");
    this.addColumnIfMissing("sessions", "prompt_tokens", "INTEGER DEFAULT 0");
    this.addColumnIfMissing("sessions", "completion_tokens", "INTEGER DEFAULT 0");
    this.addColumnIfMissing("memory_records", "domain", "TEXT");
    this.addColumnIfMissing("memory_records", "workspace_id", "TEXT");
    this.addColumnIfMissing("memory_records", "source_type", "TEXT");
    this.addColumnIfMissing("memory_records", "source_id", "TEXT");
    this.addColumnIfMissing("memory_records", "importance", "REAL NOT NULL DEFAULT 0.5");
    this.addColumnIfMissing("memory_records", "metadata_json", "TEXT");
    this.addColumnIfMissing("artifacts", "content_type", "TEXT NOT NULL DEFAULT 'text/markdown'");
    this.addColumnIfMissing("artifacts", "content", "TEXT");
    this.addColumnIfMissing("artifacts", "preview_ready", "INTEGER NOT NULL DEFAULT 0");
    this.addColumnIfMissing("artifacts", "preview_payload_json", "TEXT");
    this.addColumnIfMissing("artifacts", "workspace_id", "TEXT");
    this.addColumnIfMissing("mcp_servers", "manifest_json", "TEXT NOT NULL DEFAULT '{}'");
    this.addColumnIfMissing("journal_entries", "workspace_id", "TEXT");
    this.addColumnIfMissing("journal_entries", "decision_id", "TEXT");
    this.addColumnIfMissing("journal_entries", "paper_trade_id", "TEXT");
    this.addColumnIfMissing("workspaces", "description", "TEXT");
    this.addColumnIfMissing("workspaces", "topic_type", "TEXT");
    this.addColumnIfMissing("workspaces", "topic_ref", "TEXT");
    this.addColumnIfMissing("workspaces", "creator_session_id", "TEXT");
    this.addColumnIfMissing("workspaces", "is_default", "INTEGER NOT NULL DEFAULT 0");
    this.addColumnIfMissing("decisions", "rule_compliance_json", "TEXT NOT NULL DEFAULT '{}'");
    this.addColumnIfMissing("reviews", "workspace_id", "TEXT");
    this.addColumnIfMissing("reviews", "report_json", "TEXT NOT NULL DEFAULT '{}'");
  }

  private addColumnIfMissing(table: string, column: string, definition: string) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((entry) => entry.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    }
  }

  close() {
    this.db.close();
  }
}
