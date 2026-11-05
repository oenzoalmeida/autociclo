-- ---------------------------------------------------------------------------
-- Vínculo explícito entre gasto (public.expenses) e registro de manutenção
-- (public.maintenance_records) + gravação atômica via RPC - APENAS ESTRUTURA,
-- sem tocar em dados.
--
-- Contexto: ao registrar uma manutenção, o app gravava DOIS lançamentos em
-- duas escritas separadas: o registro em maintenance_records e um gasto
-- "sombra" em expenses com o mesmo valor. As telas de custos somavam as duas
-- tabelas e contavam a manutenção em dobro (ex.: 50 + 180 aparecia como 410);
-- e se a segunda escrita falhava, o registro ficava sem gasto ("órfão").
--
-- Esta migração:
-- 1) Cria expenses.maintenance_record_id (nulo, on delete set null) + índice.
-- 2) Cria a função RPC register_maintenance_with_expense, que grava o
--    registro e o gasto sombra JÁ VINCULADO na mesma transação.
--
-- Por que RPC e não gatilho: a existência da função é detectável pelo app
-- (PostgREST responde PGRST202 quando ela não existe), então cada versão do
-- app escolhe deterministicamente o caminho certo para o schema presente:
--   - app novo + schema novo: uma chamada RPC atômica;
--   - app novo + schema antigo: RPC ausente -> app grava como sempre gravou
--     (registro + sombra manual), sem dobrar;
--   - app antigo + schema novo: sem gatilho, o app antigo segue gravando
--     registro + sombra manual, sem dobrar.
-- Com gatilho, a janela "schema novo + app antigo" gravaria duas sombras
-- silenciosamente; por isso a escrita fica na RPC, não em trigger.
--
-- NENHUM dado existente é vinculado, inserido, alterado ou removido: o
-- histórico (pares sombra sem vínculo formal) não é tocado por igualdade.
-- A reconciliação do histórico é decisão do dono, proposta à parte com
-- estimativa dos dados afetados, e NÃO faz parte desta migração.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists maintenance_record_id uuid
  references public.maintenance_records(id) on delete set null;

create index if not exists idx_expenses_maintenance_record
  on public.expenses (maintenance_record_id);

create or replace function public.register_maintenance_with_expense(
  p_vehicle_id uuid,
  p_service_date date,
  p_mileage numeric,
  p_total_amount numeric,
  p_workshop text default null,
  p_note text default null
)
returns json
language plpgsql
security invoker
set search_path = ''
as $func$
declare
  v_user uuid := auth.uid();
  v_record public.maintenance_records;
begin
  if v_user is null then
    raise exception 'register_maintenance_with_expense: usuário não autenticado';
  end if;

  insert into public.maintenance_records (
    vehicle_id, user_id, service_date, mileage, total_amount, workshop, note
  ) values (
    p_vehicle_id, v_user, p_service_date, p_mileage, p_total_amount, p_workshop, p_note
  ) returning * into v_record;

  if p_total_amount > 0 then
    insert into public.expenses (
      vehicle_id, user_id, category, description, amount, expense_date,
      mileage, maintenance_record_id
    ) values (
      p_vehicle_id, v_user, 'Manutenção',
      coalesce(
        p_note,
        case when p_workshop is not null then 'Manutenção em ' || p_workshop
             else 'Manutenção' end
      ),
      p_total_amount, p_service_date, p_mileage, v_record.id
    );
  end if;

  return to_json(v_record);
end
$func$;

-- Mesma convenção de endurecimento das demais funções do schema: sem
-- execução pública; roda como o chamador (RLS segue valendo nas duas escritas).
revoke execute on function public.register_maintenance_with_expense(uuid, date, numeric, numeric, text, text) from public, anon;
grant execute on function public.register_maintenance_with_expense(uuid, date, numeric, numeric, text, text) to authenticated;
