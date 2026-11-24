# Isolamento de ambientes e protecao contra producao nos testes (2026-11-24)

## O que foi verificado (somente leitura do repositorio e da API publica do GitHub)
- Unico host de producao fixo no codigo: a URL publica do site (https://autociclo.vercel.app), usada em metadados, README e como entrada de um teste unitario (safe-redirect). A referencia do projeto Supabase nao esta no repositorio nem no historico git (251 commits, busca por referencia, .env e chaves).
- Testes unitarios usam placeholders (example.supabase.co). Testes com rede (scripts/supabase-rls-e2e.mjs e supabase-smoke.mjs) usam a URL de `supabase status`, ou seja, a stack local.
- Workflows: ci.yml, rls-isolation.yml, verify-migrations.yml. Nenhum faz deploy; o deploy de producao e a integracao Vercel na branch main.

## Correcoes
1. `scripts/lib/assert-local-supabase.mjs`: os scripts e2e/smoke recusam qualquer host que nao seja localhost, 127.0.0.1, ::1, host.docker.internal ou kong (analisa o hostname; rejeita usuario/senha na URL).
2. `src/test/network-guard.ts` (vitest setupFiles): fetch para qualquer host nao local falha nos testes unitarios.
3. Testes de regressao em `src/test/network-guard.test.ts`, sem rede real: URL de producao via configuracao, truques de userinfo, dominios parecidos, e verificacao de que a trava esta registrada no vitest.

## Limites
- Execucoes antigas: os logs brutos do Actions exigem permissao de admin e nao foram lidos. O codigo versionado sugere que usavam placeholders, mas isso nao prova ausencia de impacto.
- A trava cobre `fetch` do Node nos testes unitarios; clientes que usem outro transporte (http/undici direto) nao sao interceptados. Os testes e2e dependem da guarda por URL.
- Interceptacao de rede em nivel de CI (egress) nao foi implementada.
