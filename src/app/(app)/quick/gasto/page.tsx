'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useQuickVehicle } from '@/lib/data/use-quick-vehicle';

const CATS = ['Manutenção', 'Revisão', 'Pneus', 'Combustível', 'Seguro', 'Documentação', 'Impostos', 'Estacionamento', 'Pedágio', 'Outros'];

export default function QuickExpensePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { vehicles, selected, setSelected } = useQuickVehicle(params.get('v') ?? '');
  const [category, setCategory] = useState('Manutenção');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) return;
    if (!description || !amount || Number(amount) <= 0) {
      toast('Preencha descrição e valor válido.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('expenses').insert({
      vehicle_id: selected,
      user_id: user.id,
      category,
      description,
      amount: Number(amount),
      expense_date: date,
      mileage: km ? Number(km) : null,
    });
    if (error) { toast('Não foi possível salvar.', 'error'); }
    else {
      if (Number(km) > (vehicles?.find((v) => v.id === selected)?.current_mileage ?? 0)) {
        await supabase.from('vehicles').update({ current_mileage: Number(km) }).eq('id', selected);
      }
      toast('Gasto registrado.');
      router.push('/home?msg=' + encodeURIComponent('Gasto registrado.'));
    }
    setSaving(false);
  };

  if (!vehicles) return <Skeleton className="h-64 w-full" />;
  if (vehicles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
        <Button onClick={() => router.push('/garagem')} className="mt-4">Adicionar veículo</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Registrar gasto</h1>
      <div>
        <label className="label" htmlFor="v">Veículo</label>
        <select id="v" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.nickname || `${v.brand} ${v.model}`}</option>
          ))}
        </select>
      </div>
      <div className="card space-y-4 p-5">
        <Field label="Descrição" htmlFor="desc">
          <Input id="desc" value={description} placeholder="Ex.: Lavagem" onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria" htmlFor="cat">
            <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Valor (R$)" htmlFor="amount">
            <Input id="amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="date"><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Quilometragem (km)" htmlFor="km"><Input id="km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></Field>
        </div>
        <Button className="w-full" loading={saving} onClick={save}>Salvar gasto</Button>
      </div>
    </div>
  );
}
