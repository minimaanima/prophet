'use client';

import { useEffect, useState } from 'react';
import { Bolt, Building2, Factory, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanSchema, type Scan } from '@/lib/scan-schema';

const themeAreas = [
  { icon: Factory, title: 'Grid equipment', description: 'Transformers, switchgear, substations and transmission backlogs.' },
  { icon: Bolt, title: 'Dispatchable power', description: 'Gas turbines, nuclear generation and reliable capacity for data centers.' },
  { icon: Building2, title: 'Behind-the-meter', description: 'Onsite generation, cooling, storage and resilient power systems.' },
];

export function OpportunitiesView() {
  const [scan, setScan] = useState<Scan | null>(null);
  useEffect(() => {
    fetch('/api/scans').then(async (response) => await response.json() as { latest?: unknown }).then((data) => {
      const parsed = ScanSchema.safeParse(data.latest);
      if (parsed.success) setScan(parsed.data);
    }).catch(() => undefined);
  }, []);

  const opportunities = scan?.opportunities ?? [];
  return (
    <>
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-primary">Scanner output</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Opportunities</h1>
        <p className="mt-2 text-sm text-muted-foreground">Candidates outside the portfolio, with a permanent AI power-infrastructure lens.</p>
      </div>
      {opportunities.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity, index) => {
            const ticker = typeof opportunity.ticker === 'string' ? opportunity.ticker : `Candidate ${index + 1}`;
            const reason = typeof opportunity.reason === 'string' ? opportunity.reason : 'See the imported scan for the complete rationale.';
            const signal = typeof opportunity.signal === 'string' ? opportunity.signal : 'WATCH';
            const score = typeof opportunity.score === 'number' ? opportunity.score : null;
            return <Card key={`${ticker}-${index}`} className="border border-white/8 bg-card/80 ring-0"><CardHeader><div className="flex items-center justify-between"><CardTitle className="font-mono text-xl">{ticker}</CardTitle><Badge variant="outline">{signal}</Badge></div><CardDescription>{score === null ? 'Unscored candidate' : `Score ${score}/100`}</CardDescription></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">{reason}</p></CardContent></Card>;
          })}
        </div>
      ) : (
        <Card className="border border-white/8 bg-card/80 ring-0"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />No candidates in the latest scan</CardTitle><CardDescription>The next imported task should include 2–3 opportunities when credible setups exist.</CardDescription></CardHeader></Card>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">{themeAreas.map((area) => <Card key={area.title} className="border border-primary/12 bg-primary/[.035] ring-0"><CardHeader><area.icon className="mb-2 size-5 text-primary" /><CardTitle>{area.title}</CardTitle><CardDescription className="leading-relaxed">{area.description}</CardDescription></CardHeader></Card>)}</div>
    </>
  );
}
