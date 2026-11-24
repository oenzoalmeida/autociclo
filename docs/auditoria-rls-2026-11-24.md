# Auditoria de acesso, autenticação e RLS (2026-11-24)

Escopo: políticas RLS, funções, papéis e fluxo de autenticação do AutoCiclo, lidos do repositório (migrações `00001` a `20261106232100`, `src/proxy.ts`, rotas `/auth/*`, páginas de login, troca de senha e admin).
Método: as 15 migrações foram aplicadas em ordem num Postgres 17 descartável (PGlite) com papéis `anon`/`authenticated` e `auth.uid()` simulado, e cada cenário de ataque foi executado como usuário A contra dados do usuário B. Dados fictícios, nada tocou o banco real.

## O que está correto (testado)

- Leitura: usuário A não lê veículos, gastos, perfil, papéis nem chamados de B. Anônimo não lê nada.
- `user_roles` não tem policy de escrita: não há auto-promoção a admin nem limpeza da troca obrigatória de senha.
- Admin com `must_change_password` pendente perde o acesso administrativo no banco.
- Catálogo global: somente leitura para autenticados.
- `generate_demo_data` não existe mais. `delete_current_user`, `export_user_data_snapshot`, `register_maintenance_with_expense` e `handle_new_user` negam `anon` (e `handle_new_user` nega `authenticated`).
- A RPC `register_maintenance_with_expense` recusa veículo de outro usuário.
- Storage: policies por `owner`; A não lê nem grava objeto com owner de B.

## Falhas encontradas e corrigidas neste PR

1. **Integridade entre usuários (média).** As policies de INSERT/UPDATE de `expenses`, `mileage_records`, `fuel_records`, `vehicle_maintenance_items`, `maintenance_records`, `vehicle_documents`, `reminders`, `attachments`, `notifications`, `activity_logs` e `maintenance_interval_history` só exigiam `auth.uid() = user_id`. Quem soubesse o UUID de um veículo alheio gravava linhas apontando para ele e podia mover linhas próprias para ele. Os dados do dono não vazavam (SELECT por `user_id`), mas o admin passava a ver lixo atribuído ao veículo, a exclusão do veículo apagava essas linhas em cascata e o erro de chave estrangeira revelava se o UUID existia. Correção: migração `20261124120000_rls_vehicle_ownership_checks.sql` (`WITH CHECK` com `owns_vehicle()` e afins; `maintenance_record_items` agora exige item e registro do mesmo veículo e do próprio usuário).
2. **Chamado de suporte (baixa).** O cliente podia abrir chamado já `Resolvido` e com `admin_note` própria, que a tela de admin exibiria como resposta oficial. A policy agora exige `status = 'Novo'` e `admin_note is null`.
3. **Redirecionamento aberto em `/auth/callback` (baixa).** `${origin}${next}` com `next=@dominio` produz `https://autociclo.vercel.app@dominio`, que o navegador abre em `dominio`. Correção: `safeInternalPath` em `src/lib/safe-redirect.ts`, com testes. O app não usa `next` nesse caminho hoje, então não há mudança de comportamento para usuários.

## Testes

- `scripts/test_rls_isolation.sql` (novo): 55 cenários de negação e de fluxo legítimo. Antes da migração o cenário "A grava gasto em veículo de B" falha (reproduz o defeito); com a migração todos passam.
- `scripts/ci/rls-isolation.workflow.yml` (novo, ainda fora de `.github/workflows`, ver fim do documento): roda o script em Postgres 17 do runner a cada PR que toque `supabase/**`.
- Vitest: 111 testes (16 novos), typecheck, lint e build de produção passam localmente.

## Limites

- Não li as policies do banco real em produção: a comparação de 2026-11-03 (`docs/reconciliacao-migracoes.md`) indica que o remoto é igual às migrações, mas isso não foi reconfirmado hoje.
- A migração nova **não foi aplicada** em nenhum banco real. Aplicar exige decisão do dono (ver `docs/reconciliacao-migracoes.md` sobre o histórico de migrações).
- Não testado: Auth do Supabase em si (política de senha, confirmação de e-mail, limites de taxa, SMTP), que são configurações do projeto na plataforma, não do repositório.
- Não testado: comportamento do PostgREST/Storage reais; o teste usa stubs de `auth` e `storage`.
- Pendências menores, sem correção neste PR: `profiles.email` é editável pelo próprio usuário (só exibição); as policies usam `auth.uid()` sem `(select ...)`, custo de desempenho irrelevante no volume atual; bucket `vehicle-files` sem limite de tamanho/tipo definido na migração.

## Workflow de CI pendente

O token disponível para publicar este PR não tem o escopo `workflow`, então o GitHub recusou o arquivo `.github/workflows/rls-isolation.yml`. Ele está em `scripts/ci/rls-isolation.workflow.yml`. Para ativar o teste no CI, mova-o para `.github/workflows/rls-isolation.yml` (quem tiver permissão de workflow no repositório). Enquanto isso, o teste roda localmente com `psql -f scripts/test_rls_isolation.sql` num Postgres com os stubs descritos no próprio arquivo do workflow.
