import type { Database } from '@/lib/database.types';

type SB = ReturnType<typeof import('@/lib/supabase/client').createClient>;

export interface VehicleDashboardData {
  vehicle: Database['public']['Tables']['vehicles']['Row'];
  items: Database['public']['Tables']['vehicle_maintenance_items']['Row'][];
  records: Database['public']['Tables']['maintenance_records']['Row'][];
  mileage: Database['public']['Tables']['mileage_records']['Row'][];
  expenses: Database['public']['Tables']['expenses']['Row'][];
  fuel: Database['public']['Tables']['fuel_records']['Row'][];
  documents: Database['public']['Tables']['vehicle_documents']['Row'][];
  reminders: Database['public']['Tables']['reminders']['Row'][];
  notifications: Database['public']['Tables']['notifications']['Row'][];
  catalog: Record<string, string>;
}

export async function loadVehicleDashboard(
  supabase: SB,
  vehicleId: string
): Promise<{ data: VehicleDashboardData | null; error: string | null }> {
  const [
    v,
    items,
    records,
    mileage,
    expenses,
    fuel,
    documents,
    reminders,
    notifs,
    catalog,
  ] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
    supabase.from('vehicle_maintenance_items').select('*').eq('vehicle_id', vehicleId),
    supabase.from('maintenance_records').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false }),
    supabase.from('mileage_records').select('*').eq('vehicle_id', vehicleId).order('recorded_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('vehicle_id', vehicleId).order('expense_date', { ascending: false }),
    supabase.from('fuel_records').select('*').eq('vehicle_id', vehicleId).order('fuel_date', { ascending: false }),
    supabase.from('vehicle_documents').select('*').eq('vehicle_id', vehicleId),
    supabase.from('reminders').select('*').eq('vehicle_id', vehicleId).order('due_date', { ascending: true }),
    supabase.from('notifications').select('*').eq('vehicle_id', vehicleId).order('created_at', { ascending: false }),
    supabase.from('maintenance_catalog').select('slug, description').eq('is_custom', false),
  ]);

  if (v.error) return { data: null, error: 'Veículo não encontrado.' };

  const cat: Record<string, string> = {};
  catalog.data?.forEach((c) => {
    cat[c.slug] = c.description ?? '';
  });

  return {
    data: {
      vehicle: v.data,
      items: items.data ?? [],
      records: records.data ?? [],
      mileage: mileage.data ?? [],
      expenses: expenses.data ?? [],
      fuel: fuel.data ?? [],
      documents: documents.data ?? [],
      reminders: reminders.data ?? [],
      notifications: notifs.data ?? [],
      catalog: cat,
    },
    error: null,
  };
}
