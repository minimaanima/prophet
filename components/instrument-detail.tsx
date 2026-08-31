'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Database,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { fetchMarketQuotes } from '@/lib/market-data/client';
import type { MarketQuote } from '@/lib/market-data/provider';
import type { PortfolioSnapshot } from '@/lib/scan-schema';

type ChartPoint = { date: string; price: number | null; score?: number };
type InstrumentHistoryEntry = {
  generatedAt: string;
  runType: string;
  snapshot: PortfolioSnapshot;
};
type InstrumentResponse = {
  ticker: string;
  current: PortfolioSnapshot;
  history: InstrumentHistoryEntry[];
};

const chartConfig = {
  price: { label: 'Price', color: 'oklch(0.72 0.14 225)' },
  score: { label: 'AI score', color: 'oklch(0.83 0.15 160)' },
} satisfies ChartConfig;

const signalClass: Record<string, string> = {
  ADD: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  HOLD: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  WATCH: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  REDUCE: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  EXIT: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
};

export function InstrumentDetail({ ticker }: { ticker: string }) {
  const [instrument, setInstrument] = useState<InstrumentResponse | null>(null);
  const [marketPoints, setMarketPoints] = useState<
    Array<{ timestamp: string; close: number }>
  >([]);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/instruments/${encodeURIComponent(ticker)}`).then(
        async (response) => {
          const data = (await response.json()) as InstrumentResponse & {
            error?: string;
          };
          if (!response.ok)
            throw new Error(data.error ?? 'Unable to load imported assessment');
          return data;
        },
      ),
      fetch(`/api/market/${encodeURIComponent(ticker)}`)
        .then(
          async (response) =>
            (await response.json()) as {
              configured?: boolean;
              points?: Array<{ timestamp: string; close: number }>;
            },
        )
        .catch(() => ({ configured: false, points: [] })),
      fetchMarketQuotes([ticker]).catch(() => null),
    ])
      .then(([instrumentData, marketData, quoteData]) => {
        setInstrument(instrumentData);
        setProviderConfigured(Boolean(marketData.configured));
        setMarketPoints(marketData.points ?? []);
        setQuote(quoteData?.quotes[ticker] ?? null);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load instrument',
        ),
      )
      .finally(() => setLoading(false));
  }, [ticker]);

  const points = useMemo<ChartPoint[]>(() => {
    const byDate = new Map<string, ChartPoint>();
    for (const point of marketPoints) {
      const date = point.timestamp.slice(0, 10);
      byDate.set(date, { date, price: point.close });
    }
    for (const entry of instrument?.history ?? []) {
      const date = entry.generatedAt.slice(0, 10);
      const point = byDate.get(date) ?? { date, price: null };
      point.score = entry.snapshot.assessment.score;
      byDate.set(date, point);
    }
    return [...byDate.values()].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }, [instrument, marketPoints]);

  if (loading)
    return (
      <PageStatus message="Loading imported assessment and market data…" />
    );
  if (error || !instrument)
    return (
      <PageStatus message={error ?? 'No imported assessment is available.'} />
    );

  const current = instrument.current;
  const price = quote?.price ?? null;
  const currency = quote?.currency ?? null;
  const day = quote?.changePct ?? null;
  const latestEvent = [...current.events].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  )[0];

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link className={buttonVariants({ variant: 'ghost' })} href="/">
            <ArrowLeft /> Portfolio
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${providerConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            {providerConfigured
              ? 'Twelve Data configured'
              : 'Market series unavailable'}
          </div>
        </div>

        <section className="mb-6 flex flex-col justify-between gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.16em] text-primary">
              {(current.exchange ?? 'Unknown exchange').toUpperCase()} ·{' '}
              {current.instrument_type}
            </p>
            <h1 className="mt-2 font-mono text-4xl font-semibold tracking-[-.04em]">
              {ticker}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.name}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-3xl font-semibold">
              {price === null
                ? '—'
                : `${currency === 'unknown' ? '' : currency} ${price.toFixed(2)}`.trim()}
            </p>
            <DayChange value={day} />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader>
                <CardTitle>Price + AI history</CardTitle>
                <CardDescription>
                  Real Twelve Data closes with scores from imported scans.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {marketPoints.length ? (
                  <ChartContainer
                    config={chartConfig}
                    className="h-[360px] w-full aspect-auto"
                  >
                    <ComposedChart
                      data={points}
                      margin={{ top: 12, right: 10, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(255,255,255,.06)"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value: string) => value.slice(5)}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={28}
                      />
                      <YAxis
                        yAxisId="price"
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 5', 'dataMax + 5']}
                        width={42}
                      />
                      <YAxis
                        yAxisId="score"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        width={34}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#111923',
                          border: '1px solid rgba(255,255,255,.1)',
                          borderRadius: 10,
                        }}
                      />
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="price"
                        stroke="var(--color-price)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      <Scatter
                        yAxisId="score"
                        dataKey="score"
                        fill="var(--color-score)"
                      />
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <EmptyState message="No market price series is available from Twelve Data." />
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader>
                <CardTitle>Thesis timeline</CardTitle>
                <CardDescription>
                  Only assessments from scans you actually imported.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {instrument.history.map((entry) => (
                  <div
                    key={`${entry.generatedAt}-${entry.runType}`}
                    className="relative grid grid-cols-[110px_14px_1fr] gap-3 pb-5 last:pb-0"
                  >
                    <span className="pt-0.5 font-mono text-xs text-muted-foreground">
                      {formatScanDate(entry.generatedAt)}
                    </span>
                    <span className="relative mt-1 size-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(121,255,194,.45)] after:absolute after:left-[4px] after:top-3 after:h-[calc(100%+8px)] after:w-px after:bg-white/10 last:after:hidden" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            signalClass[entry.snapshot.assessment.signal]
                          }
                        >
                          {entry.snapshot.assessment.signal}
                        </Badge>
                        <span className="font-mono font-semibold">
                          {entry.snapshot.assessment.score}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.runType.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {entry.snapshot.summary ||
                          entry.snapshot.thesis.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader>
                <CardTitle>Current thesis</CardTitle>
                <CardDescription>
                  {current.thesis.status} · latest imported scan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>{current.thesis.summary}</p>
                {current.thesis.bull_case && (
                  <ThesisPoint
                    label="Bull case"
                    value={current.thesis.bull_case}
                  />
                )}
                {current.thesis.bear_case && (
                  <ThesisPoint
                    label="Bear case"
                    value={current.thesis.bear_case}
                  />
                )}
                {current.thesis.key_assumption && (
                  <ThesisPoint
                    label="Key assumption"
                    value={current.thesis.key_assumption}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="border border-primary/15 bg-primary/[.045] ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="size-4 text-primary" />
                  Current assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat label="Signal" value={current.assessment.signal} accent />
                <Stat
                  label="Score"
                  value={`${current.assessment.score} / 100`}
                />
                <Stat
                  label="Confidence"
                  value={`${Math.round(current.assessment.confidence * 100)}%`}
                />
                <Stat
                  label="Risk"
                  value={current.assessment.risk.replace('_', ' ')}
                />
              </CardContent>
            </Card>
            <ListCard
              icon={<Sparkles className="size-4 text-amber-300" />}
              title="Catalysts"
              items={current.catalysts}
              empty="No catalysts in the latest scan."
            />
            <ListCard
              icon={<ShieldAlert className="size-4 text-rose-300" />}
              title="Risks"
              items={current.risks}
              empty="No risks in the latest scan."
            />
            <Card className="border border-white/8 bg-card/80 ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-sky-300" />
                  Latest event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestEvent ? (
                  <>
                    <p className="text-sm">{latestEvent.title}</p>
                    {latestEvent.summary && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {latestEvent.summary}
                      </p>
                    )}
                    {latestEvent.source_url && (
                      <a
                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary"
                        href={latestEvent.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {latestEvent.source_name ?? 'View source'}{' '}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No events in the latest scan.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DayChange({ value }: { value: number | null }) {
  if (value === null)
    return (
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        Day change unavailable
      </p>
    );
  const positive = value >= 0;
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 font-mono text-sm ${positive ? 'text-emerald-300' : 'text-rose-300'}`}
    >
      {positive ? (
        <ArrowUpRight className="size-4" />
      ) : (
        <ArrowDownRight className="size-4" />
      )}
      {positive ? '+' : '−'}
      {Math.abs(value).toFixed(1)}%
    </p>
  );
}

function ListCard({
  icon,
  title,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items: Array<Record<string, unknown>>;
  empty: string;
}) {
  return (
    <Card className="border border-white/8 bg-card/80 ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={typeof item.id === 'string' ? item.id : `${title}-${index}`}
            >
              <p>
                {recordText(item, 'title') ??
                  recordText(item, 'type') ??
                  'Untitled item'}
              </p>
              {recordText(item, 'description') && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {recordText(item, 'description')}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid h-[300px] place-items-center text-sm text-muted-foreground">
      <div className="text-center">
        <Database className="mx-auto mb-3 size-6 text-primary" />
        {message}
      </div>
    </div>
  );
}

function PageStatus({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="text-center text-sm text-muted-foreground">
        <Database className="mx-auto mb-3 size-7 text-primary" />
        {message}
        <div>
          <Link className="mt-4 inline-flex text-primary" href="/">
            Return to portfolio
          </Link>
        </div>
      </div>
    </main>
  );
}

function ThesisPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 leading-relaxed">{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono font-semibold capitalize ${accent ? 'text-primary' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function recordText(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key] : null;
}

function formatScanDate(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Europe/Sofia',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
