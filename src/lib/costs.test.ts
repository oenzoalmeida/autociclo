import { describe, expect, it } from 'vitest';
import { buildCosts } from './costs';

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
