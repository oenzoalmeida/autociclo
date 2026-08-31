-- ============================================================================
-- AutoCiclo — Exclusão de conta com limpeza de arquivos no Storage
-- ============================================================================

-- Lista os caminhos dos arquivos do usuário autenticado no bucket privado.
create or replace function public.list_user_files()
returns setof text
language sql
security definer
set search_path = public
as $$
  select name from storage.objects where owner = auth.uid() and bucket_id = 'vehicle-files';
$$;

revoke all on function public.list_user_files() from public, anon;
grant execute on function public.list_user_files() to authenticated;

-- Exclui a conta. Os arquivos do usuário devem ser removidos pelo cliente
-- via Storage API (usando os caminhos de list_user_files) ANTES desta chamada.
-- Não é possível excluir storage.objects diretamente via SQL (o Supabase bloqueia
-- para evitar arquivos órfãos); a remoção de arquivos é feita pela Storage API.
create or replace function public.delete_current_user()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
