'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScanSchema, type Scan } from '@/lib/scan-schema';
import { fetchMarketQuotes } from '@/lib/market-data/client';
import type { MarketQuote } from '@/lib/market-data/provider';

export function PortfolioView() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/scans')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load imported scans');
        return (await response.json()) as { latest?: unknown };
      })
      .then(async (data) => {
        const parsed = ScanSchema.safeParse(data.latest);
        if (parsed.success) {
          setScan(parsed.data);
          const quoteData = await fetchMarketQuotes(
            parsed.data.portfolio.map((item) => item.ticker),
          );
          if (quoteData) setQuotes(quoteData.quotes);
        } else if (data.latest !== null && data.latest !== undefined)
          throw new Error('Latest imported scan is invalid');
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : 'Unable to load portfolio',
        ),
      )
      .finally(() => setLoaded(true));
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-primary">
          Positions
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          Portfolio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The latest saved assessment for every instrument in the imported scan.
        </p>
      </div>
      <Card className="border border-white/8 bg-card/80 ring-0">
        <CardHeader className="border-b border-white/8 pb-4">
          <CardTitle>Current positions</CardTitle>
          <CardDescription>
            {scan
              ? `${scan.portfolio.length} instruments · ${scan.run_type.replaceAll('_', ' ')}`
              : 'Waiting for an imported scan'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!loaded ? (
            <Status message="Loading portfolio…" />
          ) : error ? (
            <Status message={error} error />
          ) : !scan ? (
            <Status message="No valid scan has been imported yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableHead className="pl-5">Instrument</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Day</TableHead>
                  <TableHead className="text-center">Signal</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="pr-5 text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scan.portfolio.map((item) => {
                  const quote = quotes[item.ticker];
                  const price = quote?.price ?? null;
                  const currency = quote?.currency ?? null;
                  const day = quote?.changePct ?? null;
                  return (
                    <TableRow
                      key={item.ticker}
                      className="border-white/8 hover:bg-white/[.035]"
                    >
                      <TableCell className="py-3.5 pl-5">
                        <Link
                          className="font-mono font-semibold hover:text-primary"
                          href={`/instruments/${item.ticker}`}
                        >
                          {item.ticker}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {price === null
                          ? '—'
                          : `${currency ?? ''} ${price.toFixed(2)}`.trim()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${day === null ? 'text-muted-foreground' : day >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                      >
                        {day === null ? (
                          '—'
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {day >= 0 ? (
                              <ArrowUpRight className="size-3.5" />
                            ) : (
                              <ArrowDownRight className="size-3.5" />
                            )}
                            {Math.abs(day).toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {item.assessment.signal}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {item.assessment.score}
                      </TableCell>
                      <TableCell className="pr-5 text-right capitalize text-muted-foreground">
                        {item.assessment.risk.replace('_', ' ')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Status({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <div
      className={`grid min-h-64 place-items-center text-sm ${error ? 'text-rose-300' : 'text-muted-foreground'}`}
    >
      <div className="text-center">
        <Database className="mx-auto mb-3 size-6 text-primary" />
        {message}
      </div>
    </div>
  );
}
