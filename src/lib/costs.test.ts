import { describe, it, expect } from 'vitest';
import { buildCostSummary } from './costs';
import type { Database } from './database.types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];
type FuelRecord = Database['public']['Tables']['fuel_records']['Row'];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    vehicle_id: 'v1',
    user_id: 'u1',
    category: 'Manutenção',
    description: 'Manutenção',
    amount: 180,
    expense_date: '2026-06-10',
    mileage: null,
    maintenance_record_id: null,
    created_at: '2026-06-10T12:00:00Z',
    ...overrides,
  };
}

function record(overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord {
  return {
    id: 'r1',
    vehicle_id: 'v1',
    user_id: 'u1',
    service_date: '2026-06-10',
    mileage: 10000,
    total_amount: 180,
    workshop: null,
    note: null,
    created_at: '2026-06-10T12:00:00Z',
    updated_at: '2026-06-10T12:00:00Z',
    ...overrides,
  };
}

function fuel(overrides: Partial<FuelRecord> = {}): FuelRecord {
  return {
    id: 'f1',
    vehicle_id: 'v1',
    user_id: 'u1',
    fuel_date: '2026-06-11',
    mileage: 10100,
    liters: 40,
    total_cost: 240,
    price_per_liter: 6,
    fuel_type: 'Gasolina',
    station: null,
    full_tank: true,
    created_at: '2026-06-11T12:00:00Z',
    ...overrides,
  };
}

const sum = (list: { amount: number }[]) => list.reduce((s, c) => s + c.amount, 0);

describe('buildCostSummary', () => {
  it('total é determinístico: soma só gastos e combustível, nunca registros', () => {
    // Caso do bug: gasto avulso de 50 + manutenção de 180. O sombra de 180 já
    // está em expenses; o registro NÃO entra na soma, mesmo sem vínculo.
    const { entries } = buildCostSummary({
      expenses: [expense(), expense({ id: 'e2', amount: 50, category: 'Outros', expense_date: '2026-06-12' })],
      records: [record()],
    });
    expect(sum(entries)).toBe(230);
  });

  it('registro novo com sombra vinculado não aparece na seção separada', () => {
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [expense({ maintenance_record_id: 'r1' })],
      records: [record()],
    });
    expect(sum(entries)).toBe(180);
    expect(unlinkedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('par legado sem vínculo: gasto conta uma vez E o registro aparece na seção separada', () => {
    // Igualdade não prova sobreposição: o registro legado fica visível para
    // confirmação, sem rótulo de órfão e sem entrar no total.
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [expense()],
      records: [record()],
    });
    expect(sum(entries)).toBe(180);
    expect(unlinkedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('registro sem nenhum gasto: fora do total E visível na seção separada', () => {
    const { entries, unlinkedMaintenance } = buildCostSummary({ expenses: [], records: [record()] });
    expect(entries).toHaveLength(0);
    expect(unlinkedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('CASO ADVERSARIAL: manutenção sem sombra + avulso idêntico (inclusive texto)', () => {
    // Dados indistinguíveis de um par sombra real. Comportamento declarado:
    // o total contém o valor UMA vez via gasto (nada é apagado) e o registro
    // aparece na seção separada para confirmação - nada é decidido de fininho.
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [expense({ description: 'Troca de óleo' })],
      records: [record({ note: 'Troca de óleo' })],
    });
    expect(sum(entries)).toBe(180);
    expect(unlinkedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('CASO ADVERSARIAL: sombra + avulso indistinguíveis - os dois gastos sempre contam', () => {
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [
        expense({ id: 'e-sombra', maintenance_record_id: 'r1' }),
        expense({ id: 'e-avulso', created_at: '2026-06-10T13:00:00Z' }),
      ],
      records: [record()],
    });
    expect(sum(entries)).toBe(360);
    expect(unlinkedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('vínculo de outro registro não cobre este registro', () => {
    const { unlinkedMaintenance } = buildCostSummary({
      expenses: [expense({ maintenance_record_id: 'outro-registro' })],
      records: [record()],
    });
    expect(unlinkedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('duas manutenções idênticas sem vínculo: as duas aparecem na seção separada', () => {
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [expense()],
      records: [record(), record({ id: 'r2' })],
    });
    expect(sum(entries)).toBe(180);
    expect(unlinkedMaintenance).toEqual({ count: 2, total: 360 });
  });

  it('ignora manutenção sem valor e soma combustível uma vez', () => {
    const { entries, unlinkedMaintenance } = buildCostSummary({
      expenses: [],
      records: [record({ total_amount: 0 })],
      fuels: [fuel()],
    });
    expect(sum(entries)).toBe(240);
    expect(unlinkedMaintenance).toEqual({ count: 0, total: 0 });
  });
});
