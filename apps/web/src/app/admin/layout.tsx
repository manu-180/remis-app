import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/sidebar';
import { DarkModeProvider } from '@/components/admin/dark-mode-provider';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const role = user.user_metadata?.['role'] as string | undefined;
  if (role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <>
      <DarkModeProvider />
      <div className="flex min-h-screen bg-[var(--neutral-100)] text-[var(--neutral-900)]">
        <AdminSidebar />
        <div className="flex-1 overflow-auto">
          <main className="p-6 md:p-8">{children}</main>
        </div>
      </div>
    </>
  );
}
