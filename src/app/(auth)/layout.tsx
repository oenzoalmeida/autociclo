import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark ac-auth flex min-h-screen flex-col">
      <header className="container-page relative z-10 flex h-16 items-center">
        <Link href="/" aria-label="AutoCiclo - Início">
          <span className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-lg font-extrabold">
              Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
            </span>
          </span>
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-6">
        <div className="ac-auth-panel w-full max-w-md">
          <figure aria-hidden="true" className="ac-auth-gauge">
            <svg viewBox="0 0 200 120" role="presentation">
              <defs>
                <linearGradient id="ac-auth-gauge-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#C74500" />
                  <stop offset="1" stopColor="#FFB25C" />
                </linearGradient>
              </defs>
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#2A3238"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 80 80 0 0 1 156.6 43.4"
                fill="none"
                stroke="url(#ac-auth-gauge-grad)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <line x1="100" y1="100" x2="44" y2="100" stroke="#F2F0EA" strokeWidth="4" strokeLinecap="round" />
              <circle cx="100" cy="100" r="7" fill="#FF6B1A" />
            </svg>
          </figure>
          {children}
        </div>
      </main>
    </div>
  );
}
