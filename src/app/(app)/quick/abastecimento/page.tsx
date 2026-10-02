'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useQuickVehicle } from '@/lib/data/use-quick-vehicle';

const FUEL = ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'GNV', 'Elétrico', 'Híbrido'];

export default function QuickFuelPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { vehicles, selected, setSelected } = useQuickVehicle(params.get('v') ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState('');
  const [liters, setLiters] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [pricePerL, setPricePerL] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina');
  const [station, setStation] = useState('');
  const [fullTank, setFullTank] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) return;
    if (!liters || !totalCost || !pricePerL) {
      toast('Preencha litros, valor por litro e valor total.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('fuel_records').insert({
      vehicle_id: selected,
      user_id: user.id,
      fuel_date: date,
      mileage: Number(km) || 0,
      liters: Number(liters),
      total_cost: Number(totalCost),
      price_per_liter: Number(pricePerL),
      fuel_type: fuelType,
      station: station || null,
      full_tank: fullTank,
    });
    if (error) { toast('Não foi possível salvar.', 'error'); }
    else {
      if (Number(km) > (vehicles?.find((v) => v.id === selected)?.current_mileage ?? 0)) {
        await supabase.from('vehicles').update({ current_mileage: Number(km) }).eq('id', selected);
      }
      toast('Abastecimento registrado.');
      router.push('/home?msg=' + encodeURIComponent('Abastecimento registrado.'));
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

  const vehicle = vehicles.find((v) => v.id === selected);
  const last = vehicle?.current_mileage;
  const predicted = km && liters && last ? Number(km) - last : null;
  const predictedConsumption = predicted && Number(liters) > 0 ? predicted / Number(liters) : null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Adicionar abastecimento</h1>
      <div>
        <label className="label" htmlFor="v">Veículo</label>
        <select id="v" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.nickname || `${v.brand} ${v.model}`}</option>
          ))}
        </select>
      </div>
      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="f-date"><Input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Combustível" htmlFor="f-type">
            <Select id="f-type" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              {FUEL.map((f) => <option key={f}>{f}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quilometragem (km)" htmlFor="f-km"><Input id="f-km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></Field>
          <Field label="Litros" htmlFor="f-liters"><Input id="f-liters" type="number" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor por litro (R$)" htmlFor="f-ppl"><Input id="f-ppl" type="number" inputMode="decimal" value={pricePerL} onChange={(e) => setPricePerL(e.target.value)} placeholder="Ex.: 5,95" /></Field>
          <Field label="Valor total (R$)" htmlFor="f-total"><Input id="f-total" type="number" inputMode="decimal" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></Field>
        </div>
        <Field label="Posto" htmlFor="f-station"><Input id="f-station" value={station} onChange={(e) => setStation(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Tanque cheio
        </label>
        {predictedConsumption !== null && (
          <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            Consumo estimado desde o último abastecimento: <strong>{predictedConsumption.toFixed(1)} km/L</strong>
          </div>
        )}
        <Button className="w-full" loading={saving} onClick={save}>Salvar</Button>
      </div>
    </div>
  );
}
