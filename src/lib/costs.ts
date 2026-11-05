import type { Database } from './database.types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];
type FuelRecord = Database['public']['Tables']['fuel_records']['Row'];

export interface CostEntry {
  date: Date;
  amount: number;
  category: string;
  label: string;
}

export interface UnlinkedMaintenance {
  count: number;
  total: number;
}

export interface CostSummary {
  entries: CostEntry[];
  unlinkedMaintenance: UnlinkedMaintenance;
}

// Ao registrar uma manutenção, o banco grava dois lançamentos na mesma
// transação (gatilho maintenance_records_shadow_expense): o registro em
// maintenance_records e um gasto "sombra" em expenses, já vinculado por
// expenses.maintenance_record_id. Registros antigos (anteriores ao gatilho)
// não têm vínculo formal.
//
// Decisão de modelo:
// * O TOTAL é determinístico: soma expenses + fuel_records, e nada mais.
//   Nenhum registro de manutenção entra na soma, então nunca há duplicidade
//   e nenhum gasto lançado é escondido.
// * TODO registro sem vínculo explícito é devolvido em unlinkedMaintenance
//   para a tela mostrar em seção separada e visível, com a soma estimada.
//   Isso vale mesmo quando existe um gasto igual: igualdade não prova que o
//   gasto seja o sombra, então a sobreposição é apresentada como pendência
//   de confirmação, nunca decidida pelo código.
export function buildCostSummary(input: {
  expenses?: Expense[] | null;
  records?: MaintenanceRecord[] | null;
  fuels?: FuelRecord[] | null;
}): CostSummary {
  const expenses = input.expenses ?? [];
  const records = input.records ?? [];
  const fuels = input.fuels ?? [];

  const entries: CostEntry[] = expenses.map((e) => ({
    date: new Date(e.expense_date),
    amount: Number(e.amount),
    category: e.category,
    label: e.description,
  }));

  for (const f of fuels) {
    entries.push({
      date: new Date(f.fuel_date),
      amount: Number(f.total_cost),
      category: 'Combustível',
      label: 'Abastecimento',
    });
  }

  let count = 0;
  let total = 0;
  const linked = new Set(
    expenses.map((e) => e.maintenance_record_id).filter((id): id is string => id != null)
  );
  for (const r of records) {
    if (Number(r.total_amount) <= 0) continue;
    if (linked.has(r.id)) continue;
    count += 1;
    total += Number(r.total_amount);
  }

  return { entries, unlinkedMaintenance: { count, total } };
}
