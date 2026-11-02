import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database, 'public'>;

// Ordem das seções no arquivo exportado. A lista de tabelas e o isolamento por
// usuário vivem na função SQL export_user_data_snapshot
// (supabase/migrations/00009_export_user_data_snapshot.sql).
const TABLE_ORDER = [
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
  'maintenance_record_items',
] as const;

// A exportação usa a RPC export_user_data_snapshot: uma única chamada, uma
// única transação, uma fotografia consistente do banco (sem mistura de
// instantes por edições concorrentes). Não existe fallback para a leitura
// paginada anterior — várias requisições não garantem o mesmo instante, e um
// arquivo assim não pode ser rotulado de snapshot. Se a RPC falhar, nenhum
// arquivo é gerado (fail closed).
export async function buildUserDataExport(
  supabase: Client,
  exportedAt: Date = new Date()
): Promise<string> {
  const { data, error } = await supabase.rpc('export_user_data_snapshot');
  if (error || data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Não foi possível gerar o snapshot dos dados. Nenhum arquivo foi gerado.');
  }
  const snapshot = data as Record<string, unknown>;

  let out = '# AutoCiclo - Dados exportados\n\n';
  out += `Exportado em: ${exportedAt.toLocaleString('pt-BR')}\n\n`;
  out += 'Fotografia única do banco no instante da exportação (transação única).\n';
  for (const table of TABLE_ORDER) {
    const rows = snapshot[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    out += `\n## ${table}\n\n${JSON.stringify(rows, null, 2)}\n`;
  }
  return out;
}
