'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { Skeleton, EmptyState } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Notif = Database['public']['Tables']['notifications']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function AlertsPage() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [n, v] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', user.id),
      ]);
      const map: Record<string, Vehicle> = {};
      (v.data ?? []).forEach((x) => (map[x.id] = x));
      setVehicles(map);
      setNotifs(n.data ?? []);
    };
    load();
  }, []);

  const markAllRead = async () => {
    if (!notifs) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifs((prev) => prev?.map((x) => ({ ...x, read: true })) ?? []);
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifs((prev) => prev?.map((x) => (x.id === id ? { ...x, read: true } : x)) ?? []);
  };

  const unread = notifs?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Central de alertas</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} alerta${unread > 1 ? 's' : ''} não ${unread > 1 ? 'lidos' : 'lido'}.` : 'Tudo em dia. Você está em dia com seus cuidados.'}
          </p>
        </div>
        {unread > 0 && <Button variant="secondary" size="sm" onClick={markAllRead}>Marcar todos como lidos</Button>}
      </div>

      {!notifs ? (
        <Skeleton className="h-64 w-full" />
      ) : notifs.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nenhum alerta por aqui."
          description="Quando algo precisar de atenção, você verá o aviso aqui. Mantenha suas manutenções em dia para evitar alertas."
        />
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const v = n.vehicle_id ? vehicles[n.vehicle_id] : null;
            const tone = n.severity === 'danger' ? 'border-red-200 dark:border-red-900/40' : n.severity === 'warning' ? 'border-amber-200 dark:border-amber-900/40' : 'border-border';
            const dot = n.severity === 'danger' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-400' : 'bg-brand-500';
            return (
              <div key={n.id} className={`card flex items-start gap-3 border p-4 ${n.read ? 'opacity-60' : ''} ${tone}`}>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>}
                  {v && (
                    <Link href={`/garagem/${v.id}`} className="mt-1 inline-block text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {v.nickname || `${v.brand} ${v.model}`}
                    </Link>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    Marcar como lido
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
