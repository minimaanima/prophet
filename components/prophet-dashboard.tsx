'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bolt,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileJson,
  Import,
  LayoutDashboard,
  Search,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  formatValidationErrors,
  ScanSchema,
  type Scan,
} from '@/lib/scan-schema';
import { fetchMarketQuotes } from '@/lib/market-data/client';
import type { MarketQuote } from '@/lib/market-data/provider';

const nextScanByRunType: Record<
  Scan['run_type'],
  { time: string; detail: string }
> = {
  morning: { time: '16:30', detail: 'Europe / Sofia' },
  market_open: { time: '23:05', detail: 'Europe / Sofia' },
  market_close: { time: '09:00', detail: 'next day · Europe / Sofia' },
};

const fallbackPositions = [
  {
    ticker: 'SKHY',
    name: 'SK hynix ADR',
    price: 171.23,
    day: 2.4,
    signal: 'ADD',
    score: 84,
    delta: 6,
  },
  {
    ticker: 'SGM',
    name: 'Revolut instrument',
    price: 45.18,
    day: 0.8,
    signal: 'ADD',
    score: 79,
    delta: 2,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA',
    price: 218.42,
    day: -1.1,
    signal: 'HOLD',
    score: 75,
    delta: -3,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    price: 513.08,
    day: -0.4,
    signal: 'HOLD',
    score: 73,
    delta: 0,
  },
  {
    ticker: 'TMUS',
    name: 'T-Mobile US',
    price: 181.34,
    day: 0.3,
    signal: 'HOLD',
    score: 70,
    delta: 1,
  },
  {
    ticker: 'AAPL',
    name: 'Apple',
    price: 320.16,
    day: 0.6,
    signal: 'WATCH',
    score: 62,
    delta: -5,
  },
];

const signalClass: Record<string, string> = {
  ADD: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  HOLD: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  WATCH: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
};

export function ProphetDashboard() {
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importState, setImportState] = useState<{
    kind: 'idle' | 'saving' | 'error' | 'success';
    message?: string;
    errors?: Array<{ path: string; message: string }>;
  }>({ kind: 'idle' });

  useEffect(() => {
    fetch('/api/scans')
      .then(async (response) => (await response.json()) as { latest?: unknown })
      .then(async (data) => {
        const result = ScanSchema.safeParse(data.latest);
        if (result.success) {
          setScan(result.data);
          const quoteData = await fetchMarketQuotes(
            result.data.portfolio.map((item) => item.ticker),
          );
          if (quoteData) setQuotes(quoteData.quotes);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));

    const openImportFromHash = () => {
      if (window.location.hash === '#import') setImportOpen(true);
    };
    openImportFromHash();
    window.addEventListener('hashchange', openImportFromHash);
    return () => window.removeEventListener('hashchange', openImportFromHash);
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, []);

  const positions = useMemo(
    () =>
      scan
        ? scan.portfolio.map((item) => ({
            ticker: item.ticker,
            name: item.name,
            price: quotes[item.ticker]?.price ?? item.price?.value ?? null,
            currency:
              quotes[item.ticker]?.currency ??
              item.price?.currency ??
              item.currency,
            day:
              quotes[item.ticker]?.changePct ?? item.price?.change_pct ?? null,
            signal: item.assessment.signal,
            score: item.assessment.score,
            delta: item.delta.score_change ?? 0,
          }))
        : [],
    [quotes, scan],
  );

  const averageScore = positions.length
    ? positions.reduce((sum, item) => sum + item.score, 0) / positions.length
    : null;
  const changedTheses =
    scan?.portfolio.filter((item) => item.thesis.changed_since_previous_scan)
      .length ?? 0;

  async function saveImport() {
    setImportState({ kind: 'saving', message: 'Validating scan…' });
    let value: unknown;
    try {
      value = JSON.parse(importText);
    } catch {
      setImportState({
        kind: 'error',
        errors: [{ path: 'root', message: 'Invalid JSON syntax' }],
      });
      return;
    }

    const validation = ScanSchema.safeParse(value);
    if (!validation.success) {
      setImportState({
        kind: 'error',
        errors: formatValidationErrors(validation.error),
      });
      return;
    }

    const response = await fetch('/api/scans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: importText,
    });
    const result = (await response.json()) as {
      ok?: boolean;
      scan?: Scan;
      errors?: Array<{ path: string; message: string }>;
    };
    if (!response.ok || !result.ok || !result.scan) {
      setImportState({
        kind: 'error',
        errors: result.errors ?? [{ path: 'root', message: 'Import failed' }],
      });
      return;
    }
    setScan(result.scan);
    setQuotes({});
    try {
      const quoteData = await fetchMarketQuotes(
        result.scan.portfolio.map((item) => item.ticker),
      );
      if (quoteData) setQuotes(quoteData.quotes);
    } catch {
      // The imported scan remains usable when live quotes are temporarily unavailable.
    }
    setImportState({
      kind: 'success',
      message: `${result.scan.portfolio.length} positions imported`,
    });
  }

  function loadExample() {
    setImportText(JSON.stringify(exampleScan, null, 2));
    setImportState({ kind: 'idle' });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-5 px-4 sm:px-7">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(121,255,194,.18)]">
              <Activity className="size-4" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em]">
              PROPHET
            </span>
          </div>
          <div className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            Twelve Data · 3 daily windows
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search portfolio"
              onClick={() => setSearchOpen(true)}
            >
              <Search />
            </Button>
            <Button
              className="ml-1"
              size="lg"
              onClick={() => setImportOpen(true)}
            >
              <Import data-icon="inline-start" /> Import scan
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="space-y-1 text-sm">
            <Link
              className="flex items-center gap-3 rounded-lg bg-white/7 px-3 py-2.5 font-medium text-white"
              href="/"
            >
              <LayoutDashboard className="size-4 text-primary" />
              Overview
            </Link>
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-white/5 hover:text-white"
              href="/portfolio"
            >
              <Activity className="size-4" />
              Portfolio
            </Link>
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-white/5 hover:text-white"
              href="/opportunities"
            >
              <Sparkles className="size-4" />
              Opportunities
            </Link>
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition hover:bg-white/5 hover:text-white"
              href="/scans"
            >
              <Clock3 className="size-4" />
              Scan history
            </Link>
          </nav>
          <div className="mt-8 rounded-xl border border-primary/15 bg-primary/[.055] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-primary">
              <Bolt className="size-3.5" />
              Active theme
            </div>
            <p className="mt-3 text-sm font-medium">AI power infrastructure</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Grid, generation, storage, cooling and onsite power.
            </p>
          </div>
        </aside>

        <section id="overview" className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.16em] text-primary">
                {scan
                  ? `${scan.run_type.replaceAll('_', ' ')} · ${new Date(scan.generated_at).toLocaleString('en-GB', { timeZone: 'Europe/Sofia', dateStyle: 'medium', timeStyle: 'short' })}`
                  : 'Market close · 31 Aug 2026'}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
                Portfolio intelligence
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Price data and AI thesis tracking across every position.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-card px-3 py-2 text-xs text-muted-foreground">
              <BrainCircuit className="size-4 text-primary" /> Last scan
              processed 12 min ago
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Portfolio score"
              value={averageScore === null ? '—' : averageScore.toFixed(1)}
              detail="latest scan"
              positive
            />
            <Metric
              label="Tracked positions"
              value={String(positions.length)}
              detail={`${positions.filter((item) => item.signal === 'ADD').length} ADD · ${positions.filter((item) => item.signal === 'HOLD').length} HOLD`}
            />
            <Metric
              label="Thesis changes"
              value={String(changedTheses)}
              detail="since previous"
              positive
            />
            <Metric
              label="Next scan"
              value={scan ? nextScanByRunType[scan.run_type].time : '09:00'}
              detail={
                scan
                  ? nextScanByRunType[scan.run_type].detail
                  : 'Europe / Sofia'
              }
            />
          </div>

          <Card
            id="portfolio"
            className="border border-white/8 bg-card/80 ring-0"
          >
            <CardHeader className="border-b border-white/8 pb-4">
              <CardTitle>Portfolio snapshot</CardTitle>
              <CardDescription>
                Latest price and assessment from the selected scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="pl-5 text-xs text-muted-foreground">
                      Instrument
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Price
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Day
                    </TableHead>
                    <TableHead className="text-center text-xs text-muted-foreground">
                      Signal
                    </TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">
                      Score
                    </TableHead>
                    <TableHead className="pr-5 text-right text-xs text-muted-foreground">
                      Δ score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loaded ? (
                    <TableRow className="border-white/8">
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-sm text-muted-foreground"
                      >
                        Loading portfolio and market quotes…
                      </TableCell>
                    </TableRow>
                  ) : positions.length === 0 ? (
                    <TableRow className="border-white/8">
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-sm text-muted-foreground"
                      >
                        Import a scan to start tracking positions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    positions.map((position) => (
                      <TableRow
                        key={position.ticker}
                        className="cursor-pointer border-white/8 hover:bg-white/[.035]"
                      >
                        <TableCell className="py-3.5 pl-5">
                          <Link
                            className="font-mono text-sm font-semibold transition hover:text-primary"
                            href={`/instruments/${position.ticker}`}
                          >
                            {position.ticker}
                          </Link>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {position.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {position.price === null
                            ? '—'
                            : `${position.currency ?? ''} ${position.price.toFixed(2)}`.trim()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${position.day === null ? 'text-muted-foreground' : position.day >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                        >
                          {position.day === null ? (
                            '—'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {position.day >= 0 ? (
                                <ArrowUpRight className="size-3.5" />
                              ) : (
                                <ArrowDownRight className="size-3.5" />
                              )}
                              {Math.abs(position.day).toFixed(1)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={signalClass[position.signal]}
                          >
                            {position.signal}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {position.score}
                        </TableCell>
                        <TableCell
                          className={`pr-5 text-right font-mono ${position.delta > 0 ? 'text-emerald-300' : position.delta < 0 ? 'text-rose-300' : 'text-muted-foreground'}`}
                        >
                          {position.delta > 0 ? '+' : ''}
                          {position.delta}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search portfolio"
        description="Find an instrument from the latest imported scan."
        className="max-w-lg border border-white/10 bg-[#111923] shadow-2xl"
        showCloseButton
      >
        <Command>
          <CommandInput placeholder="Search ticker or company name…" />
          <CommandList>
            <CommandEmpty>
              {loaded
                ? 'No matching instrument in the current portfolio.'
                : 'Loading portfolio…'}
            </CommandEmpty>
            {positions.length > 0 && (
              <CommandGroup
                heading={`Current portfolio · ${positions.length} instruments`}
              >
                {positions.map((position) => (
                  <CommandItem
                    key={position.ticker}
                    value={`${position.ticker} ${position.name}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      router.push(`/instruments/${position.ticker}`);
                    }}
                    className="py-3"
                  >
                    <Search className="size-4 text-primary" />
                    <div className="min-w-0">
                      <p className="font-mono font-semibold">
                        {position.ticker}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {position.name}
                      </p>
                    </div>
                    <CommandShortcut>
                      {position.signal} · {position.score}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden border border-white/10 bg-[#111923] p-0 shadow-2xl">
          <DialogHeader className="border-b border-white/8 px-5 py-4">
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="size-4 text-primary" />
              Import scheduled scan
            </DialogTitle>
            <DialogDescription>
              Paste the JSON returned by ChatGPT or choose a local .json file.
              Nothing is sent outside this application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 px-5 sm:grid-cols-[minmax(0,1fr)_220px]">
            <Textarea
              aria-label="Scan JSON"
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportState({ kind: 'idle' });
              }}
              placeholder="Paste the JSON-only scan response here…"
              className="min-h-[420px] resize-none border-white/10 bg-black/20 font-mono text-xs leading-relaxed"
            />
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-4 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-white">
                <FileJson className="size-4" /> Choose .json file
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file)
                      void file.text().then((text) => {
                        setImportText(text);
                        setImportState({ kind: 'idle' });
                      });
                  }}
                />
              </label>
              <Button
                variant="outline"
                className="w-full"
                onClick={loadExample}
              >
                Load valid example
              </Button>
              {importState.kind === 'success' && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/8 p-3 text-xs text-emerald-200">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4" />
                    Import complete
                  </div>
                  <p className="mt-1 text-emerald-200/70">
                    {importState.message}
                  </p>
                </div>
              )}
              {importState.kind === 'error' && (
                <div className="max-h-72 overflow-auto rounded-lg border border-rose-400/20 bg-rose-400/8 p-3 text-xs text-rose-200">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4" />
                    Validation failed
                  </div>
                  <ul className="space-y-2">
                    {importState.errors?.slice(0, 12).map((error, index) => (
                      <li key={`${error.path}-${index}`}>
                        <span className="font-mono text-rose-100">
                          {error.path}
                        </span>
                        <br />
                        <span className="text-rose-200/70">
                          {error.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-lg border border-white/8 bg-white/[.025] p-3 text-[11px] leading-relaxed text-muted-foreground">
                Schema v1 requires strict signal, risk, thesis and run-type
                enums. Invalid responses are retained for troubleshooting.
              </div>
            </div>
          </div>
          <DialogFooter className="border-white/8 bg-white/[.025]">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
            <Button
              disabled={!importText.trim() || importState.kind === 'saving'}
              onClick={saveImport}
            >
              {importState.kind === 'saving' ? 'Saving…' : 'Validate & save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
}) {
  return (
    <Card className="gap-2 border border-white/8 bg-card/80 py-4 ring-0">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="font-mono text-2xl font-semibold tracking-tight">
            {value}
          </span>
          <span
            className={`pb-1 text-[11px] ${positive ? 'text-emerald-300' : 'text-muted-foreground'}`}
          >
            {detail}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

const exampleScan = {
  schema_version: '1.0',
  scan_run_id: 'scan_2026_08_31_close_001',
  generated_at: '2026-08-31T23:05:00+03:00',
  run_type: 'market_close',
  market: 'US',
  market_summary: {
    sentiment: 'bullish',
    summary: 'Semiconductors led gains while defensive sectors lagged.',
  },
  portfolio: fallbackPositions.map((item) => ({
    ticker: item.ticker,
    name: item.name,
    exchange: item.ticker === 'SGM' ? null : 'NASDAQ',
    instrument_type: 'equity',
    currency: 'USD',
    price: {
      value: item.price,
      currency: 'USD',
      timestamp: '2026-08-31T20:00:00Z',
      previous_close: null,
      change: null,
      change_pct: item.day,
      source: 'scan',
    },
    assessment: {
      signal: item.signal,
      score: item.score,
      confidence: 0.8,
      risk:
        item.ticker === 'SKHY' || item.ticker === 'NVDA' ? 'high' : 'medium',
    },
    thesis: {
      status:
        item.delta > 0
          ? 'improving'
          : item.delta < 0
            ? 'deteriorating'
            : 'unchanged',
      summary:
        'Latest evidence remains consistent with the monitored investment thesis.',
      changed_since_previous_scan: item.delta !== 0,
    },
    catalysts: [],
    risks: [],
    events: [],
    delta: {
      score_change: item.delta,
      signal_changed: false,
      thesis_changed: item.delta !== 0,
    },
    summary: '',
  })),
  opportunities: [],
  meta: { input_method: 'manual' },
};
