'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem, computeScore } from '@/lib/maintenance';
import { formatCurrency, formatDate, formatKm } from '@/lib/format';
import { LogoHorizontal } from '@/components/brand/logo';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type Record = Database['public']['Tables']['maintenance_records']['Row'];

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [v, i, r] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', params.id).single(),
        supabase.from('vehicle_maintenance_items').select('*').eq('vehicle_id', params.id),
        supabase.from('maintenance_records').select('*').eq('vehicle_id', params.id).order('service_date', { ascending: false }),
      ]);
      setVehicle(v.data);
      setItems(i.data ?? []);
      setRecords(r.data ?? []);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const print = () => window.print();

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!vehicle) return <p className="py-16 text-center text-muted-foreground">Veículo não encontrado.</p>;

  const computed = items.map((it) => ({ item: it, c: computeItem(it, vehicle.current_mileage) }));
  const score = computeScore(computed.map((x) => x.c));
  const done = records.length;
  const totalGasto = records.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const kmAtual = vehicle.current_mileage;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/garagem/${params.id}`} className="text-sm text-brand-600 dark:text-brand-400">← Voltar</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Relatório AutoCiclo</h1>
        </div>
        <Button onClick={print}>Imprimir</Button>
      </div>

      <div className="card overflow-hidden p-6 print:shadow-none">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <LogoHorizontal />
            <p className="mt-2 text-sm text-muted-foreground">Relatório gerado em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Dados fornecidos pelo proprietário.<br />Não constitui laudo técnico.
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-bold">Dados do veículo</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Marca</dt><dd className="font-semibold">{vehicle.brand}</dd>
              <dt className="text-muted-foreground">Modelo</dt><dd className="font-semibold">{vehicle.model}</dd>
              <dt className="text-muted-foreground">Versão</dt><dd className="font-semibold">{vehicle.version ?? '—'}</dd>
              <dt className="text-muted-foreground">Ano</dt><dd className="font-semibold">{vehicle.year_model}</dd>
              <dt className="text-muted-foreground">Quilometragem</dt><dd className="font-semibold">{formatKm(kmAtual)}</dd>
              <dt className="text-muted-foreground">Combustível</dt><dd className="font-semibold">{vehicle.fuel_type ?? '—'}</dd>
            </dl>
          </div>
          <div>
            <h3 className="mb-2 font-bold">AutoCiclo Score</h3>
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="text-4xl font-extrabold">{score.score}/100</div>
              <div className="mt-1 text-sm text-muted-foreground">{score.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">Acompanhamento das manutenções registradas.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-muted p-4 text-center">
            <div className="text-2xl font-extrabold">{done}</div>
            <div className="text-xs text-muted-foreground">Manutenções registradas</div>
          </div>
          <div className="rounded-xl bg-muted p-4 text-center">
            <div className="text-2xl font-extrabold">{formatCurrency(totalGasto)}</div>
            <div className="text-xs text-muted-foreground">Gastos com manutenção</div>
          </div>
          <div className="rounded-xl bg-muted p-4 text-center">
            <div className="text-2xl font-extrabold">{kmAtual.toLocaleString('pt-BR')}</div>
            <div className="text-xs text-muted-foreground">Quilometragem atual</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 font-bold">Linha do tempo</h3>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
          ) : (
            <ol className="space-y-3">
              {records.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="font-semibold">{r.note ?? `Manutenção em ${r.workshop ?? 'oficina'}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.service_date)} · {formatKm(r.mileage)} · {formatCurrency(Number(r.total_amount) || 0)}
                    {r.workshop ? ` · ${r.workshop}` : ''}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-6">
          <h3 className="mb-2 font-bold">Situação dos itens</h3>
          <div className="space-y-2">
            {computed.map(({ item, c }) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-2 text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="badge">{c.status === 'em_dia' ? 'Em dia' : c.status === 'atencao' ? 'Atenção' : c.status === 'atrasado' ? 'Atrasado' : 'Sem informações'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Este relatório foi gerado pelo AutoCiclo e reflete apenas os registros mantidos pelo proprietário.
        </div>
      </div>
    </div>
  );
}
