-- ============================================================================
-- AutoCiclo — Plano de manutenção: origem das recomendações, uso do veículo
-- e estruturas para recomendações específicas por fabricante/modelo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Uso do veículo
-- ---------------------------------------------------------------------------
alter table public.vehicles
  add column if not exists usage_type text not null default 'misto';

alter table public.vehicles
  add column if not exists severe_usage boolean not null default false;

-- ---------------------------------------------------------------------------
-- Origem da recomendação no item de manutenção do veículo
--   fabricante | referencia_geral | personalizada
-- ---------------------------------------------------------------------------
alter table public.vehicle_maintenance_items
  add column if not exists origin text not null default 'referencia_geral';

-- ---------------------------------------------------------------------------
-- Recomendações específicas (futuro: por marca/modelo/versão/ano/motor/...)
-- Estrutura preparada para evoluir sem popular agora.
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_recommendations (
  id               uuid primary key default gen_random_uuid(),
  catalog_id       uuid not null references public.maintenance_catalog(id) on delete cascade,
  brand            text,
  model            text,
  version          text,
  year_start       integer,
  year_end         integer,
  engine           text,
  fuel_type        text,
  transmission     text,
  interval_km      integer,
  interval_months  integer,
  origin           text not null default 'fabricante',
  source_note      text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Histórico de alteração de intervalo (personalização)
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_interval_history (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid not null references public.vehicle_maintenance_items(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  old_interval_km   integer,
  old_interval_months integer,
  new_interval_km   integer,
  new_interval_months integer,
  changed_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.maintenance_recommendations enable row level security;
create policy "recommendations read authenticated" on public.maintenance_recommendations
  for select using (auth.role() = 'authenticated');

alter table public.maintenance_interval_history enable row level security;
create policy "interval history select own or admin" on public.maintenance_interval_history
  for select using (auth.uid() = user_id or public.is_admin());
create policy "interval history insert own" on public.maintenance_interval_history
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_recommendations_catalog on public.maintenance_recommendations(catalog_id);
create index if not exists idx_interval_history_item on public.maintenance_interval_history(item_id, changed_at desc);
