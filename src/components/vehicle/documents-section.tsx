'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatDate, relativeDays } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Doc = Database['public']['Tables']['vehicle_documents']['Row'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

const DOC_CATS = ['Notas fiscais', 'Recibos', 'Orçamentos', 'Fotos', 'Seguro', 'Documentação', 'Outros'];
const REMINDER_TYPES = ['Licenciamento', 'Seguro', 'IPVA', 'Inspeção', 'Garantia', 'Outros'];

export function DocumentsSection({ vehicle, onChanged }: { vehicle: Vehicle; onChanged: () => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [addDoc, setAddDoc] = useState(false);
  const [addRem, setAddRem] = useState(false);
  const [delDoc, setDelDoc] = useState<Doc | null>(null);
  const [delRem, setDelRem] = useState<Reminder | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const supabase = createClient();
    const [d, r] = await Promise.all([
      supabase.from('vehicle_documents').select('*').eq('vehicle_id', vehicle.id).order('created_at', { ascending: false }),
      supabase.from('reminders').select('*').eq('vehicle_id', vehicle.id).order('due_date', { ascending: true }),
    ]);
    setDocs(d.data ?? []);
    setReminders(r.data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeReminders = reminders?.filter((r) => !r.completed) ?? [];
  const completedReminders = reminders?.filter((r) => r.completed) ?? [];
  const visibleReminders = showCompleted
    ? [...activeReminders, ...completedReminders]
    : activeReminders;

  const markDone = async (r: Reminder) => {
    const supabase = createClient();
    await supabase.from('reminders').update({ completed: !r.completed }).eq('id', r.id);
    load();
    onChanged();
  };

  return (
    <section className="card p-5">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">Documentos e compromissos</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAddDoc(true)}>+ Documento</Button>
            <Button size="sm" onClick={() => setAddRem(true)}>+ Compromisso</Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Notas, recibos, seguro, licenciamento e vencimentos do seu veículo.
        </p>
      </div>

      {/* Documentos */}
      <div className="mb-6">
        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Documentos e arquivos</h4>
        {!docs || docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento adicionado.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.category}
                    {d.due_date ? ` · vence ${formatDate(d.due_date)}` : ''}
                    {d.amount ? ` · ${formatCurrency(d.amount)}` : ''}
                  </div>
                  {d.note && <div className="mt-0.5 truncate text-xs text-muted-foreground">{d.note}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs" title="Baixar">⬇</a>
                  )}
                  <button onClick={() => setDelDoc(d)} aria-label="Excluir" className="rounded p-1 text-muted-foreground hover:text-red-600">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vencimentos */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Vencimentos e lembretes</h4>
        {visibleReminders.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Nenhum compromisso cadastrado."
            description="Adicione licenciamento, seguro, IPVA ou outros vencimentos para receber alertas."
            action={<Button onClick={() => setAddRem(true)}>Adicionar compromisso</Button>}
          />
        ) : (
          <div className="space-y-2">
            {visibleReminders.map((r) => {
              const days = relativeDays(r.due_date);
              const tone = days < 0
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                : days <= 30
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                : 'bg-muted text-muted-foreground';
              return (
                <div key={r.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm ${r.completed ? 'opacity-60' : 'border-border'}`}>
                  <div className="min-w-0">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Vence em {formatDate(r.due_date)}
                      {r.amount ? ` · ${formatCurrency(r.amount)}` : ''}
                    </div>
                    {r.note && <div className="mt-0.5 text-xs text-muted-foreground">{r.note}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`badge ${tone}`}>
                      {r.completed ? 'Concluído' : days < 0 ? `${Math.abs(days)}d atrasado` : days === 0 ? 'Hoje' : `${days}d`}
                    </span>
                    <button onClick={() => markDone(r)} className="text-xs font-semibold text-green-600" title={r.completed ? 'Reabrir' : 'Concluir'}>
                      {r.completed ? '↩' : '✓'}
                    </button>
                    <button onClick={() => setDelRem(r)} aria-label="Excluir" className="rounded p-1 text-muted-foreground hover:text-red-600">🗑</button>
                  </div>
                </div>
              );
            })}
            {completedReminders.length > 0 && (
              <button onClick={() => setShowCompleted((s) => !s)} className="text-xs font-medium text-brand-600 dark:text-brand-400">
                {showCompleted ? 'Ocultar concluídos' : `Ver concluídos (${completedReminders.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {addDoc && <AddDocModal vehicle={vehicle} onClose={() => setAddDoc(false)} onSaved={() => { load(); onChanged(); }} />}
      {addRem && <AddReminderModal vehicle={vehicle} onClose={() => setAddRem(false)} onSaved={() => { load(); onChanged(); }} />}
      <ConfirmDialog
        open={!!delDoc}
        onClose={() => setDelDoc(null)}
        onConfirm={async () => {
          if (delDoc) {
            const supabase = createClient();
            await supabase.from('vehicle_documents').delete().eq('id', delDoc.id);
            toast('Documento excluído.');
            load();
            onChanged();
          }
        }}
        title="Excluir documento"
        message="Tem certeza que deseja excluir este documento?"
      />
      <ConfirmDialog
        open={!!delRem}
        onClose={() => setDelRem(null)}
        onConfirm={async () => {
          if (delRem) {
            const supabase = createClient();
            await supabase.from('reminders').delete().eq('id', delRem.id);
            toast('Compromisso excluído.');
            load();
            onChanged();
          }
        }}
        title="Excluir compromisso"
        message="Tem certeza que deseja excluir este compromisso?"
      />
    </section>
  );
}

function AddDocModal({ vehicle, onClose, onSaved }: { vehicle: Vehicle; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DOC_CATS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !file) {
      toast('Informe um nome e selecione um arquivo.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const path = `documents/${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('vehicle-files').upload(path, file);
    if (upErr) {
      toast('Não foi possível enviar o arquivo.', 'error');
      setSaving(false);
      return;
    }
    const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
    const { error } = await supabase.from('vehicle_documents').insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      name,
      category,
      file_url: pub.publicUrl,
    });
    if (error) toast('Não foi possível salvar.', 'error');
    else toast('Documento adicionado.');
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Adicionar documento">
      <div className="space-y-4">
        <Field label="Nome" htmlFor="d-name">
          <Input id="d-name" value={name} placeholder="Ex.: Nota fiscal da troca de óleo" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Categoria" htmlFor="d-cat">
          <Select id="d-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {DOC_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Arquivo" htmlFor="d-file">
          <input
            id="d-file"
            type="file"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={save}>Salvar</Button>
      </div>
    </Modal>
  );
}

function AddReminderModal({ vehicle, onClose, onSaved }: { vehicle: Vehicle; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [due, setDue] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !due) {
      toast('Informe o nome e a data de vencimento.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast('Sessão expirada.', 'error'); setSaving(false); return; }
    const { error } = await supabase.from('reminders').insert({
      vehicle_id: vehicle.id,
      user_id: user.id,
      name,
      due_date: due,
      amount: amount ? Number(amount) : null,
      note: note || null,
    });
    if (error) toast('Não foi possível salvar.', 'error');
    else toast('Compromisso adicionado.');
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Adicionar compromisso / vencimento">
      <div className="space-y-4">
        <Field label="Nome / tipo" htmlFor="r-name">
          <Select id="r-name" value={name} onChange={(e) => setName(e.target.value)}>
            <option value="">Selecione...</option>
            {REMINDER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de vencimento" htmlFor="r-due">
            <Input id="r-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
          </Field>
          <Field label="Valor (R$)" htmlFor="r-amount" hint="Opcional.">
            <Input id="r-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        <Field label="Observação" htmlFor="r-note">
          <Textarea id="r-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Valores são informativos. Não calculamos impostos oficiais automaticamente.
        </p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={save}>Salvar</Button>
      </div>
    </Modal>
  );
}
