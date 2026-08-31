-- ============================================================================
-- AutoCiclo — Remove seed de dados demo
-- A função generate_demo_data criava um usuário com senha conhecida e era
-- executável por PUBLIC (poderia ser chamada por usuário anônimo via RPC).
-- O catálogo e o schema continuam reproduzidos pelas migrations anteriores.
-- ============================================================================

drop function if exists public.generate_demo_data();
