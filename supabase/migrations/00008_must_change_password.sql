-- ============================================================================
-- AutoCiclo — Troca obrigatória de senha no primeiro acesso administrativo
-- ----------------------------------------------------------------------------
-- A flag mora em user_roles (que NÃO tem policy de insert/update/delete para
-- usuários: ninguém limpa a própria flag). is_admin() passa a exigir a flag
-- desligada, então com a troca pendente TODAS as policies/RPCs admin negam no
-- banco — inclusive um token válido chamando a API diretamente. O middleware
-- do app só reflete esse estado na UI (redirect), não é ele quem protege.
--
-- Ordem de provisionamento obrigatória (a trigger limpa a flag em QUALQUER
-- mudança de senha): criar o usuário com a senha temporária PRIMEIRO e
-- marcar must_change_password=true DEPOIS. Força/diferença da nova senha são
-- exigidas no fluxo do app (mín. 12, reautenticação com a temporária);
-- a trigger garante apenas que a flag só cai quando a senha muda de fato.
-- ============================================================================

alter table public.user_roles
  add column if not exists must_change_password boolean not null default false;

-- Admin só vale com a troca pendente resolvida.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select role = 'admin' and not must_change_password
    from public.user_roles
    where user_id = (select auth.uid())
  ), false);
$$;

-- Leitura da PRÓPRIA flag pelo app (middleware/tela de troca). Só autenticado.
create or replace function public.must_change_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select must_change_password
    from public.user_roles
    where user_id = (select auth.uid())
  ), false);
$$;
revoke execute on function public.must_change_password() from public, anon;
grant execute on function public.must_change_password() to authenticated;

-- Limpa a flag quando a senha muda de fato (troca ou recuperação de senha).
create or replace function public.clear_must_change_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.user_roles
      set must_change_password = false, updated_at = now()
      where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.clear_must_change_on_password_change() from public, anon, authenticated;

drop trigger if exists on_password_change_clear_must_change on auth.users;
create trigger on_password_change_clear_must_change
  after update on auth.users
  for each row execute function public.clear_must_change_on_password_change();
