import type { Metadata } from 'next';
import { PortfolioView } from '@/components/portfolio-view';
import { WorkspacePageShell } from '@/components/workspace-page-shell';

export const metadata: Metadata = { title: 'Portfolio — Prophet', description: 'Latest imported portfolio assessments.' };

export default function PortfolioPage() { return <WorkspacePageShell active="portfolio"><PortfolioView /></WorkspacePageShell>; }
