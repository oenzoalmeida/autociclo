-- ============================================================================
-- AutoCiclo — Prontuário digital do carro
-- Schema PostgreSQL + RLS + Storage + Seed demo
-- Execute este script inteiro no Supabase SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------------

-- Perfis de usuário (espelha auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  avatar_url  text,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Veículos
create table if not exists public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  brand            text not null,
  model            text not null,
  version          text,
  year_fab         integer,
  year_model       integer not null,
  current_mileage  numeric(12,1) not null default 0,
  fuel_type        text,
  transmission     text,
  color            text,
  plate            text,
  nickname         text,
  photo_url        text,
  monthly_usage    text,
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Membros da garagem (futuro compartilhamento)
create table if not exists public.vehicle_members (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner', -- owner | editor | viewer
  created_at  timestamptz not null default now(),
  unique (vehicle_id, user_id)
);

-- Registros de quilometragem
create table if not exists public.mileage_records (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  mileage          numeric(12,1) not null,
  previous_mileage numeric(12,1) not null,
  correction       boolean not null default false,
  note             text,
  recorded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- Catálogo padrão de manutenções
create table if not exists public.maintenance_catalog (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  category       text not null,
  description    text,
  default_km     integer,
  default_months integer,
  is_custom      boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Itens de manutenção por veículo
create table if not exists public.vehicle_maintenance_items (
  id                uuid primary key default gen_random_uuid(),
  vehicle_id        uuid not null references public.vehicles(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  catalog_id        uuid references public.maintenance_catalog(id) on delete set null,
  custom_name       text,
  name              text not null,
  category          text not null,
  last_done_date    date,
  last_done_mileage numeric(12,1),
  interval_km       integer,
  interval_months   integer,
  manual_interval   boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Registros de manutenção (visita à oficina)
create table if not exists public.maintenance_records (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  service_date date not null,
  mileage      numeric(12,1) not null,
  total_amount numeric(12,2) not null default 0,
  workshop     text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Itens executados em cada registro de manutenção
create table if not exists public.maintenance_record_items (
  id                   uuid primary key default gen_random_uuid(),
  record_id            uuid not null references public.maintenance_records(id) on delete cascade,
  maintenance_item_id  uuid not null references public.vehicle_maintenance_items(id) on delete cascade,
  amount               numeric(12,2),
  created_at           timestamptz not null default now()
);

-- Gastos avulsos
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  description  text not null,
  amount       numeric(12,2) not null,
  expense_date date not null,
  mileage      numeric(12,1),
  created_at   timestamptz not null default now()
);

-- Abastecimentos
create table if not exists public.fuel_records (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references public.vehicles(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  fuel_date        date not null,
  mileage          numeric(12,1) not null,
  liters           numeric(10,2) not null,
  total_cost       numeric(12,2) not null,
  price_per_liter  numeric(10,2) not null,
  fuel_type        text not null,
  station          text,
  full_tank        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Documentos do veículo
create table if not exists public.vehicle_documents (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null,
  due_date    date,
  amount      numeric(12,2),
  note        text,
  file_url    text,
  created_at  timestamptz not null default now()
);

-- Anexos (notas, recibos, fotos)
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  record_id    uuid references public.maintenance_records(id) on delete cascade,
  document_id  uuid references public.vehicle_documents(id) on delete cascade,
  file_url     text not null,
  file_name    text not null,
  category     text not null default 'outros',
  created_at   timestamptz not null default now()
);

-- Alertas / notificações internas
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  vehicle_id  uuid references public.vehicles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  severity    text not null default 'info', -- info | warning | danger
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Documentos e compromissos com vencimento
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  due_date    date not null,
  amount      numeric(12,2),
  note        text,
  file_url    text,
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Preferências do usuário
create table if not exists public.user_preferences (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  theme          text not null default 'system',
  currency       text not null default 'BRL',
  distance_unit  text not null default 'km',
  updated_at     timestamptz not null default now()
);

-- Log de atividades
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  vehicle_id  uuid references public.vehicles(id) on delete cascade,
  action      text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TRIGGERS / AUTOMAÇÃO
-- ---------------------------------------------------------------------------

-- Criar perfil ao cadastrar usuário
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atualizar updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.vehicles for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_maintenance_items for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.maintenance_records for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.user_preferences for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.vehicles                 enable row level security;
alter table public.vehicle_members          enable row level security;
alter table public.mileage_records          enable row level security;
alter table public.maintenance_catalog      enable row level security;
alter table public.vehicle_maintenance_items enable row level security;
alter table public.maintenance_records      enable row level security;
alter table public.maintenance_record_items enable row level security;
alter table public.expenses                 enable row level security;
alter table public.fuel_records             enable row level security;
alter table public.vehicle_documents        enable row level security;
alter table public.attachments              enable row level security;
alter table public.notifications            enable row level security;
alter table public.reminders                enable row level security;
alter table public.user_preferences         enable row level security;
alter table public.activity_logs            enable row level security;

-- profiles: apenas o próprio usuário
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- user_preferences
create policy "prefs select own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "prefs insert own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "prefs update own" on public.user_preferences for update using (auth.uid() = user_id);

-- vehicles: proprietário (ou membro) gerencia
create policy "vehicles select own" on public.vehicles for select using (
  auth.uid() = user_id or exists (
    select 1 from public.vehicle_members vm where vm.vehicle_id = vehicles.id and vm.user_id = auth.uid()
  )
);
create policy "vehicles insert own" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "vehicles update owner" on public.vehicles for update using (
  auth.uid() = user_id or exists (
    select 1 from public.vehicle_members vm where vm.vehicle_id = vehicles.id and vm.user_id = auth.uid() and vm.role in ('owner','editor')
  )
);
create policy "vehicles delete owner" on public.vehicles for delete using (auth.uid() = user_id);

-- vehicle_members
create policy "members select" on public.vehicle_members for select using (
  auth.uid() = user_id or exists (
    select 1 from public.vehicles v where v.id = vehicle_members.vehicle_id and v.user_id = auth.uid()
  )
);
create policy "members insert owner" on public.vehicle_members for insert with check (
  exists (select 1 from public.vehicles v where v.id = vehicle_members.vehicle_id and v.user_id = auth.uid())
);
create policy "members delete owner" on public.vehicle_members for delete using (
  exists (select 1 from public.vehicles v where v.id = vehicle_members.vehicle_id and v.user_id = auth.uid())
);

-- maintenance_catalog: leitura para todos autenticados (é base de conhecimento)
create policy "catalog read" on public.maintenance_catalog for select using (auth.role() = 'authenticated');
create policy "catalog insert" on public.maintenance_catalog for insert with check (auth.uid() is not null and is_custom = false);

-- Demais tabelas de dados do veículo: apenas dono/membros
create or replace function public.is_vehicle_member(vehicle_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id
      and (v.user_id = auth.uid()
           or exists (select 1 from public.vehicle_members vm where vm.vehicle_id = v.id and vm.user_id = auth.uid()))
  );
$$;

create policy "mileage select" on public.mileage_records for select using (auth.uid() = user_id);
create policy "mileage insert" on public.mileage_records for insert with check (auth.uid() = user_id);

create policy "items select" on public.vehicle_maintenance_items for select using (auth.uid() = user_id);
create policy "items insert" on public.vehicle_maintenance_items for insert with check (auth.uid() = user_id);
create policy "items update" on public.vehicle_maintenance_items for update using (auth.uid() = user_id);
create policy "items delete" on public.vehicle_maintenance_items for delete using (auth.uid() = user_id);

create policy "records select" on public.maintenance_records for select using (auth.uid() = user_id);
create policy "records insert" on public.maintenance_records for insert with check (auth.uid() = user_id);
create policy "records update" on public.maintenance_records for update using (auth.uid() = user_id);
create policy "records delete" on public.maintenance_records for delete using (auth.uid() = user_id);

create policy "record items select" on public.maintenance_record_items for select using (
  exists (select 1 from public.maintenance_records mr where mr.id = record_id and mr.user_id = auth.uid())
);
create policy "record items insert" on public.maintenance_record_items for insert with check (
  exists (select 1 from public.maintenance_records mr where mr.id = record_id and mr.user_id = auth.uid())
);
create policy "record items delete" on public.maintenance_record_items for delete using (
  exists (select 1 from public.maintenance_records mr where mr.id = record_id and mr.user_id = auth.uid())
);

create policy "expenses select" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses insert" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses update" on public.expenses for update using (auth.uid() = user_id);
create policy "expenses delete" on public.expenses for delete using (auth.uid() = user_id);

create policy "fuel select" on public.fuel_records for select using (auth.uid() = user_id);
create policy "fuel insert" on public.fuel_records for insert with check (auth.uid() = user_id);
create policy "fuel update" on public.fuel_records for update using (auth.uid() = user_id);
create policy "fuel delete" on public.fuel_records for delete using (auth.uid() = user_id);

create policy "documents select" on public.vehicle_documents for select using (auth.uid() = user_id);
create policy "documents insert" on public.vehicle_documents for insert with check (auth.uid() = user_id);
create policy "documents update" on public.vehicle_documents for update using (auth.uid() = user_id);
create policy "documents delete" on public.vehicle_documents for delete using (auth.uid() = user_id);

create policy "attachments select" on public.attachments for select using (auth.uid() = user_id);
create policy "attachments insert" on public.attachments for insert with check (auth.uid() = user_id);
create policy "attachments delete" on public.attachments for delete using (auth.uid() = user_id);

create policy "notifications select" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications insert" on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications delete" on public.notifications for delete using (auth.uid() = user_id);

create policy "reminders select" on public.reminders for select using (auth.uid() = user_id);
create policy "reminders insert" on public.reminders for insert with check (auth.uid() = user_id);
create policy "reminders update" on public.reminders for update using (auth.uid() = user_id);
create policy "reminders delete" on public.reminders for delete using (auth.uid() = user_id);

create policy "activity select" on public.activity_logs for select using (auth.uid() = user_id);
create policy "activity insert" on public.activity_logs for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------
create index if not exists idx_vehicles_user on public.vehicles(user_id);
create index if not exists idx_mileage_vehicle on public.mileage_records(vehicle_id, recorded_at desc);
create index if not exists idx_items_vehicle on public.vehicle_maintenance_items(vehicle_id);
create index if not exists idx_records_vehicle on public.maintenance_records(vehicle_id, service_date desc);
create index if not exists idx_record_items_record on public.maintenance_record_items(record_id);
create index if not exists idx_record_items_item on public.maintenance_record_items(maintenance_item_id);
create index if not exists idx_expenses_vehicle on public.expenses(vehicle_id, expense_date desc);
create index if not exists idx_fuel_vehicle on public.fuel_records(vehicle_id, fuel_date desc);
create index if not exists idx_documents_vehicle on public.vehicle_documents(vehicle_id);
create index if not exists idx_attachments_vehicle on public.attachments(vehicle_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read);
create index if not exists idx_reminders_vehicle on public.reminders(vehicle_id);
create index if not exists idx_activity_user on public.activity_logs(user_id, created_at desc);
create index if not exists idx_members_vehicle on public.vehicle_members(vehicle_id);

-- ---------------------------------------------------------------------------
-- STORAGE (buckets privados)
-- Executado de forma condicional: em um projeto recém-criado o schema
-- `storage` pode ainda não estar provisionado quando este script roda.
-- ---------------------------------------------------------------------------
do $$
declare
  has_buckets boolean;
  has_objects boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) into has_buckets;
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) into has_objects;

  if has_buckets then
    insert into storage.buckets (id, name, public)
    values ('vehicle-files', 'vehicle-files', false)
    on conflict (id) do nothing;
  end if;

  if has_objects then
    execute $policy$create policy "vehicle files select" on storage.objects for select using (bucket_id = 'vehicle-files' and auth.uid() = owner)$policy$;
    execute $policy$create policy "vehicle files insert" on storage.objects for insert with check (bucket_id = 'vehicle-files' and auth.uid() = owner)$policy$;
    execute $policy$create policy "vehicle files update" on storage.objects for update using (bucket_id = 'vehicle-files' and auth.uid() = owner)$policy$;
    execute $policy$create policy "vehicle files delete" on storage.objects for delete using (bucket_id = 'vehicle-files' and auth.uid() = owner)$policy$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE MANUTENÇÕES (valores = ESTIMATIVA GERAL)
-- ---------------------------------------------------------------------------
insert into public.maintenance_catalog (slug, name, category, description, default_km, default_months, sort_order) values
  ('oleo-motor', 'Óleo do motor', 'Motor', 'Lubrifica as peças internas do motor e reduz o atrito. A troca periódica prolonga a vida do motor.', 10000, 12, 10),
  ('filtro-oleo', 'Filtro de óleo', 'Motor', 'Retém impurezas e partículas que se acumulam no óleo do motor.', 10000, 12, 11),
  ('filtro-ar', 'Filtro de ar', 'Motor', 'Filtra o ar que entra no motor, evitando que sujeira danifique as peças internas.', 15000, 12, 12),
  ('filtro-combustivel', 'Filtro de combustível', 'Motor', 'Remove impurezas do combustível antes que cheguem ao motor.', 30000, 24, 13),
  ('filtro-arcondicionado', 'Filtro do ar-condicionado', 'Conforto', 'Filtra o ar que entra na cabine, deixando o interior mais limpo e sem odores.', 15000, 12, 14),
  ('fluido-freio', 'Fluido de freio', 'Freios', 'Ajuda a transmitir a força aplicada no pedal para o sistema de frenagem.', 20000, 24, 20),
  ('pastilhas-freio', 'Pastilhas de freio', 'Freios', 'Fazem pressão nos discos para parar o veículo. Devem ser verificadas com frequência.', 35000, 24, 21),
  ('discos-freio', 'Discos de freio', 'Freios', 'Superfície onde as pastilhas fazem contato para frear o carro.', 60000, 48, 22),
  ('pneus', 'Pneus', 'Rodagem', 'Garantem aderência e segurança na estrada. Verifique a profundidade dos sulcos.', 50000, 48, 30),
  ('rodizio-pneus', 'Rodízio dos pneus', 'Rodagem', 'Alterna a posição dos pneus para que se desgastem de forma uniforme.', 10000, 12, 31),
  ('alinhamento', 'Alinhamento', 'Rodagem', 'Ajusta o ângulo das rodas para que o carro ande reto e os pneus durem mais.', 10000, 12, 32),
  ('balanceamento', 'Balanceamento', 'Rodagem', 'Equilibra o peso do conjunto roda e pneu para evitar vibração ao dirigir.', 10000, 12, 33),
  ('correia-dentada', 'Correia dentada', 'Motor', 'Sincroniza o funcionamento do motor. A troca no prazo evita danos caros.', 60000, 60, 40),
  ('correia-acessorios', 'Correia de acessórios', 'Motor', 'Movimenta acessórios como direção, alternador e ar-condicionado.', 50000, 48, 41),
  ('velas', 'Velas', 'Motor', 'Geram a faísca que queima o combustível no motor. Influenciam o consumo.', 30000, 24, 42),
  ('bateria', 'Bateria', 'Elétrica', 'Fornece energia para dar partida e alimentar os sistemas elétricos.', 40000, 36, 50),
  ('liquido-arrefecimento', 'Líquido de arrefecimento', 'Motor', 'Controla a temperatura do motor, evitando superaquecimento.', 30000, 24, 51),
  ('oleo-transmissao', 'Óleo da transmissão', 'Transmissão', 'Lubrifica as engrenagens do câmbio, garantindo trocas suaves.', 40000, 36, 52),
  ('suspensao', 'Suspensão', 'Suspensão', 'Amortece impactos e mantém os pneus em contato com a estrada.', 50000, 48, 60),
  ('palhetas-limpador', 'Palhetas do limpador', 'Conforto', 'Mantêm o para-brisa limpo e garantem boa visibilidade na chuva.', 15000, 12, 61)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- FUNÇÃO DE DADOS DEMO (apenas desenvolvimento)
-- Cria um usuário demo com histórico completo. Executar uma única vez.
-- ---------------------------------------------------------------------------
create or replace function public.generate_demo_data()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  d_user uuid;
  v_veh uuid;
  v_oleo uuid;
  v_foleo uuid;
  v_far uuid;
  v_rod uuid;
  v_rec uuid;
begin
  -- Ignora usuário já cadastrado
  select id into d_user from auth.users where email = 'demo@autociclo.app';
  if d_user is null then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'demo@autociclo.app', crypt('Demo#1234', gen_salt('bf')),
       now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"João Martins"}'::jsonb, now(), now())
    returning id into d_user;
  end if;

  update public.profiles set name = 'João Martins', email = 'demo@autociclo.app', onboarded = true where id = d_user;

  -- Veículo
  select id into v_veh from public.vehicles where user_id = d_user limit 1;
  if v_veh is null then
    insert into public.vehicles (user_id, brand, model, version, year_fab, year_model, current_mileage, fuel_type, transmission, color, plate, nickname, monthly_usage)
    values (d_user, 'Chevrolet', 'Onix', 'LT 1.0', 2023, 2023, 38450, 'Gasolina', 'Manual', 'Preto', 'ABC1D23', 'Onix', '1000-2000')
    returning id into v_veh;
  else
    update public.vehicles set current_mileage = 38450 where id = v_veh;
  end if;

  -- Itens de manutenção
  insert into public.vehicle_maintenance_items (vehicle_id, user_id, catalog_id, name, category, last_done_date, last_done_mileage, interval_km, interval_months)
  select v_veh, d_user, mc.id, mc.name, mc.category, '2026-03-10', 31850, mc.default_km, mc.default_months
  from public.maintenance_catalog mc where mc.slug = 'oleo-motor'
  on conflict do nothing;
  insert into public.vehicle_maintenance_items (vehicle_id, user_id, catalog_id, name, category, last_done_date, last_done_mileage, interval_km, interval_months)
  select v_veh, d_user, mc.id, mc.name, mc.category, '2026-06-20', 35720, mc.default_km, mc.default_months
  from public.maintenance_catalog mc where mc.slug in ('rodizio-pneus','alinhamento','balanceamento')
  on conflict do nothing;

  select id into v_oleo from public.vehicle_maintenance_items where vehicle_id = v_veh and name = 'Óleo do motor';
  select id into v_foleo from public.vehicle_maintenance_items where vehicle_id = v_veh and name = 'Filtro de óleo';
  select id into v_far from public.vehicle_maintenance_items where vehicle_id = v_veh and name = 'Filtro de ar';
  select id into v_rod from public.vehicle_maintenance_items where vehicle_id = v_veh and name = 'Rodízio dos pneus';

  -- Registros de manutenção
  insert into public.maintenance_records (id, vehicle_id, user_id, service_date, mileage, total_amount, workshop)
  values (gen_random_uuid(), v_veh, d_user, '2026-08-30', 38450, 420.00, 'Auto Center Silva')
  returning id into v_rec;

  insert into public.maintenance_records (vehicle_id, user_id, service_date, mileage, total_amount, workshop) values
    (v_veh, d_user, '2026-06-20', 35720, 180.00, 'Pneu Center'),
    (v_veh, d_user, '2026-03-03', 31850, 490.00, 'Freios Perfeitos');

  -- Abastecimentos
  insert into public.fuel_records (vehicle_id, user_id, fuel_date, mileage, liters, total_cost, price_per_liter, fuel_type, station, full_tank) values
    (v_veh, d_user, '2026-08-20', 37950, 42.0, 250.00, 5.95, 'Gasolina', 'Posto Shell', true),
    (v_veh, d_user, '2026-08-05', 36900, 40.0, 238.00, 5.95, 'Gasolina', 'Posto Ipiranga', true),
    (v_veh, d_user, '2026-07-20', 35800, 43.0, 253.00, 5.88, 'Gasolina', 'Posto Shell', true);

  -- Gastos avulsos
  insert into public.expenses (vehicle_id, user_id, category, description, amount, expense_date, mileage) values
    (v_veh, d_user, 'Manutenção', 'Troca de óleo + filtros', 420.00, '2026-08-30', 38450),
    (v_veh, d_user, 'Pneus', 'Alinhamento e balanceamento', 180.00, '2026-06-20', 35720),
    (v_veh, d_user, 'Manutenção', 'Troca das pastilhas dianteiras', 490.00, '2026-03-03', 31850),
    (v_veh, d_user, 'Seguro', 'Seguro anual', 3200.00, '2026-01-15', NULL);

  -- Documentos e compromissos
  insert into public.vehicle_documents (vehicle_id, user_id, name, category, due_date, amount, note) values
    (v_veh, d_user, 'Licenciamento 2026', 'Documentação', '2026-12-31', 250.00, 'Vencimento do licenciamento anual.'),
    (v_veh, d_user, 'Seguro anual', 'Seguro', '2027-01-15', 3200.00, 'Renovação do seguro.');

  -- Alertas
  insert into public.notifications (user_id, vehicle_id, type, title, body, severity) values
    (d_user, v_veh, 'maintenance', 'Troca de óleo se aproximando', 'Faltam aproximadamente 1.550 km para a próxima troca de óleo.', 'warning'),
    (d_user, v_veh, 'document', 'Licenciamento', 'Vencimento em aproximadamente 4 meses.', 'info'),
    (d_user, v_veh, 'maintenance', 'Filtro de ar', 'Aproxime-se do intervalo recomendado para verificação.', 'info');
end;
$$;

-- Aviso visual (apenas console/cópia não é possível) — lembre no guia.
-- Para gerar os dados demo, execute após este script:
--   select public.generate_demo_data();
-- E entre com: demo@autociclo.app / Demo#1234

-- ---------------------------------------------------------------------------
-- EXCLUSÃO DE CONTA (self-service)
-- ---------------------------------------------------------------------------
create or replace function public.delete_current_user()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
