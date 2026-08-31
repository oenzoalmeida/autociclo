'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatDate, monthName } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Record = Database['public']['Tables']['maintenance_records']['Row'];

const EXPENSE_CATS = [
  'Manutenção', 'Revisão', 'Pneus', 'Combustível', 'Seguro', 'Documentação', 'Impostos', 'Estacionamento', 'Pedágio', 'Outros',
];

export function CostsSection({
  vehicle,
  expenses,
  records,
  onChanged,
}: {
  vehicle: Vehicle;
  expenses: Expense[];
  records: Record[];
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>('all');
  const { toast } = useToast();

  const now = new Date();
  const allCosts = useMemo(() => {
    const list: { date: Date; amount: number; label: string; category: string }[] = [];
    for (const e of expenses) {
      list.push({ date: new Date(e.expense_date), amount: Number(e.amount), label: e.description, category: e.category });
    }
    for (const r of records) {
      if (Number(r.total_amount) > 0) {
        list.push({ date: new Date(r.service_date), amount: Number(r.total_amount), label: r.note || `Manutenção em ${r.workshop || 'oficina'}`, category: 'Manutenção' });
      }
    }
    return list;
  }, [expenses, records]);

  const totals = useMemo(() => {
    const thisMonth = allCosts.filter((x) => x.date.getMonth() === now.getMonth() && x.date.getFullYear() === now.getFullYear()).reduce((s, c) => s + c.amount, 0);
    const thisYear = allCosts.filter((x) => x.date.getFullYear() === now.getFullYear()).reduce((s, c) => s + c.amount, 0);
    const last12 = allCosts.filter((x) => now.getTime() - x.date.getTime() < 365 * 24 * 3600 * 1000 && x.date <= now).reduce((s, c) => s + c.amount, 0);
    const total = allCosts.reduce((s, c) => s + c.amount, 0);
    return { thisMonth, thisYear, last12, total };
  }, [allCosts, now]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allCosts) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
    const arr = Array.from(map.entries()).map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v);
    const max = Math.max(...arr.map((a) => a.v), 1);
    return { arr, max };
  }, [allCosts]);

  const visibleCats = activeCat === 'all' ? byCategory.arr : byCategory.arr.filter((a) => a.cat === activeCat);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">Custos do veículo</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>+ Adicionar gasto</Button>
      </div>

      {allCosts.length === 0 ? (
        <EmptyState
          icon="💰"
          title="Nenhum gasto registrado."
          description="Registre seus gastos com o veículo para acompanhar o custo ao longo do tempo."
          action={<Button onClick={() => setAddOpen(true)}>Adicionar gasto</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Este mês" value={formatCurrency(totals.thisMonth)} sub={monthName(now)} />
            <StatCard label="Este ano" value={formatCurrency(totals.thisYear)} sub={String(now.getFullYear())} />
            <StatCard label="Últimos 12 meses" value={formatCurrency(totals.last12)} sub="12 meses" />
            <StatCard label="Total registrado" value={formatCurrency(totals.total)} sub="Todos" strong />
          </div>

          {byCategory.arr.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <button onClick={() => setActiveCat('all')} className={`badge ${activeCat === 'all' ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'}`}>Todos</button>
                {byCategory.arr.map((c) => (
                  <button key={c.cat} onClick={() => setActiveCat(c.cat)} className={`badge ${activeCat === c.cat ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {c.cat}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {visibleCats.map((c) => (
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
        </>
      )}

      {addOpen && (
        <AddExpenseModal vehicle={vehicle} onClose={() => setAddOpen(false)} onSaved={onChanged} />
      )}
    </section>
  );
}

function StatCard({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-3 ${strong ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold sm:text-base">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function AddExpenseModal({ vehicle, onClose, onSaved }: { vehicle: Vehicle; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState('Manutenção');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!description || !amount || Number(amount) <= 0) {
      toast('Preencha a descrição e um valor válido.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('expenses').insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      category,
      description,
      amount: Number(amount),
      expense_date: date,
      mileage: km ? Number(km) : null,
    });
    if (error) { toast('Não foi possível salvar.', 'error'); }
    else { toast('Gasto registrado.'); onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Adicionar gasto">
      <div className="space-y-4">
        <Field label="Descrição" htmlFor="g-desc">
          <Input id="g-desc" value={description} placeholder="Ex.: Lavagem completa" onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria" htmlFor="g-cat">
            <Select id="g-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Valor (R$)" htmlFor="g-amount">
            <Input id="g-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="g-date">
            <Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Quilometragem (km)" htmlFor="g-km">
            <Input id="g-km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={save}>Salvar</Button>
      </div>
    </Modal>
  );
}
