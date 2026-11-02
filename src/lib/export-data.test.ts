import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildUserDataExport } from './export-data';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database, 'public'>;

type Call = { table: string; op: string; args: unknown[] };

// Cliente falso que grava a cadeia de chamadas e serve fixtures por tabela.
function fakeClient(rows: Record<string, unknown[]>, failTable?: string, cap = 500, failOffset = 0) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    let from = 0;
    let to = 499;
    let ids: unknown[] | undefined;
    for (const op of ['select', 'eq', 'in', 'order', 'range']) {
      b[op] = (...a: unknown[]) => {
        calls.push({ table, op, args: a });
        if (op === 'range') [from, to] = a as number[];
        if (op === 'in') ids = a[1] as unknown[];
        return b;
      };
    }
    // builders PostgREST são "thenable" em qualquer ponto da cadeia
    b.then = (resolve: (v: unknown) => unknown) => {
      const data = (rows[table] ?? []).filter((row) => !ids || ids.includes((row as {record_id: unknown}).record_id));
      return Promise.resolve(table === failTable && from >= failOffset
        ? {data: null, error: {message: 'network failure'}}
        : {data: data.slice(from, Math.min(to + 1, from + cap)), error: null}).then(resolve);
    };
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
    // Uma página vazia por tabela, sem consulta redundante de ids.
    expect(eqCalls).toHaveLength(11);
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


describe('export completeness', () => {
  it.each(['vehicles', 'expenses', 'maintenance_records', 'maintenance_record_items'])('rejects failed %s instead of returning a success file', async (table) => {
    const {client} = fakeClient({vehicles: [{id: 'v1'}], maintenance_records: [{id: 'r1'}]}, table);
    await expect(buildUserDataExport(client, 'u1', when)).rejects.toThrow(table);
  });

  it('rejects failure after a successful first page', async () => {
    const {client} = fakeClient({vehicles: Array.from({length: 600}, (_, id) => ({id: String(id)}))}, 'vehicles', 500, 500);
    await expect(buildUserDataExport(client, 'u1', when)).rejects.toThrow('vehicles');
  });

  it('exports beyond 1000 rows and a lower server cap, including batched child items', async () => {
    const records = Array.from({length: 1103}, (_, id) => ({id: `r${id}`}));
    const items = records.map(({id}, i) => ({id: `i${i}`, record_id: id}));
    const {client, calls} = fakeClient({maintenance_records: records, maintenance_record_items: items}, undefined, 73);
    const out = await buildUserDataExport(client, 'u1', when);
    expect(out.match(/"record_id":/g)).toHaveLength(1103);
    expect(out.match(/"id": "r/g)).toHaveLength(1103);
    expect(out).toContain('"id": "i1102"');
    const batches = calls.filter(c => c.op === 'in');
    expect(batches.length).toBeGreaterThan(11);
    expect(batches.every(c => (c.args[1] as unknown[]).length <= 100)).toBe(true);
    for (const table of ['maintenance_records', 'maintenance_record_items']) {
      expect(calls.some(c => c.table === table && c.op === 'order' && c.args[0] === 'id')).toBe(true);
    }
  });
});
