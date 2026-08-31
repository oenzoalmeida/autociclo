'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatKm, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type MileageRecord = Database['public']['Tables']['mileage_records']['Row'];

export function KmCard({
  vehicle,
  mileage,
  onUpdated,
  monthlyKm,
}: {
  vehicle: Vehicle;
  mileage: MileageRecord[];
  onUpdated: () => void;
  monthlyKm: number | null;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState('');
  const [note, setNote] = useState('');
  const [confirmCorrection, setConfirmCorrection] = useState(false);
  const [saving, setSaving] = useState(false);

  const newVal = Number(km);
  const isCorrection = !isNaN(newVal) && km !== '' && newVal < vehicle.current_mileage;

  const handleSave = async () => {
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
    if (!user) {
      toast('Sessão expirada.', 'error');
      setSaving(false);
      return;
    }

    const { error: insErr } = await supabase.from('mileage_records').insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      mileage: newVal,
      previous_mileage: vehicle.current_mileage,
      correction: isCorrection,
      note: isCorrection ? note || 'Correção de quilometragem' : note || null,
    });
    if (insErr) {
      toast('Não foi possível salvar.', 'error');
      setSaving(false);
      return;
    }

    await supabase.from('vehicles').update({ current_mileage: newVal }).eq('id', vehicle.id);

    // Registra atividade
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      action: 'mileage_updated',
      metadata: { from: vehicle.current_mileage, to: newVal, correction: isCorrection },
    });

    setOpen(false);
    setKm('');
    setNote('');
    setConfirmCorrection(false);
    toast(isCorrection ? 'Quilometragem corrigida.' : 'Quilometragem atualizada.');
    onUpdated();
    setSaving(false);
  };

  const latest = mileage[0];

  return (
    <div className="card p-5">
      <h3 className="mb-3 font-bold">Quilometragem</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold">{formatNumber(vehicle.current_mileage)}</span>
        <span className="text-sm text-muted-foreground">km</span>
      </div>
      {monthlyKm !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Você roda aproximadamente {formatNumber(monthlyKm)} km/mês.
        </p>
      )}
      {latest && latest.previous_mileage > 0 && !latest.correction && (
        <p className="mt-1 text-xs text-muted-foreground">
          Última atualização: {formatKm(latest.mileage)} em{' '}
          {new Date(latest.recorded_at).toLocaleDateString('pt-BR')}
        </p>
      )}
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        ⟳ Atualizar quilometragem
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Atualizar quilometragem">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">Anterior</span>
              <span className="font-semibold">{formatKm(vehicle.current_mileage)}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Data</span>
              <span className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <Field label="Nova quilometragem (km)" htmlFor="newkm">
            <Input
              id="newkm"
              type="number"
              inputMode="numeric"
              value={km}
              placeholder={String(vehicle.current_mileage)}
              onChange={(e) => setKm(e.target.value)}
            />
          </Field>
          {isCorrection && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              A nova quilometragem é menor que a anterior. Isso será registrado como uma{' '}
              <strong>correção</strong> e exigirá uma justificativa.
            </div>
          )}
          <Field label="Justificativa" htmlFor="note" hint={isCorrection ? 'Obrigatória para correção.' : 'Opcional.'}>
            <Textarea
              id="note"
              value={note}
              required={isCorrection}
              placeholder="Ex.: Quilometragem corrigida após revisão do painel."
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCorrection}
        onClose={() => setConfirmCorrection(false)}
        onConfirm={handleSave}
        title="Confirmar correção"
        message={`Tem certeza que deseja reduzir a quilometragem de ${formatKm(vehicle.current_mileage)} para ${formatKm(newVal)}? A justificativa será registrada no histórico.`}
        confirmLabel="Confirmar correção"
      />
    </div>
  );
}
