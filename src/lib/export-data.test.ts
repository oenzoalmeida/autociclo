import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { buildDataExport, EXPORT_TABLES } from './export-data';

function mockClient(failTable?: string, itemCount = 1) {
  const calls: { table: string; select?: string; filter?: [string, string]; range?: number[] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table } as (typeof calls)[number];
    calls.push(call);
    const query = {
      select(value: string) { call.select = value; return query; },
      eq(column: string, value: string) { call.filter = [column, value]; return query; },
      order() { return query; },
      range(start: number, end: number) {
        call.range = [start, end];
        if (table === failTable) return Promise.resolve({ data: null, error: { message: 'DB failure' } });
        const data = table === 'maintenance_record_items'
          ? Array.from({ length: Math.max(0, Math.min(end + 1, itemCount) - start) }, (_, i) => ({
            id: String(start + i), record_id: 'owned-record', amount: 20,
            maintenance_records: { user_id: 'owner' },
          })) : [];
        return Promise.resolve({ data, error: null });
      },
    };
    return query;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, calls };
}

describe('exportação de dados', () => {
  it('filtra itens pelo dono do registro pai e inclui seus dados sem expor o join auxiliar', async () => {
    const { client, calls } = mockClient();
    const out = await buildDataExport(client, 'owner');
    expect(out).toContain('## maintenance_record_items');
    expect(out).toContain('"amount": 20');
    expect(out).not.toContain('"maintenance_records":');
    const items = calls.find(c => c.table === 'maintenance_record_items')!;
    expect(items.select).toBe('*, maintenance_records!inner(user_id)');
    expect(items.filter).toEqual(['maintenance_records.user_id', 'owner']);
    for (const c of calls.filter(c => c.table !== 'maintenance_record_items')) {
      expect(c.filter).toEqual(['user_id', 'owner']);
    }
    expect(calls).toHaveLength(EXPORT_TABLES.length);
  });

  it.each(EXPORT_TABLES)('aborta sem retornar arquivo parcial quando %s falha', async table => {
    const { client } = mockClient(table);
    await expect(buildDataExport(client, 'owner')).rejects.toThrow(`Não foi possível exportar ${table}`);
  });

  it('pagina para não perder itens acima do limite padrão da API', async () => {
    const { client, calls } = mockClient(undefined, 1100);
    const out = await buildDataExport(client, 'owner');
    const items = calls.filter(c => c.table === 'maintenance_record_items');
    expect(items.map(c => c.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
    expect(out).toContain('"id": "1099"');
  });

  it('aceita usuário sem dados, sem fabricar registros', async () => {
    const { client } = mockClient(undefined, 0);
    expect(await buildDataExport(client, 'owner')).not.toContain('## ');
  });
});

// Verifica a fronteira da UI sem instalar DOM nem autenticar: executa somente o
// handler, com download/toast simulados, e o helper real.
import { readFileSync } from 'node:fs';

describe('handler de exportação do perfil', () => {
  it('não baixa nem anuncia sucesso quando uma tabela falha', async () => {
    const source = readFileSync(new URL('../app/(app)/perfil/page.tsx', import.meta.url), 'utf8');
    const handler = source.split('const exportData = async () => {')[1].split('\n  const deleteAccount')[0]
      .replace(/\n  };\s*$/, '').replace('let out: string;', 'let out;');
    const { client } = mockClient('maintenance_record_items');
    const download = vi.fn();
    const toast = vi.fn();
    const fake = Object.assign(client, { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } });
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('createClient', 'buildDataExport', 'toast', 'document', 'URL', handler)(
      () => fake, buildDataExport, toast,
      { createElement: () => ({ click: download }) },
      { createObjectURL: () => 'blob:fake', revokeObjectURL: vi.fn() },
    );
    expect(download).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Não foi possível exportar todos os dados. Tente novamente.', 'error');
    expect(toast).not.toHaveBeenCalledWith('Dados exportados.');
  });
});
