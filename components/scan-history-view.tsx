'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
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

type HistoryItem = {
  id: string;
  generated_at: string;
  run_type: string;
  market_sentiment: string | null;
  status: string;
};

export function ScanHistoryView() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/scans')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load scan history');
        return (await response.json()) as { history?: HistoryItem[] };
      })
      .then((data) => setHistory(data.history ?? []))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load scan history',
        ),
      )
      .finally(() => setLoaded(true));
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-primary">
          Audit trail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          Scan history
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Processed and invalid imports, ordered by arrival.
        </p>
      </div>
      <Card className="border border-white/8 bg-card/80 ring-0">
        <CardHeader className="border-b border-white/8 pb-4">
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>Up to 20 scans are shown here.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!loaded ? (
            <Empty message="Loading scan history…" />
          ) : error ? (
            <Empty message={error} error />
          ) : history.length === 0 ? (
            <Empty message="No scans have been imported yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableHead className="pl-5">Run ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((run) => (
                  <TableRow key={run.id} className="border-white/8">
                    <TableCell className="pl-5 font-mono text-xs">
                      {run.id}
                    </TableCell>
                    <TableCell className="capitalize">
                      {run.run_type.replaceAll('_', ' ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(run.generated_at).toLocaleString('en-GB', {
                        timeZone: 'Europe/Sofia',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {run.market_sentiment?.replace('_', ' ') ?? '—'}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Badge
                        variant="outline"
                        className={
                          run.status === 'processed'
                            ? 'border-emerald-400/20 text-emerald-300'
                            : 'border-rose-400/20 text-rose-300'
                        }
                      >
                        {run.status === 'processed' ? (
                          <CheckCircle2 />
                        ) : (
                          <XCircle />
                        )}
                        {run.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Empty({
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
        <Clock3 className="mx-auto mb-3 size-6 text-primary" />
        {message}
      </div>
    </div>
  );
}
