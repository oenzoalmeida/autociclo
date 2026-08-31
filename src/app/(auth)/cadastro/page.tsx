'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Este e-mail já está cadastrado. Faça login.'
        : error.message);
      setLoading(false);
      return;
    }

    // Se a confirmação de e-mail estiver habilitada
    if (data.session) {
      // Sessão já criada (confirmação desativada) → ir para onboarding
      router.push('/onboarding');
      router.refresh();
      return;
    }
    setNeedsConfirm(true);
    setLoading(false);
  };

  if (needsConfirm) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-900/30">
          ✉️
        </div>
        <h1 className="text-2xl font-extrabold">Confirme seu e-mail</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua
          conta e começar a usar o AutoCiclo.
        </p>
        <Link href="/login" className="btn-secondary mt-6">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Criar conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Leva menos de um minuto. Comece a cuidar do seu carro hoje.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <Field label="Nome" htmlFor="name">
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Criar conta
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ao criar a conta você concorda com os{' '}
          <Link href="/termos" className="underline">Termos de Uso</Link> e a{' '}
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Entrar
        </Link>
      </p>
    </div>
  );
}
