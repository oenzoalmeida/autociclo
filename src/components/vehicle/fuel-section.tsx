'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Fuel = Database['public']['Tables']['fuel_records']['Row'];

export function FuelSection({ vehicle, fuel, onChanged }: { vehicle: Vehicle; fuel: Fuel[]; onChanged: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [del, setDel] = useState<Fuel | null>(null);

  const fullTanks = useMemo(() => fuel.filter((f) => f.full_tank).sort((a, b) => new Date(a.fuel_date).getTime() - new Date(b.fuel_date).getTime()), [fuel]);
  const mileage = vehicle.current_mileage;

  const stats = useMemo(() => {
    let totalLiters = 0;
    let totalCost = 0;
    // consumo médio entre tanques cheios consecutivos
    let kmSum = 0;
    let litertUnion = 0;
    for (let i = 1; i < fullTanks.length; i++) {
      const prev = fullTanks[i - 1];
      const curr = fullTanks[i];
      const d = Number(curr.mileage) - Number(prev.mileage);
      if (d > 0) {
        kmSum += d;
        litertUnion += Number(curr.liters);
      }
    }
    for (const f of fuel) {
      totalLiters += Number(f.liters);
      totalCost += Number(f.total_cost);
    }
    const avgConsumption = litertUnion > 0 ? kmSum / litertUnion : null; // km/L
    const costPerKm = totalLiters > 0 ? totalCost / (mileage || 1) : null; // R$/km (aprox)
    // gasto mensal (últimos 3 meses)
    const threeMonths = fuel.filter((f) => {
      const d = new Date(f.fuel_date);
      return Date.now() - d.getTime() < 92 * 24 * 3600 * 1000;
    });
    const monthlyFuel = (threeMonths.reduce((s, f) => s + Number(f.total_cost), 0) / 3);
    return { avgConsumption, costPerKm: null, monthlyFuel, totalLiters, totalCost };
  }, [fullTanks, fuel, mileage]);

  const sorted = [...fuel].sort((a, b) => new Date(b.fuel_date).getTime() - new Date(a.fuel_date).getTime());

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">Abastecimentos</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>+ Adicionar abastecimento</Button>
      </div>

      {fuel.length === 0 ? (
        <EmptyState
          icon="⛽"
          title="Nenhum abastecimento registrado."
          description="Registre seus abastecimentos para acompanhar o consumo e o custo do seu carro (opcional)."
          action={<Button onClick={() => setAddOpen(true)}>Adicionar abastecimento</Button>}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Consumo médio" value={stats.avgConsumption ? `${stats.avgConsumption.toFixed(1)} km/L` : '—'} />
            <Metric label="Gasto mensal (comb.)" value={formatCurrency(stats.monthlyFuel)} />
            <Metric label="Total de litros" value={`${stats.totalLiters.toFixed(0)} L`} />
            <Metric label="Total gasto" value={formatCurrency(stats.totalCost)} />
          </div>
          <div className="space-y-2">
            {sorted.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div>
                  <div className="font-semibold">{formatDate(f.fuel_date)} · {Number(f.liters).toFixed(1)} L</div>
                  <div className="text-xs text-muted-foreground">
                    {f.station || 'Posto'} · {formatCurrency(f.total_cost)} ({formatCurrency(f.price_per_liter)}/L)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Number(f.mileage).toLocaleString('pt-BR')} km</span>
                  <button onClick={() => setDel(f)} aria-label="Excluir" className="text-muted-foreground hover:text-red-600">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {addOpen && <AddFuelModal vehicle={vehicle} fuel={fuel} onClose={() => setAddOpen(false)} onSaved={onChanged} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          const supabase = createClient();
          await supabase.from('fuel_records').delete().eq('id', del.id);
          onChanged();
        }}
        title="Excluir abastecimento"
        message="Tem certeza que deseja excluir este registro de abastecimento?"
      />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function AddFuelModal({ vehicle, fuel, onClose, onSaved }: { vehicle: Vehicle; fuel: Fuel[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const last = [...fuel].sort((a, b) => new Date(b.fuel_date).getTime() - new Date(a.fuel_date).getTime())[0];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState(String(vehicle.current_mileage || ''));
  const [liters, setLiters] = useState('');
  const [pricePerL, setPricePerL] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina');
  const [station, setStation] = useState('');
  const [fullTank, setFullTank] = useState(true);
  const [saving, setSaving] = useState(false);

  // prevê consumo parcial se preencher km
  const predicted = useMemo(() => {
    if (last && km && Number(km) > Number(last.mileage) && Number(liters) > 0) {
      const d = Number(km) - Number(last.mileage);
      return (d / Number(liters)).toFixed(1);
    }
    return null;
  }, [last, km, liters]);

  const save = async () => {
    if (!liters || !totalCost || !pricePerL) {
      toast('Preencha litros, valor por litro e valor total.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('fuel_records').insert({
      vehicle_id: vehicle.id,
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
      // atualiza km se maior
      if (Number(km) > vehicle.current_mileage) {
        await supabase.from('vehicles').update({ current_mileage: Number(km) }).eq('id', vehicle.id);
      }
      toast('Abastecimento registrado.');
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Adicionar abastecimento">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="f-date"><Input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Combustível" htmlFor="f-type">
            <Select id="f-type" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              {['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Elétrico'].map((f) => <option key={f}>{f}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quilometragem (km)" htmlFor="f-km"><Input id="f-km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></Field>
          <Field label="Litros" htmlFor="f-liters"><Input id="f-liters" type="number" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor por litro (R$)" htmlFor="f-ppl"><Input id="f-ppl" type="number" inputMode="decimal" value={pricePerL} onChange={(e) => setPricePerL(e.target.value)} placeholder="Ex.: 5.95" /></Field>
          <Field label="Valor total (R$)" htmlFor="f-total"><Input id="f-total" type="number" inputMode="decimal" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} /></Field>
        </div>
        <Field label="Posto" htmlFor="f-station"><Input id="f-station" value={station} onChange={(e) => setStation(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          Tanque cheio
        </label>
        {predicted && (
          <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            Consumo desde o último abastecimento: <strong>{predicted} km/L</strong>
          </p>
        )}
        {last && (
          <p className="text-xs text-muted-foreground">Último abastecimento: {formatDate(last.fuel_date)} · {Number(last.mileage).toLocaleString('pt-BR')} km</p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={save}>Salvar</Button>
      </div>
    </Modal>
  );
}
