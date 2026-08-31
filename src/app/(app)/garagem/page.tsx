'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem, computeScore } from '@/lib/maintenance';
import { formatNumber } from '@/lib/format';
import { Skeleton, EmptyState } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  VehicleFormFields,
  emptyVehicle,
  type VehicleFormData,
} from '@/components/vehicles/vehicle-form';
import { createVehicleWithDefaults } from '@/lib/data/vehicles';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];

export default function GaragePage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [itemsByVehicle, setItemsByVehicle] = useState<Record<string, Item[]>>({});
  const [alertCount, setAlertCount] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [data, setData] = useState<VehicleFormData>(emptyVehicle);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: vs } = await supabase
      .from('vehicles')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: true });
    setVehicles(vs ?? []);

    const map: Record<string, Item[]> = {};
    const alerts: Record<string, number> = {};
    if (vs) {
      for (const v of vs) {
        const { data: items } = await supabase
          .from('vehicle_maintenance_items')
          .select('*')
          .eq('vehicle_id', v.id);
        map[v.id] = items ?? [];
        const computed = (items ?? []).map((it) => computeItem(it, v.current_mileage));
        const score = computeScore(computed);
        alerts[v.id] = computed.filter((c) => c.status === 'atrasado' || c.status === 'atencao').length;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void score;
      }
    }
    setItemsByVehicle(map);
    setAlertCount(alerts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('Sessão expirada.', 'error');
      setSaving(false);
      return;
    }
    const { error } = await createVehicleWithDefaults(supabase, user.id, {
      brand: data.brand,
      model: data.model,
      version: data.version || null,
      year_fab: data.year_fab ? Number(data.year_fab) : null,
      year_model: Number(data.year_model),
      current_mileage: Number(data.current_mileage) || 0,
      fuel_type: data.fuel_type,
      transmission: data.transmission,
      color: data.color || null,
      plate: data.plate || null,
      nickname: data.nickname || null,
      monthly_usage: data.monthly_usage,
      usage_type: data.usage_type,
      severe_usage: data.severe_usage,
    });
    if (error) {
      toast('Não foi possível adicionar.', 'error');
    } else {
      toast('Veículo adicionado à sua garagem.');
      setAddOpen(false);
      setData(emptyVehicle);
      load();
    }
    setSaving(false);
  };

  const nextMaintenance = (v: Vehicle) => {
    const items = itemsByVehicle[v.id] ?? [];
    const computed = items.map((it) => computeItem(it, v.current_mileage)).filter((c) => c.status !== 'sem_info');
    if (computed.length === 0) return null;
    const top = [...computed].sort((a, b) => a.urgency - b.urgency)[0];
    const item = items[computed.indexOf(top)];
    if (top.kmDistance !== null) return `Próx.: ${item.name} em ${formatNumber(top.kmDistance)} km`;
    if (top.daysLeft !== null) return `Próx.: ${item.name} em ~${top.daysLeft} dias`;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Minha Garagem</h1>
          <p className="text-sm text-muted-foreground">Todos os seus veículos em um só lugar.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Adicionar</Button>
      </div>

      {!vehicles ? (
        <Skeleton className="h-40 w-full" />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="Sua garagem está vazia."
          description="Adicione seu primeiro veículo para começar a acompanhar manutenções, km e histórico."
          action={<Button onClick={() => setAddOpen(true)}>Adicionar veículo</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((v) => {
            const alerts = alertCount[v.id] ?? 0;
            return (
              <Link key={v.id} href={`/garagem/${v.id}`} className="card group p-4 transition-shadow hover:shadow-card-hover">
                <div className="flex items-center gap-3">
                  {v.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photo_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl text-white">🚗</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {v.nickname || `${v.brand} ${v.model}`}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {v.brand} {v.model} {v.version} · {v.year_model}
                    </div>
                    <div className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {formatNumber(v.current_mileage)} km
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alerts > 0 && (
                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {alerts} alerta{alerts > 1 ? 's' : ''}
                      </span>
                    )}
                    {alerts === 0 && <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Tudo em dia</span>}
                  </div>
                </div>
                {nextMaintenance(v) && (
                  <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {nextMaintenance(v)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar veículo" size="lg">
        <VehicleFormFields data={data} onChange={setData} steps="all" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={add} disabled={!data.brand || !data.model}>Adicionar</Button>
        </div>
      </Modal>
    </div>
  );
}
