-- PostgreSQL regression test, in an ephemeral CI database only.
-- Wraps fixtures and the backfill in a rollback. Never run against production.
begin;

insert into auth.users(id,email)
values ('98000000-0000-4000-8000-000000000001','fixture@example.invalid');

insert into public.vehicles(id,user_id,brand,model,year_model)
values (
 '98000000-0000-4000-8000-000000000002',
 '98000000-0000-4000-8000-000000000001',
 'Teste', 'Fixture', 2020
);

insert into public.maintenance_records
 (id,vehicle_id,user_id,service_date,mileage,total_amount,note,created_at)
values
 ('98000000-0000-4000-8000-000000000011','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','2026-11-04',100,180,'Troca de óleo','2026-11-04 10:00:00+00'),
 ('98000000-0000-4000-8000-000000000012','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','2026-11-04',100,190,'Lavagem','2026-11-04 10:10:00+00'),
 ('98000000-0000-4000-8000-000000000013','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','2026-11-04',100,200,'Alinhamento','2026-11-04 10:20:00+00'),
 ('98000000-0000-4000-8000-000000000014','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','2026-11-04',100,210,'Oficina','2026-11-04 10:30:00+00');

insert into public.expenses
 (id,vehicle_id,user_id,category,description,amount,expense_date,created_at)
values
 ('98000000-0000-4000-8000-000000000021','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Manutenção','Troca de óleo',180,'2026-11-04','2026-11-04 10:00:02+00'),
 ('98000000-0000-4000-8000-000000000022','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Manutenção','Gasto independente',190,'2026-11-04','2026-11-04 10:10:01+00'),
 ('98000000-0000-4000-8000-000000000023','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Manutenção','Alinhamento',200,'2026-11-04','2026-11-04 10:20:01+00'),
 ('98000000-0000-4000-8000-000000000024','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Manutenção','Alinhamento',200,'2026-11-04','2026-11-04 10:20:02+00'),
 ('98000000-0000-4000-8000-000000000025','98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001','Manutenção','Oficina',210,'2026-11-04','2026-11-04 10:30:10+00');

-- An expense may not link to another vehicle's maintenance, even for the same user.
insert into public.vehicles(id,user_id,brand,model,year_model)
values ('98000000-0000-4000-8000-000000000003',
        '98000000-0000-4000-8000-000000000001', 'Outro', 'Carro', 2021);

do $
begin
  begin
    insert into public.expenses
      (id,vehicle_id,user_id,category,description,amount,expense_date,maintenance_record_id)
    values
      ('98000000-0000-4000-8000-000000000030',
       '98000000-0000-4000-8000-000000000003',
       '98000000-0000-4000-8000-000000000001',
       'Manutenção', 'vínculo inválido', 180, '2026-11-04',
       '98000000-0000-4000-8000-000000000011');
    raise exception 'Cross-vehicle maintenance reference should have been rejected';
  exception when foreign_key_violation then
    null;
  end;
end $;

\i supabase/migrations/20261104120000_backfill_unambiguous_maintenance_expenses.sql

do $$
begin
 if (select maintenance_record_id from public.expenses where id='98000000-0000-4000-8000-000000000021')
     is distinct from '98000000-0000-4000-8000-000000000011'::uuid then
   raise exception 'Strict one-to-one pair was not linked';
 end if;
 if exists (
   select 1 from public.expenses
   where id in (
     '98000000-0000-4000-8000-000000000022',
     '98000000-0000-4000-8000-000000000023',
     '98000000-0000-4000-8000-000000000024',
     '98000000-0000-4000-8000-000000000025'
   ) and maintenance_record_id is not null
 ) then
   raise exception 'Independent, ambiguous or out-of-window expense was linked';
 end if;
 if (select count(*) from public.activity_logs
     where user_id='98000000-0000-4000-8000-000000000001'
       and action='maintenance_expense_reconciled') <> 1 then
   raise exception 'Expected exactly one audited historical reconciliation';
 end if;
end $$;

rollback;
