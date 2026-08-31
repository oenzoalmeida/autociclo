'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogoMark } from '@/components/brand/logo';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

const quickActions = [
  { href: '/quick/km', label: 'Atualizar km', icon: '⟳' },
  { href: '/quick/manutencao', label: 'Registrar manutenção', icon: '🔧' },
  { href: '/quick/abastecimento', label: 'Abastecimento', icon: '⛽' },
  { href: '/quick/gasto', label: 'Registrar gasto', icon: '💰' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const q = params.get('msg');
    const kind = params.get('kind');
    if (q) {
      toast(q, (kind as 'success' | 'error' | 'info') || 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const firstSeg = '/' + (pathname.split('/')[1] || '');

  const nav = useMemo(
    () => [
      { href: '/home', label: 'Início', icon: HomeIcon, active: firstSeg === '/home' },
      { href: '/garagem', label: 'Garagem', icon: GarageIcon, active: firstSeg === '/garagem' },
      { href: '/historico', label: 'Histórico', icon: HistoryIcon, active: firstSeg === '/historico' },
      { href: '/perfil', label: 'Perfil', icon: ProfileIcon, active: firstSeg === '/perfil' },
    ],
    [firstSeg]
  );

  const sidebarNav = [
    { href: '/home', label: 'Início', icon: HomeIcon },
    { href: '/garagem', label: 'Minha Garagem', icon: GarageIcon },
    { href: '/gastos', label: 'Gastos', icon: CoinsIcon },
    { href: '/historico', label: 'Histórico', icon: HistoryIcon },
    { href: '/alertas', label: 'Alertas', icon: BellIcon },
    { href: '/perfil', label: 'Perfil', icon: ProfileIcon },
  ];

  const showQuick = ['/home', '/garagem', '/historico'].includes(firstSeg);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white p-4 dark:bg-[hsl(var(--card))] md:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <LogoMark size={32} />
          <span className="text-lg font-extrabold">
            Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {sidebarNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <LogoutIcon className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-16 md:pt-8">
          {children}
        </div>
      </div>

      {/* Bottom nav mobile */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur dark:bg-slate-900/95 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 items-center gap-1 px-2 py-1.5">
          {showQuick && (
            <div className="relative flex justify-center">
              <button
                onClick={() => router.push('/quick')}
                aria-label="Ações rápidas"
                className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                +
              </button>
            </div>
          )}
          {nav.map((item) => {
            if (showQuick && item.href === '/historico') return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors',
                  item.active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-6 w-6" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Actions rápidas content (para quando /quick é aberto) */}
      {firstSeg === '/quick' && <QuickActions />}
    </div>
  );
}

function QuickActions() {
  return null;
}

const iconProps = { 'aria-hidden': true } as const;

function IconSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...iconProps} className={className ?? 'h-6 w-6'}>
      {children}
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </IconSvg>
  );
}
function GarageIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M6 19V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13" />
      <path d="M4 19h16" />
      <path d="M9 10h6M9 14h6" />
    </IconSvg>
  );
}
function HistoryIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </IconSvg>
  );
}
function ProfileIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </IconSvg>
  );
}
function CoinsIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <circle cx="9" cy="9" r="6" />
      <path d="M9 6v6l3 2" />
      <path d="M15 12.5 18 21l-3-1-2 1-2-1-3 1 3-8.5" />
    </IconSvg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </IconSvg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </IconSvg>
  );
}
