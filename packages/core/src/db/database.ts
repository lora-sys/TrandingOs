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
        period TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        discipline_score INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL,
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
        kind TEXT NOT NULL,
        context_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
    this.addColumnIfMissing("mcp_servers", "manifest_json", "TEXT NOT NULL DEFAULT '{}'");
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
