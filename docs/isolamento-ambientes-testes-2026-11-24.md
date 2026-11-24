# Isolamento de ambientes e protecao contra producao nos testes (2026-11-24)

## O que foi verificado (somente leitura do repositorio e da API publica do GitHub)
- Unico host de producao fixo no codigo: a URL publica do site (https://autociclo.vercel.app), usada em metadados, README e como entrada de um teste unitario (safe-redirect). A referencia do projeto Supabase nao esta no repositorio nem no historico git (251 commits, busca por referencia, .env e chaves).
- Testes unitarios usam placeholders (example.supabase.co). Testes com rede (scripts/supabase-rls-e2e.mjs e supabase-smoke.mjs) usam a URL de `supabase status`, ou seja, a stack local.
- Workflows: ci.yml, rls-isolation.yml, verify-migrations.yml. Nenhum faz deploy; o deploy de producao e a integracao Vercel na branch main.

## Correcoes
1. `scripts/lib/assert-local-supabase.mjs`: os scripts e2e/smoke recusam qualquer host que nao seja localhost, 127.0.0.1, ::1, host.docker.internal ou kong (analisa o hostname; rejeita usuario/senha na URL).
2. `src/test/network-guard.ts` (vitest setupFiles) instala `src/test/guards.ts`: default-deny em duas camadas, fetch e socket/DNS (net.Socket.connect e dns.lookup, que cobrem http/undici). Host nao local falha.
3. Testes de regressao em `src/test/network-guard.test.ts`, sem NENHUMA rede real (transporte, net e dns sao dubles; seguem seguros mesmo se a guarda for removida): URL de producao via configuracao, truques de userinfo, dominios parecidos, e verificacao de que a trava esta registrada no vitest.

4. Contencao independente nos scripts e2e (`scripts/lib/local-only-network.mjs`, carregada primeiro por `enforce-local-network.mjs`): reavalia cada fetch, conexao de socket e lookup DNS contra loopback, mesmo se `assertLocalSupabase` for removido. Regressao em `src/test/e2e-containment.test.ts` com fetch/net/dns falsos.

## Limites
- Execucoes antigas: os logs brutos do Actions exigem permissao de admin e nao foram lidos. O codigo versionado sugere que usavam placeholders, mas isso nao prova ausencia de impacto.
- Cobertura: fetch e a camada net/dns dos testes unitarios. Processos filhos e binarios externos nao sao cobertos; os scripts e2e dependem da guarda por URL. A guarda de socket e verificada com net/dns falsos, nao com conexoes reais.
- Incidente 24/11 09:45: ao validar por mutacao (guarda removida de proposito), a primeira versao do teste usava fetch real com URLs de aparencia de producao. Pode ter saido GET sem credenciais para autociclo.vercel.app e para hosts *.supabase.co ficticios. Regra adotada: controle negativo so com transporte falso.
- Interceptacao de rede em nivel de CI (egress) nao foi implementada.
- Contencao dos scripts e2e e dentro do processo Node: nao cobre processos filhos (`supabase`, `docker`) nem binarios externos. Isolamento de egress em nivel de runner/CI (rede bloqueada) nao foi implementado: exigiria alterar workflow, fora do escopo do PAT e nao validavel sem nova execucao.
- A validacao de que os scripts e2e continuam passando com a contencao depende do CI (stack local no runner).
