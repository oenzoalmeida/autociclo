'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  loadVehicleDashboard,
  type VehicleDashboardData,
} from '@/lib/data/vehicle-dashboard';
import { computeItem, computeScore, estimateMonthlyKm, STATUS_LABEL, statusColor } from '@/lib/maintenance';
import { formatKm } from '@/lib/format';
import { Skeleton } from '@/components/ui/badge';
import { ScoreCard } from './score-ring';
import { CuidadosCard } from './cuidados-card';
import { KmCard } from './km-card';
import { MaintenanceSection } from './maintenance-section';
import { CostsSection } from './costs-section';
import { FuelSection } from './fuel-section';
import { DocumentsSection } from './documents-section';
import { TimelineSection } from './timeline-section';

export default function VehicleDashboard() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<VehicleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const res = await loadVehicleDashboard(supabase, params.id);
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [params.id, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{error || 'Veículo não encontrado.'}</p>
        <Link href="/garagem" className="btn-secondary mt-4">Voltar à garagem</Link>
      </div>
    );
  }

  const v = data.vehicle;
  const computed = data.items.map((it) => ({ item: it, c: computeItem(it, v.current_mileage) }));
  const score = computeScore(computed.map((x) => x.c));
  const monthlyKm = estimateMonthlyKm(data.mileage, v.current_mileage);
  const photo = v.photo_url;

  return (
    <div className="space-y-6">
      <Header v={v} computed={computed} score={score} photo={photo} />

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink href={`/quick/km?v=${v.id}`} icon="⟳" label="Atualizar km" />
        <QuickLink href={`/quick/manutencao?v=${v.id}`} icon="🔧" label="Registrar manutenção" />
        <QuickLink href={`/quick/gasto?v=${v.id}`} icon="💰" label="Adicionar gasto" />
        <QuickLink href={`/garagem/${v.id}/historico`} icon="📜" label="Ver histórico" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CuidadosCard vehicle={v} computed={computed} />
        <div className="space-y-6">
          <KmCard vehicle={v} mileage={data.mileage} onUpdated={reload} monthlyKm={monthlyKm} />
          <ScoreCard score={score} />
        </div>
      </div>

      <MaintenanceSection vehicle={v} items={data.items} computed={computed} onChanged={reload} />
      <CostsSection vehicle={v} expenses={data.expenses} records={data.records} onChanged={reload} />
      <FuelSection vehicle={v} fuel={data.fuel} onChanged={reload} />
      <DocumentsSection vehicle={v} onChanged={reload} />
      <TimelineSection vehicle={v} records={data.records} />
    </div>
  );
}

function Header({
  v,
  computed,
  score,
  photo,
}: {
  v: VehicleDashboardData['vehicle'];
  computed: { item: VehicleDashboardData['items'][number]; c: ReturnType<typeof computeItem> }[];
  score: ReturnType<typeof computeScore>;
  photo: string | null;
}) {
  const pendingCount = computed.filter(
    (x) => x.c.status === 'atrasado' || x.c.status === 'atencao'
  ).length;
  const title = [v.brand, v.model, v.version].filter(Boolean).join(' ');
  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={title} className="h-16 w-16 rounded-2xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white">
          🚗
        </div>
      )}
      <div className="flex-1">
        <h1 className="text-xl font-extrabold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {v.year_model} · {formatKm(v.current_mileage)}
          {v.nickname ? ` · ${v.nickname}` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill score={score} />
          {pendingCount > 0 && (
            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {pendingCount} {pendingCount === 1 ? 'item' : 'itens'} de atenção
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 self-start sm:self-center sm:flex-row">
        <Link href={`/garagem/${v.id}/relatorio`} className="btn-ghost">
          Relatório
        </Link>
        <Link href={`/garagem/${v.id}/editar`} className="btn-secondary">
          Editar
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ score }: { score: ReturnType<typeof computeScore> }) {
  const color =
    score.tone === 'green'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : score.tone === 'amber'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`badge ${color}`}>{score.label}</span>;
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="btn-secondary flex-col py-3 text-center dark:bg-[hsl(var(--card))]">
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export { STATUS_LABEL, statusColor };
