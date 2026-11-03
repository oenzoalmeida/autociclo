-- ---------------------------------------------------------------------------
-- Snapshot pontual de exportação dos dados do usuário autenticado
-- ---------------------------------------------------------------------------
-- A exportação anterior lia as tabelas do usuário em várias requisições
-- PostgREST paginadas; edições durante a exportação podiam misturar estados de
-- instantes diferentes. Uma chamada RPC executa em uma única transação, então
-- todas as leituras veem o mesmo instante do banco (fotografia única).
--
-- Segurança:
-- * security invoker: as políticas de RLS seguem aplicadas às leituras.
-- * Filtro explícito user_id = auth.uid() em cada tabela: políticas do tipo
--   "próprio ou admin" NÃO permitem a um admin exportar dados de terceiros;
--   a função só devolve linhas do chamador.
-- * Sem parâmetros: o chamador não escolhe o usuário exportado.
-- * search_path vazio com referências qualificadas; execute apenas para
--   authenticated.

create or replace function public.export_user_data_snapshot()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'vehicles', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.vehicles where user_id = uid) t),
    'mileage_records', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.mileage_records where user_id = uid) t),
    'maintenance_records', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.maintenance_records where user_id = uid) t),
    'vehicle_maintenance_items', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.vehicle_maintenance_items where user_id = uid) t),
    'expenses', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.expenses where user_id = uid) t),
    'fuel_records', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.fuel_records where user_id = uid) t),
    'vehicle_documents', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.vehicle_documents where user_id = uid) t),
    'attachments', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.attachments where user_id = uid) t),
    'reminders', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.reminders where user_id = uid) t),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.notifications where user_id = uid) t),
    'activity_logs', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select * from public.activity_logs where user_id = uid) t),
    'maintenance_record_items', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
                 from (select mri.* from public.maintenance_record_items mri
                       join public.maintenance_records mr on mr.id = mri.record_id
                       where mr.user_id = uid) t)
  );
end;
$$;

revoke execute on function public.export_user_data_snapshot() from public, anon;
grant execute on function public.export_user_data_snapshot() to authenticated;
