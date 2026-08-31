-- ============================================================================
-- AutoCiclo — Suporte (chamados de usuários)
-- ============================================================================

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  email        text not null,
  category     text not null,
  subject      text not null,
  message      text not null,
  status       text not null default 'Novo' check (status in ('Novo','Em atendimento','Resolvido')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

-- Cliente vê apenas os próprios chamados; admin vê todos.
create policy "support select own or admin" on public.support_tickets for select using (
  auth.uid() = user_id or public.is_admin()
);

-- Cliente cria o próprio chamado (não pode criar em nome de outro usuário).
create policy "support insert own" on public.support_tickets for insert with check (
  auth.uid() = user_id
);

-- Apenas admin altera (ex.: status). Cliente não consegue atualizar.
create policy "support update admin" on public.support_tickets for update using (
  public.is_admin()
);

create trigger set_updated_at before update on public.support_tickets for each row execute procedure public.set_updated_at();

create index if not exists idx_support_user on public.support_tickets(user_id, created_at desc);
create index if not exists idx_support_status on public.support_tickets(status);
