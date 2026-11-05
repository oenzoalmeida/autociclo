// Registro de manutenção com gasto vinculado, atômico quando o schema novo
// está presente e com fallback determinístico para o schema antigo.
//
// A migração 20261105120000 cria a função register_maintenance_with_expense,
// que grava o registro e o gasto sombra vinculado na mesma transação. A
// existência da função é detectável (PostgREST responde PGRST202 quando ela
// não existe), então cada versão do app grava exatamente UMA sombra em
// qualquer ordem de deploy, sem janela de dupla escrita.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database>;
type MaintenanceRecordRow = Database['public']['Tables']['maintenance_records']['Row'];

// PostgREST: função ausente no schema exposto.
const FUNCTION_NOT_FOUND = 'PGRST202';

export interface RegisterMaintenanceInput {
  vehicleId: string;
  serviceDate: string;
  mileage: number;
  totalAmount: number;
  workshop: string | null;
  note: string | null;
}

export interface RegisterMaintenanceResult {
  recordId: string | null;
  error: boolean;
}

// Descrição determinística, idêntica à da função SQL — usada no caminho
// legado (schema antigo, sem a função), em que o app grava a sombra em uma
// segunda escrita, como sempre fez.
export function shadowDescription(note: string | null, workshop: string | null): string {
  return note ?? (workshop ? `Manutenção em ${workshop}` : 'Manutenção');
}

export async function registerMaintenance(
  supabase: Client,
  userId: string,
  input: RegisterMaintenanceInput
): Promise<RegisterMaintenanceResult> {
  const { data, error } = await supabase.rpc('register_maintenance_with_expense', {
    p_vehicle_id: input.vehicleId,
    p_service_date: input.serviceDate,
    p_mileage: input.mileage,
    p_total_amount: input.totalAmount,
    p_workshop: input.workshop,
    p_note: input.note,
  });

  if (!error && data) {
    const record = data as unknown as Pick<MaintenanceRecordRow, 'id'>;
    return { recordId: record.id, error: false };
  }

  // Fallback determinístico: a função NÃO existe => schema antigo, que nunca
  // teve gatilho; o app precisa gravar a sombra manualmente, como sempre fez.
  // Qualquer outro erro significa que a função existe e falhou de verdade
  // (ou gravou); tentar o caminho manual poderia duplicar a sombra, então
  // aqui só se reporta o erro.
  if (!error || error.code !== FUNCTION_NOT_FOUND) {
    return { recordId: null, error: true };
  }

  const { data: record, error: rErr } = await supabase
    .from('maintenance_records')
    .insert({
      vehicle_id: input.vehicleId,
      user_id: userId,
      service_date: input.serviceDate,
      mileage: input.mileage,
      total_amount: input.totalAmount,
      workshop: input.workshop,
      note: input.note,
    })
    .select()
    .single();
  if (rErr || !record) return { recordId: null, error: true };

  if (input.totalAmount > 0) {
    const { error: eErr } = await supabase.from('expenses').insert({
      vehicle_id: input.vehicleId,
      user_id: userId,
      category: 'Manutenção',
      description: shadowDescription(input.note, input.workshop),
      amount: input.totalAmount,
      expense_date: input.serviceDate,
      mileage: input.mileage,
    });
    // Se a sombra falhar, o registro fica visível na seção de manutenções
    // sem vínculo (mesmo modo de falha que já existia) — não some, não dobra.
    if (eErr) return { recordId: record.id, error: false };
  }
  return { recordId: record.id, error: false };
}
