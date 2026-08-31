import type { Metadata } from 'next';
import { ScanHistoryView } from '@/components/scan-history-view';
import { WorkspacePageShell } from '@/components/workspace-page-shell';

export const metadata: Metadata = { title: 'Scan history — Prophet', description: 'Audit history of imported investment scans.' };

export default function ScansPage() { return <WorkspacePageShell active="scans"><ScanHistoryView /></WorkspacePageShell>; }
