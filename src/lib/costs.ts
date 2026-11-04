export interface Cost {
  date: Date;
  amount: number;
  category: string;
  label: string;
}

// Livro-caixa da página Gastos: expenses + abastecimentos.
//
// Invariante estrutural do app: todo maintenance_record com total_amount > 0
// nasce junto de uma linha equivalente em expenses, no mesmo fluxo
// (quick/manutencao e maintenance-section gravam as duas). Somar
// maintenance_records aqui contaria a mesma manutenção em dobro, então a
// tabela NÃO entra nesta agregação. Gastos independentes (quick/gasto,
// costs-section) vivem em expenses e são sempre preservados.
export function buildCosts(
  expenses: Array<{ expense_date: string; amount: number | string; category: string; description: string }>,
  fuels: Array<{ fuel_date: string; total_cost: number | string }>,
): Cost[] {
  const list: Cost[] = [];
  expenses.forEach((e) =>
    list.push({ date: new Date(e.expense_date), amount: Number(e.amount), category: e.category, label: e.description }),
  );
  fuels.forEach((f) =>
    list.push({ date: new Date(f.fuel_date), amount: Number(f.total_cost), category: 'Combustível', label: 'Abastecimento' }),
  );
  list.sort((a, b) => b.date.getTime() - a.date.getTime());
  return list;
}
