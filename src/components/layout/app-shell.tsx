'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogoMark } from '@/components/brand/logo';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const q = params.get('msg');
    const kind = params.get('kind');
    if (q) {
      toast(q, (kind as 'success' | 'error' | 'info') || 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('is_admin');
      if (data) setIsAdmin(true);
    };
    check();
  }, []);

  const isAdminArea = pathname.startsWith('/admin');
  const firstSeg = '/' + (pathname.split('/')[1] || '');

  const adminNav = [
    { href: '/admin', label: 'Visão geral', icon: HomeIcon, active: pathname === '/admin' },
    { href: '/admin/usuarios', label: 'Usuários', icon: UsersIcon, active: pathname.startsWith('/admin/usuarios') },
    { href: '/admin/veiculos', label: 'Veículos', icon: GarageIcon, active: pathname.startsWith('/admin/veiculos') },
    { href: '/admin/atividade', label: 'Atividade', icon: ActivityIcon, active: pathname.startsWith('/admin/atividade') },
    { href: '/admin/suporte', label: 'Suporte', icon: HelpIcon, active: pathname.startsWith('/admin/suporte') },
    { href: '/admin/configuracoes', label: 'Configurações', icon: SettingsIcon, active: pathname.startsWith('/admin/configuracoes') },
  ];

  const clientSidebarNav = [
    { href: '/home', label: 'Início', icon: HomeIcon },
    { href: '/garagem', label: 'Garagem', icon: GarageIcon },
    { href: '/manutencoes', label: 'Manutenções', icon: WrenchIcon },
    { href: '/historico', label: 'Histórico', icon: HistoryIcon },
    { href: '/gastos', label: 'Gastos', icon: CoinsIcon },
    { href: '/alertas', label: 'Alertas', icon: BellIcon },
    { href: '/suporte', label: 'Suporte', icon: HelpIcon },
    { href: '/perfil', label: 'Perfil', icon: ProfileIcon },
  ];

  const mobileNav = useMemo(
    () => [
      { href: '/home', label: 'Início', icon: HomeIcon, active: firstSeg === '/home' },
      { href: '/garagem', label: 'Garagem', icon: GarageIcon, active: firstSeg === '/garagem' },
      { href: '/historico', label: 'Histórico', icon: HistoryIcon, active: firstSeg === '/historico' },
      { href: '/perfil', label: 'Perfil', icon: ProfileIcon, active: firstSeg === '/perfil' },
    ],
    [firstSeg]
  );

  const showQuick = ['/home', '/garagem', '/historico'].includes(firstSeg);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (isAdminArea) {
    return (
      <div className="min-h-screen pb-20 md:pb-0">
        {/* Sidebar admin */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-slate-50 p-4 dark:bg-[hsl(var(--card))] md:flex">
          <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-2">
            <LogoMark size={32} />
            <span className="text-lg font-extrabold">
              Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
            </span>
          </Link>
          <span className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Administração</span>
          <nav className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <SidebarLink key={item.href} href={item.href} active={item.active} icon={item.icon} label={item.label} />
            ))}
          </nav>
          <div className="mt-auto space-y-1">
            <Link href="/garagem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
              <GarageIcon className="h-5 w-5" />
              Ir para minha garagem
            </Link>
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
              <LogoutIcon className="h-5 w-5" />
              Sair
            </button>
          </div>
        </aside>

        {/* Conteúdo admin */}
        <div className="md:pl-64">
          <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 md:pb-16 md:pt-8">
            {children}
          </div>
        </div>

        {/* Bottom nav admin (mobile) */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur dark:bg-slate-900/95 md:hidden">
          <div className="no-scrollbar mx-auto flex max-w-md items-center gap-1 overflow-x-auto px-2 py-1.5">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-2 text-[10px] font-medium transition-colors',
                  item.active ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <Link href="/garagem" className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-2 text-[10px] font-medium text-muted-foreground">
              <GarageIcon className="h-5 w-5" />
              Garagem
            </Link>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Sidebar cliente */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white p-4 dark:bg-[hsl(var(--card))] md:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
          <LogoMark size={32} />
          <span className="text-lg font-extrabold">
            Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {clientSidebarNav.map((item) => (
            <SidebarLink key={item.href} href={item.href} active={pathname === item.href || pathname.startsWith(item.href + '/')} icon={item.icon} label={item.label} />
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-muted dark:text-brand-400">
              <ShieldIcon className="h-5 w-5" />
              Voltar para administração
            </Link>
          )}
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogoutIcon className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo cliente */}
      <div className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-16 md:pt-8">
          {children}
        </div>
      </div>

      {/* Bottom nav mobile cliente */}
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
          {mobileNav.map((item) => {
            if (showQuick && item.href === '/historico') return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors',
                  item.active ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-6 w-6" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({ href, active, icon: Icon, label }: { href: string; active: boolean; icon: (props: { className?: string }) => ReactElement; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
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
function HelpIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
      <path d="M12 17h.01" />
    </IconSvg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </IconSvg>
  );
}
function WrenchIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3z" />
    </IconSvg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconSvg>
  );
}
function ActivityIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconSvg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <IconSvg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
