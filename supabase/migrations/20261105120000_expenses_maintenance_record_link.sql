-- ---------------------------------------------------------------------------
-- Vínculo explícito entre gasto (public.expenses) e registro de manutenção
-- (public.maintenance_records) - APENAS ESTRUTURA, sem tocar em dados.
--
-- Contexto: ao registrar uma manutenção, o app gravava DOIS lançamentos em
-- duas escritas separadas: o registro em maintenance_records e um gasto
-- "sombra" em expenses com o mesmo valor. As telas de custos somavam as duas
-- tabelas e contavam a manutenção em dobro (ex.: 50 + 180 aparecia como 410);
-- e se a segunda escrita falhava, o registro ficava sem gasto ("órfão").
--
-- Esta migração:
-- 1) Cria expenses.maintenance_record_id (nulo, on delete set null) + índice.
-- 2) Cria gatilho AFTER INSERT em maintenance_records que grava o gasto
--    sombra JÁ VINCULADO na mesma transação do registro: escrita atômica,
--    impossível nascer órfão novo, para qualquer caminho de inserção.
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

create or replace function public.create_maintenance_shadow_expense()
returns trigger
language plpgsql
as $func$
begin
  if new.total_amount > 0 then
    insert into public.expenses (
      vehicle_id, user_id, category, description, amount, expense_date,
      mileage, maintenance_record_id
    ) values (
      new.vehicle_id, new.user_id, 'Manutenção',
      coalesce(new.note, case when new.workshop is not null then 'Manutenção em ' || new.workshop else 'Manutenção' end),
      new.total_amount, new.service_date, new.mileage, new.id
    );
  end if;
  return new;
end
$func$;

-- Mesma convenção de endurecimento das demais funções do schema.
alter function public.create_maintenance_shadow_expense() set search_path = '';

drop trigger if exists maintenance_records_shadow_expense on public.maintenance_records;
create trigger maintenance_records_shadow_expense
  after insert on public.maintenance_records
  for each row execute function public.create_maintenance_shadow_expense();
