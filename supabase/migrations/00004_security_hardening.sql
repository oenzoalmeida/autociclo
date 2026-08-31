-- ============================================================================
-- AutoCiclo — Endurecimento de segurança (auditoria)
-- Remove policy que permitia qualquer usuário autenticado inserir no
-- catálogo global de manutenções. O catálogo é dado de referência (seed) e
-- nenhum fluxo da aplicação insere nele.
-- ============================================================================

drop policy if exists "catalog insert" on public.maintenance_catalog;
