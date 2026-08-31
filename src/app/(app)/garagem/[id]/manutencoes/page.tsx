'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { computeItem } from '@/lib/maintenance';
import { Skeleton } from '@/components/ui/badge';
import { MaintenanceSection } from '@/components/vehicle/maintenance-section';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];

export default function ManutencoesPage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [v, i] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', params.id).single(),
        supabase.from('vehicle_maintenance_items').select('*').eq('vehicle_id', params.id),
      ]);
      setVehicle(v.data);
      setItems(i.data ?? []);
      setLoading(false);
    };
    load();
  }, [params.id, reloadKey]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!vehicle) return <p className="text-muted-foreground">Veículo não encontrado.</p>;

  const computed = items.map((it) => ({ item: it, c: computeItem(it, vehicle.current_mileage) }));

  return (
    <div className="space-y-4">
      <Link href={`/garagem/${params.id}`} className="text-sm text-brand-600 dark:text-brand-400">← Voltar</Link>
      <h1 className="text-2xl font-extrabold">Central de manutenções</h1>
      <p className="text-sm text-muted-foreground">
        {vehicle.brand} {vehicle.model} — acompanhe os prazos de cada cuidado preventivo.
      </p>
      <MaintenanceSection
        vehicle={vehicle}
        items={items}
        computed={computed}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
