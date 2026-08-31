'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem, STATUS_LABEL, statusColor } from '@/lib/maintenance';
import { formatDate, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];

interface ComputedRow { item: Item; c: ReturnType<typeof computeItem>; }

export function MaintenanceSection({
  vehicle,
  items,
  computed,
  onChanged,
}: {
  vehicle: Vehicle;
  items: Item[];
  computed: ComputedRow[];
  onChanged: () => void;
}) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ComputedRow | null>(null);

  const known = [...computed].sort((a, b) => a.c.status === 'sem_info' ? 1 : b.c.status === 'sem_info' ? -1 : a.c.urgency - b.c.urgency);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">Central de manutenções</h3>
        <Button size="sm" onClick={() => setRegisterOpen(true)}>+ Registrar manutenção</Button>
      </div>

      {known.length === 0 ? (
        <EmptyState
          icon="🔧"
          title="Nenhuma manutenção registrada ainda."
          description="Registre o primeiro serviço realizado no seu veículo para começar a construir o histórico dele."
          action={<Button onClick={() => setRegisterOpen(true)}>Registrar manutenção</Button>}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {known.map(({ item, c }) => (
            <button
              key={item.id}
              onClick={() => setDetailItem({ item, c })}
              className="flex items-center justify-between rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.dueKm !== null
                    ? `Próximo em ${formatNumber(c.dueKm)} km`
                    : c.dueDate
                    ? `Próximo em ${formatDate(c.dueDate)}`
                    : 'Sem previsão'}
                </div>
              </div>
              <span className={`badge ml-2 shrink-0 ${statusColor(c.status)}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </button>
          ))}
        </div>
      )}

      {registerOpen && (
        <RegisterMaintenanceModal
          vehicle={vehicle}
          items={items}
          onClose={() => setRegisterOpen(false)}
          onSaved={onChanged}
        />
      )}
      {detailItem && (
        <ItemDetailModal
          vehicle={vehicle}
          row={detailItem}
          onClose={() => setDetailItem(null)}
          onSaved={onChanged}
        />
      )}
    </section>
  );
}

function RegisterMaintenanceModal({
  vehicle,
  items,
  onClose,
  onSaved,
}: {
  vehicle: Vehicle;
  items: Item[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState(String(vehicle.current_mileage || ''));
  const [amount, setAmount] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSave = async () => {
    if (selected.length === 0) {
      toast('Selecione pelo menos um serviço realizado.', 'error');
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

    const { data: record, error: rErr } = await supabase
      .from('maintenance_records')
      .insert({
        vehicle_id: vehicle.id,
        user_id: user.id,
        service_date: date,
        mileage: Number(km) || vehicle.current_mileage,
        total_amount: amount ? Number(amount) : 0,
        workshop: workshop || null,
        note: note || null,
      })
      .select()
      .single();
    if (rErr || !record) {
      toast('Não foi possível registrar.', 'error');
      setSaving(false);
      return;
    }

    // Itens executados
    const itemAmounts = bufferAmount(selected, items, Number(amount) || 0);
    await supabase.from('maintenance_record_items').insert(
      selected.map((id) => ({
        record_id: record.id,
        maintenance_item_id: id,
        amount: itemAmounts[id] ?? null,
      }))
    );

    // Atualiza cada item de manutenção (data + km da última)
    for (const id of selected) {
      const item = items.find((i) => i.id === id);
      if (item) {
        await supabase
          .from('vehicle_maintenance_items')
          .update({
            last_done_date: date,
            last_done_mileage: Number(km) || vehicle.current_mileage,
          })
          .eq('id', id);
      }
    }

    // Upload de anexos
    for (const f of files) {
      const path = `attachments/${user.id}/${record.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: fErr } = await supabase.storage.from('vehicle-files').upload(path, f);
      if (!fErr) {
        const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
        await supabase.from('attachments').insert({
          vehicle_id: vehicle.id,
          user_id: user.id,
          record_id: record.id,
          file_url: pub.publicUrl,
          file_name: f.name,
          category: categoryOf(f.name),
        });
      }
    }

    // Gasto associado (manutenção)
    if (amount && Number(amount) > 0) {
      await supabase.from('expenses').insert({
        vehicle_id: vehicle.id,
        user_id: user.id,
        category: 'Manutenção',
        description: workshop ? note || `Manutenção em ${workshop}` : note || 'Manutenção',
        amount: Number(amount),
        expense_date: date,
        mileage: Number(km) || null,
      });
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      action: 'maintenance_registered',
      metadata: { services: selected.length },
    });

    setSaving(false);
    toast('Manutenção registrada com sucesso.');
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Registrar manutenção" size="lg">
      <div className="space-y-4">
        <Field label="Serviço(s) realizado(s)">
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
            {items.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum item disponível.</p>}
            {items.map((it) => (
              <label
                key={it.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${selected.includes(it.id) ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-muted'}`}
              >
                <span className="flex-1 font-medium">{it.name}</span>
                <input
                  type="checkbox"
                  checked={selected.includes(it.id)}
                  onChange={() => toggle(it.id)}
                  className="h-4 w-4 accent-brand-600"
                />
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="m-date">
            <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Quilometragem (km)" htmlFor="m-km">
            <Input id="m-km" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="m-amount">
            <Input id="m-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Oficina / profissional" htmlFor="m-workshop">
            <Input id="m-workshop" value={workshop} placeholder="Ex.: Auto Center Silva" onChange={(e) => setWorkshop(e.target.value)} />
          </Field>
        </div>
        <Field label="Observação" htmlFor="m-note">
          <Textarea id="m-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Anexos (nota, recibo, foto)" htmlFor="m-files">
          <input
            id="m-files"
            type="file"
            multiple
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {files.map((f, i) => (
              <li key={i}>• {f.name}</li>
            ))}
          </ul>
        )}
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={handleSave}>Salvar manutenção</Button>
      </div>
    </Modal>
  );
}

function bufferAmount(selected: string[], items: Item[], total: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (total > 0) {
    const per = Math.round((total / selected.length) * 100) / 100;
    selected.forEach((id) => (out[id] = per));
  }
  return out;
}

function categoryOf(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('foto') || /\.(png|jpe?g|webp|heic)$/.test(n)) return 'Fotos';
  if (n.includes('nota') || /\.pdf$/.test(n)) return 'Notas fiscais';
  return 'Recibos';
}

function ItemDetailModal({
  vehicle,
  row,
  onClose,
  onSaved,
}: {
  vehicle: Vehicle;
  row: ComputedRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { item, c } = row;
  const [km, setKm] = useState(item.interval_km ? String(item.interval_km) : '');
  const [months, setMonths] = useState(item.interval_months ? String(item.interval_months) : '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('vehicle_maintenance_items')
      .update({
        interval_km: km ? Number(km) : null,
        interval_months: months ? Number(months) : null,
        manual_interval: km !== '' || months !== '',
        notes: notes || null,
      })
      .eq('id', item.id);
    if (error) {
      toast('Não foi possível salvar.', 'error');
    } else {
      toast('Intervalo atualizado.');
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  const remove = async () => {
    const supabase = createClient();
    await supabase.from('vehicle_maintenance_items').delete().eq('id', item.id);
    toast('Item removido da central.');
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={item.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`badge ${statusColor(c.status)}`}>{STATUS_LABEL[c.status]}</span>
          {c.estimated && <span className="badge bg-muted text-muted-foreground">Estimativa geral</span>}
        </div>
        <div className="rounded-xl bg-muted p-3 text-sm">
          {c.dueKm !== null && (
            <p><span className="text-muted-foreground">Próxima previsão:</span> <strong>{formatNumber(c.dueKm)} km</strong> (faltam {formatNumber(c.kmDistance ?? 0)} km)</p>
          )}
          {c.dueDate && (
            <p><span className="text-muted-foreground">Próximo por tempo:</span> <strong>{formatDate(c.dueDate)}</strong></p>
          )}
          {item.last_done_date && <p><span className="text-muted-foreground">Última manutenção:</span> {formatDate(item.last_done_date)}{item.last_done_mileage ? ` · ${formatNumber(item.last_done_mileage)} km` : ''}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intervalo (km)" htmlFor={`i-km-${item.id}`}>
            <Input id={`i-km-${item.id}`} type="number" value={km} placeholder="Ex.: 10000" onChange={(e) => setKm(e.target.value)} />
          </Field>
          <Field label="Intervalo (meses)" htmlFor={`i-mo-${item.id}`}>
            <Input id={`i-mo-${item.id}`} type="number" value={months} placeholder="Ex.: 12" onChange={(e) => setMonths(e.target.value)} />
          </Field>
        </div>
        <Field label="Observações" htmlFor={`i-no-${item.id}`}>
          <Textarea id={`i-no-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Os valores padrão são uma <strong>estimativa geral</strong>, não uma recomendação oficial da
          fabricante. Ajuste de acordo com o manual do seu veículo.
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Remover item</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={save}>Salvar</Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Remover item"
        message={`Tem certeza que deseja remover "${item.name}" da central de manutenções deste veículo?`}
      />
    </Modal>
  );
}
