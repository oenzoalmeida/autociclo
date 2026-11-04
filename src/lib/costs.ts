/** Aggregates financial records without double-counting explicitly linked maintenance. */
export interface Cost {
  date: Date;
  amount: number;
  category: string;
  label: string;
}
export interface ExpenseRow {
  amount: number | string;
  category: string;
  description: string;
  expense_date: string;
  maintenance_record_id?: string | null;
}
export interface MaintenanceRow {
  id: string;
  total_amount: number | string;
  service_date: string;
  note: string | null;
  workshop: string | null;
}
export interface FuelRow {
  total_cost: number | string;
  fuel_date: string;
}

/** Supabase DATE values carry a calendar day, not a UTC instant. */
export function parseCostDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  // Local noon avoids crossing a day boundary in negative UTC offsets.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function buildCosts(expenses: ExpenseRow[], records: MaintenanceRow[], fuels: FuelRow[]): Cost[] {
  const linked = new Set(expenses.map((e) => e.maintenance_record_id).filter((id): id is string => !!id));
  const costs: Cost[] = expenses.map((e) => ({
    date: parseCostDate(e.expense_date),
    amount: Number(e.amount),
    category: e.category,
    label: e.description,
  }));
  for (const r of records) {
    if (Number(r.total_amount) <= 0 || linked.has(r.id)) continue;
    costs.push({
      date: parseCostDate(r.service_date),
      amount: Number(r.total_amount),
      category: 'Manutenção',
      label: r.note || `Manutenção em ${r.workshop || 'oficina'}`,
    });
  }
  for (const f of fuels) {
    costs.push({
      date: parseCostDate(f.fuel_date),
      amount: Number(f.total_cost),
      category: 'Combustível',
      label: 'Abastecimento',
    });
  }
  return costs.sort((a, b) => b.date.getTime() - a.date.getTime());
}
