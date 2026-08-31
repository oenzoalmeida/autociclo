'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { computeItem, computeScore } from '@/lib/maintenance';
import { formatCurrency, formatNumber, formatDate, monthName } from '@/lib/format';
import { Skeleton } from '@/components/ui/badge';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Notif = Database['public']['Tables']['notifications']['Row'];
type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];

export default function HomePage() {
  const [name, setName] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [details, setDetails] = useState<Record<string, { items: Item[]; notices: Notif[]; monthExpenses: number }>>({});
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('name, onboarded').eq('id', user.id).single();
        setName(prof?.name?.split(' ')[0] ?? '');
        if (prof && !prof.onboarded) {
          window.location.href = '/onboarding';
          return;
        }
      }

      const { data: vs } = await supabase.from('vehicles').select('*').eq('archived', false);
      setVehicles(vs ?? []);

      const map: Record<string, { items: Item[]; notices: Notif[]; monthExpenses: number }> = {};
      const now = new Date();
      let allRecords: MaintenanceRecord[] = [];
      const notifPromises: PromiseLike<Notif | null>[] = [];
      const recordPromises: PromiseLike<MaintenanceRecord[] | null>[] = [];

      if (vs) {
        for (const v of vs) {
          const itemsP = supabase.from('vehicle_maintenance_items').select('*').eq('vehicle_id', v.id).then((r) => r.data ?? []);
          const monthP = supabase.from('expenses').select('amount, expense_date').eq('vehicle_id', v.id).then((r) => {
            const list = r.data ?? [];
            return list
              .filter((e) => { const d = new Date(e.expense_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
              .reduce((s, e) => s + Number(e.amount), 0);
          });
          const items = await itemsP;
          const monthExpenses = await monthP;
          const rec = supabase.from('maintenance_records').select('*').eq('vehicle_id', v.id).order('service_date', { ascending: false });
          recordPromises.push(rec.then((r) => r.data));
          const notif = supabase.from('notifications').select('*').eq('user_id', user!.id).eq('vehicle_id', v.id).eq('read', false).limit(5);
          notifPromises.push(notif.then((r) => r.data?.[0] ?? null));
          map[v.id] = { items, notices: [], monthExpenses };
        }
      }

      const recs = await Promise.all(recordPromises);
      allRecords = recs.flat().filter((r): r is MaintenanceRecord => r !== null).sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());
      setRecords(allRecords);
      const notifs = await Promise.all(notifPromises);
      vs?.forEach((v, i) => { if (map[v.id]) map[v.id].notices = notifs[i] ? [notifs[i] as Notif] : []; });
      setDetails(map);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const single = vehicles && vehicles.length === 1 ? vehicles[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{greeting}, {name || 'motorista'}.</h1>
        <p className="text-sm text-muted-foreground">Aqui está a situação da sua garagem.</p>
      </div>

      {single ? (
        <SingleVehicleSummary vehicle={single} detail={details[single.id]} />
      ) : (
        <GarageSummary vehicles={vehicles ?? []} details={details} />
      )}

      <NextCares vehicles={vehicles ?? []} details={details} />

      <RecentActivity records={records} />

      <MonthCosts vehicles={vehicles ?? []} details={details} />
    </div>
  );
}

function SingleVehicleSummary({ vehicle, detail }: { vehicle: Vehicle; detail?: { items: Item[]; notices: Notif[]; monthExpenses: number } }) {
  const items = detail?.items ?? [];
  const computed = items.map((it) => computeItem(it, vehicle.current_mileage));
  const score = computeScore(computed);
  const pending = computed.filter((c) => c.status === 'atrasado' || c.status === 'atencao').length;

  const color = score.tone === 'green' ? 'text-green-600' : score.tone === 'amber' ? 'text-amber-600' : 'text-red-600';

  return (
    <Link href={`/garagem/${vehicle.id}`} className="card block p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center gap-4">
        {vehicle.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.photo_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white">🚗</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold">
            {vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {vehicle.brand} {vehicle.model} {vehicle.version} · {vehicle.year_model} · {formatNumber(vehicle.current_mileage)} km
          </div>
          <div className="mt-1 text-sm font-semibold">
            {pending === 0 ? (
              <span className="text-green-600">Tudo em dia.</span>
            ) : (
              <span className={`${pending > 1 ? 'text-amber-600' : 'text-amber-600'}`}>
                {pending} {pending === 1 ? 'item precisa' : 'itens precisam'} de atenção.
              </span>
            )}
          </div>
        </div>
        <div className={`text-center ${color}`}>
          <div className="text-2xl font-extrabold">{score.score}</div>
          <div className="text-[10px] uppercase text-muted-foreground">score</div>
        </div>
      </div>
    </Link>
  );
}

function GarageSummary({ vehicles, details }: { vehicles: Vehicle[]; details: Record<string, { items: Item[]; notices: Notif[]; monthExpenses: number }> }) {
  return (
    <div>
      <h2 className="mb-3 font-bold">Sua garagem</h2>
      <div className="space-y-2">
        {vehicles.map((v) => {
          const items = details[v.id]?.items ?? [];
          const pending = items.map((it) => computeItem(it, v.current_mileage)).filter((c) => c.status === 'atrasado' || c.status === 'atencao').length;
          return (
            <Link key={v.id} href={`/garagem/${v.id}`} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-card-hover">
              {v.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.photo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white">🚗</div>
              )}
              <div className="flex-1">
                <div className="font-bold">{v.nickname || `${v.brand} ${v.model}`}</div>
                <div className={`text-sm ${pending === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {pending === 0 ? 'Tudo em dia.' : `${pending} ${pending === 1 ? 'item' : 'itens'} de atenção.`}
                </div>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{formatNumber(v.current_mileage)} km</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NextCares({ vehicles, details }: { vehicles: Vehicle[]; details: Record<string, { items: Item[]; notices: Notif[]; monthExpenses: number }> }) {
  const cares: { label: string; text: string; href: string; tone: string }[] = [];
  for (const v of vehicles) {
    const items = details[v.id]?.items ?? [];
    const computed = items.map((it) => ({ it, c: computeItem(it, v.current_mileage) })).filter((x) => x.c.status !== 'sem_info');
    computed.sort((a, b) => a.c.urgency - b.c.urgency);
    const top = computed.slice(0, 2);
    for (const { it, c } of top) {
      let text = '';
      if (c.status === 'atrasado') text = 'Prazo ultrapassado.';
      else if (c.kmDistance !== null) text = `Faltam ~${formatNumber(c.kmDistance)} km.`;
      else if (c.daysLeft !== null) text = `Em ~${c.daysLeft} dias.`;
      cares.push({
        label: it.name,
        text,
        href: `/garagem/${v.id}`,
        tone: c.status === 'atrasado' ? 'border-red-200 dark:border-red-900/40' : c.status === 'atencao' ? 'border-amber-200 dark:border-amber-900/40' : 'border-green-200 dark:border-green-900/40',
      });
    }
  }
  cares.sort((a, b) => (a.tone.includes('red') ? 0 : a.tone.includes('amber') ? 1 : 2) - (b.tone.includes('red') ? 0 : b.tone.includes('amber') ? 1 : 2));
  const topCares = cares.slice(0, 4);

  return (
    <div>
      <h2 className="mb-3 font-bold">Próximos cuidados</h2>
      {topCares.length === 0 ? (
        <div className="card p-4 text-sm text-muted-foreground">
          Adicione manutenções para ver previsões aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {topCares.map((c, i) => (
            <Link key={i} href={c.href} className={`card flex items-center gap-3 border p-3 ${c.tone}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${c.tone.includes('red') ? 'bg-red-500' : c.tone.includes('amber') ? 'bg-amber-400' : 'bg-green-500'}`} />
              <div className="flex-1">
                <span className="font-semibold">{c.label}</span>
                <span className="text-muted-foreground"> · {c.text}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivity({ records }: { records: MaintenanceRecord[] }) {
  const top = records.slice(0, 4);
  return (
    <div>
      <h2 className="mb-3 font-bold">Últimas atividades</h2>
      {top.length === 0 ? (
        <div className="card p-4 text-sm text-muted-foreground">
          Registre manutenções para acompanhar as últimas atividades aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-semibold">{r.note || 'Manutenção'}</div>
                <div className="text-xs text-muted-foreground">{formatDate(r.service_date)}</div>
              </div>
              {Number(r.total_amount) > 0 && <span className="font-semibold">{formatCurrency(r.total_amount)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthCosts({ vehicles, details }: { vehicles: Vehicle[]; details: Record<string, { items: Item[]; notices: Notif[]; monthExpenses: number }> }) {
  const total = vehicles.reduce((s, v) => s + (details[v.id]?.monthExpenses ?? 0), 0);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold">Gastos do mês</span>
        <span className="text-lg font-extrabold text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{monthName()}</p>
    </div>
  );
}
