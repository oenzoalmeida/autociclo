import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database, 'public'>;

const USER_TABLES = [
  'vehicles',
  'mileage_records',
  'maintenance_records',
  'vehicle_maintenance_items',
  'expenses',
  'fuel_records',
  'vehicle_documents',
  'attachments',
  'reminders',
  'notifications',
  'activity_logs',
] as const;

// Monta o markdown de exportação LGPD do usuário.
// maintenance_record_items não tem user_id: entra via record_id dos
// maintenance_records do próprio usuário (antes saía silenciosamente).
export async function buildUserDataExport(
  supabase: Client,
  userId: string,
  exportedAt: Date = new Date()
): Promise<string> {
  let out = '# AutoCiclo — Dados exportados\n\n';
  out += `Exportado em: ${exportedAt.toLocaleString('pt-BR')}\n\n`;
  for (const t of USER_TABLES) {
    const { data } = await supabase.from(t).select('*').eq('user_id', userId).order('created_at');
    if (data && data.length) {
      out += `\n## ${t}\n\n`;
      out += JSON.stringify(data, null, 2) + '\n';
    }
  }
  const { data: userRecords } = await supabase
    .from('maintenance_records')
    .select('id')
    .eq('user_id', userId);
  const recordIds = (userRecords ?? []).map((r) => r.id);
  if (recordIds.length) {
    const { data } = await supabase
      .from('maintenance_record_items')
      .select('*')
      .in('record_id', recordIds)
      .order('created_at');
    if (data && data.length) {
      out += `\n## maintenance_record_items\n\n`;
      out += JSON.stringify(data, null, 2) + '\n';
    }
  }
  return out;
}
