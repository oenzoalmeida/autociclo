-- Fixa a resolução de nomes nas funções e restringe o gatilho ao uso interno.
alter function public.set_updated_at() set search_path = '';
alter function public.is_vehicle_member(uuid) set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
