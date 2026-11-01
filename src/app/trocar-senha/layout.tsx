import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[hsl(var(--background))]">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="AutoCiclo - Início">
          <span className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-lg font-extrabold">
              Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
            </span>
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
