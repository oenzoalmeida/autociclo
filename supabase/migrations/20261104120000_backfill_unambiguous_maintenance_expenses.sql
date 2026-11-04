-- Conservative legacy reconciliation, proposed for review and homologation.
-- Only links unmistakably generated pairs; no amounts or records are deleted.
-- Preconditions: earlier migration added expenses.maintenance_record_id.
-- Manual entries that merely share an amount/date are NOT sufficient.
with candidates as (
  select
    m.id as maintenance_record_id,
    e.id as expense_id,
    count(*) over (partition by m.id) as expenses_for_maintenance,
    count(*) over (partition by e.id) as maintenances_for_expense
  from public.maintenance_records m
  join public.expenses e
    on e.user_id = m.user_id
   and e.vehicle_id = m.vehicle_id
   and e.expense_date = m.service_date
   and e.amount = m.total_amount
   and e.category = 'Manutenção'
   and e.maintenance_record_id is null
   and e.created_at >= m.created_at
   and e.created_at <= m.created_at + interval '5 seconds'
   and e.description = case
     when nullif(m.note, '') is not null then m.note
     when nullif(m.workshop, '') is not null then 'Manutenção em ' || m.workshop
     else 'Manutenção'
   end
  where m.total_amount > 0
    and not exists (
      select 1 from public.expenses existing_link
      where existing_link.maintenance_record_id = m.id
    )
), unique_pairs as (
  select maintenance_record_id, expense_id
  from candidates
  where expenses_for_maintenance = 1 and maintenances_for_expense = 1
)
update public.expenses e
set maintenance_record_id = p.maintenance_record_id
from unique_pairs p
where e.id = p.expense_id
  and e.maintenance_record_id is null;
