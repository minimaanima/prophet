export type PricePoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export interface MarketDataProvider {
  getSeries(symbol: string, interval: '1day' | '1h', outputSize?: number): Promise<PricePoint[]>;
}
