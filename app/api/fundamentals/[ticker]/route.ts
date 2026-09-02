import { ensureDatabase } from '@/db/bootstrap';
import {
  fetchSecFundamentals,
  SEC_CACHE_TTL_MS,
  SecFundamentalsError,
} from '@/lib/fundamentals/sec';
import type {
  CompanyFundamentals,
  FundamentalsApiResponse,
} from '@/lib/fundamentals/types';

type CacheRow = {
  ticker: string;
  cik: string | null;
  status: string;
  data_json: string | null;
  last_error: string | null;
  fetched_at: string;
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

  const userAgent = process.env.SEC_USER_AGENT?.trim() ?? '';
  if (!userAgent) {
    const response: FundamentalsApiResponse = {
      configured: false,
      available: false,
      cached: false,
      error:
        'Add SEC_USER_AGENT with an application name and contact email to enable free SEC fundamentals.',
    };
    return Response.json(response);
  }

  const db = await ensureDatabase();
  const cached = await db
    .prepare(
      `SELECT ticker, cik, status, data_json, last_error, fetched_at
       FROM company_fundamentals_cache WHERE ticker = ?`,
    )
    .bind(ticker)
    .first<CacheRow>();

  const cacheAge = cached
    ? Date.now() - Date.parse(cached.fetched_at)
    : Number.POSITIVE_INFINITY;
  if (cached && cacheAge < SEC_CACHE_TTL_MS) {
    const cachedResponse = responseFromCache(cached);
    if (cachedResponse) return Response.json(cachedResponse);
  }

  const instrument = await db
    .prepare('SELECT name FROM instruments WHERE ticker = ?')
    .bind(ticker)
    .first<{ name: string }>();

  try {
    const fundamentals = await fetchSecFundamentals({
      ticker,
      companyName: instrument?.name ?? null,
      knownCik: cached?.cik ?? null,
      userAgent,
    });
    const fetchedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO company_fundamentals_cache
         (ticker, cik, status, data_json, last_error, fetched_at)
         VALUES (?, ?, 'ready', ?, NULL, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           cik = excluded.cik, status = 'ready',
           data_json = excluded.data_json, last_error = NULL,
           fetched_at = excluded.fetched_at`,
      )
      .bind(ticker, fundamentals.cik, JSON.stringify(fundamentals), fetchedAt)
      .run();

    const response: FundamentalsApiResponse = {
      configured: true,
      available: true,
      cached: false,
      fetchedAt,
      fundamentals,
    };
    return Response.json(response);
  } catch (reason) {
    if (cached?.data_json) {
      const stale = parseFundamentals(cached.data_json);
      if (stale) {
        const response: FundamentalsApiResponse = {
          configured: true,
          available: true,
          cached: true,
          stale: true,
          fetchedAt: cached.fetched_at,
          fundamentals: stale,
          error:
            reason instanceof Error
              ? reason.message
              : 'Unable to refresh SEC fundamentals.',
        };
        return Response.json(response);
      }
    }

    const message =
      reason instanceof Error
        ? reason.message
        : 'Unable to load SEC fundamentals.';
    const status =
      reason instanceof SecFundamentalsError ? reason.code : 'remote';
    const fetchedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO company_fundamentals_cache
         (ticker, cik, status, data_json, last_error, fetched_at)
         VALUES (?, ?, ?, NULL, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           cik = COALESCE(excluded.cik, company_fundamentals_cache.cik),
           status = excluded.status, data_json = NULL,
           last_error = excluded.last_error, fetched_at = excluded.fetched_at`,
      )
      .bind(ticker, cached?.cik ?? null, status, message, fetchedAt)
      .run();

    const response: FundamentalsApiResponse = {
      configured: status !== 'configuration',
      available: false,
      cached: false,
      fetchedAt,
      error: message,
    };
    return Response.json(response);
  }
}

function responseFromCache(row: CacheRow): FundamentalsApiResponse | null {
  if (row.data_json) {
    const fundamentals = parseFundamentals(row.data_json);
    if (!fundamentals) return null;
    return {
      configured: true,
      available: true,
      cached: true,
      fetchedAt: row.fetched_at,
      fundamentals,
    };
  }
  return {
    configured: row.status !== 'configuration',
    available: false,
    cached: true,
    fetchedAt: row.fetched_at,
    error: row.last_error ?? 'SEC fundamentals are unavailable.',
  };
}

function parseFundamentals(value: string) {
  try {
    const parsed = JSON.parse(value) as CompanyFundamentals;
    return parsed.normalizerVersion === 3 ? parsed : null;
  } catch {
    return null;
  }
}
