export type PricePoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  timestamp: string | null;
  isMarketOpen: boolean | null;
};

export type QuoteApiResponse = {
  configured: boolean;
  slot: string;
  quotes: Record<string, MarketQuote>;
  refreshed: string[];
  errors?: Record<string, string>;
};

export interface MarketDataProvider {
  getSeries(
    symbol: string,
    interval: '1day' | '1h',
    outputSize?: number,
  ): Promise<PricePoint[]>;
  getQuote(symbol: string): Promise<MarketQuote>;
}
