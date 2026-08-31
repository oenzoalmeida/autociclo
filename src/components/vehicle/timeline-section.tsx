'use client';

import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatNumber } from '@/lib/format';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Record = Database['public']['Tables']['maintenance_records']['Row'];

export function TimelineSection({ vehicle, records }: { vehicle: Vehicle; records: Record[] }) {
  const sorted = [...records].sort((a, b) => {
    const d = new Date(b.service_date).getTime() - new Date(a.service_date).getTime();
    return d || Number(b.mileage) - Number(a.mileage);
  });

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">Histórico do veículo</h3>
        <Link href={`/garagem/${vehicle.id}/historico`} className="text-xs font-semibold text-brand-600 dark:text-brand-400">
          Ver completo
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma manutenção registrada ainda. Registre o primeiro serviço para começar a história
          do seu carro.
        </p>
      ) : (
        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-100 pl-6 dark:border-brand-900/40">
          {sorted.slice(0, 5).map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" />
              <div className="text-xs font-bold text-brand-600 dark:text-brand-400">
                {new Date(r.service_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
              <div className="font-semibold">{r.note || `Manutenção em ${r.workshop || 'oficina'}`}</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(r.mileage)} km
                {r.workshop ? ` · ${r.workshop}` : ''}
                {Number(r.total_amount) > 0 ? ` · ${formatCurrency(r.total_amount)}` : ''}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
