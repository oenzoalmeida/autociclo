'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/badge';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('is_admin');
      setState(!error && data ? 'ok' : 'denied');
    };
    check();
  }, []);

  if (state === 'loading') return <Skeleton className="h-64 w-full" />;
  if (state === 'denied') {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-2xl font-extrabold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-muted-foreground">Esta área é exclusiva de administradores.</p>
        <Link href="/home" className="btn-secondary mt-6">Voltar ao início</Link>
      </div>
    );
  }

  return <>{children}</>;
}
