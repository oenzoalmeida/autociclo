import { describe, expect, it } from 'vitest';
import { buildCosts } from './costs';

describe('buildCosts', () => {
  it('conta manutenção uma única vez (via expenses, sem maintenance_records)', () => {
    // O fluxo de manutenção grava expenses + maintenance_records; a agregação
    // recebe apenas expenses/fuel_records, então a manutenção aparece uma vez.
    const costs = buildCosts(
      [{ expense_date: '2026-11-04', amount: 180, category: 'Manutenção', description: 'Troca de óleo' }],
      [],
    );
    expect(costs).toHaveLength(1);
    expect(costs[0].amount).toBe(180);
    expect(costs.reduce((s, c) => s + c.amount, 0)).toBe(180);
  });

  it('preserva gastos independentes de qualquer categoria', () => {
    const costs = buildCosts(
      [
        { expense_date: '2026-11-04', amount: 50, category: 'Manutenção', description: 'Lavagem auditoria' },
        { expense_date: '2026-11-03', amount: '75.50', category: 'Peças', description: 'Palheta' },
      ],
      [],
    );
    expect(costs).toHaveLength(2);
    expect(costs.reduce((s, c) => s + c.amount, 0)).toBeCloseTo(125.5);
  });

  it('preserva abastecimentos como Combustível', () => {
    const costs = buildCosts([], [{ fuel_date: '2026-11-02', total_cost: 200 }]);
    expect(costs).toHaveLength(1);
    expect(costs[0]).toMatchObject({ amount: 200, category: 'Combustível', label: 'Abastecimento' });
  });

  it('ordena do mais recente para o mais antigo', () => {
    const costs = buildCosts(
      [
        { expense_date: '2026-11-01', amount: 10, category: 'Outros', description: 'a' },
        { expense_date: '2026-11-04', amount: 20, category: 'Outros', description: 'b' },
      ],
      [],
    );
    expect(costs[0].amount).toBe(20);
    expect(costs[1].amount).toBe(10);
  });

  it('lista vazia sem lançamentos', () => {
    expect(buildCosts([], [])).toEqual([]);
  });
});
