'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKm } from '@/lib/format';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useQuickVehicle } from '@/lib/data/use-quick-vehicle';

export default function QuickKmPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { vehicles, selected, setSelected } = useQuickVehicle(params.get('v') ?? '');
  const [km, setKm] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCorrection, setConfirmCorrection] = useState(false);

  const current = vehicles?.find((v) => v.id === selected) ?? null;
  const newVal = Number(km);
  const isCorrection = km !== '' && !isNaN(newVal) && current !== null && newVal < current.current_mileage;

  const save = async () => {
    if (!current) return;
    if (km === '' || isNaN(newVal) || newVal <= 0) {
      toast('Informe uma quilometragem válida.', 'error');
      return;
    }
    if (isCorrection && !confirmCorrection) {
      setConfirmCorrection(true);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }

    await supabase.from('mileage_records').insert({
      vehicle_id: current.id,
      user_id: user.id,
      mileage: newVal,
      previous_mileage: current.current_mileage,
      correction: isCorrection,
      note: isCorrection ? note || 'Correção de quilometragem' : note || null,
    });
    await supabase.from('vehicles').update({ current_mileage: newVal }).eq('id', current.id);
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      vehicle_id: current.id,
      action: 'mileage_updated',
      metadata: { from: current.current_mileage, to: newVal, correction: isCorrection },
    });
    toast('Quilometragem atualizada.');
    router.push('/home?msg=' + encodeURIComponent('Quilometragem atualizada.'));
  };

  if (!vehicles) return <Skeleton className="h-64 w-full" />;
  if (vehicles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Nenhum veículo cadastrado ainda.</p>
        <Button onClick={() => router.push('/garagem')} className="mt-4">Adicionar veículo</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Atualizar quilometragem</h1>

      <div>
        <label className="label" htmlFor="v">Veículo</label>
        <select id="v" className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.nickname || `${v.brand} ${v.model}`}</option>
          ))}
        </select>
      </div>

      {current && (
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">Anterior</span>
              <span className="font-semibold">{formatKm(current.current_mileage)}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Data</span>
              <span className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <Field label="Nova quilometragem (km)" htmlFor="km">
            <Input id="km" type="number" inputMode="numeric" value={km} placeholder={String(current.current_mileage)} onChange={(e) => setKm(e.target.value)} />
          </Field>
          {isCorrection && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              Menor que a anterior. Será registrado como correção com justificativa.
            </div>
          )}
          <Field label="Justificativa" htmlFor="note" hint={isCorrection ? 'Obrigatória para correção.' : 'Opcional.'}>
            <Textarea id="note" value={note} required={isCorrection} placeholder="Ex.: Correção após revisão do painel." onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button className="w-full" loading={saving} onClick={save}>Salvar</Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCorrection}
        onClose={() => setConfirmCorrection(false)}
        onConfirm={save}
        title="Confirmar correção"
        message={`Reduzir de ${formatKm(current?.current_mileage ?? 0)} para ${formatKm(newVal)}? A justificativa será registrada.`}
        confirmLabel="Confirmar correção"
      />
    </div>
  );
}
