'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdminGuard } from '@/components/admin/admin-guard';

function Configuracoes() {
  const [info, setInfo] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setInfo({ email: user.email ?? '', role: role?.role ?? 'cliente' });
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Informações da conta administrativa.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-bold">Sessão</h2>
        {!info ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="font-semibold">{info.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Papel</dt>
              <dd className="font-semibold capitalize">{info.role === 'admin' ? 'Administrador' : 'Cliente'}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-bold">Sobre</h2>
        <p className="text-sm text-muted-foreground">
          A administração do AutoCiclo é feita por este painel. Papéis, políticas de acesso e configurações de banco são
          gerenciados no Supabase. O papel de cada usuário é protegido por Row Level Security — um usuário comum não
          consegue promover a própria conta.
        </p>
      </div>
    </div>
  );
}

export default function AdminConfiguracoesPage() {
  return (
    <AdminGuard>
      <Configuracoes />
    </AdminGuard>
  );
}
