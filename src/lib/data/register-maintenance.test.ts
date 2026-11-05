import { describe, it, expect, vi } from 'vitest';
import { registerMaintenance, shadowDescription } from './register-maintenance';

// Mock mínimo do cliente supabase para os caminhos do helper.
function makeClient(opts: {
  rpcResult: { data?: unknown; error?: { code: string } | null };
  recordInsert?: { data?: { id: string } | null; error?: { message: string } | null };
  expenseInsert?: { error?: { message: string } | null };
}) {
  const expenseInsert = vi.fn().mockResolvedValue(opts.expenseInsert ?? { error: null });
  const recordSingle = vi
    .fn()
    .mockResolvedValue(opts.recordInsert ?? { data: { id: 'rec-1' }, error: null });
  const recordSelect = vi.fn().mockReturnValue({ single: recordSingle });
  const recordInsert = vi.fn().mockReturnValue({ select: recordSelect });
  const from = vi.fn((table: string) =>
    table === 'expenses' ? { insert: expenseInsert } : { insert: recordInsert }
  );
  const rpc = vi.fn().mockResolvedValue(opts.rpcResult);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { rpc, from } as any, rpc, recordInsert, expenseInsert };
}

const INPUT = {
  vehicleId: 'veh-1',
  serviceDate: '2026-11-05',
  mileage: 45000,
  totalAmount: 230,
  workshop: 'Oficina Central',
  note: null,
};

describe('shadowDescription', () => {
  it('usa a nota quando presente', () => {
    expect(shadowDescription('Troca de óleo', 'Oficina X')).toBe('Troca de óleo');
  });
  it('usa a oficina quando não há nota', () => {
    expect(shadowDescription(null, 'Oficina X')).toBe('Manutenção em Oficina X');
  });
  it('cai no genérico sem nota nem oficina', () => {
    expect(shadowDescription(null, null)).toBe('Manutenção');
  });
});

describe('registerMaintenance', () => {
  it('schema novo: RPC grava tudo e nenhum insert direto acontece', async () => {
    const { client, rpc, recordInsert, expenseInsert } = makeClient({
      rpcResult: { data: { id: 'rec-rpc' }, error: null },
    });
    const r = await registerMaintenance(client, 'user-1', INPUT);
    expect(r).toEqual({ recordId: 'rec-rpc', error: false });
    expect(rpc).toHaveBeenCalledWith('register_maintenance_with_expense', {
      p_vehicle_id: 'veh-1',
      p_service_date: '2026-11-05',
      p_mileage: 45000,
      p_total_amount: 230,
      p_workshop: 'Oficina Central',
      p_note: null,
    });
    expect(recordInsert).not.toHaveBeenCalled();
    expect(expenseInsert).not.toHaveBeenCalled();
  });

  it('schema antigo (PGRST202): grava registro + sombra manual, sem vínculo', async () => {
    const { client, recordInsert, expenseInsert } = makeClient({
      rpcResult: { data: null, error: { code: 'PGRST202' } },
    });
    const r = await registerMaintenance(client, 'user-1', INPUT);
    expect(r).toEqual({ recordId: 'rec-1', error: false });
    expect(recordInsert).toHaveBeenCalledWith({
      vehicle_id: 'veh-1',
      user_id: 'user-1',
      service_date: '2026-11-05',
      mileage: 45000,
      total_amount: 230,
      workshop: 'Oficina Central',
      note: null,
    });
    expect(expenseInsert).toHaveBeenCalledWith({
      vehicle_id: 'veh-1',
      user_id: 'user-1',
      category: 'Manutenção',
      description: 'Manutenção em Oficina Central',
      amount: 230,
      expense_date: '2026-11-05',
      mileage: 45000,
    });
  });

  it('schema antigo com total zero: só o registro, sem sombra', async () => {
    const { client, expenseInsert } = makeClient({
      rpcResult: { data: null, error: { code: 'PGRST202' } },
    });
    const r = await registerMaintenance(client, 'user-1', { ...INPUT, totalAmount: 0 });
    expect(r).toEqual({ recordId: 'rec-1', error: false });
    expect(expenseInsert).not.toHaveBeenCalled();
  });

  it('erro real da RPC (função existe): não cai no fallback, para não duplicar', async () => {
    const { client, recordInsert, expenseInsert } = makeClient({
      rpcResult: { data: null, error: { code: 'P0001' } },
    });
    const r = await registerMaintenance(client, 'user-1', INPUT);
    expect(r).toEqual({ recordId: null, error: true });
    expect(recordInsert).not.toHaveBeenCalled();
    expect(expenseInsert).not.toHaveBeenCalled();
  });

  it('fallback: falha no registro impede a sombra', async () => {
    const { client, expenseInsert } = makeClient({
      rpcResult: { data: null, error: { code: 'PGRST202' } },
      recordInsert: { data: null, error: { message: 'boom' } },
    });
    const r = await registerMaintenance(client, 'user-1', INPUT);
    expect(r).toEqual({ recordId: null, error: true });
    expect(expenseInsert).not.toHaveBeenCalled();
  });

  it('fallback: sombra falhando não esconde o registro (fica visível sem vínculo)', async () => {
    const { client } = makeClient({
      rpcResult: { data: null, error: { code: 'PGRST202' } },
      expenseInsert: { error: { message: 'boom' } },
    });
    const r = await registerMaintenance(client, 'user-1', INPUT);
    expect(r).toEqual({ recordId: 'rec-1', error: false });
  });
});
