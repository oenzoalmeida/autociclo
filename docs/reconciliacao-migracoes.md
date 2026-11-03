# Reconciliação do histórico de migrações

Estado verificado em 2026-11-03, só com leitura (SELECT em transação somente leitura). Nada foi aplicado, registrado nem reparado no banco real.

## O que existe

| Onde | Estado |
|---|---|
| Repositório | `00001` a `00009`, `20261015185040_harden_function_permissions`, `20261103130000_codify_vehicle_catalog_and_checks`, `20261103130100_seed_vehicle_catalog` |
| Remoto, `supabase_migrations.schema_migrations` | só `20261015185046` (harden). `00001` a `00009` não estão registradas |

O efeito das migrações `00001` a `00009` e do harden existe no remoto. O que falta é o registro no histórico.

## O que foi comparado

Um Postgres descartável, construído só com as migrações do repositório, foi comparado com o remoto. Funções (corpo, `security definer`, `search_path`), triggers (inclusive em `auth`), policies, índices, constraints, colunas e defaults, RLS, comentários, buckets, views e tipos são iguais. O catálogo de veículos e quatro CHECKs de `vehicles` existiam no remoto sem migração; a `20261103130000` os codifica.

Diferenças que vêm da plataforma Supabase e não das migrações:

- `service_role` tem EXECUTE nas funções do schema `public` por privilégios padrão da plataforma. As migrações revogam de `public`, `anon` e `authenticated`.
- Os privilégios de tabela para `anon`, `authenticated` e `service_role` vêm dos privilégios padrão da plataforma. A segurança dos dados fica nas policies de RLS.
- As extensões `pgcrypto` e `uuid-ossp` ficam no schema `extensions` no remoto.

Não foram comparados dados de usuários.

## Caso da `00006_remove_demo_seed`

O arquivo só faz `drop function if exists public.generate_demo_data()`. No remoto a função não existe. Isso mostra o estado atual, não que a migração tenha sido executada lá. A `00006` não remove dados, então não há dado a reaplicar.

## Banco novo

`supabase db push` (ou `supabase db reset` em ambiente local) aplica todos os arquivos em ordem. O workflow `Verify migrations` testa esse caminho, o seed (idempotência, ajuste local preservado, linha ausente recriada) e a detecção de divergência de estrutura, num Postgres descartável.

O seed usa `ON CONFLICT DO NOTHING`. Ele mantém linhas existentes e cria as ausentes. Não prova que um catálogo já existente seja igual ao do arquivo, e não remove linhas extras.

## Banco remoto: só com decisão explícita do dono

Registrar as migrações antigas altera o histórico do projeto real. Não faça isso por padrão. Se for decidido, confira antes e registre só as versões cujo efeito foi conferido:

```bash
supabase migration list            # compara local x remoto
supabase migration repair --status applied 00001   # uma versão por vez, após conferir o efeito
```

Rodar `supabase db push` no remoto sem reparar o histórico tentaria reaplicar `00001` a `00009`. Não rode antes de decidir o reparo.

Cada versão registrada deve ter o efeito conferido no remoto (consulta de catálogo). A `20261103130000` e a `20261103130100` são seguras de rodar no remoto: a primeira compara a estrutura e falha se divergir, a segunda só insere linhas ausentes.
