import { resolveMarketDataSymbol } from '@/lib/market-data/symbols';
import { TwelveDataProvider } from '@/lib/market-data/twelve-data';

export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return Response.json({ configured: false, points: [] });
  }

  const { symbol } = await context.params;
  const providerSymbol = resolveMarketDataSymbol(symbol);
  const interval =
    new URL(request.url).searchParams.get('interval') === '1h' ? '1h' : '1day';
  try {
    const points = await new TwelveDataProvider(apiKey).getSeries(
      providerSymbol,
      interval,
    );
    return Response.json({
      configured: true,
      provider: 'twelve_data',
      symbol: symbol.toUpperCase(),
      providerSymbol,
      interval,
      points,
    });
  } catch (error) {
    return Response.json(
      {
        configured: true,
        error:
          error instanceof Error ? error.message : 'Market data request failed',
      },
      { status: 502 },
    );
  }
}
