'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';
import { Modal } from '@/components/ui/modal';
import { Select, Field } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Ticket = Database['public']['Tables']['support_tickets']['Row'];

const CATEGORIES = ['Problema técnico', 'Dúvida sobre o sistema', 'Cadastro/conta', 'Veículo', 'Manutenção', 'Outro'];
const STATUSES = ['Novo', 'Em atendimento', 'Resolvido'];

function statusBadge(status: string): string {
  switch (status) {
    case 'Em atendimento':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'Resolvido':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300';
  }
}

function SuporteAdmin() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState<Ticket | null>(null);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    setTickets(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!tickets) return null;
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (q && !(t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (category !== 'all' && t.category !== category) return false;
      return true;
    });
  }, [tickets, query, status, category]);

  const changeStatus = async (id: string, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast('Não foi possível alterar o status.', 'error');
    } else {
      toast('Status atualizado.');
      setTickets((prev) => prev?.map((t) => (t.id === id ? { ...t, status: newStatus } : t)) ?? []);
      setOpen((prev) => (prev && prev.id === id ? { ...prev, status: newStatus } : prev));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Suporte</h1>
        <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} chamado(s) no total.</p>
      </div>

      <div className="space-y-2">
        <input type="search" className="input" placeholder="Buscar por usuário, e-mail ou assunto..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
            <option value="all">Todos os status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoria">
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
      </div>

      {!filtered ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="📭" title="Nenhum chamado encontrado." description="Ajuste os filtros ou aguarde novas solicitações." />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpen(t)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left text-sm transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.subject}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.name} · {t.email} · {t.category}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(t.created_at)}</span>
                <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(null)} title="Chamado" size="lg">
          <div className="space-y-4">
            <div>
              <div className="font-bold">{open.subject}</div>
              <div className="text-xs text-muted-foreground">{open.category} · {formatDate(open.created_at)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-sm">
              <div>
                <span className="block text-xs text-muted-foreground">Usuário</span>
                <span className="font-semibold">{open.name}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">E-mail</span>
                <span className="break-all font-semibold">{open.email}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Mensagem</span>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-border p-3 text-sm">{open.message}</p>
            </div>

            <Field label="Status" htmlFor="t-status">
              <Select id="t-status" value={open.status} onChange={(e) => changeStatus(open.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AdminSuportePage() {
  return (
    <AdminGuard>
      <SuporteAdmin />
    </AdminGuard>
  );
}
