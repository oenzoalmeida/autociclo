'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatDate } from '@/lib/format';
import { AdminGuard } from '@/components/admin/admin-guard';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];
type AdminUser = Pick<Profile, 'id' | 'name' | 'email' | 'created_at'>;
type AdminRole = Pick<UserRole, 'user_id' | 'role'>;

function Usuarios() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [u, r] = await Promise.all([
        supabase.from('profiles').select('id, name, email, created_at').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      setUsers(u.data ?? []);
      setRoles(r.data ?? []);
    };
    load();
  }, []);

  const roleById: Record<string, string> = {};
  roles.forEach((r) => (roleById[r.user_id] = r.role));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s).</p>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Buscar por nome ou e-mail..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          filtered.map((u) => {
            const role = roleById[u.id] ?? 'cliente';
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={role === 'admin' ? 'badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'badge bg-muted text-muted-foreground'}>
                    {role === 'admin' ? 'Admin' : 'Cliente'}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{formatDate(u.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminUsuariosPage() {
  return (
    <AdminGuard>
      <Usuarios />
    </AdminGuard>
  );
}
