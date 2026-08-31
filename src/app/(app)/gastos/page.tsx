'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, monthName } from '@/lib/format';
import { Skeleton, EmptyState } from '@/components/ui/badge';

type Expense = Database['public']['Tables']['expenses']['Row'];
type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];
type Fuel = Database['public']['Tables']['fuel_records']['Row'];

interface Cost {
  date: Date;
  amount: number;
  category: string;
  label: string;
}

export default function ExpensesPage() {
  const [costs, setCosts] = useState<Cost[] | null>(null);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [vs, exps, recs, fuels] = await Promise.all([
        supabase.from('vehicles').select('id, brand, model, nickname').eq('user_id', user.id).eq('archived', false),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('maintenance_records').select('*').eq('user_id', user.id),
        supabase.from('fuel_records').select('*').eq('user_id', user.id),
      ]);

      const names: Record<string, string> = {};
      (vs.data ?? []).forEach((v) => (names[v.id] = v.nickname || `${v.brand} ${v.model}`));
      setVehicleNames(names);

      const list: Cost[] = [];
      (exps.data ?? []).forEach((e) => list.push({ date: new Date(e.expense_date), amount: Number(e.amount), category: e.category, label: e.description }));
      (recs.data ?? []).forEach((r) => {
        if (Number(r.total_amount) > 0) {
          list.push({ date: new Date(r.service_date), amount: Number(r.total_amount), category: 'Manutenção', label: r.note || `Manutenção em ${r.workshop || 'oficina'}` });
        }
      });
      (fuels.data ?? []).forEach((f) => list.push({ date: new Date(f.fuel_date), amount: Number(f.total_cost), category: 'Combustível', label: 'Abastecimento' }));

      list.sort((a, b) => b.date.getTime() - a.date.getTime());
      setCosts(list);
    };
    load();
  }, []);

  const totals = useMemo(() => {
    if (!costs) return null;
    const now = new Date();
    const month = costs.filter((c) => c.date.getMonth() === now.getMonth() && c.date.getFullYear() === now.getFullYear()).reduce((s, c) => s + c.amount, 0);
    const year = costs.filter((c) => c.date.getFullYear() === now.getFullYear()).reduce((s, c) => s + c.amount, 0);
    const last12 = costs.filter((c) => now.getTime() - c.date.getTime() <= 365 * 24 * 3600 * 1000).reduce((s, c) => s + c.amount, 0);
    return { month, year, last12 };
  }, [costs]);

  const byCategory = useMemo(() => {
    if (!costs) return { arr: [], max: 1 };
    const map = new Map<string, number>();
    for (const c of costs) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
    const arr = Array.from(map.entries()).map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v);
    const max = Math.max(...arr.map((a) => a.v), 1);
    return { arr, max };
  }, [costs]);

  const byMonth = useMemo(() => {
    if (!costs) return { arr: [], max: 1 };
    const map = new Map<string, number>();
    for (const c of costs) {
      const key = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + c.amount);
    }
    const arr = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    const max = Math.max(...arr.map((a) => a[1]), 1);
    return { arr, max };
  }, [costs]);

  if (!costs) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Gastos</h1>
        <p className="text-sm text-muted-foreground">Resumo de tudo que você investiu na sua garagem.</p>
      </div>

      {costs.length === 0 ? (
        <EmptyState
          icon="💰"
          title="Nenhum gasto registrado."
          description="Registre manutenções, abastecimentos e gastos avulsos para acompanhar o custo dos seus veículos."
        />
      ) : (
        <>
          {totals && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Este mês" value={formatCurrency(totals.month)} sub={monthName()} />
              <Stat label="Este ano" value={formatCurrency(totals.year)} sub={String(new Date().getFullYear())} />
              <Stat label="Últimos 12 meses" value={formatCurrency(totals.last12)} sub="12 meses" />
              <Stat label="Total registrado" value={formatCurrency(costs.reduce((s, c) => s + c.amount, 0))} sub="Todos" strong />
            </div>
          )}

          {byCategory.arr.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-4 font-bold">Por categoria</h3>
              <div className="space-y-2">
                {byCategory.arr.map((c) => (
                  <div key={c.cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{c.cat}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
                      <div className="flex h-full items-center rounded-md bg-brand-500 px-2" style={{ width: `${Math.max((c.v / byCategory.max) * 100, 6)}%` }}>
                        <span className="text-[11px] font-semibold text-white">{formatCurrency(c.v)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {byMonth.arr.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-4 font-bold">Últimos meses</h3>
              <div className="flex items-end gap-1.5">
                {byMonth.arr.map(([key, v]) => {
                  const [y, m] = key.split('-');
                  const label = `${Number(m)}/${y.slice(2)}`;
                  return (
                    <div key={key} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end rounded-t-md bg-brand-500" style={{ height: `${Math.max((v / byMonth.max) * 120, 6)}px` }} title={formatCurrency(v)} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-4 font-bold">Lançamentos recentes</h3>
            <div className="space-y-2">
              {costs.slice(0, 15).map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.category} · {c.date.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-3 ${strong ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold sm:text-base">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
