import type { Database } from '@/lib/database.types';

type Supabase = ReturnType<typeof import('@/lib/supabase/client').createClient>;

// Cria o veículo e inicializa os itens de manutenção padrão do catálogo.
export async function createVehicleWithDefaults(
  supabase: Supabase,
  userId: string,
  data: {
    brand: string;
    model: string;
    version?: string | null;
    year_fab?: number | null;
    year_model: number;
    current_mileage: number;
    fuel_type?: string | null;
    transmission?: string | null;
    color?: string | null;
    plate?: string | null;
    nickname?: string | null;
    photo_url?: string | null;
    monthly_usage?: string | null;
    usage_type?: string | null;
    severe_usage?: boolean;
  }
) {
  const { data: vehicle, error: vError } = await supabase
    .from('vehicles')
    .insert({
      user_id: userId,
      brand: data.brand,
      model: data.model,
      version: data.version ?? null,
      year_fab: data.year_fab ?? null,
      year_model: data.year_model,
      current_mileage: data.current_mileage,
      fuel_type: data.fuel_type ?? null,
      transmission: data.transmission ?? null,
      color: data.color ?? null,
      plate: data.plate ?? null,
      nickname: data.nickname ?? null,
      photo_url: data.photo_url ?? null,
      monthly_usage: data.monthly_usage ?? null,
      usage_type: data.usage_type ?? 'misto',
      severe_usage: data.severe_usage ?? false,
    })
    .select()
    .single();

  if (vError || !vehicle) return { vehicle: null, error: vError };

  // Carrega catálogo padrão e cria itens para o veículo
  const { data: catalog } = await supabase
    .from('maintenance_catalog')
    .select('*')
    .eq('is_custom', false)
    .order('sort_order');

  if (catalog && catalog.length) {
    // Item do óleo inicia com a km atual como referência (sem data)
    const rows = catalog.map((c) => ({
      vehicle_id: vehicle.id,
      user_id: userId,
      catalog_id: c.id,
      name: c.name,
      category: c.category,
      interval_km: c.default_km ?? null,
      interval_months: c.default_months ?? null,
      manual_interval: false,
      last_done_mileage: c.slug === 'oleo-motor' ? data.current_mileage : null,
    }));
    await supabase.from('vehicle_maintenance_items').insert(rows);
  }

  // Registro de quilometragem inicial
  await supabase.from('mileage_records').insert({
    vehicle_id: vehicle.id,
    user_id: userId,
    mileage: data.current_mileage,
    previous_mileage: data.current_mileage,
    note: 'Quilometragem inicial',
  });

  return { vehicle, error: null };
}

