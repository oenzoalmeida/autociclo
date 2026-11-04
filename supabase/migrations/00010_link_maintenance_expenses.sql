-- Optional explicit association for new maintenance expense entries.
-- Does not guess or backfill historic records, where similarity is ambiguous.
alter table public.expenses
  add column if not exists maintenance_record_id uuid;

create unique index if not exists maintenance_records_id_user_unique
  on public.maintenance_records(id, user_id);

alter table public.expenses
  add constraint expenses_maintenance_owner_fk
  foreign key (maintenance_record_id, user_id)
  references public.maintenance_records(id, user_id)
  on delete set null (maintenance_record_id);

create unique index if not exists expenses_maintenance_unique_link
  on public.expenses(maintenance_record_id)
  where maintenance_record_id is not null;
