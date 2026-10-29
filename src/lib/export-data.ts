import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const EXPORT_TABLES = [
  'vehicles', 'mileage_records', 'maintenance_records', 'maintenance_record_items',
  'vehicle_maintenance_items', 'expenses', 'fuel_records', 'vehicle_documents',
  'attachments', 'reminders', 'notifications', 'activity_logs',
] as const;
const PAGE_SIZE = 500;

/** Falha por inteiro: nunca oferece um arquivo parcial como exportação concluída. */
export async function buildDataExport(
  supabase: SupabaseClient<Database>, userId: string, now = new Date(),
): Promise<string> {
  let out = '# AutoCiclo - Dados exportados\n\n';
  out += `Exportado em: ${now.toLocaleString('pt-BR')}\n\n`;
  for (const table of EXPORT_TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      // Os itens pertencem ao usuário pelo registro pai, não por user_id próprio.
      // A RLS continua ativa; o filtro explícito também limita ao dono da exportação.
      const query = table === 'maintenance_record_items'
        ? supabase.from(table).select('*, maintenance_records!inner(user_id)')
          .eq('maintenance_records.user_id', userId)
        : supabase.from(table).select('*').eq('user_id', userId);
      const { data, error } = await query.order('created_at').order('id')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Não foi possível exportar ${table}.`, { cause: error });
      if (!data) throw new Error(`Resposta vazia ao exportar ${table}.`);
      for (const item of data) {
        const row: Record<string, unknown> = { ...item };
        delete row.maintenance_records;
        rows.push(row);
      }
      if (data.length < PAGE_SIZE) break;
    }
    if (rows.length) out += `\n## ${table}\n\n${JSON.stringify(rows, null, 2)}\n`;
  }
  return out;
}
