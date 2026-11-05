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
-- 2) Vincula os pares históricos por correspondência exata (veículo, data,
--    valor, categoria 'Manutenção' e texto derivado do registro), com
--    pareamento 1:1: cada gasto cobre no máximo um registro e vice-versa.
-- 3) Cria o gasto sombra que faltar para registros antigos com valor > 0
--    (ex.: o insert do gasto falhou na época), para que nenhuma manutenção
--    conhecida suma dos totais quando as telas passarem a ler só expenses.
--
-- Limite declarado: um gasto avulso histórico com TODOS esses campos
-- idênticos aos de uma manutenção sem sombra é indistinguível de um sombra
-- real; nesse caso o valor passa a ser contado uma vez (nunca é apagado).
--
-- Reexecutável: na segunda rodada o passo 2 não encontra gastos sem vínculo
-- que formem par novo e o passo 3 não encontra registros sem vínculo.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists maintenance_record_id uuid
  references public.maintenance_records(id) on delete set null;

create index if not exists idx_expenses_maintenance_record
  on public.expenses (maintenance_record_id);

-- 2) Vincula pares históricos. A descrição do sombra é derivada do registro
-- desde que o fluxo de registro de manutenção existe (formato estável,
-- verificado no histórico do repositório): a anotação da manutenção, ou
-- 'Manutenção em <oficina>', ou 'Manutenção'. O laço garante pareamento 1:1
-- de fato em qualquer combinação de duplicados: registros processados em
-- ordem de criação, cada um pega no máximo o primeiro gasto ainda livre.
do $$
declare
  rec record;
  eid uuid;
begin
  for rec in
    select r.*
    from public.maintenance_records r
    where r.total_amount > 0
    order by r.created_at, r.id
  loop
    select e.id into eid
    from public.expenses e
    where e.maintenance_record_id is null
      and e.category = 'Manutenção'
      and e.vehicle_id = rec.vehicle_id
      and e.expense_date = rec.service_date
      and e.amount = rec.total_amount
      and (
        e.description = coalesce(rec.note, case when rec.workshop is not null then 'Manutenção em ' || rec.workshop else 'Manutenção' end)
        or e.description = 'Manutenção'
      )
    order by e.created_at, e.id
    limit 1;

    if eid is not null then
      update public.expenses set maintenance_record_id = rec.id where id = eid;
    end if;
  end loop;
end $$;

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
