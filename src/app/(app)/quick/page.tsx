'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/badge';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

const actions = [
  { href: '/quick/km', icon: '⟳', label: 'Atualizar quilometragem', desc: 'Registre a km atual do veículo' },
  { href: '/quick/manutencao', icon: '🔧', label: 'Registrar manutenção', desc: 'Anote um serviço realizado' },
  { href: '/quick/abastecimento', icon: '⛽', label: 'Adicionar abastecimento', desc: 'Registre uma ida ao posto' },
  { href: '/quick/gasto', icon: '💰', label: 'Registrar gasto', desc: 'Anote um custo avulso' },
];

export default function QuickPage() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('vehicles').select('*').eq('user_id', user.id).eq('archived', false);
      setVehicles(data ?? []);
      if (data && data.length === 1) setSelected(data[0].id);
    };
    load();
  }, []);

  if (!vehicles) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Ações rápidas</h1>
      <p className="text-sm text-muted-foreground">Escolha o que deseja registrar.</p>

      <div>
        <label className="label" htmlFor="q-vehicle">Veículo</label>
        <select id="q-vehicle" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nickname || `${v.brand} ${v.model}`} · {v.year_model}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={`${a.href}${selected ? `?v=${selected}` : ''}`}
            className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl dark:bg-brand-900/30">
              {a.icon}
            </span>
            <div>
              <div className="font-semibold">{a.label}</div>
              <div className="text-xs text-muted-foreground">{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
