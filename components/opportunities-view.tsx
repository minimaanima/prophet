'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScanSchema, type Scan } from '@/lib/scan-schema';

export function OpportunitiesView() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/scans')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load imported scans');
        return (await response.json()) as { latest?: unknown };
      })
      .then((data) => {
        const parsed = ScanSchema.safeParse(data.latest);
        if (parsed.success) setScan(parsed.data);
        else if (data.latest !== null && data.latest !== undefined)
          throw new Error('Latest imported scan is invalid');
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load opportunities',
        ),
      )
      .finally(() => setLoaded(true));
  }, []);

  const opportunities = (scan?.opportunities ?? []).filter(
    (opportunity) => typeof opportunity.ticker === 'string',
  );

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-primary">
          Scanner output
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          Opportunities
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Candidates supplied by the latest imported scan.
        </p>
      </div>

      {!loaded ? (
        <OpportunityStatus message="Loading imported opportunities…" />
      ) : error ? (
        <OpportunityStatus message={error} error />
      ) : opportunities.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity, index) => {
            const ticker = opportunity.ticker as string;
            const reason =
              typeof opportunity.reason === 'string'
                ? opportunity.reason
                : null;
            const signal =
              typeof opportunity.signal === 'string'
                ? opportunity.signal
                : null;
            const score =
              typeof opportunity.score === 'number' ? opportunity.score : null;

            return (
              <Card
                key={`${ticker}-${index}`}
                className="border border-white/8 bg-card/80 ring-0"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-xl">
                      {ticker}
                    </CardTitle>
                    {signal && <Badge variant="outline">{signal}</Badge>}
                  </div>
                  {score !== null && (
                    <CardDescription>Score {score}/100</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {reason ?? 'Rationale unavailable in the imported scan.'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-white/8 bg-card/80 ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              No candidates in the latest imported scan
            </CardTitle>
            <CardDescription>
              No opportunity records were supplied.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  );
}

function OpportunityStatus({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <Card className="border border-white/8 bg-card/80 ring-0">
      <CardContent
        className={`grid min-h-48 place-items-center text-sm ${error ? 'text-rose-300' : 'text-muted-foreground'}`}
      >
        {message}
      </CardContent>
    </Card>
  );
}
