import { ensureDatabase } from '@/db/bootstrap';
import { formatValidationErrors, ScanSchema } from '@/lib/scan-schema';

export async function GET() {
  const db = await ensureDatabase();
  const latest = await db
    .prepare(
      `SELECT id, raw_json, generated_at, run_type, created_at
     FROM scan_runs WHERE status = 'processed'
     ORDER BY generated_at DESC LIMIT 1`,
    )
    .first<{
      id: string;
      raw_json: string;
      generated_at: string;
      run_type: string;
      created_at: string;
    }>();

  const history = await db
    .prepare(
      `SELECT id, generated_at, run_type, market_sentiment, status
     FROM scan_runs ORDER BY created_at DESC LIMIT 20`,
    )
    .all();

  return Response.json({
    latest: latest ? JSON.parse(latest.raw_json) : null,
    latestImportedAt: latest?.created_at ?? null,
    history: history.results,
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const id = `invalid_${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO scan_runs
       (id, run_type, schema_version, generated_at, market, status, raw_json, error_json, created_at)
       VALUES (?, 'unknown', 'unknown', ?, 'unknown', 'invalid', ?, ?, ?)`,
      )
      .bind(
        id,
        now,
        raw,
        JSON.stringify([{ path: 'root', message: 'Invalid JSON syntax' }]),
        now,
      )
      .run();
    return Response.json(
      {
        ok: false,
        id,
        errors: [{ path: 'root', message: 'Invalid JSON syntax' }],
      },
      { status: 400 },
    );
  }

  const result = ScanSchema.safeParse(parsed);
  if (!result.success) {
    const errors = formatValidationErrors(result.error);
    const candidate = parsed as Record<string, unknown>;
    const id =
      typeof candidate.scan_run_id === 'string'
        ? candidate.scan_run_id
        : `invalid_${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO scan_runs
       (id, run_type, schema_version, generated_at, market, status, raw_json, error_json, created_at)
       VALUES (?, ?, ?, ?, ?, 'invalid', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET raw_json = excluded.raw_json, error_json = excluded.error_json, status = 'invalid'`,
      )
      .bind(
        id,
        typeof candidate.run_type === 'string' ? candidate.run_type : 'unknown',
        typeof candidate.schema_version === 'string'
          ? candidate.schema_version
          : 'unknown',
        typeof candidate.generated_at === 'string'
          ? candidate.generated_at
          : now,
        typeof candidate.market === 'string' ? candidate.market : 'unknown',
        raw,
        JSON.stringify(errors),
        now,
      )
      .run();
    return Response.json({ ok: false, id, errors }, { status: 422 });
  }

  const scan = result.data;
  const statements = [
    db
      .prepare(
        `INSERT INTO scan_runs
       (id, run_type, schema_version, generated_at, market, market_sentiment, market_summary, status, raw_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'processed', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         market_sentiment = excluded.market_sentiment,
         market_summary = excluded.market_summary,
         status = 'processed', raw_json = excluded.raw_json, error_json = NULL,
         created_at = excluded.created_at`,
      )
      .bind(
        scan.scan_run_id,
        scan.run_type,
        scan.schema_version,
        scan.generated_at,
        scan.market,
        scan.market_summary.sentiment,
        scan.market_summary.summary,
        JSON.stringify(scan),
        now,
      ),
    db
      .prepare(
        'DELETE FROM events WHERE snapshot_id IN (SELECT id FROM snapshots WHERE scan_run_id = ?)',
      )
      .bind(scan.scan_run_id),
    db
      .prepare('DELETE FROM snapshots WHERE scan_run_id = ?')
      .bind(scan.scan_run_id),
  ];

  for (const item of scan.portfolio) {
    const snapshotId = `${scan.scan_run_id}_${item.ticker}`;
    statements.push(
      db
        .prepare(
          `INSERT INTO instruments (ticker, name, exchange, currency, instrument_type, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           name = excluded.name, exchange = excluded.exchange, currency = excluded.currency,
           instrument_type = excluded.instrument_type, is_active = 1`,
        )
        .bind(
          item.ticker,
          item.name,
          item.exchange ?? null,
          item.currency,
          item.instrument_type,
          now,
        ),
      db
        .prepare(
          `INSERT INTO snapshots
         (id, scan_run_id, ticker, price, price_change_pct, signal, score, score_change,
          confidence, risk, thesis_status, thesis_summary, raw_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          snapshotId,
          scan.scan_run_id,
          item.ticker,
          item.price?.value ?? null,
          item.price?.change_pct ?? null,
          item.assessment.signal,
          item.assessment.score,
          item.delta.score_change ?? null,
          item.assessment.confidence,
          item.assessment.risk,
          item.thesis.status,
          item.thesis.summary,
          JSON.stringify(item),
          now,
        ),
    );

    for (const event of item.events) {
      statements.push(
        db
          .prepare(
            `INSERT INTO events
           (id, snapshot_id, ticker, event_type, title, summary, impact, event_at,
            source_name, source_url, verified, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            `${snapshotId}_${event.id}`,
            snapshotId,
            item.ticker,
            event.type,
            event.title,
            event.summary,
            event.impact,
            event.timestamp,
            event.source_name ?? null,
            event.source_url ?? null,
            event.verified ? 1 : 0,
            now,
          ),
      );
    }
  }

  await db.batch(statements);
  await db.prepare('PRAGMA optimize').run();
  return Response.json(
    { ok: true, scan, imported: scan.portfolio.length, importedAt: now },
    { status: 201 },
  );
}
