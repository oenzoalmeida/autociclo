import { describe, it, expect } from 'vitest';
import { buildCostList } from './costs';
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

const total = (list: { amount: number }[]) => list.reduce((s, c) => s + c.amount, 0);

describe('buildCostList', () => {
  it('não duplica manutenção com gasto sombra legado (correspondência exata)', () => {
    // Caso do bug: gasto avulso de 50 + manutenção de 180 gravada em dobro.
    const list = buildCostList({
      expenses: [expense({ id: 'e-sombra' }), expense({ id: 'e2', amount: 50, category: 'Outros', expense_date: '2026-06-12' })],
      records: [record()],
    });
    expect(total(list)).toBe(230);
  });

  it('não duplica manutenção com gasto sombra vinculado (maintenance_record_id)', () => {
    const list = buildCostList({
      expenses: [expense({ maintenance_record_id: 'r1' })],
      records: [record()],
    });
    expect(total(list)).toBe(180);
  });

  it('mantém manutenção sem gasto correspondente (registro antigo/órfão)', () => {
    const list = buildCostList({ expenses: [], records: [record()] });
    expect(total(list)).toBe(180);
  });

  it('não esconde gasto independente com valor ou data diferente', () => {
    const list = buildCostList({
      expenses: [expense({ amount: 90 })],
      records: [record()],
    });
    expect(total(list)).toBe(270);
  });

  it('pareamento é 1:1 - duas manutenções idênticas e um gasto soma o registro sem par', () => {
    const list = buildCostList({
      expenses: [expense()],
      records: [record(), record({ id: 'r2', created_at: '2026-06-10T12:01:00Z', updated_at: '2026-06-10T12:01:00Z' })],
    });
    expect(total(list)).toBe(360);
  });

  it('gasto vinculado a outro registro não serve de sombra por coincidência', () => {
    const list = buildCostList({
      expenses: [expense({ maintenance_record_id: 'outro-registro' })],
      records: [record()],
    });
    expect(total(list)).toBe(360);
  });

  it('ignora manutenção sem valor e soma combustível uma vez', () => {
    const list = buildCostList({
      expenses: [],
      records: [record({ total_amount: 0 })],
      fuels: [fuel()],
    });
    expect(total(list)).toBe(240);
  });

  it('mantém rótulo da manutenção quando entra como registro sem sombra', () => {
    const list = buildCostList({ expenses: [], records: [record({ workshop: 'Oficina do Zé' })] });
    expect(list[0].label).toBe('Manutenção em Oficina do Zé');
    expect(list[0].category).toBe('Manutenção');
  });

  it('não pareia gasto avulso com texto não derivado do registro', () => {
    const list = buildCostList({
      expenses: [expense({ description: 'Revisão do câmbio' })],
      records: [record()],
    });
    expect(total(list)).toBe(360);
  });

  it('não pareia texto genérico quando o registro tem anotação própria', () => {
    // O sombra real desse registro teria a anotação como descrição.
    const list = buildCostList({
      expenses: [expense({ description: 'Manutenção' })],
      records: [record({ note: 'Troca de óleo' })],
    });
    expect(total(list)).toBe(360);
  });

  it('reconhece sombra legado nos dois formatos de descrição do app', () => {
    const viaSecao = buildCostList({
      expenses: [expense({ description: 'Manutenção em Oficina A' })],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(total(viaSecao)).toBe(180);
    const viaRapido = buildCostList({
      expenses: [expense({ description: 'Manutenção' })],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(total(viaRapido)).toBe(180);
  });

  it('CASO ADVERSARIAL: manutenção sem sombra + avulso idêntico (inclusive texto) conta uma vez', () => {
    // Dados indistinguíveis de um par sombra real: não existe critério que
    // separe os dois sem apagar dado. Comportamento determinístico declarado:
    // o valor é contado UMA vez (via gasto); nada é removido da base.
    const list = buildCostList({
      expenses: [expense({ description: 'Troca de óleo' })],
      records: [record({ note: 'Troca de óleo' })],
    });
    expect(total(list)).toBe(180);
  });

  it('CASO ADVERSARIAL: sombra + avulso indistinguíveis - os dois gastos sempre contam', () => {
    const list = buildCostList({
      expenses: [
        expense({ id: 'e-sombra', description: 'Manutenção em Oficina A', maintenance_record_id: 'r1' }),
        expense({ id: 'e-avulso', description: 'Manutenção em Oficina A', created_at: '2026-06-10T13:00:00Z' }),
      ],
      records: [record({ workshop: 'Oficina A' })],
    });
    expect(total(list)).toBe(360);
  });

  it('fallback sem migração (sem maintenance_record_id) não oculta gasto legítimo', () => {
    // Banco ainda não migrado: todos os vínculos nulos. Gasto avulso comum
    // continua contando; a manutenção conta via seu sombra legado.
    const list = buildCostList({
      expenses: [
        expense({ id: 'e-sombra' }),
        expense({ id: 'e-avulso', amount: 75, category: 'Seguro', description: 'Seguro anual', expense_date: '2026-06-20' }),
      ],
      records: [record()],
    });
    expect(total(list)).toBe(255);
  });
});
