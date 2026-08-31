import type { Metadata } from 'next';
import { OpportunitiesView } from '@/components/opportunities-view';
import { WorkspacePageShell } from '@/components/workspace-page-shell';

export const metadata: Metadata = { title: 'Opportunities — Prophet', description: 'Investment candidates from the latest scan.' };

export default function OpportunitiesPage() { return <WorkspacePageShell active="opportunities"><OpportunitiesView /></WorkspacePageShell>; }
