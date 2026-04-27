import type { Metadata } from 'next';
import { ClipboardList } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Auditoría — Admin' };
export const revalidate = 0;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; actor?: string; action?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('audit_log')
    .select('id, entity_type, entity_id, actor_id, action, diff, created_at, hash')
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.entity) query = query.eq('entity_type', params.entity);
  if (params.actor) query = query.eq('actor_id', params.actor);
  if (params.action) query = query.eq('action', params.action);
  if (params.from) query = query.gte('created_at', params.from);
  if (params.to) query = query.lte('created_at', params.to);

  const { data: logs } = await query;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <ClipboardList size={20} className="text-[var(--brand-accent)]" />
        <h1 className="font-bold text-2xl text-[var(--neutral-900)]">Auditoría</h1>
      </div>

      <form className="flex gap-3 mb-6 flex-wrap">
        {[
          { name: 'entity', placeholder: 'Entidad (rides, profiles…)', defaultValue: params.entity },
          { name: 'actor', placeholder: 'Actor (UUID)', defaultValue: params.actor },
          { name: 'action', placeholder: 'Acción (update, delete…)', defaultValue: params.action },
          { name: 'from', placeholder: 'Desde (ISO date)', defaultValue: params.from, type: 'date' },
          { name: 'to', placeholder: 'Hasta (ISO date)', defaultValue: params.to, type: 'date' },
        ].map((field) => (
          <input
            key={field.name}
            name={field.name}
            type={field.type ?? 'text'}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            className="border border-[var(--neutral-300)] rounded-[var(--radius-md)] px-3 py-2 text-sm bg-[var(--neutral-0)] text-[var(--neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        ))}
        <button
          type="submit"
          className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium"
        >
          Filtrar
        </button>
      </form>

      <div className="bg-[var(--neutral-0)] rounded-[var(--radius-xl)] border border-[var(--neutral-200)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Entidad</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">ID</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Acción</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Diff</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--neutral-500)]">Hash</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-[var(--neutral-100)] last:border-0 hover:bg-[var(--neutral-50)]">
                <td className="px-4 py-2 font-mono text-[var(--neutral-400)] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-2 text-[var(--neutral-700)]">{log.entity_type}</td>
                <td className="px-4 py-2 font-mono text-[var(--neutral-400)]">{log.entity_id?.slice(0, 8)}</td>
                <td className="px-4 py-2">
                  <span className="bg-[var(--neutral-100)] px-2 py-0.5 rounded text-[var(--neutral-700)]">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-[var(--neutral-400)]">{log.actor_id?.slice(0, 8)}</td>
                <td className="px-4 py-2 font-mono text-[var(--neutral-500)] max-w-[200px] truncate">
                  {JSON.stringify(log.diff)}
                </td>
                <td className="px-4 py-2 font-mono text-[var(--neutral-300)]">{log.hash?.slice(0, 10)}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--neutral-400)]">
                  No hay registros con esos filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
