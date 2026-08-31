'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate, formatNumber } from '@/lib/format';
import { Skeleton, EmptyState } from '@/components/ui/badge';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totals, setTotals] = useState<{ records: number; expenses: number }>({ records: 0, expenses: 0 });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: admin, error } = await supabase.rpc('is_admin');
      if (error || !admin) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);

      const [p, v, m, e] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
        supabase.from('maintenance_records').select('id'),
        supabase.from('expenses').select('id'),
      ]);
      setProfiles(p.data ?? []);
      setVehicles(v.data ?? []);
      setTotals({ records: (m.data ?? []).length, expenses: (e.data ?? []).length });
    };
    load();
  }, []);

  if (isAdmin === null) return <Skeleton className="h-64 w-full" />;

  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-2xl font-extrabold">Acesso negado</h1>
        <p className="mt-1 text-sm text-muted-foreground">Esta área é restrita a administradores.</p>
        <Link href="/home" className="btn-secondary mt-6">Voltar ao início</Link>
      </div>
    );
  }

  const userById: Record<string, Profile> = {};
  profiles.forEach((p) => (userById[p.id] = p));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Painel administrativo</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma AutoCiclo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Usuários" value={String(profiles.length)} />
        <Stat label="Veículos" value={String(vehicles.length)} />
        <Stat label="Manutenções" value={String(totals.records)} />
        <Stat label="Gastos" value={String(totals.expenses)} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-bold">Usuários cadastrados</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold">Veículos da plataforma</h2>
        {vehicles.length === 0 ? (
          <EmptyState icon="🚗" title="Nenhum veículo cadastrado." description="Quando houver veículos, eles aparecerão aqui." />
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => {
              const owner = userById[v.user_id];
              return (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold">{v.brand} {v.model} {v.version ?? ''}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {v.year_model} · {formatNumber(v.current_mileage)} km · {owner ? owner.email : v.user_id.slice(0, 8)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
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
