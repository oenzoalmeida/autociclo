'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Logo } from '@/components/brand/logo';

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passDone, setPassDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from('profiles').select('name, email, avatar_url').eq('id', user.id).single();
      setName(prof?.name ?? '');
      setEmail(prof?.email ?? '');
      setAvatar(prof?.avatar_url ?? null);
      const { data: prefs } = await supabase.from('user_preferences').select('theme').single();
      if (prefs?.theme) setTheme(prefs.theme as 'light' | 'dark' | 'system');
      setLoading(false);
    };
    load();
  }, []);

  const saveName = async () => {
    setSavingName(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingName(false); return; }
    const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
    if (error) toast('Não foi possível salvar.', 'error');
    else toast('Perfil atualizado.');
    setSavingName(false);
  };

  const changePass = async () => {
    if (newPass.length < 8) {
      toast('A nova senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
    setSavingPass(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast('Não foi possível alterar a senha.', 'error');
    else {
      setPassDone(true);
      toast('Senha alterada.');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    }
    setSavingPass(false);
  };

  const exportData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const tables = ['vehicles', 'mileage_records', 'maintenance_records', 'maintenance_record_items', 'vehicle_maintenance_items', 'expenses', 'fuel_records', 'vehicle_documents', 'attachments', 'reminders', 'notifications', 'activity_logs'];
    let out = '# AutoCiclo — Dados exportados\n\n';
    out += `Exportado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*').eq('user_id', user.id).order('created_at');
      if (data && data.length) {
        out += `\n## ${t}\n\n`;
        out += JSON.stringify(data, null, 2) + '\n';
      }
    }
    const blob = new Blob([out], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autociclo-export-${user.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Dados exportados.');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_current_user');
    if (error) {
      toast('Não foi possível excluir a conta.', 'error');
      setDeleting(false);
      return;
    }
    window.location.href = '/';
  };

  if (loading) return <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-extrabold">Perfil</h1>

      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white">
              {name[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <div className="font-bold">{name}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
        </div>

        <Field label="Nome" htmlFor="p-name">
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button size="sm" loading={savingName} onClick={saveName}>Salvar nome</Button>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-bold">Alterar senha</h2>
        {passDone ? (
          <p className="text-sm text-green-600">Senha alterada com sucesso. Faça login novamente.</p>
        ) : (
          <>
            <Field label="Senha atual" htmlFor="old">
              <Input id="old" type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
            </Field>
            <Field label="Nova senha" htmlFor="new" hint="Mínimo de 8 caracteres.">
              <Input id="new" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="conf">
              <Input id="conf" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
            </Field>
            <Button className="w-full" loading={savingPass} onClick={changePass}>Alterar senha</Button>
          </>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-bold">Preferências</h2>
        <Field label="Tema" htmlFor="theme">
          <select id="theme" className="input" value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
            <option value="system">Seguir sistema</option>
          </select>
        </Field>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-bold">Dados</h2>
        <Button variant="secondary" className="w-full" onClick={exportData}>Exportar meus dados</Button>
        <p className="text-xs text-muted-foreground">Baixe uma cópia dos seus dados em formato Markdown.</p>
      </div>

      <button onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-red-600">
        Excluir conta
      </button>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
        title="Excluir conta"
        message="Tem certeza? Esta ação excluirá todos os seus dados permanentemente e não pode ser desfeita. O processo levará alguns instantes."
        confirmLabel="Excluir conta"
      />
    </div>
  );
}
