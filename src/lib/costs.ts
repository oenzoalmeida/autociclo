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

// Ao registrar uma manutenção o app grava dois lançamentos: o registro em
// maintenance_records e um gasto "sombra" em expenses com o mesmo valor.
// Somar as duas tabelas conta a manutenção em dobro (bug dos Gastos).
//
// O vínculo explícito (expenses.maintenance_record_id) é o critério principal
// para reconhecer o sombra. A correspondência exata (mesmo veículo, data,
// valor e categoria "Manutenção") cobre os dados históricos gravados antes de
// a coluna existir. O pareamento é 1:1 e ordenado: cada gasto cobre no máximo
// um registro, então duas manutenções idênticas com um único gasto gravado
// ainda somam o registro que ficou sem par.
function isShadowExpense(e: Expense, r: MaintenanceRecord): boolean {
  if (e.maintenance_record_id) return e.maintenance_record_id === r.id;
  return (
    e.vehicle_id === r.vehicle_id &&
    e.category === 'Manutenção' &&
    e.expense_date === r.service_date &&
    Number(e.amount) === Number(r.total_amount)
  );
}

// Monta a lista única de custos (gastos avulsos + manutenções + combustível)
// sem contar nada duas vezes e sem esconder lançamentos: todo gasto em
// expenses entra sempre; um registro de manutenção só é somado quando não
// existe gasto sombra correspondente.
export function buildCostList(input: {
  expenses?: Expense[] | null;
  records?: MaintenanceRecord[] | null;
  fuels?: FuelRecord[] | null;
}): CostEntry[] {
  const expenses = input.expenses ?? [];
  const records = input.records ?? [];
  const fuels = input.fuels ?? [];

  const list: CostEntry[] = expenses.map((e) => ({
    date: new Date(e.expense_date),
    amount: Number(e.amount),
    category: e.category,
    label: e.description,
  }));

  const used = new Set<number>();
  const ordered = [...records].sort((a, b) => {
    const byCreation = a.created_at.localeCompare(b.created_at);
    return byCreation !== 0 ? byCreation : a.id.localeCompare(b.id);
  });
  for (const r of ordered) {
    if (Number(r.total_amount) <= 0) continue;
    const idx = expenses.findIndex((e, i) => !used.has(i) && isShadowExpense(e, r));
    if (idx >= 0) {
      used.add(idx);
      continue;
    }
    list.push({
      date: new Date(r.service_date),
      amount: Number(r.total_amount),
      category: 'Manutenção',
      label: r.note || `Manutenção em ${r.workshop || 'oficina'}`,
    });
  }

  for (const f of fuels) {
    list.push({
      date: new Date(f.fuel_date),
      amount: Number(f.total_cost),
      category: 'Combustível',
      label: 'Abastecimento',
    });
  }

  return list;
}
