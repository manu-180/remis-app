import { requireRole } from '@/lib/auth/require-role';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/command-palette';
import { DensityHotkeys } from '@/components/layout/density-hotkeys';
import { LockScreen } from '@/components/lock-screen';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['dispatcher', 'admin']);

  return (
    <>
      <AppShell>{children}</AppShell>
      <CommandPalette />
      <DensityHotkeys />
      <LockScreen />
    </>
  );
}
