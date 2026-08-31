'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate, formatNumber } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type AdminUser = Pick<Profile, 'id' | 'name' | 'email' | 'created_at'>;
type AdminVehicle = Pick<Vehicle, 'id' | 'brand' | 'model' | 'version' | 'year_model' | 'current_mileage' | 'created_at'>;

function Overview() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [counts, setCounts] = useState({ records: 0, expenses: 0 });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [u, v, m, e] = await Promise.all([
        supabase.from('profiles').select('id, name, email, created_at').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('id, brand, model, version, year_model, current_mileage, created_at').order('created_at', { ascending: false }),
        supabase.from('maintenance_records').select('id'),
        supabase.from('expenses').select('id'),
      ]);
      setUsers(u.data ?? []);
      setVehicles(v.data ?? []);
      setCounts({ records: (m.data ?? []).length, expenses: (e.data ?? []).length });
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Panorama da plataforma AutoCiclo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Usuários" value={String(users.length)} />
        <Stat label="Veículos" value={String(vehicles.length)} />
        <Stat label="Manutenções" value={String(counts.records)} />
        <Stat label="Gastos" value={String(counts.expenses)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">Novos usuários</h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário.</p>
          ) : (
            <div className="space-y-2">
              {users.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold">Veículos recentes</h2>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum veículo.</p>
          ) : (
            <div className="space-y-2">
              {vehicles.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold">{v.brand} {v.model} {v.version ?? ''}</div>
                    <div className="truncate text-xs text-muted-foreground">{v.year_model} · {formatNumber(v.current_mileage)} km</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <AdminGuard>
      <Overview />
    </AdminGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
