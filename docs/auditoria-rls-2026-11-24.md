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
- `.github/workflows/rls-isolation.yml` (novo): roda o script em Postgres 17 do runner a cada PR que toque `supabase/**`.
- Vitest: 111 testes (16 novos), typecheck, lint e build de produção passam localmente.

## Limites

- Banco real: ver a seção seguinte.
- A migração nova **não foi aplicada** em nenhum banco real. Aplicar exige decisão do dono (ver `docs/reconciliacao-migracoes.md` sobre o histórico de migrações).
- Não testado: Auth do Supabase em si (política de senha, confirmação de e-mail, limites de taxa, SMTP), que são configurações do projeto na plataforma, não do repositório.
- Não testado: comportamento do PostgREST/Storage reais; o teste usa stubs de `auth` e `storage`.
- Pendências menores, sem correção neste PR: `profiles.email` é editável pelo próprio usuário (só exibição); as policies usam `auth.uid()` sem `(select ...)`, custo de desempenho irrelevante no volume atual; bucket `vehicle-files` sem limite de tamanho/tipo definido na migração.

## Banco real em 2026-11-24 (somente leitura, transação `read only`)

- As 66 policies de `public` e `storage` são iguais às produzidas pelas migrações do `main` (comparação normalizada, texto a texto). Logo as falhas 1 e 2 existem no banco real.
- Consultas de integridade (somente contagens): nenhum registro com dono diferente do dono do veículo nas tabelas filhas, nenhum chamado com `admin_note`, 6 usuários, 1 admin, todos com papel. Isso registra apenas que as consultas feitas não encontraram registros divergentes. Não prova que não houve exploração no passado (linhas apagadas, alteradas ou cascateadas não aparecem) nem o efeito exato da migração nova.
- Postgres 17.6.
- Funções: `is_admin`, `is_vehicle_member` e `set_updated_at` ainda são executáveis por `anon` (retornam falso/inofensivo); as demais seguem as migrações.

## Histórico de migrações: reconciliação proposta (NÃO aplicada)

Registro em `supabase_migrations.schema_migrations` (12 versões): `00001` a `00009`, `20261015185046`, `20261103130000`, `20261103130100`. O doc `reconciliacao-migracoes.md` de 2026-11-03 está desatualizado nesse ponto.

| Versão no repositório | Registrada | Efeito no banco real |
|---|---|---|
| `20261105120000_expenses_maintenance_record_link` | não | presente: coluna, índice `idx_expenses_maintenance_record`, FK simples e função `register_maintenance_with_expense` (corpo com o mesmo md5 do arquivo) |
| `20261106232000_link_maintenance_expenses_owner_fk` | não | **ausente**: sem `expenses_maintenance_owner_fk`, sem `maintenance_records_id_user_vehicle_unique`, sem `expenses_maintenance_unique_link` |
| `20261106232100_backfill_unambiguous_maintenance_expenses` | não | **não executada**: 0 de 2 gastos vinculados |
| `20261124120000_rls_vehicle_ownership_checks` (este PR) | não | ausente |

Consequência da ausência da `20261106232000`: hoje `expenses.maintenance_record_id` só tem FK simples, então um gasto pode apontar para registro de manutenção de outro usuário ou de outro veículo. A migração fecha isso.

Sequência proposta, cada passo só com decisão do dono e depois de ensaio em banco descartável restaurado do backup:

1. `supabase migration list` para confirmar o estado acima.
2. `supabase migration repair --status applied 20261105120000` (efeito conferido).
3. `supabase db push --dry-run` e conferir que listaria exatamente `20261106232000`, `20261106232100` e `20261124120000`, nessa ordem.
4. Ensaiar as três num restore do backup do dia (script de teste `scripts/test_rls_isolation.sql` incluso), depois `supabase db push` no real.
5. Reexecutar a leitura de policies e o teste de isolamento contra o real.

Não rodar `supabase db push` antes do passo 2: tentaria reaplicar `20261105120000`.
