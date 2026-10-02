'use client';

import Link from 'next/link';
import type { computeItem } from '@/lib/maintenance';
import type { Database } from '@/lib/database.types';
import { formatNumber, pluralize } from '@/lib/format';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
interface C { item: Database['public']['Tables']['vehicle_maintenance_items']['Row']; c: ReturnType<typeof computeItem>; }

export function CuidadosCard({ vehicle, computed }: { vehicle: Vehicle; computed: C[] }) {
  const sorted = [...computed]
    .filter((x) => x.c.status !== 'sem_info')
    .sort((a, b) => a.c.urgency - b.c.urgency)
    .slice(0, 5);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">Próximos cuidados</h3>
        <Link href={`/garagem/${vehicle.id}/manutencoes`} className="text-xs font-semibold text-brand-600 dark:text-brand-400">
          Ver todos
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma manutenção com prazo registrado. Adicione manutenções para começar a receber
          previsões.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map(({ item, c }) => (
            <li key={item.id} className={`flex items-start gap-3 rounded-xl border p-3 ${statusBorder(c.status)}`}>
              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(c.status)}`} />
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">{description(item, c)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function description(
  item: Database['public']['Tables']['vehicle_maintenance_items']['Row'],
  c: ReturnType<typeof computeItem>
): string {
  if (c.status === 'atrasado') {
    const parts: string[] = [];
    if (c.kmDistance !== null && c.kmDistance < 0) parts.push(`prazo ultrapassado em ${formatNumber(Math.abs(c.kmDistance))} km`);
    if (c.daysLeft !== null && c.daysLeft < 0) parts.push(`${Math.abs(c.daysLeft)} ${pluralize(Math.abs(c.daysLeft), 'dia', 'dias')} atrasado`);
    if (parts.length) return parts.join(' ou ') + '.';
    return 'Prazo ultrapassado.';
  }
  if (c.status === 'atencao') {
    const parts: string[] = [];
    if (c.kmDistance !== null && c.kmDistance >= 0) parts.push(`faltam aproximadamente ${formatNumber(c.kmDistance)} km`);
    if (c.daysLeft !== null && c.daysLeft >= 0) parts.push(`${c.daysLeft} ${pluralize(c.daysLeft, 'dia', 'dias')}`);
    if (parts.length) return parts.join(' ou ') + '.';
  }
  if (c.status === 'em_dia') {
    const parts: string[] = [];
    if (c.kmDistance !== null) parts.push(`próximo em ${formatNumber(c.kmDistance)} km`);
    if (c.daysLeft !== null) parts.push(`${c.daysLeft} ${pluralize(c.daysLeft, 'dia', 'dias')}`);
    if (parts.length) return `Em dia · ${parts.join(' ou ')}.`;
  }
  return 'Acompanhe o prazo deste item.';
}

function statusDot(status: C['c']['status']) {
  switch (status) {
    case 'atrasado': return 'bg-red-500';
    case 'atencao': return 'bg-amber-400';
    default: return 'bg-green-500';
  }
}
function statusBorder(status: C['c']['status']) {
  switch (status) {
    case 'atrasado': return 'border-red-200 dark:border-red-900/40';
    case 'atencao': return 'border-amber-200 dark:border-amber-900/40';
    default: return 'border-green-200 dark:border-green-900/40';
  }
}
