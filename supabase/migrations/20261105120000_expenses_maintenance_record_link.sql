-- ---------------------------------------------------------------------------
-- Vínculo explícito entre gasto (public.expenses) e registro de manutenção
-- (public.maintenance_records).
--
-- Contexto: ao registrar uma manutenção, o app grava DOIS lançamentos - o
-- registro em maintenance_records e um gasto "sombra" em expenses com o mesmo
-- valor. As telas de custos somavam as duas tabelas e contavam a manutenção
-- em dobro (ex.: gasto de 50 + manutenção de 180 aparecia como 410).
--
-- Esta migração é apenas ADITIVA - nenhuma linha é removida:
-- 1) Cria expenses.maintenance_record_id (nulo permitido, on delete set null)
--    para vincular o gasto sombra ao seu registro.
-- 2) Vincula os pares históricos por correspondência exata (mesmo usuário,
--    veículo, data, valor e categoria 'Manutenção'), com pareamento 1:1
--    ordenado por criação: cada gasto cobre no máximo um registro e cada
--    registro recebe no máximo um gasto. Gastos avulsos idênticos lançados
--    de propósito NÃO são vinculados além do primeiro par e continuam
--    contando normalmente.
-- 3) Cria o gasto sombra que faltar para registros antigos com valor > 0
--    (ex.: o insert do gasto falhou na época), para que nenhuma manutenção
--    conhecida suma dos totais quando as telas passarem a ler só expenses.
--
-- Reexecutável: na segunda rodada o passo 2 não encontra gastos sem vínculo
-- que formem par novo e o passo 3 não encontra registros sem vínculo.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists maintenance_record_id uuid
  references public.maintenance_records(id) on delete set null;

create index if not exists idx_expenses_maintenance_record
  on public.expenses (maintenance_record_id);

-- 2) Vincula pares históricos (gasto sombra gravado antes da coluna existir)
with cand_e as (
  select e.id, e.vehicle_id, e.expense_date, e.amount,
         row_number() over (
           partition by e.vehicle_id, e.expense_date, e.amount
           order by e.created_at, e.id
         ) as rn
  from public.expenses e
  where e.maintenance_record_id is null
    and e.category = 'Manutenção'
),
cand_r as (
  select r.id, r.vehicle_id, r.service_date, r.total_amount,
         row_number() over (
           partition by r.vehicle_id, r.service_date, r.total_amount
           order by r.created_at, r.id
         ) as rn
  from public.maintenance_records r
  where r.total_amount > 0
)
update public.expenses ex
set maintenance_record_id = cr.id
from cand_e ce
join cand_r cr
  on cr.vehicle_id = ce.vehicle_id
 and cr.service_date = ce.expense_date
 and cr.total_amount = ce.amount
 and cr.rn = ce.rn
where ex.id = ce.id;

-- 3) Cria o gasto sombra ausente para registros antigos com valor, mantendo o
-- mesmo formato de descrição que o app grava hoje.
insert into public.expenses (
  vehicle_id, user_id, category, description, amount, expense_date, mileage,
  maintenance_record_id
)
select
  r.vehicle_id,
  r.user_id,
  'Manutenção',
  coalesce(r.note, case when r.workshop is not null then 'Manutenção em ' || r.workshop else 'Manutenção' end),
  r.total_amount,
  r.service_date,
  r.mileage,
  r.id
from public.maintenance_records r
where r.total_amount > 0
  and not exists (
    select 1 from public.expenses e where e.maintenance_record_id = r.id
  );
