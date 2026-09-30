# Supabase: regeneração de `src/lib/database.types.ts` (pré-requisito para atualizar `@supabase/ssr` / `@supabase/supabase-js`)

## O problema exato

`src/lib/database.types.ts` é um arquivo **mantido à mão** (não é saída de
`supabase gen types`): 515 linhas, sem as seções `Relationships` e sem o bloco
`__InternalSupabase` que as versões recentes do `@supabase/supabase-js` esperam
no tipo `Database`. Ele cobre as 20 tabelas e 3 funções do schema `public`
(inclusive as colunas da migration `00007_maintenance_plan`), e com os pins
atuais o `npm run typecheck` passa limpo.

O problema aparece ao atualizar os pacotes. Simulação real (set/2026), mantendo
o `database.types.ts` atual:

| `@supabase/ssr` | `@supabase/supabase-js` | `npm run typecheck` |
| --- | --- | --- |
| `0.5.2` (atual) | `2.45.4` (atual) | 0 erros |
| `0.12.7` (latest) | `2.117.2` (latest) | **153 erros** (`TS2339`/`TS2345` — propriedades/argumentos tipados como `never`) |

Os erros se espalham por `src/app/**` (ex.: `Property 'role' does not exist on
type 'never'`, `Argument of type '{ status: string; }' is not assignable to
parameter of type 'never'`) porque a inferência de resultado das queries
(`.select(...)`, `.update(...)`) degrada para `never` quando o `Database`
hand-written não tem a estrutura completa esperada pelas versões novas.

**Consequência prática para segurança:** o `npm audit` reporta 2 **low** em
`@supabase/supabase-js`/`@supabase/auth-js` (Insecure Path Routing) com fix
não-major (`supabase-js 2.117.2`). Mas atualizar **somente** o
`@supabase/supabase-js` para `2.117.2`, mantendo o `@supabase/ssr 0.5.2`,
também quebra o typecheck: **163 erros `never`**. Ou seja, nem o bump de
segurança é aplicável antes da regeneração dos types — ela é o pré-requisito
de qualquer atualização desses pacotes.

Para completar, o `npm audit` reporta ainda 1 **moderate** + 1 **high**
(cadeia `postcss` via `next`): o fix exige `next 16.3.7` (**major**) e ficou
fora do escopo — depende de decisão do dono sobre migrar para Next 16.

Além disso, os pins têm que subir **juntos** — peer dependency do
`@supabase/ssr`:

| `@supabase/ssr` | exige `@supabase/supabase-js` |
| --- | --- |
| `0.5.2` (atual) | `^2.43.4` |
| `0.12.7` (latest) | `^2.114.0` |

## Por que não dá para regenerar pelo repositório sozinho

- Não existe `supabase/config.toml` nem credenciais commitadas (correto).
- As migrations locais existem e estão em ordem
  (`supabase/migrations/00001_init_schema.sql` … `00007_maintenance_plan.sql`),
  mas o `supabase gen types` precisa de um **banco ativo** para introspectar:
  ou o projeto remoto (via `--project-id`, exige `supabase login` do dono) ou
  um banco local via `supabase start` (exige Docker).
- Por isso este PR é só documentação: a regeneração depende de acesso do dono.

## Passo a passo exato para o dono regenerar

> Ordem recomendada: **regenerar os types primeiro**, atualizar os pacotes
> depois, e validar com `typecheck` a cada passo.

1. **Instalar/verificar a CLI** (requer Node 18+):

   ```bash
   npx supabase --version
   ```

2. **Autenticar** (abre o navegador):

   ```bash
   npx supabase login
   ```

3. **Obter o `project-id`** (Reference ID do projeto):
   - Dashboard Supabase → seu projeto → *Project Settings* → *General* →
     campo **Reference ID**; ou
   - `npx supabase projects list` (após o login).

4. **Regenerar o arquivo de types** (substitui o hand-written; use o bash/WSL
   no Windows para o redirect funcionar):

   ```bash
   npx supabase gen types typescript \
     --project-id <PROJECT_ID> \
     --schema public > src/lib/database.types.ts
   ```

   Alternativa 100% local (sem tocar no projeto remoto, requer Docker):
   `npx supabase init` + `npx supabase start` (aplica as migrations de
   `supabase/migrations/`) e então
   `npx supabase gen types typescript --local > src/lib/database.types.ts`.

5. **Atualizar os dois pins juntos** em `package.json`:

   ```bash
   npm install @supabase/ssr@latest @supabase/supabase-js@latest
   ```

   Pins atuais que devem ser atualizados juntos:

   ```json
   "@supabase/ssr": "0.5.2",          // -> ^0.12.7
   "@supabase/supabase-js": "2.45.4"  // -> ^2.117.2 (peer: ^2.114.0)
   ```

6. **Validar**:

   ```bash
   npm ci
   npm run typecheck   # deve voltar a 0 erros
   npm run lint && npm test && npm run build
   ```

## Observações

- O arquivo regenerado é bem maior que o atual (inclui `Relationships` por
  tabela e `__InternalSupabase`); isso é esperado e é justamente o que resolve
  os `never`. Não edite à mão — trate como artefato gerado.
- Se o passo 6 acusar erros residuais, confira se alguma query usa colunas que
  não existem mais no banco remoto (drift entre código e projeto Supabase).
- Manter os dois pacotes sempre na mesma atualização: a peer dependency do
  `@supabase/ssr` muda a cada minor.
