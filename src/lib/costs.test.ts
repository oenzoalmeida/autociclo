import { describe, expect, it } from 'vitest';
import { buildCosts } from './costs';
import { parseLocalCalendarDate } from './format';

describe('buildCosts', () => {
  const maintenance = { id: 'r1', total_amount: 180, service_date: '2026-11-03', note: null, workshop: null };
  const linkedExpense = { amount: 180, category: 'Manutenção', description: 'Manutenção', expense_date: '2026-11-03', maintenance_record_id: 'r1' };
  it('counts a linked maintenance/expense pair once', () => {
    expect(buildCosts([linkedExpense], [maintenance], []).reduce((s, c) => s + c.amount, 0)).toBe(180);
  });
  it('retains old maintenance without expense row', () => {
    expect(buildCosts([], [maintenance], [])).toHaveLength(1);
  });
  it('preserves separate user-entered expenses, even when amount and date match', () => {
    const independent = { ...linkedExpense, maintenance_record_id: null };
    expect(buildCosts([independent], [maintenance], [])).toHaveLength(2);
  });
  it('includes fuel and independent expenses', () => {
    const fuel = { fuel_date: '2026-11-04', total_cost: 50 };
    expect(buildCosts([linkedExpense], [maintenance], [fuel]).reduce((s,c)=>s+c.amount,0)).toBe(230);
  });
});

describe('calendar dates in expense reports', () => {
  it('preserves the first day of a month in the local timezone', () => {
    const date = parseLocalCalendarDate('2026-11-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(1);
  });

  it('preserves calendar year on January 1st', () => {
    const date = parseLocalCalendarDate('2027-01-01');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2027, 0, 1]);
  });

  it('uses the correct local month for expenses, maintenance and fuel dates', () => {
    const expenses = [{ amount: 10, category: 'Outros', description: 'Teste', expense_date: '2026-11-01' }];
    const maintenance = [{ id: 'r2', total_amount: 20, service_date: '2026-11-01', note: null, workshop: null }];
    const fuel = [{ total_cost: 30, fuel_date: '2026-11-01' }];
    const costs = buildCosts(expenses, maintenance, fuel);
    expect(costs).toHaveLength(3);
    for (const entry of costs) {
      expect([entry.date.getFullYear(), entry.date.getMonth(), entry.date.getDate()]).toEqual([2026, 10, 1]);
    }
  });
});
