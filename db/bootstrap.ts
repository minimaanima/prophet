import { env } from 'cloudflare:workers';

export async function ensureDatabase() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS instruments (
      ticker TEXT PRIMARY KEY, name TEXT NOT NULL, exchange TEXT, currency TEXT NOT NULL,
      instrument_type TEXT NOT NULL DEFAULT 'equity', is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS scan_runs (
      id TEXT PRIMARY KEY, run_type TEXT NOT NULL, schema_version TEXT NOT NULL,
      generated_at TEXT NOT NULL, market TEXT NOT NULL, market_sentiment TEXT,
      market_summary TEXT, status TEXT NOT NULL, raw_json TEXT NOT NULL,
      error_json TEXT, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY, scan_run_id TEXT NOT NULL, ticker TEXT NOT NULL,
      price REAL, price_change_pct REAL, signal TEXT NOT NULL, score REAL NOT NULL,
      score_change REAL, confidence REAL NOT NULL, risk TEXT NOT NULL,
      thesis_status TEXT NOT NULL, thesis_summary TEXT NOT NULL, raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (scan_run_id) REFERENCES scan_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (ticker) REFERENCES instruments(ticker)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL, ticker TEXT NOT NULL,
      event_type TEXT NOT NULL, title TEXT NOT NULL, summary TEXT, impact INTEGER NOT NULL,
      event_at TEXT NOT NULL, source_name TEXT, source_url TEXT, verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS market_quotes (
      ticker TEXT PRIMARY KEY, price REAL NOT NULL, previous_close REAL, change REAL,
      change_pct REAL, currency TEXT, price_timestamp TEXT, is_market_open INTEGER,
      refresh_slot TEXT NOT NULL, fetched_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS market_quote_attempts (
      ticker TEXT PRIMARY KEY, refresh_slot TEXT NOT NULL, last_error TEXT,
      attempted_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS company_fundamentals_cache (
      ticker TEXT PRIMARY KEY, cik TEXT, status TEXT NOT NULL,
      data_json TEXT, last_error TEXT, fetched_at TEXT NOT NULL
    )`),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_scan_runs_generated_at ON scan_runs(generated_at)',
    ),
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_scan_ticker ON snapshots(scan_run_id, ticker)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_snapshots_ticker_created ON snapshots(ticker, created_at)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_events_ticker_event_at ON events(ticker, event_at)',
    ),
  ]);
  return db;
}
