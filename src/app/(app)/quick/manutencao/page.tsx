'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useQuickVehicle } from '@/lib/data/use-quick-vehicle';

type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];

export default function QuickMaintenancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { vehicles, selected, setSelected } = useQuickVehicle(params.get('v') ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState('');
  const [amount, setAmount] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('vehicle_maintenance_items').select('*').eq('vehicle_id', selected);
      setItems(data ?? []);
      const v = vehicles?.find((x) => x.id === selected);
      if (v) setKm(String(v.current_mileage || ''));
    };
    load();
  }, [selected, vehicles]);

  const toggle = (id: string) => setSelectedItems((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = async () => {
    if (!selected) return;
    if (selectedItems.length === 0) {
      toast('Selecione pelo menos um serviço realizado.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }

    const { data: record, error } = await supabase.from('maintenance_records').insert({
      vehicle_id: selected,
      user_id: user.id,
      service_date: date,
      mileage: Number(km) || 0,
      total_amount: amount ? Number(amount) : 0,
      workshop: workshop || null,
      note: note || null,
    }).select().single();
    if (error || !record) { toast('Não foi possível registrar.', 'error'); setSaving(false); return; }

    await supabase.from('maintenance_record_items').insert(
      selectedItems.map((id) => ({ record_id: record.id, maintenance_item_id: id }))
    );
    for (const id of selectedItems) {
      await supabase.from('vehicle_maintenance_items').update({
        last_done_date: date,
        last_done_mileage: Number(km) || 0,
      }).eq('id', id);
    }
    if (amount && Number(amount) > 0) {
      await supabase.from('expenses').insert({
        vehicle_id: selected,
        user_id: user.id,
        category: 'Manutenção',
        description: note || 'Manutenção',
        amount: Number(amount),
        expense_date: date,
        mileage: Number(km) || null,
      });
    }
    if (Number(km) > (vehicles?.find((v) => v.id === selected)?.current_mileage ?? 0)) {
      await supabase.from('vehicles').update({ current_mileage: Number(km) }).eq('id', selected);
    }
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      vehicle_id: selected,
      action: 'maintenance_registered',
      metadata: { services: selectedItems.length },
    });
    toast('Manutenção registrada com sucesso.');
    router.push('/home?msg=' + encodeURIComponent('Manutenção registrada com sucesso.'));
  };

  if (!vehicles) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Registrar manutenção</h1>
      <div>
        <label className="label" htmlFor="v">Veículo</label>
        <select id="v" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.nickname || `${v.brand} ${v.model}`}</option>
          ))}
        </select>
      </div>

      <div className="card space-y-4 p-5">
        <Field label="Serviço(s) realizado(s)">
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
            {items.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum item de manutenção cadastrado.</p>}
            {items.map((it) => (
              <label key={it.id} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${selectedItems.includes(it.id) ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-muted'}`}>
                <span className="flex-1 font-medium">{it.name}</span>
                <input type="checkbox" checked={selectedItems.includes(it.id)} onChange={() => toggle(it.id)} className="h-4 w-4 accent-brand-600" />
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="date"><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Quilometragem (km)" htmlFor="km"><Input id="km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="amount"><Input id="amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Oficina" htmlFor="ws"><Input id="ws" value={workshop} placeholder="Ex.: Auto Center" onChange={(e) => setWorkshop(e.target.value)} /></Field>
        </div>
        <Field label="Observação" htmlFor="note"><Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button className="w-full" loading={saving} onClick={save}>Salvar manutenção</Button>
      </div>
    </div>
  );
}
