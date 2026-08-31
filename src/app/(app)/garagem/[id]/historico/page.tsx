'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Record = Database['public']['Tables']['maintenance_records']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function VehicleHistoryPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [service, setService] = useState('all');
  const [workshop, setWorkshop] = useState('all');
  const [del, setDel] = useState<Record | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [v, r] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', params.id).single(),
        supabase.from('maintenance_records').select('*').eq('vehicle_id', params.id).order('service_date', { ascending: false }),
      ]);
      setVehicle(v.data);
      setRecords(r.data ?? []);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const services = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => r.note && set.add(r.note));
    const ws = new Set<string>();
    records.forEach((r) => r.workshop && ws.add(r.workshop));
    return { services: Array.from(set), workshops: Array.from(ws) };
  }, [records]);

  const years = useMemo(() => {
    const set = new Set(records.map((r) => new Date(r.service_date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        r.note?.toLowerCase().includes(q) ||
        r.workshop?.toLowerCase().includes(q) ||
        String(r.mileage).includes(q);
      if (!matchesQuery) return false;
      if (year !== 'all' && new Date(r.service_date).getFullYear() !== Number(year)) return false;
      if (service !== 'all' && r.note !== service) return false;
      if (workshop !== 'all' && r.workshop !== workshop) return false;
      return true;
    });
  }, [records, query, year, service, workshop]);

  const remove = async () => {
    if (!del) return;
    const supabase = createClient();
    await supabase.from('maintenance_records').delete().eq('id', del.id);
    setRecords((prev) => prev.filter((r) => r.id !== del.id));
    toast('Registro excluído.');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/garagem/${params.id}`} className="text-sm text-brand-600 dark:text-brand-400">← Voltar</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Histórico do veículo</h1>
          {vehicle && <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model}</p>}
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="card space-y-3 p-4">
        <input
          type="search"
          className="input"
          placeholder="Buscar por serviço, oficina ou km..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <select className="input" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filtrar por ano">
            <option value="all">Todos os anos</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input" value={service} onChange={(e) => setService(e.target.value)} aria-label="Filtrar por serviço">
            <option value="all">Todos os serviços</option>
            {services.services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={workshop} onChange={(e) => setWorkshop(e.target.value)} aria-label="Filtrar por oficina">
            <option value="all">Todas as oficinas</option>
            {services.workshops.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-100 pl-6 dark:border-brand-900/40">
          {filtered.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {new Date(r.service_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                  </div>
                  <div className="font-semibold">{r.note || `Manutenção em ${r.workshop || 'oficina'}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(r.mileage)} km
                    {r.workshop ? ` · ${r.workshop}` : ''}
                    {Number(r.total_amount) > 0 ? ` · ${formatCurrency(r.total_amount)}` : ''}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Link href={`/garagem/${params.id}/historico/${r.id}`} className="btn-ghost px-2 py-1 text-xs">Detalhes</Link>
                  <button onClick={() => setDel(r)} aria-label="Excluir" className="rounded p-1 text-muted-foreground hover:text-red-600">🗑</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={remove}
        title="Excluir registro"
        message="Tem certeza que deseja excluir este registro de manutenção? O histórico será perdido."
      />
    </div>
  );
}
