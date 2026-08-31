'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem, STATUS_LABEL, statusColor } from '@/lib/maintenance';
import { formatNumber, formatDate } from '@/lib/format';
import { Skeleton, EmptyState } from '@/components/ui/badge';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];

export default function ManutencoesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: vs } = await supabase.from('vehicles').select('*').eq('archived', false);
      setVehicles(vs ?? []);
      if (vs && vs.length) {
        const { data: its } = await supabase
          .from('vehicle_maintenance_items')
          .select('*')
          .in('vehicle_id', vs.map((v) => v.id));
        setItems(its ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !vehicles) return <Skeleton className="h-64 w-full" />;

  const vehicleById: Record<string, Vehicle> = {};
  vehicles.forEach((v) => (vehicleById[v.id] = v));

  const rows = items
    .map((it) => {
      const v = vehicleById[it.vehicle_id];
      const c = computeItem(it, v?.current_mileage ?? 0);
      return { it, v, c };
    })
    .sort((a, b) => (a.c.status === 'sem_info' ? 1 : b.c.status === 'sem_info' ? -1 : a.c.urgency - b.c.urgency));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Manutenções</h1>
        <p className="text-sm text-muted-foreground">Todos os itens de manutenção da sua garagem.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="🔧"
          title="Nenhuma manutenção cadastrada."
          description="Cadastre um veículo para começar a acompanhar as manutenções preventivas."
          action={<Link href="/garagem" className="btn-primary">Ir para a garagem</Link>}
        />
      ) : (
        <div className="space-y-2">
          {rows.map(({ it, v, c }) => (
            <Link
              key={it.id}
              href={`/garagem/${v.id}`}
              className="card flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{it.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {v.nickname || `${v.brand} ${v.model}`}
                  {c.dueKm !== null
                    ? ` · próximo em ${formatNumber(c.dueKm)} km`
                    : c.dueDate
                    ? ` · próximo em ${formatDate(c.dueDate)}`
                    : ' · sem previsão'}
                </div>
              </div>
              <span className={`badge shrink-0 ${statusColor(c.status)}`}>{STATUS_LABEL[c.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
