import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const instruments = sqliteTable('instruments', {
  ticker: text('ticker').primaryKey(),
  name: text('name').notNull(),
  exchange: text('exchange'),
  currency: text('currency').notNull(),
  instrumentType: text('instrument_type').notNull().default('equity'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const scanRuns = sqliteTable('scan_runs', {
  id: text('id').primaryKey(),
  runType: text('run_type').notNull(),
  schemaVersion: text('schema_version').notNull(),
  generatedAt: text('generated_at').notNull(),
  market: text('market').notNull(),
  marketSentiment: text('market_sentiment'),
  marketSummary: text('market_summary'),
  status: text('status').notNull(),
  rawJson: text('raw_json').notNull(),
  errorJson: text('error_json'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_scan_runs_generated_at').on(table.generatedAt)]);

export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey(),
  scanRunId: text('scan_run_id').notNull().references(() => scanRuns.id, { onDelete: 'cascade' }),
  ticker: text('ticker').notNull().references(() => instruments.ticker),
  price: real('price'),
  priceChangePct: real('price_change_pct'),
  signal: text('signal').notNull(),
  score: real('score').notNull(),
  scoreChange: real('score_change'),
  confidence: real('confidence').notNull(),
  risk: text('risk').notNull(),
  thesisStatus: text('thesis_status').notNull(),
  thesisSummary: text('thesis_summary').notNull(),
  rawJson: text('raw_json').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_snapshots_scan_ticker').on(table.scanRunId, table.ticker),
  index('idx_snapshots_ticker_created').on(table.ticker, table.createdAt),
]);

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  snapshotId: text('snapshot_id').notNull().references(() => snapshots.id, { onDelete: 'cascade' }),
  ticker: text('ticker').notNull(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  impact: integer('impact').notNull(),
  eventAt: text('event_at').notNull(),
  sourceName: text('source_name'),
  sourceUrl: text('source_url'),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_events_ticker_event_at').on(table.ticker, table.eventAt)]);
