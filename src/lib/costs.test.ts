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

describe('buildCostSummary', () => {
  it('total é determinístico: soma só gastos e combustível, nunca registros', () => {
    // Caso do bug: gasto avulso de 50 + manutenção de 180. O sombra de 180 já
    // está em expenses; o registro NÃO entra de novo na soma.
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [expense(), expense({ id: 'e2', amount: 50, category: 'Outros', expense_date: '2026-06-12' })],
      records: [record()],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(230);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('não duplica manutenção nova com sombra vinculado (maintenance_record_id)', () => {
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [expense({ maintenance_record_id: 'r1' })],
      records: [record()],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(180);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('manutenção sem nenhum gasto correspondente: fora do total E visível no aviso', () => {
    // Registro antigo/órfão: o dinheiro não some de fininho - sai do total e
    // aparece destacado para reconciliação.
    const { entries, unmatchedMaintenance } = buildCostSummary({ expenses: [], records: [record()] });
    expect(entries).toHaveLength(0);
    expect(unmatchedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('gasto avulso com texto próprio não é correspondente: conta no total e registro vai para o aviso', () => {
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [expense({ description: 'Revisão do câmbio' })],
      records: [record()],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(180);
    expect(unmatchedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('texto genérico não cobre registro com anotação própria', () => {
    const { unmatchedMaintenance } = buildCostSummary({
      expenses: [expense({ description: 'Manutenção' })],
      records: [record({ note: 'Troca de óleo' })],
    });
    expect(unmatchedMaintenance).toEqual({ count: 1, total: 180 });
  });

  it('reconhece sombra legado nos dois formatos de descrição do app', () => {
    const viaSecao = buildCostSummary({
      expenses: [expense({ description: 'Manutenção em Oficina A' })],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(viaSecao.unmatchedMaintenance.count).toBe(0);
    const viaRapido = buildCostSummary({
      expenses: [expense({ description: 'Manutenção' })],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(viaRapido.unmatchedMaintenance.count).toBe(0);
  });

  it('CASO ADVERSARIAL: manutenção sem sombra + avulso idêntico (inclusive texto)', () => {
    // Dados indistinguíveis de um par sombra real. Comportamento declarado:
    // o total contém o valor UMA vez via gasto (nada é apagado); o registro
    // é classificado como coberto. Não existe critério que separe os dois
    // sem remover dado - a ambiguidade vai para a decisão do dono com a
    // estimativa de registros afetados.
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [expense({ description: 'Troca de óleo' })],
      records: [record({ note: 'Troca de óleo' })],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(180);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('CASO ADVERSARIAL: sombra + avulso indistinguíveis - os dois gastos sempre contam', () => {
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [
        expense({ id: 'e-sombra', description: 'Manutenção em Oficina A', maintenance_record_id: 'r1' }),
        expense({ id: 'e-avulso', description: 'Manutenção em Oficina A', created_at: '2026-06-10T13:00:00Z' }),
      ],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(360);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('duas manutenções idênticas com um só gasto: nenhuma some do aviso por pareamento', () => {
    // Sem pareamento 1:1 para esconder registro: as duas têm correspondente
    // exato (o mesmo gasto), então nenhuma vai para o aviso; o gasto conta
    // uma vez no total. O segundo registro representa a mesma despesa.
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [expense()],
      records: [record(), record({ id: 'r2', created_at: '2026-06-10T12:01:00Z', updated_at: '2026-06-10T12:01:00Z' })],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(180);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('ignora manutenção sem valor e soma combustível uma vez', () => {
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [],
      records: [record({ total_amount: 0 })],
      fuels: [fuel()],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(240);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });

  it('fallback sem migração (vínculos nulos): nenhum gasto é ocultado', () => {
    const { entries, unmatchedMaintenance } = buildCostSummary({
      expenses: [
        expense({ id: 'e-sombra' }),
        expense({ id: 'e-avulso', amount: 75, category: 'Seguro', description: 'Seguro anual', expense_date: '2026-06-20' }),
      ],
      records: [record()],
    });
    expect(entries.reduce((s, c) => s + c.amount, 0)).toBe(255);
    expect(unmatchedMaintenance).toEqual({ count: 0, total: 0 });
  });
});
