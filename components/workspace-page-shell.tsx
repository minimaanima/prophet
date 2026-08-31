import Link from 'next/link';
import {
  Activity,
  Bell,
  Bolt,
  Clock3,
  Import,
  LayoutDashboard,
  Search,
  Sparkles,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActivePage = 'overview' | 'portfolio' | 'opportunities' | 'scans';

const navigation = [
  { key: 'overview', label: 'Overview', href: '/', icon: LayoutDashboard },
  { key: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: Activity },
  { key: 'opportunities', label: 'Opportunities', href: '/opportunities', icon: Sparkles },
  { key: 'scans', label: 'Scan history', href: '/scans', icon: Clock3 },
] as const;

export function WorkspacePageShell({ active, children }: { active: ActivePage; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-5 px-4 sm:px-7">
          <Link className="flex items-center gap-2.5" href="/">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(121,255,194,.18)]"><Activity className="size-4" /></span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em]">PROPHET</span>
          </Link>
          <div className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />Market data connected</div>
          <div className="ml-auto flex items-center gap-2">
            <span className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-hidden="true"><Search /></span>
            <span className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-hidden="true"><Bell /></span>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'ml-1')} href="/#import"><Import />Import scan</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="space-y-1 text-sm" aria-label="Primary navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <Link
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition',
                    selected ? 'bg-white/7 font-medium text-white' : 'text-muted-foreground hover:bg-white/5 hover:text-white',
                  )}
                  href={item.href}
                  aria-current={selected ? 'page' : undefined}
                >
                  <Icon className={cn('size-4', selected && 'text-primary')} />{item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-xl border border-primary/15 bg-primary/[.055] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-primary"><Bolt className="size-3.5" />Active theme</div>
            <p className="mt-3 text-sm font-medium">AI power infrastructure</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Grid, generation, storage, cooling and onsite power.</p>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
