const MARKET_DATA_ALIASES: Record<string, string> = {
  SGM: 'STM',
};

export function resolveMarketDataSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return MARKET_DATA_ALIASES[normalized] ?? normalized;
}
