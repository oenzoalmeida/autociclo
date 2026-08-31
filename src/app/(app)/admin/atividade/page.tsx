'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';

type Log = Database['public']['Tables']['activity_logs']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const ACTION_LABEL: Record<string, string> = {
  mileage_updated: 'Quilometragem atualizada',
  maintenance_registered: 'Manutenção registrada',
  expense_added: 'Gasto adicionado',
  fuel_added: 'Abastecimento adicionado',
};

function Atividade() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [l, p] = await Promise.all([
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*'),
      ]);
      setLogs(l.data ?? []);
      setProfiles(p.data ?? []);
    };
    load();
  }, []);

  const userById: Record<string, Profile> = {};
  profiles.forEach((p) => (userById[p.id] = p));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Atividade</h1>
        <p className="text-sm text-muted-foreground">Últimas ações realizadas na plataforma.</p>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
        ) : (
          logs.map((l) => {
            const user = userById[l.user_id];
            return (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold">{ACTION_LABEL[l.action] ?? l.action}</div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email ?? l.user_id.slice(0, 8)}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminAtividadePage() {
  return (
    <AdminGuard>
      <Atividade />
    </AdminGuard>
  );
}
