import type { MarketDataProvider, MarketQuote, PricePoint } from './provider';

type TwelveDataResponse = {
  status?: 'error';
  message?: string;
  values?: Array<
    Record<'datetime' | 'open' | 'high' | 'low' | 'close' | 'volume', string>
  >;
};

type TwelveDataQuoteResponse = {
  status?: 'error';
  message?: string;
  symbol?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
};

function optionalNumber(value: string | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class TwelveDataProvider implements MarketDataProvider {
  constructor(private readonly apiKey: string) {}

  async getSeries(
    symbol: string,
    interval: '1day' | '1h',
    outputSize = 90,
  ): Promise<PricePoint[]> {
    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('interval', interval);
    url.searchParams.set(
      'outputsize',
      String(Math.min(Math.max(outputSize, 1), 5000)),
    );
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url, {
      next: { revalidate: interval === '1day' ? 3600 : 300 },
    });
    if (!response.ok)
      throw new Error(`Twelve Data request failed (${response.status})`);
    const data = (await response.json()) as TwelveDataResponse;
    if (data.status === 'error' || !data.values)
      throw new Error(data.message ?? 'Twelve Data returned no series');

    return data.values
      .map((value) => ({
        timestamp: value.datetime,
        open: Number(value.open),
        high: Number(value.high),
        low: Number(value.low),
        close: Number(value.close),
        volume: value.volume ? Number(value.volume) : null,
      }))
      .reverse();
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const url = new URL('https://api.twelvedata.com/quote');
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok)
      throw new Error(`Twelve Data request failed (${response.status})`);
    const data = (await response.json()) as TwelveDataQuoteResponse;
    const price = optionalNumber(data.close);
    if (data.status === 'error' || price === null)
      throw new Error(data.message ?? 'Twelve Data returned no quote');

    return {
      symbol: (data.symbol ?? symbol).toUpperCase(),
      price,
      previousClose: optionalNumber(data.previous_close),
      change: optionalNumber(data.change),
      changePct: optionalNumber(data.percent_change),
      currency: data.currency ?? null,
      timestamp:
        data.datetime ??
        (data.timestamp ? new Date(data.timestamp * 1000).toISOString() : null),
      isMarketOpen: data.is_market_open ?? null,
    };
  }
}
