'use client';

import Link from 'next/link';
import {
  Activity,
  Clock3,
  LayoutDashboard,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type NavigationPage =
  | 'overview'
  | 'portfolio'
  | 'opportunities'
  | 'scans';

export const workspaceNavigation = [
  { key: 'overview', label: 'Overview', href: '/', icon: LayoutDashboard },
  { key: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: Activity },
  {
    key: 'opportunities',
    label: 'Opportunities',
    href: '/opportunities',
    icon: Sparkles,
  },
  { key: 'scans', label: 'Scan history', href: '/scans', icon: Clock3 },
] as const;

export function MobileNavigationMenu({ active }: { active: NavigationPage }) {
  return (
    <Drawer swipeDirection="right">
      <DrawerTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon-lg' }),
          'lg:hidden',
        )}
        aria-label="Open navigation menu"
      >
        <Menu />
      </DrawerTrigger>
      <DrawerContent className="border-white/10 bg-background/95 backdrop-blur-xl">
        <DrawerHeader className="border-b border-white/8 p-5 pr-14">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(121,255,194,.18)]">
              <Activity className="size-5" />
            </span>
            <div>
              <DrawerTitle className="font-mono tracking-[0.14em]">
                PROPHET
              </DrawerTitle>
              <DrawerDescription>Workspace navigation</DrawerDescription>
            </div>
          </div>
          <DrawerClose
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-lg' }),
              'absolute right-4 top-4',
            )}
            aria-label="Close navigation menu"
          >
            <X />
          </DrawerClose>
        </DrawerHeader>
        <nav className="flex flex-col gap-2 p-4" aria-label="Mobile navigation">
          {workspaceNavigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <DrawerClose
                key={item.key}
                render={<Link href={item.href} />}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                  selected
                    ? 'bg-primary/12 text-white ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white',
                )}
                aria-current={selected ? 'page' : undefined}
              >
                <Icon className={cn('size-5', selected && 'text-primary')} />
                {item.label}
              </DrawerClose>
            );
          })}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
