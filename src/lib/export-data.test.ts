import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildUserDataExport } from './export-data';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database, 'public'>;

type Call = { table: string; op: string; args: unknown[] };

// Cliente falso que grava a cadeia de chamadas e serve fixtures por tabela.
function fakeClient(rows: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const op of ['select', 'eq', 'in', 'order']) {
      b[op] = (...a: unknown[]) => {
        calls.push({ table, op, args: a });
        return b;
      };
    }
    // builders PostgREST são "thenable" em qualquer ponto da cadeia
    b.then = (resolve: (v: { data: unknown[] }) => unknown) =>
      Promise.resolve({ data: rows[table] ?? [] }).then(resolve);
    return b;
  };
  const client = { from: (t: string) => builder(t) } as unknown as Client;
  return { client, calls };
}

const when = new Date('2026-11-01T12:00:00-03:00');

describe('buildUserDataExport', () => {
  it('inclui maintenance_record_items ligados aos registros do usuário', async () => {
    const { client } = fakeClient({
      maintenance_records: [{ id: 10, user_id: 'u1', created_at: '2026-10-01' }],
      maintenance_record_items: [
        { id: 1, record_id: 10, name: 'Óleo', created_at: '2026-10-01' },
        { id: 2, record_id: 10, name: 'Filtro', created_at: '2026-10-01' },
      ],
    });
    const out = await buildUserDataExport(client, 'u1', when);
    expect(out).toContain('## maintenance_record_items');
    expect(out).toContain('"Óleo"');
    expect(out).toContain('"Filtro"');
  });

  it('filtra itens somente pelos record_ids do usuário (isolamento)', async () => {
    const { client, calls } = fakeClient({
      maintenance_records: [{ id: 10, user_id: 'u1' }],
      maintenance_record_items: [],
    });
    await buildUserDataExport(client, 'u1', when);
    const inCall = calls.find((c) => c.table === 'maintenance_record_items' && c.op === 'in');
    expect(inCall).toBeDefined();
    expect(inCall!.args).toEqual(['record_id', [10]]);
  });

  it('filtra cada tabela pelo user_id informado', async () => {
    const { client, calls } = fakeClient({});
    await buildUserDataExport(client, 'u1', when);
    const eqCalls = calls.filter((c) => c.op === 'eq' && c.args[0] === 'user_id');
    // 11 tabelas do usuário + a consulta de ids dos maintenance_records
    expect(eqCalls).toHaveLength(12);
    for (const c of eqCalls) expect(c.args[1]).toBe('u1');
  });

  it('omite a seção de itens quando o usuário não tem registros de manutenção', async () => {
    const { client, calls } = fakeClient({
      vehicles: [{ id: 1, user_id: 'u1', created_at: '2026-10-01' }],
    });
    const out = await buildUserDataExport(client, 'u1', when);
    expect(out).toContain('## vehicles');
    expect(out).not.toContain('## maintenance_record_items');
    expect(calls.some((c) => c.table === 'maintenance_record_items')).toBe(false);
  });
});
