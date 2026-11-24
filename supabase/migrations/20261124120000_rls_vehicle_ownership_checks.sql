-- ============================================================================
-- AutoCiclo — Isolamento entre usuários: o veículo referenciado tem de ser do
-- próprio usuário (auditoria RLS de 2026-11-24).
--
-- Problema: as policies de INSERT/UPDATE das tabelas filhas só exigiam
-- auth.uid() = user_id. Um usuário autenticado que soubesse o UUID de um
-- veículo de OUTRO usuário conseguia gravar linhas (gasto, km, abastecimento,
-- item de manutenção, documento, lembrete, anexo...) apontando para esse
-- veículo, e também mover linhas próprias para ele. Os dados do dono não
-- vazavam (SELECT continua por user_id), mas a integridade entre usuários
-- ficava furada, e a diferença entre "FK inválida" e "inserido" servia de
-- oráculo de existência de UUIDs de veículos.
--
-- Correção: WITH CHECK exige que o veículo (e, quando houver, o registro, o
-- documento ou o item referenciado) pertença ao próprio usuário. Só estrutura
-- de policies: nenhuma linha é alterada. Linhas já existentes continuam
-- legíveis; apenas novas gravações passam a ser validadas.
--
-- Também fecha o chamado de suporte: o cliente não define status nem nota do
-- administrador ao abrir um chamado.
--
-- Esta migração NÃO foi aplicada em nenhum banco real. Aplicar só com decisão
-- explícita do dono, depois de revisar o PR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER para não depender do RLS de leitura;
-- comparam sempre com auth.uid(), então um admin NÃO passa por "dono").
-- ---------------------------------------------------------------------------
create or replace function public.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_maintenance_record(p_record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maintenance_records r
    where r.id = p_record_id and r.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_vehicle_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicle_documents d
    where d.id = p_document_id and d.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_maintenance_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicle_maintenance_items i
    where i.id = p_item_id and i.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_vehicle(uuid) from public, anon;
revoke execute on function public.owns_maintenance_record(uuid) from public, anon;
revoke execute on function public.owns_vehicle_document(uuid) from public, anon;
revoke execute on function public.owns_maintenance_item(uuid) from public, anon;
grant execute on function public.owns_vehicle(uuid) to authenticated;
grant execute on function public.owns_maintenance_record(uuid) to authenticated;
grant execute on function public.owns_vehicle_document(uuid) to authenticated;
grant execute on function public.owns_maintenance_item(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mileage_records (sem UPDATE/DELETE por desenho)
-- ---------------------------------------------------------------------------
drop policy if exists "mileage insert" on public.mileage_records;
create policy "mileage insert" on public.mileage_records for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- vehicle_maintenance_items
-- ---------------------------------------------------------------------------
drop policy if exists "items insert" on public.vehicle_maintenance_items;
create policy "items insert" on public.vehicle_maintenance_items for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "items update" on public.vehicle_maintenance_items;
create policy "items update" on public.vehicle_maintenance_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- maintenance_records
-- ---------------------------------------------------------------------------
drop policy if exists "records insert" on public.maintenance_records;
create policy "records insert" on public.maintenance_records for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "records update" on public.maintenance_records;
create policy "records update" on public.maintenance_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- maintenance_record_items: registro e item do próprio usuário e do mesmo
-- veículo (antes só o registro era conferido).
-- ---------------------------------------------------------------------------
drop policy if exists "record items insert" on public.maintenance_record_items;
create policy "record items insert" on public.maintenance_record_items for insert
  with check (
    public.owns_maintenance_record(record_id)
    and public.owns_maintenance_item(maintenance_item_id)
    and (select r.vehicle_id from public.maintenance_records r where r.id = record_id)
      = (select i.vehicle_id from public.vehicle_maintenance_items i where i.id = maintenance_item_id)
  );

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
drop policy if exists "expenses insert" on public.expenses;
create policy "expenses insert" on public.expenses for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "expenses update" on public.expenses;
create policy "expenses update" on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- fuel_records
-- ---------------------------------------------------------------------------
drop policy if exists "fuel insert" on public.fuel_records;
create policy "fuel insert" on public.fuel_records for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "fuel update" on public.fuel_records;
create policy "fuel update" on public.fuel_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- vehicle_documents
-- ---------------------------------------------------------------------------
drop policy if exists "documents insert" on public.vehicle_documents;
create policy "documents insert" on public.vehicle_documents for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "documents update" on public.vehicle_documents;
create policy "documents update" on public.vehicle_documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- attachments: veículo próprio e, quando informados, registro e documento
-- próprios.
-- ---------------------------------------------------------------------------
drop policy if exists "attachments insert" on public.attachments;
create policy "attachments insert" on public.attachments for insert
  with check (
    auth.uid() = user_id
    and public.owns_vehicle(vehicle_id)
    and (record_id is null or public.owns_maintenance_record(record_id))
    and (document_id is null or public.owns_vehicle_document(document_id))
  );

-- ---------------------------------------------------------------------------
-- notifications (vehicle_id é opcional)
-- ---------------------------------------------------------------------------
drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications for insert
  with check (auth.uid() = user_id and (vehicle_id is null or public.owns_vehicle(vehicle_id)));
drop policy if exists "notifications update" on public.notifications;
create policy "notifications update" on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (vehicle_id is null or public.owns_vehicle(vehicle_id)));

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
drop policy if exists "reminders insert" on public.reminders;
create policy "reminders insert" on public.reminders for insert
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));
drop policy if exists "reminders update" on public.reminders;
create policy "reminders update" on public.reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owns_vehicle(vehicle_id));

-- ---------------------------------------------------------------------------
-- activity_logs (vehicle_id é opcional)
-- ---------------------------------------------------------------------------
drop policy if exists "activity insert" on public.activity_logs;
create policy "activity insert" on public.activity_logs for insert
  with check (auth.uid() = user_id and (vehicle_id is null or public.owns_vehicle(vehicle_id)));

-- ---------------------------------------------------------------------------
-- maintenance_interval_history: o item tem de ser do próprio usuário
-- ---------------------------------------------------------------------------
drop policy if exists "interval history insert own" on public.maintenance_interval_history;
create policy "interval history insert own" on public.maintenance_interval_history for insert
  with check (auth.uid() = user_id and public.owns_maintenance_item(item_id));

-- ---------------------------------------------------------------------------
-- support_tickets: o cliente abre o chamado como "Novo" e sem nota de admin.
-- ---------------------------------------------------------------------------
drop policy if exists "support insert own" on public.support_tickets;
create policy "support insert own" on public.support_tickets for insert
  with check (auth.uid() = user_id and status = 'Novo' and admin_note is null);
