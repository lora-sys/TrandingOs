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
    `);
  }

  close() {
    this.db.close();
  }
}
