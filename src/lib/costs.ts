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

export interface UnmatchedMaintenance {
  count: number;
  total: number;
}

export interface CostSummary {
  entries: CostEntry[];
  unmatchedMaintenance: UnmatchedMaintenance;
}

// Ao registrar uma manutenção o app grava dois lançamentos: o registro em
// maintenance_records e um gasto "sombra" em expenses com o mesmo valor.
// Somar as duas tabelas conta a manutenção em dobro (bug dos Gastos).
//
// Decisão de modelo:
// * O TOTAL é determinístico: soma expenses + fuel_records, e nada mais.
//   Nenhum registro de manutenção entra na soma, então nunca há duplicidade
//   e nenhum gasto lançado é escondido.
// * Registros de manutenção sem gasto correspondente identificado NÃO entram
//   no total silenciosamente: são devolvidos em unmatchedMaintenance para a
//   tela mostrar um aviso separado e visível. A correção definitiva desses
//   registros é uma reconciliação aditiva proposta à parte, decidida pelo
//   dono — o código não autovincula nem inventa correspondências.
//
// Critério de correspondência (só classificação para o aviso; nunca altera o
// total): vínculo explícito (expenses.maintenance_record_id, gravado nos
// registros novos) OU correspondência exata legada — mesmo veículo, data,
// valor, categoria "Manutenção" e texto que o app teria gravado para o
// registro (a descrição do sombra é derivada do registro desde a criação do
// fluxo). Um registro sem nenhum correspondente cai no aviso; um gasto avulso
// com texto próprio nunca é tratado como correspondente.
function matchesShadowDescription(e: Expense, r: MaintenanceRecord): boolean {
  if (r.note) return e.description === r.note;
  if (e.description === 'Manutenção') return true;
  return r.workshop != null && e.description === `Manutenção em ${r.workshop}`;
}

function hasCorrespondingExpense(r: MaintenanceRecord, expenses: Expense[]): boolean {
  return expenses.some(
    (e) =>
      e.maintenance_record_id === r.id ||
      (e.maintenance_record_id == null &&
        e.vehicle_id === r.vehicle_id &&
        e.category === 'Manutenção' &&
        e.expense_date === r.service_date &&
        Number(e.amount) === Number(r.total_amount) &&
        matchesShadowDescription(e, r))
  );
}

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
  for (const r of records) {
    if (Number(r.total_amount) <= 0) continue;
    if (hasCorrespondingExpense(r, expenses)) continue;
    count += 1;
    total += Number(r.total_amount);
  }

  return { entries, unmatchedMaintenance: { count, total } };
}
