-- AutoCiclo: READ-ONLY preview for historic maintenance/expense reconciliation.
-- Run only after migration 20261106232000_link_maintenance_expenses_owner_fk.sql.
-- No update, delete, insert, or automatic matching occurs.
-- Equal amount/date does NOT prove a duplicate: verify each pair manually.
with candidates as (
  select
    m.id as maintenance_record_id,
    e.id as expense_id,
    m.user_id,
    m.vehicle_id,
    m.service_date,
    m.total_amount,
    count(*) over (partition by m.id) as expense_candidates_for_maintenance,
    count(*) over (partition by e.id) as maintenance_candidates_for_expense
  from public.maintenance_records m
  join public.expenses e
    on e.user_id = m.user_id
   and e.vehicle_id = m.vehicle_id
   and e.expense_date = m.service_date
   and e.amount = m.total_amount
   and e.category = 'Manutenção'
   and e.maintenance_record_id is null
  where m.total_amount > 0
    and not exists (
      select 1 from public.expenses already_linked
      where already_linked.maintenance_record_id = m.id
    )
)
select
  maintenance_record_id,
  expense_id,
  vehicle_id,
  service_date,
  total_amount,
  expense_candidates_for_maintenance,
  maintenance_candidates_for_expense,
  case when expense_candidates_for_maintenance = 1
         and maintenance_candidates_for_expense = 1
       then 'candidate_requires_manual_review'
       else 'ambiguous_do_not_link_automatically'
  end as review_status
from candidates
order by service_date, maintenance_record_id, expense_id;
