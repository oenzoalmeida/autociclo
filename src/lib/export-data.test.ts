import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildUserDataExport } from './export-data';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database, 'public'>;

// Cliente falso: registra chamadas rpc/from e responde a RPC com a fixture.
function fakeClient(options: { data?: unknown; error?: unknown }) {
  const calls: { op: string; name?: string }[] = [];
  const client = {
    rpc: (name: string) => {
      calls.push({ op: 'rpc', name });
      return Promise.resolve({
        data: 'data' in options ? options.data : null,
        error: options.error ?? null,
      });
    },
    from: (table: string) => {
      calls.push({ op: 'from', name: table });
      throw new Error('exportação não deve ler tabelas por requisições paginadas');
    },
  } as unknown as Client;
  return { client, calls };
}

const when = new Date('2026-11-01T12:00:00-03:00');

describe('buildUserDataExport (snapshot via RPC)', () => {
  it('usa uma única chamada RPC e nenhuma leitura paginada', async () => {
    const { client, calls } = fakeClient({ data: {} });
    await buildUserDataExport(client, when);
    expect(calls).toEqual([{ op: 'rpc', name: 'export_user_data_snapshot' }]);
  });

  it('formata as seções não vazias na ordem definida', async () => {
    const { client } = fakeClient({
      data: {
        vehicles: [{ id: 'v1', created_at: '2026-10-01' }],
        expenses: [{ id: 'e1', amount: 10 }],
        maintenance_record_items: [{ id: 'i1', name: 'Óleo' }],
        notifications: [],
      },
    });
    const out = await buildUserDataExport(client, when);
    expect(out).toContain('# AutoCiclo - Dados exportados');
    expect(out).toContain('transação única');
    expect(out).toContain('## vehicles');
    expect(out).toContain('## expenses');
    expect(out).toContain('## maintenance_record_items');
    expect(out).toContain('"Óleo"');
    expect(out).not.toContain('## notifications');
    expect(out.indexOf('## vehicles')).toBeLessThan(out.indexOf('## expenses'));
  });

  it('falha fechado quando a RPC retorna erro (nenhum arquivo)', async () => {
    const { client } = fakeClient({ error: { message: 'function missing' } });
    await expect(buildUserDataExport(client, when)).rejects.toThrow('Não foi possível gerar o snapshot');
  });

  it('falha fechado quando a RPC retorna dados nulos ou inválidos', async () => {
    const nullClient = fakeClient({ data: null });
    await expect(buildUserDataExport(nullClient.client, when)).rejects.toThrow();
    const arrayClient = fakeClient({ data: [] });
    await expect(buildUserDataExport(arrayClient.client, when)).rejects.toThrow();
  });
});
