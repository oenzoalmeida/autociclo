-- ---------------------------------------------------------------------------
-- Codifica no repositório objetos que já existem em produção e não estavam em
-- nenhuma migração: catálogo de veículos (marcas, modelos, versões) e quatro
-- CHECKs da tabela vehicles. As definições abaixo foram observadas no banco
-- de produção em 2026-11-03 (leitura apenas).
--
-- Comportamento seguro:
-- * Objeto ausente: é criado com a definição observada.
-- * Objeto existente: NADA é alterado; a definição é comparada com a esperada
--   e a migração FALHA (exception) se divergir. Não usa "if not exists" como
--   garantia de equivalência.
-- * Só estrutura. Nenhuma linha de dados é inserida ou alterada: os registros
--   do catálogo (marcas/modelos/versões) NÃO vêm desta migração.
-- ---------------------------------------------------------------------------

do $$
declare
  got text;
  want text;
begin
  -- ===== vehicle_brands =====
  if to_regclass('public.vehicle_brands') is null then
    create table public.vehicle_brands (
      id         uuid primary key default gen_random_uuid(),
      name       text not null unique,
      slug       text not null unique,
      sort_order integer not null default 0,
      created_at timestamptz not null default now()
    );
    alter table public.vehicle_brands enable row level security;
    create policy "brands read" on public.vehicle_brands
      for select using (auth.role() = 'authenticated');
  end if;

  -- ===== vehicle_models =====
  if to_regclass('public.vehicle_models') is null then
    create table public.vehicle_models (
      id         uuid primary key default gen_random_uuid(),
      brand_id   uuid not null references public.vehicle_brands(id) on delete cascade,
      name       text not null,
      sort_order integer not null default 0,
      unique (brand_id, name)
    );
    create index idx_models_brand on public.vehicle_models (brand_id);
    alter table public.vehicle_models enable row level security;
    create policy "models read" on public.vehicle_models
      for select using (auth.role() = 'authenticated');
  end if;

  -- ===== vehicle_versions =====
  if to_regclass('public.vehicle_versions') is null then
    create table public.vehicle_versions (
      id         uuid primary key default gen_random_uuid(),
      model_id   uuid not null references public.vehicle_models(id) on delete cascade,
      name       text not null,
      sort_order integer not null default 0,
      unique (model_id, name)
    );
    create index idx_versions_model on public.vehicle_versions (model_id);
    alter table public.vehicle_versions enable row level security;
    create policy "versions read" on public.vehicle_versions
      for select using (auth.role() = 'authenticated');
  end if;

  -- ===== CHECKs de vehicles =====
  if not exists (select 1 from pg_constraint where conrelid = 'public.vehicles'::regclass and conname = 'vehicles_fuel_check') then
    alter table public.vehicles add constraint vehicles_fuel_check check (
      fuel_type is null or fuel_type = any (array['Gasolina','Etanol','Flex','Diesel','Híbrido','Híbrido plug-in','Elétrico','GNV']));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.vehicles'::regclass and conname = 'vehicles_plate_check') then
    alter table public.vehicles add constraint vehicles_plate_check check (
      plate is null or plate ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$' or plate ~ '^[A-Z]{3}[0-9]{4}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.vehicles'::regclass and conname = 'vehicles_transmission_check') then
    alter table public.vehicles add constraint vehicles_transmission_check check (
      transmission is null or transmission = any (array['Manual','Automático','Automatizado','CVT']));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.vehicles'::regclass and conname = 'vehicles_usage_check') then
    alter table public.vehicles add constraint vehicles_usage_check check (
      usage_type = any (array['urbano_leve','urbano_intenso','rodoviario','estrada_terra','comercial','misto','personalizado']));
  end if;

  -- ===== Verificação: o estado final tem de ser exatamente o esperado =====
  select string_agg(table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''), '|' order by table_name, column_name)
    into got
    from information_schema.columns
   where table_schema = 'public' and table_name in ('vehicle_brands','vehicle_models','vehicle_versions');
  want := 'vehicle_brands.created_at:timestamp with time zone:NO:now()|vehicle_brands.id:uuid:NO:gen_random_uuid()|vehicle_brands.name:text:NO:|vehicle_brands.slug:text:NO:|vehicle_brands.sort_order:integer:NO:0|'
       || 'vehicle_models.brand_id:uuid:NO:|vehicle_models.id:uuid:NO:gen_random_uuid()|vehicle_models.name:text:NO:|vehicle_models.sort_order:integer:NO:0|'
       || 'vehicle_versions.id:uuid:NO:gen_random_uuid()|vehicle_versions.model_id:uuid:NO:|vehicle_versions.name:text:NO:|vehicle_versions.sort_order:integer:NO:0';
  if got is distinct from want then
    raise exception 'catalogo de veiculos: colunas divergem do esperado: %', got;
  end if;

  select string_agg(conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid), '|' order by conrelid::regclass::text, conname)
    into got
    from pg_constraint
   where contype <> 'n'
     and conrelid in ('public.vehicle_brands'::regclass, 'public.vehicle_models'::regclass, 'public.vehicle_versions'::regclass);
  want := 'vehicle_brands:vehicle_brands_name_key:UNIQUE (name)|vehicle_brands:vehicle_brands_pkey:PRIMARY KEY (id)|vehicle_brands:vehicle_brands_slug_key:UNIQUE (slug)|'
       || 'vehicle_models:vehicle_models_brand_id_fkey:FOREIGN KEY (brand_id) REFERENCES vehicle_brands(id) ON DELETE CASCADE|vehicle_models:vehicle_models_brand_id_name_key:UNIQUE (brand_id, name)|vehicle_models:vehicle_models_pkey:PRIMARY KEY (id)|'
       || 'vehicle_versions:vehicle_versions_model_id_fkey:FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE|vehicle_versions:vehicle_versions_model_id_name_key:UNIQUE (model_id, name)|vehicle_versions:vehicle_versions_pkey:PRIMARY KEY (id)';
  if got is distinct from want then
    raise exception 'catalogo de veiculos: constraints divergem do esperado: %', got;
  end if;

  select string_agg(indexname, '|' order by indexname) into got
    from pg_indexes where schemaname = 'public' and indexname in ('idx_models_brand','idx_versions_model');
  if got is distinct from 'idx_models_brand|idx_versions_model' then
    raise exception 'catalogo de veiculos: indices esperados ausentes: %', got;
  end if;

  select string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,''), '|' order by tablename) into got
    from pg_policies where schemaname = 'public' and tablename in ('vehicle_brands','vehicle_models','vehicle_versions');
  want := 'vehicle_brands:brands read:SELECT:(auth.role() = ''authenticated''::text)|vehicle_models:models read:SELECT:(auth.role() = ''authenticated''::text)|vehicle_versions:versions read:SELECT:(auth.role() = ''authenticated''::text)';
  if got is distinct from want then
    raise exception 'catalogo de veiculos: politicas divergem do esperado: %', got;
  end if;

  if exists (select 1 from pg_class where oid in ('public.vehicle_brands'::regclass,'public.vehicle_models'::regclass,'public.vehicle_versions'::regclass) and not relrowsecurity) then
    raise exception 'catalogo de veiculos: RLS desligada em tabela do catalogo';
  end if;

  select string_agg(conname||':'||pg_get_constraintdef(oid), '|' order by conname) into got
    from pg_constraint
   where conrelid = 'public.vehicles'::regclass and conname in ('vehicles_fuel_check','vehicles_plate_check','vehicles_transmission_check','vehicles_usage_check');
  want := 'vehicles_fuel_check:CHECK (((fuel_type IS NULL) OR (fuel_type = ANY (ARRAY[''Gasolina''::text, ''Etanol''::text, ''Flex''::text, ''Diesel''::text, ''Híbrido''::text, ''Híbrido plug-in''::text, ''Elétrico''::text, ''GNV''::text]))))|'
       || 'vehicles_plate_check:CHECK (((plate IS NULL) OR (plate ~ ''^[A-Z]{3}[0-9][A-Z][0-9]{2}$''::text) OR (plate ~ ''^[A-Z]{3}[0-9]{4}$''::text)))|'
       || 'vehicles_transmission_check:CHECK (((transmission IS NULL) OR (transmission = ANY (ARRAY[''Manual''::text, ''Automático''::text, ''Automatizado''::text, ''CVT''::text]))))|'
       || 'vehicles_usage_check:CHECK ((usage_type = ANY (ARRAY[''urbano_leve''::text, ''urbano_intenso''::text, ''rodoviario''::text, ''estrada_terra''::text, ''comercial''::text, ''misto''::text, ''personalizado''::text])))';
  if got is distinct from want then
    raise exception 'vehicles: CHECKs divergem do esperado: %', got;
  end if;
end $$;
