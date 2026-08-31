-- ============================================================================
-- AutoCiclo — Papéis de acesso (cliente / admin)
-- Cria tabela de papéis, função is_admin() e autorização admin nas policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABELA DE PAPÉIS
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'cliente' check (role in ('cliente','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- ---------------------------------------------------------------------------
-- FUNÇÃO is_admin (security definer para evitar recursão de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.user_roles where user_id = auth.uid()), false);
$$;

-- Usuário lê apenas o próprio papel. Sem policies de insert/update/delete:
-- nenhum usuário comum consegue criar ou alterar papéis (anti auto-promoção).
create policy "user_roles select own" on public.user_roles for select using (
  auth.uid() = user_id or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- TRIGGER: cria papel padrão 'cliente' ao cadastrar usuário
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'cliente')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- AUTORIZAÇÃO ADMIN (leitura ampla) nas policies SELECT existentes
-- ---------------------------------------------------------------------------
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id or public.is_admin());

drop policy if exists "prefs select own" on public.user_preferences;
create policy "prefs select own" on public.user_preferences for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "vehicles select own" on public.vehicles;
create policy "vehicles select own" on public.vehicles for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "members select" on public.vehicle_members;
create policy "members select" on public.vehicle_members for select using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (select 1 from public.vehicles v where v.id = vehicle_members.vehicle_id and v.user_id = auth.uid())
);

drop policy if exists "mileage select" on public.mileage_records;
create policy "mileage select" on public.mileage_records for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "items select" on public.vehicle_maintenance_items;
create policy "items select" on public.vehicle_maintenance_items for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "records select" on public.maintenance_records;
create policy "records select" on public.maintenance_records for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "record items select" on public.maintenance_record_items;
create policy "record items select" on public.maintenance_record_items for select using (
  public.is_admin()
  or exists (select 1 from public.maintenance_records mr where mr.id = record_id and mr.user_id = auth.uid())
);

drop policy if exists "expenses select" on public.expenses;
create policy "expenses select" on public.expenses for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "fuel select" on public.fuel_records;
create policy "fuel select" on public.fuel_records for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "documents select" on public.vehicle_documents;
create policy "documents select" on public.vehicle_documents for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "attachments select" on public.attachments;
create policy "attachments select" on public.attachments for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications select" on public.notifications;
create policy "notifications select" on public.notifications for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reminders select" on public.reminders;
create policy "reminders select" on public.reminders for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "activity select" on public.activity_logs;
create policy "activity select" on public.activity_logs for select using (auth.uid() = user_id or public.is_admin());

-- Índice auxiliar
create index if not exists idx_user_roles_role on public.user_roles(role);
