-- Teste de isolamento entre usuários (RLS) em Postgres descartável.
-- Pré-requisitos (feitos pelo workflow rls-isolation.yml): stubs de auth/storage
-- com auth.uid() lendo request.jwt.claim.sub, papéis anon/authenticated e
-- migrações aplicadas. Dados 100% fictícios; tudo termina em ROLLBACK.
\set ON_ERROR_STOP on
begin;

create function pg_temp.act_as(p_uid uuid, p_role text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
  execute format('set local role %I', p_role);
end $$;

-- Deve ser NEGADO: erro 42501 (RLS) ou nenhuma linha afetada.
create function pg_temp.deny(p_label text, p_uid uuid, p_sql text, p_role text default 'authenticated') returns void language plpgsql as $$
declare n bigint := 0; allowed boolean := false;
begin
  perform pg_temp.act_as(p_uid, p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    allowed := n > 0;
  exception when insufficient_privilege then
    allowed := false;
  end;
  reset role;
  if allowed then raise exception 'FALHOU (deveria negar): %', p_label; end if;
  raise notice 'ok negado: %', p_label;
end $$;

-- Deve ser PERMITIDO com ao menos 1 linha afetada.
create function pg_temp.allow(p_label text, p_uid uuid, p_sql text) returns void language plpgsql as $$
declare n bigint := 0;
begin
  perform pg_temp.act_as(p_uid);
  execute p_sql;
  get diagnostics n = row_count;
  reset role;
  if n < 1 then raise exception 'FALHOU (deveria permitir): %', p_label; end if;
  raise notice 'ok permitido: %', p_label;
end $$;

-- Deve devolver exatamente N linhas numa consulta.
create function pg_temp.rows_seen(p_label text, p_uid uuid, p_sql text, p_expected bigint) returns void language plpgsql as $$
declare n bigint;
begin
  perform pg_temp.act_as(p_uid);
  execute 'select count(*) from (' || p_sql || ') q' into n;
  reset role;
  if n <> p_expected then raise exception 'FALHOU %: esperado % linhas, veio %', p_label, p_expected, n; end if;
  raise notice 'ok leitura (% linhas): %', n, p_label;
end $$;

-- Usuários: A e B (clientes), ADM (admin sem troca pendente).
insert into auth.users(id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.test', '{}'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.test', '{}'),
  ('cccccccc-0000-0000-0000-0000000000cc', 'adm@example.test', '{}');
update public.user_roles set role = 'admin' where user_id = 'cccccccc-0000-0000-0000-0000000000cc';

insert into public.vehicles(id, user_id, brand, model, year_model) values
  ('a0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', 'X', 'A', 2020),
  ('b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Y', 'B', 2021);
insert into public.vehicle_maintenance_items(id, vehicle_id, user_id, name, category) values
  ('a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', 'item A', 'Motor'),
  ('b0000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', 'item B', 'Motor');
insert into public.maintenance_records(id, vehicle_id, user_id, service_date, mileage) values
  ('a0000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', current_date, 1),
  ('b0000000-0000-0000-0000-0000000000c1', 'b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', current_date, 1);
insert into public.expenses(id, vehicle_id, user_id, category, description, amount, expense_date) values
  ('b0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', 'c', 'gasto de B', 10, current_date);

-- ---------------------------------------------------------------- leitura
select pg_temp.rows_seen('A não lê veículos de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$select 1 from public.vehicles where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'$q$, 0);
select pg_temp.rows_seen('A não lê gastos de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$select 1 from public.expenses where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'$q$, 0);
select pg_temp.rows_seen('A não lê perfil de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$select 1 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-00000000000b'$q$, 0);
select pg_temp.rows_seen('A não lê papéis de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$select 1 from public.user_roles where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'$q$, 0);
select pg_temp.rows_seen('anônimo não lê veículos', null, $q$select 1 from public.vehicles$q$, 0);
select pg_temp.rows_seen('admin lê gastos de todos', 'cccccccc-0000-0000-0000-0000000000cc', $q$select 1 from public.expenses$q$, 1);

-- ---------------------------------------------------------------- escrita cruzada (corrigida em 20261124120000)
select pg_temp.deny('A grava gasto em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.expenses(vehicle_id,user_id,category,description,amount,expense_date) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a','c','x',1,current_date)$q$);
select pg_temp.deny('A grava km em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.mileage_records(vehicle_id,user_id,mileage,previous_mileage) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a',9,1)$q$);
select pg_temp.deny('A grava abastecimento em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.fuel_records(vehicle_id,user_id,fuel_date,mileage,liters,total_cost,price_per_liter,fuel_type) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a',current_date,1,1,1,1,'Flex')$q$);
select pg_temp.deny('A grava item de manutenção em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.vehicle_maintenance_items(vehicle_id,user_id,name,category) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a','x','x')$q$);
select pg_temp.deny('A grava registro de manutenção em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_records(vehicle_id,user_id,service_date,mileage) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a',current_date,1)$q$);
select pg_temp.deny('A grava documento em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.vehicle_documents(vehicle_id,user_id,name,category) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a','x','x')$q$);
select pg_temp.deny('A grava lembrete em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.reminders(vehicle_id,user_id,name,due_date) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a','x',current_date)$q$);
select pg_temp.deny('A grava anexo em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.attachments(vehicle_id,user_id,file_url,file_name) values('b0000000-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-00000000000a','u','n')$q$);
select pg_temp.deny('A grava notificação para veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.notifications(user_id,vehicle_id,type,title) values('aaaaaaaa-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-0000000000b1','t','x')$q$);
select pg_temp.deny('A grava log de atividade em veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.activity_logs(user_id,vehicle_id,action) values('aaaaaaaa-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-0000000000b1','x')$q$);
select pg_temp.deny('A liga registro próprio a item de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_record_items(record_id,maintenance_item_id) values('a0000000-0000-0000-0000-0000000000c1','b0000000-0000-0000-0000-0000000000d1')$q$);
select pg_temp.deny('A grava histórico de intervalo em item de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_interval_history(item_id,user_id) values('b0000000-0000-0000-0000-0000000000d1','aaaaaaaa-0000-0000-0000-00000000000a')$q$);
select pg_temp.deny('A grava gasto em nome de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.expenses(vehicle_id,user_id,category,description,amount,expense_date) values('a0000000-0000-0000-0000-0000000000a1','bbbbbbbb-0000-0000-0000-00000000000b','c','x',1,current_date)$q$);

-- Atualizações: mover linha própria para veículo alheio, tomar linha alheia.
select pg_temp.allow('A cria gasto próprio (base do teste de movimentação)', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.expenses(id,vehicle_id,user_id,category,description,amount,expense_date) values('a0000000-0000-0000-0000-0000000000e1','a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a','c','meu',1,current_date)$q$);
select pg_temp.deny('A move gasto próprio para veículo de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.expenses set vehicle_id='b0000000-0000-0000-0000-0000000000b1' where id='a0000000-0000-0000-0000-0000000000e1'$q$);
select pg_temp.deny('A altera gasto de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.expenses set amount=0 where id='b0000000-0000-0000-0000-0000000000e1'$q$);
select pg_temp.deny('A passa gasto próprio para o user_id de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.expenses set user_id='bbbbbbbb-0000-0000-0000-00000000000b' where id='a0000000-0000-0000-0000-0000000000e1'$q$);
select pg_temp.deny('A apaga gasto de B', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$delete from public.expenses where id='b0000000-0000-0000-0000-0000000000e1'$q$);

-- ---------------------------------------------------------------- papéis e administração
select pg_temp.deny('A se promove a admin (update)', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.user_roles set role='admin' where user_id='aaaaaaaa-0000-0000-0000-00000000000a'$q$);
select pg_temp.deny('A se promove a admin (insert/upsert)', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.user_roles(user_id,role) values('aaaaaaaa-0000-0000-0000-00000000000a','admin') on conflict (user_id) do update set role='admin'$q$);
select pg_temp.deny('A limpa a própria troca obrigatória', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.user_roles set must_change_password=false where user_id='aaaaaaaa-0000-0000-0000-00000000000a'$q$);
select pg_temp.deny('A altera catálogo global', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_catalog(slug,name,category) values('zz','zz','zz')$q$);
select pg_temp.deny('A atualiza catálogo global', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.maintenance_catalog set name='zz'$q$);
select pg_temp.deny('A apaga catálogo global', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$delete from public.maintenance_catalog$q$);
select pg_temp.deny('A abre chamado já Resolvido com nota de admin', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.support_tickets(user_id,name,email,category,subject,message,status,admin_note) values('aaaaaaaa-0000-0000-0000-00000000000a','n','e','c','s','m','Resolvido','nota')$q$);
select pg_temp.allow('A abre chamado normal', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.support_tickets(user_id,name,email,category,subject,message) values('aaaaaaaa-0000-0000-0000-00000000000a','n','e','c','s','m')$q$);
select pg_temp.deny('A muda o status do próprio chamado', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.support_tickets set status='Resolvido'$q$);
select pg_temp.allow('admin atualiza chamado', 'cccccccc-0000-0000-0000-0000000000cc', $q$update public.support_tickets set status='Em atendimento'$q$);

-- Admin com troca de senha pendente perde o acesso administrativo no banco.
update public.user_roles set must_change_password = true where user_id = 'cccccccc-0000-0000-0000-0000000000cc';
select pg_temp.rows_seen('admin com troca pendente não lê gastos de terceiros', 'cccccccc-0000-0000-0000-0000000000cc', $q$select 1 from public.expenses$q$, 0);
update public.user_roles set must_change_password = false where user_id = 'cccccccc-0000-0000-0000-0000000000cc';

-- ---------------------------------------------------------------- funções
select pg_temp.deny('anônimo chama delete_current_user', null, $q$select public.delete_current_user()$q$, 'anon');
select pg_temp.deny('anônimo chama export_user_data_snapshot', null, $q$select public.export_user_data_snapshot()$q$, 'anon');
select pg_temp.deny('anônimo chama register_maintenance_with_expense', null, $q$select public.register_maintenance_with_expense('b0000000-0000-0000-0000-0000000000b1', current_date, 1, 1)$q$, 'anon');
select pg_temp.deny('anônimo chama owns_vehicle', null, $q$select public.owns_vehicle('b0000000-0000-0000-0000-0000000000b1')$q$, 'anon');
select pg_temp.deny('autenticado chama handle_new_user', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$select public.handle_new_user()$q$);
do $$ begin
  if to_regprocedure('public.generate_demo_data()') is not null then raise exception 'FALHOU: generate_demo_data ainda existe'; end if;
end $$;
do $$ begin
  perform pg_temp.act_as('aaaaaaaa-0000-0000-0000-00000000000a');
  begin
    perform public.register_maintenance_with_expense('b0000000-0000-0000-0000-0000000000b1', current_date, 1, 1);
    reset role; raise exception 'FALHOU: A registrou manutenção em veículo de B via RPC';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    reset role; raise notice 'ok negado: RPC register_maintenance em veículo de B';
  end;
end $$;

-- ---------------------------------------------------------------- fluxos legítimos continuam funcionando
select pg_temp.allow('A grava km no próprio veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.mileage_records(vehicle_id,user_id,mileage,previous_mileage) values('a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a',10,1)$q$);
select pg_temp.allow('A grava abastecimento no próprio veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.fuel_records(vehicle_id,user_id,fuel_date,mileage,liters,total_cost,price_per_liter,fuel_type) values('a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a',current_date,1,1,1,1,'Flex')$q$);
select pg_temp.allow('A grava item no próprio veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.vehicle_maintenance_items(vehicle_id,user_id,name,category) values('a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a','y','y')$q$);
select pg_temp.allow('A atualiza item próprio', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.vehicle_maintenance_items set notes='ok' where user_id='aaaaaaaa-0000-0000-0000-00000000000a'$q$);
select pg_temp.allow('A atualiza gasto próprio', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$update public.expenses set amount=2 where id='a0000000-0000-0000-0000-0000000000e1'$q$);
select pg_temp.allow('A grava documento no próprio veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.vehicle_documents(id,vehicle_id,user_id,name,category) values('a0000000-0000-0000-0000-0000000000f1','a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a','d','x')$q$);
select pg_temp.allow('A grava anexo (registro e documento próprios)', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.attachments(vehicle_id,user_id,record_id,document_id,file_url,file_name) values('a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-0000000000c1','a0000000-0000-0000-0000-0000000000f1','u','n')$q$);
select pg_temp.allow('A grava lembrete no próprio veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.reminders(vehicle_id,user_id,name,due_date) values('a0000000-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-00000000000a','r',current_date)$q$);
select pg_temp.allow('A grava notificação sem veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.notifications(user_id,type,title) values('aaaaaaaa-0000-0000-0000-00000000000a','t','x')$q$);
select pg_temp.allow('A grava log de atividade', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.activity_logs(user_id,vehicle_id,action) values('aaaaaaaa-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-0000000000a1','x')$q$);
select pg_temp.allow('A liga registro próprio a item próprio do mesmo veículo', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_record_items(record_id,maintenance_item_id) values('a0000000-0000-0000-0000-0000000000c1','a0000000-0000-0000-0000-0000000000d1')$q$);
select pg_temp.allow('A grava histórico de intervalo em item próprio', 'aaaaaaaa-0000-0000-0000-00000000000a', $q$insert into public.maintenance_interval_history(item_id,user_id) values('a0000000-0000-0000-0000-0000000000d1','aaaaaaaa-0000-0000-0000-00000000000a')$q$);
do $$ declare r json; begin
  perform pg_temp.act_as('aaaaaaaa-0000-0000-0000-00000000000a');
  r := public.register_maintenance_with_expense('a0000000-0000-0000-0000-0000000000a1', current_date, 5, 100, 'Oficina', 'troca');
  reset role;
  if r is null then raise exception 'FALHOU: RPC register_maintenance no próprio veículo'; end if;
  raise notice 'ok permitido: RPC register_maintenance no próprio veículo';
end $$;

rollback;
\echo 'Isolamento entre usuários: todos os cenários passaram.'
