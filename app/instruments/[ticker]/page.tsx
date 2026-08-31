import type { Metadata } from 'next';
import { InstrumentDetail } from '@/components/instrument-detail';

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();
  return {
    title: `${symbol} — Prophet`,
    description: `Price, AI assessment, thesis and event history for ${symbol}.`,
    openGraph: { title: `${symbol} — Prophet`, description: `Investment thesis history for ${symbol}.`, images: [] },
    twitter: { title: `${symbol} — Prophet`, description: `Investment thesis history for ${symbol}.`, images: [] },
  };
}

export default async function InstrumentPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  return <InstrumentDetail ticker={ticker.toUpperCase()} />;
}
