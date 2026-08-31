'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const detect = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const hasParams = new URLSearchParams(window.location.hash.slice(1)).has('access_token');
      if (data.session || hasParams) {
        setReady(true);
      } else {
        setError('Link de redefinição ausente ou expirado.');
      }
    };
    detect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/30">✓</div>
        <h1 className="text-2xl font-extrabold">Senha redefinida</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Sua senha foi atualizada com sucesso. Você pode entrar com a nova senha.
        </p>
        <Link href="/login" className="btn-primary mt-6">Ir para o login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Redefinir senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            disabled={!ready}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            disabled={!ready}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading} disabled={!ready}>
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}
