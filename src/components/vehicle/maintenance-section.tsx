'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem, STATUS_LABEL, statusColor, originLabel, usageLabel } from '@/lib/maintenance';
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
        <h3 className="font-bold">Plano de manutenção</h3>
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
                  {c.dueKm !== null && c.dueDate
                    ? `Próximo: ${formatNumber(c.dueKm)} km ou ${formatDate(c.dueDate)}`
                    : c.dueKm !== null
                    ? `Próximo em ${formatNumber(c.dueKm)} km`
                    : c.dueDate
                    ? `Próximo em ${formatDate(c.dueDate)}`
                    : 'Sem previsão'}
                  {' · '}
                  {originLabel(item.origin)}
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
  const [description, setDescription] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; old_interval_km: number | null; old_interval_months: number | null; changed_at: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      if (item.catalog_id) {
        const { data } = await supabase.from('maintenance_catalog').select('description').eq('id', item.catalog_id).single();
        if (data?.description) setDescription(data.description);
      }
      const { data: h } = await supabase
        .from('maintenance_interval_history')
        .select('id, old_interval_km, old_interval_months, changed_at')
        .eq('item_id', item.id)
        .order('changed_at', { ascending: false })
        .limit(5);
      setHistory(h ?? []);
    };
    load();
  }, [item.id, item.catalog_id]);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const newKm = km ? Number(km) : null;
    const newMonths = months ? Number(months) : null;
    const { error } = await supabase
      .from('vehicle_maintenance_items')
      .update({
        interval_km: newKm,
        interval_months: newMonths,
        manual_interval: newKm !== null || newMonths !== null,
        origin: 'personalizada',
        notes: notes || null,
      })
      .eq('id', item.id);
    if (error) {
      toast('Não foi possível salvar.', 'error');
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('maintenance_interval_history').insert({
        item_id: item.id,
        user_id: user.id,
        old_interval_km: item.interval_km,
        old_interval_months: item.interval_months,
        new_interval_km: newKm,
        new_interval_months: newMonths,
      });
    }
    toast('Recomendação personalizada salva.');
    onSaved();
    onClose();
    setSaving(false);
  };

  const remove = async () => {
    const supabase = createClient();
    await supabase.from('vehicle_maintenance_items').delete().eq('id', item.id);
    toast('Item removido da central.');
    onSaved();
    onClose();
  };

  const prediction = [
    c.dueKm !== null ? `${formatNumber(c.dueKm)} km` : null,
    c.dueDate ? formatDate(c.dueDate) : null,
  ].filter(Boolean).join(' ou ');

  return (
    <Modal open onClose={onClose} title={item.name} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${statusColor(c.status)}`}>{STATUS_LABEL[c.status]}</span>
          <span className="badge bg-muted text-muted-foreground">{originLabel(item.origin)}</span>
          {vehicle.severe_usage && <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Uso severo</span>}
        </div>

        <div className="rounded-xl bg-muted p-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Recomendação atual:</span>{' '}
            <strong>{recommendationText(item)}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Próxima previsão:</span>{' '}
            <strong>{prediction || 'Sem previsão'}</strong>
          </p>
          {item.last_done_date && (
            <p>
              <span className="text-muted-foreground">Última manutenção:</span>{' '}
              {formatDate(item.last_done_date)}
              {item.last_done_mileage ? ` · ${formatNumber(item.last_done_mileage)} km` : ''}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Considera o que ocorrer primeiro (quilometragem ou tempo).
            {vehicle.severe_usage ? ' Em uso severo, alguns intervalos podem ser reduzidos.' : ''}
          </p>
        </div>

        {description && (
          <div className="rounded-xl border border-border p-3 text-sm">
            <div className="font-semibold">Por que isso importa?</div>
            <p className="mt-1 text-muted-foreground">{description}</p>
          </div>
        )}

        {item.origin === 'referencia_geral' && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Referência geral — confirme no manual do veículo.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Intervalo (km)" htmlFor={`i-km-${item.id}`}>
            <Input id={`i-km-${item.id}`} type="number" value={km} placeholder="Ex.: 10000" onChange={(e) => setKm(e.target.value)} />
          </Field>
          <Field label="Intervalo (meses)" htmlFor={`i-mo-${item.id}`}>
            <Input id={`i-mo-${item.id}`} type="number" value={months} placeholder="Ex.: 12" onChange={(e) => setMonths(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Ao alterar, a recomendação passa a ser <strong>personalizada</strong> e o histórico da alteração é registrado.
        </p>

        <Field label="Observações" htmlFor={`i-no-${item.id}`}>
          <Textarea id={`i-no-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {history.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Histórico de alterações</div>
            <div className="mt-1 space-y-1">
              {history.map((h) => (
                <div key={h.id} className="text-xs text-muted-foreground">
                  {formatDate(h.changed_at)}: {h.old_interval_km ?? '—'} km / {h.old_interval_months ?? '—'} meses
                </div>
              ))}
            </div>
          </div>
        )}
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

function recommendationText(item: Item): string {
  const parts: string[] = [];
  if (item.interval_km) parts.push(`${formatNumber(item.interval_km)} km`);
  if (item.interval_months) parts.push(`${item.interval_months} ${item.interval_months === 1 ? 'mês' : 'meses'}`);
  return parts.length ? parts.join(' ou ') : 'Sem intervalo definido';
}
