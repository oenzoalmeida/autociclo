-- ---------------------------------------------------------------------------
-- Vínculo explícito entre gasto (public.expenses) e registro de manutenção
-- (public.maintenance_records) - APENAS ESTRUTURA.
--
-- Contexto: ao registrar uma manutenção, o app grava DOIS lançamentos - o
-- registro em maintenance_records e um gasto "sombra" em expenses com o mesmo
-- valor. As telas de custos somavam as duas tabelas e contavam a manutenção
-- em dobro (ex.: gasto de 50 + manutenção de 180 aparecia como 410).
--
-- Esta migração só cria a coluna do vínculo (nulo permitido,
-- on delete set null) e seu índice. NENHUM dado existente é vinculado,
-- inserido, alterado ou removido aqui: o histórico ambíguo (pares sombra sem
-- vínculo) não é tocado por igualdade. Os registros novos passam a gravar o
-- vínculo no momento da criação (código do app).
--
-- A reconciliação do histórico (preencher vínculos e/ou gerar os gastos que
-- faltam) é uma decisão do dono, proposta à parte com estimativa dos dados
-- afetados, e NÃO faz parte desta migração.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists maintenance_record_id uuid
  references public.maintenance_records(id) on delete set null;

create index if not exists idx_expenses_maintenance_record
  on public.expenses (maintenance_record_id);
