'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export default function ForcedChangePage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError('A nova senha precisa ter pelo menos 12 caracteres.');
      return;
    }
    if (password === current) {
      setError('A nova senha precisa ser diferente da senha temporária.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const supabase = createClient();

    // Confere a senha temporária reautenticando antes de trocar.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setError('Sessão não encontrada. Entre novamente.');
      setLoading(false);
      return;
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (reauthError) {
      setError('Senha temporária incorreta.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/home');
    router.refresh();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Crie sua senha definitiva</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Por segurança, você precisa trocar a senha temporária antes de continuar.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Senha temporária">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="Nova senha">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Definir nova senha'}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={handleLogout}>
          Sair e trocar de conta
        </Button>
      </form>
    </div>
  );
}
