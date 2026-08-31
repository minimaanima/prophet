import { ensureDatabase } from '@/db/bootstrap';
import type { MarketQuote, QuoteApiResponse } from '@/lib/market-data/provider';
import { TwelveDataProvider } from '@/lib/market-data/twelve-data';

type CachedQuote = {
  ticker: string;
  price: number;
  previous_close: number | null;
  change: number | null;
  change_pct: number | null;
  currency: string | null;
  price_timestamp: string | null;
  is_market_open: number | null;
  refresh_slot: string;
};

type CachedAttempt = {
  ticker: string;
  refresh_slot: string;
  last_error: string | null;
};

function getUsMarketSlot(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun')
    return `closed_${day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (minutes < 9 * 60 + 30) return `morning_${day}`;
  if (minutes < 16 * 60) return `market_open_${day}`;
  return `market_close_${day}`;
}

function fromCache(row: CachedQuote): MarketQuote {
  return {
    symbol: row.ticker,
    price: row.price,
    previousClose: row.previous_close,
    change: row.change,
    changePct: row.change_pct,
    currency: row.currency,
    timestamp: row.price_timestamp,
    isMarketOpen: row.is_market_open === null ? null : row.is_market_open === 1,
  };
}

export async function GET(request: Request) {
  const symbols = [
    ...new Set(
      (new URL(request.url).searchParams.get('symbols') ?? '')
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => /^[A-Z0-9.-]{1,15}$/.test(symbol)),
    ),
  ].slice(0, 8);
  const slot = getUsMarketSlot();
  const response: QuoteApiResponse = {
    configured: Boolean(process.env.TWELVE_DATA_API_KEY),
    slot,
    quotes: {},
    refreshed: [],
  };
  if (symbols.length === 0) return Response.json(response);

  const db = await ensureDatabase();
  const placeholders = symbols.map(() => '?').join(',');
  const cached = await db
    .prepare(`SELECT * FROM market_quotes WHERE ticker IN (${placeholders})`)
    .bind(...symbols)
    .all<CachedQuote>();
  const cachedBySymbol = new Map(
    cached.results.map((row) => [row.ticker, row]),
  );
  const attempts = await db
    .prepare(
      `SELECT ticker, refresh_slot, last_error FROM market_quote_attempts WHERE ticker IN (${placeholders})`,
    )
    .bind(...symbols)
    .all<CachedAttempt>();
  const attemptsBySymbol = new Map(
    attempts.results.map((row) => [row.ticker, row]),
  );
  const stale = symbols.filter(
    (symbol) =>
      cachedBySymbol.get(symbol)?.refresh_slot !== slot &&
      attemptsBySymbol.get(symbol)?.refresh_slot !== slot,
  );

  if (stale.length && process.env.TWELVE_DATA_API_KEY) {
    const provider = new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY);
    const results = await Promise.allSettled(
      stale.map(
        async (symbol) => [symbol, await provider.getQuote(symbol)] as const,
      ),
    );
    const now = new Date().toISOString();
    const statements = results.map((result, index) => {
      const symbol = stale[index];
      const error =
        result.status === 'rejected'
          ? result.reason instanceof Error
            ? result.reason.message
            : 'Quote request failed'
          : null;
      return db
        .prepare(
          `INSERT INTO market_quote_attempts (ticker, refresh_slot, last_error, attempted_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           refresh_slot = excluded.refresh_slot, last_error = excluded.last_error,
           attempted_at = excluded.attempted_at`,
        )
        .bind(symbol, slot, error, now);
    });
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [symbol, quote] = result.value;
        response.refreshed.push(symbol);
        response.quotes[symbol] = quote;
        statements.push(
          db
            .prepare(
              `INSERT INTO market_quotes
         (ticker, price, previous_close, change, change_pct, currency, price_timestamp, is_market_open, refresh_slot, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           price = excluded.price, previous_close = excluded.previous_close, change = excluded.change,
           change_pct = excluded.change_pct, currency = excluded.currency,
           price_timestamp = excluded.price_timestamp, is_market_open = excluded.is_market_open,
           refresh_slot = excluded.refresh_slot, fetched_at = excluded.fetched_at`,
            )
            .bind(
              symbol,
              quote.price,
              quote.previousClose,
              quote.change,
              quote.changePct,
              quote.currency,
              quote.timestamp,
              quote.isMarketOpen === null ? null : Number(quote.isMarketOpen),
              slot,
              now,
            ),
        );
      }
    }
    if (statements.length) await db.batch(statements);
    response.errors = {};
    results.forEach((result, index) => {
      if (result.status === 'rejected')
        response.errors![stale[index]] =
          result.reason instanceof Error
            ? result.reason.message
            : 'Quote request failed';
    });
    if (Object.keys(response.errors).length === 0) delete response.errors;
  }

  for (const symbol of symbols) {
    if (!response.quotes[symbol] && cachedBySymbol.has(symbol))
      response.quotes[symbol] = fromCache(cachedBySymbol.get(symbol)!);
    const attempt = attemptsBySymbol.get(symbol);
    if (attempt?.refresh_slot === slot && attempt.last_error) {
      response.errors ??= {};
      response.errors[symbol] = attempt.last_error;
    }
  }
  return Response.json(response);
}
