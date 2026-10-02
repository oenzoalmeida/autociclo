'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

type Ticket = Database['public']['Tables']['support_tickets']['Row'];

const CATEGORIES = ['Problema técnico', 'Dúvida sobre o sistema', 'Cadastro/conta', 'Veículo', 'Manutenção', 'Outro'];

const FAQ = [
  { q: 'Como cadastrar um veículo?', a: 'Vá em "Garagem", toque em "Adicionar" e preencha marca, modelo e ano. Depois informe a quilometragem e os demais dados.' },
  { q: 'Como atualizar a quilometragem?', a: 'Abra o veículo e toque em "Atualizar km" (ou use o botão "+"). Digite o valor atual e salve.' },
  { q: 'Como registrar uma manutenção?', a: 'Abra o veículo, toque em "Registrar manutenção", marque os serviços realizados, informe data, quilometragem e valor.' },
  { q: 'Como alterar dados do meu veículo?', a: 'Abra o veículo e toque em "Editar". Ajuste os campos desejados e salve.' },
  { q: 'Como anexar um comprovante?', a: 'Ao registrar uma manutenção ou documento, use a opção de anexo para enviar nota fiscal, recibo ou foto.' },
  { q: 'Como recuperar minha senha?', a: 'Na tela de login, toque em "Esqueceu a senha?" e informe seu e-mail para receber o link de redefinição.' },
];

export default function SuportePage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string; email: string } | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', user.id).single();
    setProfile({ id: user.id, name: prof?.name ?? '', email: prof?.email ?? user.email ?? '' });
    const { data: t } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets(t ?? []);
  };

  useEffect(() => {
    // Data loading intentionally hydrates client state after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const submit = async () => {
    if (!profile) return;
    if (!subject.trim() || !message.trim()) {
      toast('Preencha o assunto e a mensagem.', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('support_tickets').insert({
      user_id: profile.id,
      name: profile.name,
      email: profile.email,
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (error) {
      toast('Não foi possível enviar. Tente novamente.', 'error');
    } else {
      toast('Solicitação enviada com sucesso.');
      setSubject('');
      setMessage('');
      setCategory(CATEGORIES[0]);
      await load();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Suporte</h1>
        <p className="text-sm text-muted-foreground">Encontre respostas rápidas ou abra um chamado.</p>
      </div>

      {/* Ajuda rápida */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold">Ajuda rápida</h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
                {item.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="px-4 pb-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Formulário */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold">Precisa de ajuda?</h2>
        <div className="space-y-4">
          <Field label="Assunto" htmlFor="s-subject">
            <Input id="s-subject" value={subject} placeholder="Resuma sua dúvida ou problema" onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Categoria" htmlFor="s-category">
            <Select id="s-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Mensagem" htmlFor="s-message">
            <Textarea id="s-message" value={message} placeholder="Descreva o que está acontecendo..." onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Button loading={saving} onClick={submit}>Enviar solicitação</Button>
        </div>
      </section>

      {/* Meus chamados */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold">Meus chamados</h2>
        {!tickets ? (
          <Skeleton className="h-24 w-full" />
        ) : tickets.length === 0 ? (
          <EmptyState icon="📝" title="Nenhum chamado aberto." description="Suas solicitações de suporte aparecerão aqui." />
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{t.subject}</span>
                  <span className={`badge shrink-0 ${statusBadge(t.status)}`}>{t.status}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.category} · {formatDate(t.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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
