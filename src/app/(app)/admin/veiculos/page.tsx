'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type AdminVehicle = Pick<Vehicle, 'id' | 'brand' | 'model' | 'version' | 'year_model' | 'current_mileage' | 'plate' | 'user_id'>;
type AdminOwner = Pick<Profile, 'id' | 'email'>;

function Veiculos() {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [profiles, setProfiles] = useState<AdminOwner[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [v, p] = await Promise.all([
        supabase.from('vehicles').select('id, brand, model, version, year_model, current_mileage, plate, user_id').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, email'),
      ]);
      setVehicles(v.data ?? []);
      setProfiles(p.data ?? []);
    };
    load();
  }, []);

  const ownerById: Record<string, AdminOwner> = {};
  profiles.forEach((p) => (ownerById[p.id] = p));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const owner = ownerById[v.user_id];
      return (
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.plate ?? '').toLowerCase().includes(q) ||
        (owner?.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [vehicles, query, ownerById]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Veículos</h1>
        <p className="text-sm text-muted-foreground">{vehicles.length} veículo(s) na plataforma.</p>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Buscar por marca, modelo, placa ou dono..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum veículo encontrado.</p>
        ) : (
          filtered.map((v) => {
            const owner = ownerById[v.user_id];
            return (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold">{v.brand} {v.model} {v.version ?? ''}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {v.year_model} · {formatNumber(v.current_mileage)} km · {maskPlate(v.plate)}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {owner ? owner.email : v.user_id.slice(0, 8)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminVeiculosPage() {
  return (
    <AdminGuard>
      <Veiculos />
    </AdminGuard>
  );
}

function maskPlate(plate: string | null): string {
  if (!plate) return 'sem placa';
  const clean = plate.replace(/[^A-Za-z0-9]/g, '');
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + '••••';
}
