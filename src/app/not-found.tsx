import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-[hsl(var(--background))] dark:text-slate-100">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="AutoCiclo - Início">
          <Logo />
        </Link>
      </header>
      <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Erro 404</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Essa página saiu da garagem
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          O endereço que você acessou não existe ou foi movido. Volte ao início ou entre na sua
          conta para continuar cuidando do seu carro.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            Voltar ao início
          </Link>
          <Link href="/login" className="btn-secondary">
            Entrar na minha conta
          </Link>
        </div>
      </main>
    </div>
  );
}
