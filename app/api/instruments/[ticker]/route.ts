import { ensureDatabase } from '@/db/bootstrap';
import { PortfolioSnapshotSchema } from '@/lib/scan-schema';

type SnapshotRow = {
  generated_at: string;
  run_type: string;
  raw_json: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await context.params;
  const ticker = rawTicker.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,20}$/.test(ticker)) {
    return Response.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  const db = await ensureDatabase();
  const rows = await db
    .prepare(
      `SELECT snapshots.raw_json, scan_runs.generated_at, scan_runs.run_type
       FROM snapshots
       JOIN scan_runs ON scan_runs.id = snapshots.scan_run_id
       WHERE snapshots.ticker = ? AND scan_runs.status = 'processed'
       ORDER BY scan_runs.generated_at DESC`,
    )
    .bind(ticker)
    .all<SnapshotRow>();

  const history = rows.results.flatMap((row) => {
    try {
      const parsed = PortfolioSnapshotSchema.safeParse(
        JSON.parse(row.raw_json),
      );
      return parsed.success
        ? [
            {
              generatedAt: row.generated_at,
              runType: row.run_type,
              snapshot: parsed.data,
            },
          ]
        : [];
    } catch {
      return [];
    }
  });

  if (!history.length) {
    return Response.json(
      { error: 'No imported assessment for this instrument' },
      { status: 404 },
    );
  }

  return Response.json({ ticker, current: history[0].snapshot, history });
}
