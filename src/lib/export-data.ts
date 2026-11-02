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

// Page conservatively, but advance by the actual row count so a lower server
// response cap does not silently truncate an export. A final empty page ends it.
const PAGE_SIZE = 500;
const RECORD_BATCH_SIZE = 100;

async function readAll<T>(
  table: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error || !data) throw new Error(`Não foi possível exportar ${table}. Tente novamente.`);
    if (data.length === 0) return rows;
    rows.push(...data);
  }
}

// Queries remain user-scoped under RLS. No file is returned on partial failure.
// Pagination is deterministic, but it is not a database-wide snapshot: concurrent
// edits during export may still require a future server-side snapshot endpoint.
export async function buildUserDataExport(
  supabase: Client,
  userId: string,
  exportedAt: Date = new Date()
): Promise<string> {
  let out = '# AutoCiclo - Dados exportados\n\n';
  out += `Exportado em: ${exportedAt.toLocaleString('pt-BR')}\n\n`;
  const recordIds: string[] = [];
  for (const table of USER_TABLES) {
    const data = await readAll(table, (from, to) => supabase.from(table)
      .select('*').eq('user_id', userId).order('created_at').order('id').range(from, to));
    if (table === 'maintenance_records') recordIds.push(...data.map((row) => row.id));
    if (data.length) out += `\n## ${table}\n\n${JSON.stringify(data, null, 2)}\n`;
  }
  const items = [];
  for (let start = 0; start < recordIds.length; start += RECORD_BATCH_SIZE) {
    const ids = recordIds.slice(start, start + RECORD_BATCH_SIZE);
    items.push(...await readAll('maintenance_record_items', (from, to) => supabase
      .from('maintenance_record_items').select('*').in('record_id', ids)
      .order('created_at').order('id').range(from, to)));
  }
  if (items.length) out += `\n## maintenance_record_items\n\n${JSON.stringify(items, null, 2)}\n`;
  return out;
}
