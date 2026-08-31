'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { Skeleton, EmptyState } from '@/components/ui/badge';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type Doc = Database['public']['Tables']['vehicle_documents']['Row'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

interface SearchResult {
  id: string;
  type: 'manutencao' | 'documento' | 'item' | 'compromisso';
  vehicleId: string;
  title: string;
  subtitle: string;
  date?: string;
  value?: number;
}

export default function HistoryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [vs, recs, items, docs, rems] = await Promise.all([
        supabase.from('vehicles').select('id, brand, model, nickname').eq('user_id', user.id).eq('archived', false),
        supabase.from('maintenance_records').select('*').eq('user_id', user.id),
        supabase.from('vehicle_maintenance_items').select('*').eq('user_id', user.id),
        supabase.from('vehicle_documents').select('*').eq('user_id', user.id),
        supabase.from('reminders').select('*').eq('user_id', user.id),
      ]);

      const names: Record<string, string> = {};
      (vs.data ?? []).forEach((v) => (names[v.id] = v.nickname || `${v.brand} ${v.model}`));
      setVehicleNames(names);

      const all: SearchResult[] = [];
      (recs.data ?? []).forEach((r) => all.push({
        id: r.id,
        type: 'manutencao',
        vehicleId: r.vehicle_id,
        title: r.note || 'Manutenção',
        subtitle: [r.workshop, formatDate(r.service_date), r.mileage ? `${formatNumber(r.mileage)} km` : ''].filter(Boolean).join(' · '),
        date: r.service_date,
        value: Number(r.total_amount) || undefined,
      }));
      (items.data ?? []).forEach((i) => all.push({
        id: i.id,
        type: 'item',
        vehicleId: i.vehicle_id,
        title: `Item de manutenção: ${i.name}`,
        subtitle: i.category,
        date: i.last_done_date ?? undefined,
      }));
      (docs.data ?? []).forEach((d) => all.push({
        id: d.id,
        type: 'documento',
        vehicleId: d.vehicle_id,
        title: d.name,
        subtitle: d.category,
        date: d.due_date ?? undefined,
        value: d.amount ?? undefined,
      }));
      (rems.data ?? []).forEach((r) => all.push({
        id: r.id,
        type: 'compromisso',
        vehicleId: r.vehicle_id,
        title: r.name,
        subtitle: `Vence em ${formatDate(r.due_date)}`,
        date: r.due_date,
        value: r.amount ?? undefined,
      }));

      all.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
      setResults(all);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!results) return null;
    const q = query.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q) ||
      (r.date && r.date.includes(q))
    );
  }, [results, query]);

  const typeLabel: Record<SearchResult['type'], string> = {
    manutencao: 'Manutenção',
    documento: 'Documento',
    item: 'Item',
    compromisso: 'Compromisso',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Histórico e busca</h1>
      <p className="text-sm text-muted-foreground">
        Pesquise por serviço, oficina, ano, documento ou item — ex.: "óleo", "pastilha", "Auto Center", "2025".
      </p>

      <input
        type="search"
        className="input"
        placeholder="Buscar no histórico do AutoCiclo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {!filtered ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔎"
          title={query ? 'Nada encontrado para esta busca.' : 'Nenhum registro ainda.'}
          description={
            query
              ? `Tente buscar por outro termo, como "óleo" ou uma oficina.`
              : 'Registre manutenções, documentos e compromissos para construir seu histórico.'
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Link
              key={`${r.type}-${r.id}`}
              href={r.type === 'manutencao' ? `/garagem/${r.vehicleId}/historico/${r.id}` : `/garagem/${r.vehicleId}`}
              className="card flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {typeLabel[r.type]}
                  </span>
                  <span className="truncate font-semibold">{r.title}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {vehicleNames[r.vehicleId]} · {r.subtitle}
                </div>
              </div>
              {r.value ? (
                <span className="shrink-0 text-sm font-bold">{formatCurrency(r.value)}</span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(r.date)}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
