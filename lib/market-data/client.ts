import type { QuoteApiResponse } from './provider';

export async function fetchMarketQuotes(symbols: string[]) {
  if (symbols.length === 0) return null;
  const response = await fetch(
    `/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
  );
  if (!response.ok) throw new Error('Unable to refresh market quotes');
  return (await response.json()) as QuoteApiResponse;
}
