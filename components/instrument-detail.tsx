'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BrainCircuit, CalendarDays, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

type ChartPoint = { date: string; price: number; score?: number };

const chartConfig = {
  price: { label: 'Price', color: 'oklch(0.72 0.14 225)' },
  score: { label: 'AI score', color: 'oklch(0.83 0.15 160)' },
} satisfies ChartConfig;

export function InstrumentDetail({ ticker }: { ticker: string }) {
  const [marketPoints, setMarketPoints] = useState<ChartPoint[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/market/${encodeURIComponent(ticker)}`)
      .then(async (response) => await response.json() as { configured?: boolean; points?: Array<{ timestamp: string; close: number }> })
      .then((data) => {
        setProviderConfigured(Boolean(data.configured));
        if (data.points?.length) {
          const stride = Math.max(1, Math.floor(data.points.length / 4));
          setMarketPoints(data.points.map((point, index) => ({
            date: point.timestamp.slice(5, 10),
            price: point.close,
            score: index % stride === 0 ? 68 + Math.min(16, Math.round(index / stride) * 4) : undefined,
          })));
        }
      })
      .catch(() => setProviderConfigured(false));
  }, [ticker]);

  const points = useMemo(() => marketPoints.length ? marketPoints : [
    { date: '08-01', price: 164.2, score: 63 },
    { date: '08-06', price: 166.8 },
    { date: '08-11', price: 169.1, score: 69 },
    { date: '08-16', price: 168.4 },
    { date: '08-21', price: 174.7, score: 77 },
    { date: '08-26', price: 172.9 },
    { date: '08-31', price: 179.2, score: 84 },
  ], [marketPoints]);

  const latest = points.at(-1)?.price ?? 0;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link className={buttonVariants({ variant: 'ghost' })} href="/"><ArrowLeft /> Portfolio</Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`size-1.5 rounded-full ${providerConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {providerConfigured ? 'Twelve Data connected' : 'Using preview price series'}
          </div>
        </div>

        <section className="mb-6 flex flex-col justify-between gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.16em] text-primary">NASDAQ · Equity</p>
            <h1 className="mt-2 font-mono text-4xl font-semibold tracking-[-.04em]">{ticker}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Instrument identity can be edited after import.</p>
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-3xl font-semibold">${latest.toFixed(2)}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-emerald-300"><ArrowUpRight className="size-4" />+2.4%</p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader>
                <CardTitle>Price + AI history</CardTitle>
                <CardDescription>Market price with assessment points overlaid on the same timeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[360px] w-full aspect-auto">
                  <ComposedChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis yAxisId="price" tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} width={42} />
                    <YAxis yAxisId="score" orientation="right" tickLine={false} axisLine={false} domain={[0, 100]} width={34} />
                    <Tooltip contentStyle={{ background: '#111923', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10 }} />
                    <Line yAxisId="price" type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={2} dot={false} />
                    <Scatter yAxisId="score" dataKey="score" fill="var(--color-score)" />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader><CardTitle>Thesis timeline</CardTitle><CardDescription>How the model&apos;s assessment changed over time.</CardDescription></CardHeader>
              <CardContent className="space-y-0">
                {[
                  ['31 Aug', 'ADD', '84', 'Analyst targets increased while demand remained firm.'],
                  ['21 Aug', 'HOLD', '77', 'Earnings expectations moved higher.'],
                  ['11 Aug', 'HOLD', '69', 'No material deterioration in the core thesis.'],
                  ['01 Aug', 'WATCH', '63', 'Initial monitored position.'],
                ].map(([date, signal, score, summary]) => (
                  <div key={date} className="relative grid grid-cols-[70px_14px_1fr] gap-3 pb-5 last:pb-0">
                    <span className="pt-0.5 font-mono text-xs text-muted-foreground">{date}</span>
                    <span className="relative mt-1 size-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(121,255,194,.45)] after:absolute after:left-[4px] after:top-3 after:h-[calc(100%+8px)] after:w-px after:bg-white/10 last:after:hidden" />
                    <div><div className="flex items-center gap-2"><Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">{signal}</Badge><span className="font-mono font-semibold">{score}</span></div><p className="mt-1.5 text-sm text-muted-foreground">{summary}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="border border-primary/15 bg-primary/[.045] ring-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-4 text-primary" />Current assessment</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Signal" value="ADD" accent />
                <Stat label="Score" value="84 / 100" />
                <Stat label="Confidence" value="82%" />
                <Stat label="Risk" value="High" />
              </CardContent>
            </Card>
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-amber-300" />Catalysts</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm"><p>HBM demand remains strong</p><p>Analyst targets increased</p><p>AI infrastructure spending</p></CardContent>
            </Card>
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4 text-rose-300" />Risks</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm"><p>AI capex slowdown</p><p>Memory pricing normalization</p></CardContent>
            </Card>
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-sky-300" />Latest event</CardTitle></CardHeader>
              <CardContent><p className="text-sm">Analyst raises price target</p><a className="mt-2 inline-flex items-center gap-1 text-xs text-primary" href="#sources">View source <ExternalLink className="size-3" /></a></CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-1 font-mono font-semibold ${accent ? 'text-primary' : ''}`}>{value}</p></div>;
}
