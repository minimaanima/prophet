'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Library,
  XCircle,
} from 'lucide-react';
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
  meta?: unknown;
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

      {history[0] ? <ScanContext meta={history[0].meta} /> : null}

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

function getStringList(meta: unknown, key: 'sources_used' | 'warnings') {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return [];
  const value = (meta as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function ScanContext({ meta }: { meta: unknown }) {
  const warnings = getStringList(meta, 'warnings');
  const sources = getStringList(meta, 'sources_used');

  if (warnings.length === 0 && sources.length === 0) return null;

  return (
    <Card className="mb-6 border border-white/8 bg-card/80 ring-0">
      <CardHeader className="pb-3">
        <CardTitle>Latest scan context</CardTitle>
        <CardDescription>
          Caveats and research provenance saved with the newest import.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {warnings.length > 0 ? (
          <ContextDetails
            icon={AlertTriangle}
            label="Warnings"
            items={warnings}
            tone="warning"
          />
        ) : null}
        {sources.length > 0 ? (
          <ContextDetails
            icon={Library}
            label="Sources used"
            items={sources}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ContextDetails({
  icon: Icon,
  label,
  items,
  tone = 'default',
}: {
  icon: typeof Library;
  label: string;
  items: string[];
  tone?: 'default' | 'warning';
}) {
  return (
    <details className="group rounded-xl border border-white/8 bg-white/[.025] open:bg-white/[.04]">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Icon
          className={
            tone === 'warning' ? 'size-4 text-amber-300' : 'size-4 text-primary'
          }
        />
        <span>{label}</span>
        <Badge variant="outline" className="ml-auto">
          {items.length}
        </Badge>
      </summary>
      <ul className="space-y-2 border-t border-white/8 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${label}-${index}`} className="flex gap-2">
            <span
              className={`mt-[.45rem] size-1 shrink-0 rounded-full ${
                tone === 'warning' ? 'bg-amber-300/80' : 'bg-primary/70'
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </details>
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
      className={`grid min-h-64 place-items-center text-sm ${
        error ? 'text-rose-300' : 'text-muted-foreground'
      }`}
    >
      <div className="text-center">
        <Clock3 className="mx-auto mb-3 size-6 text-primary" />
        {message}
      </div>
    </div>
  );
}
