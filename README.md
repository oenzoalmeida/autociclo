# AutoCiclo

**Seu carro em dia, sempre.**

O prontuário digital do seu carro. O AutoCiclo centraliza manutenções, revisões, quilometragem, gastos, documentos e todo o histórico do veículo em um só lugar — cada cuidado, serviço e custo vira um registro organizado e consultável, para que o dono não dependa apenas da memória.

Aplicação web responsiva/PWA construída em Next.js com TypeScript e Supabase (PostgreSQL, autenticação e storage), com Row Level Security no banco e perfis de acesso cliente/admin.

## Demonstração

**Aplicação:** https://autociclo.vercel.app

> Projeto de portfólio hospedado em planos gratuitos (Vercel/Supabase): o primeiro acesso pode ser mais lento e os dados podem ser removidos a qualquer momento. O painel administrativo é de uso interno do autor; cadastros pela página pública são criados como Cliente.

## Sobre o projeto

O AutoCiclo acompanha a manutenção preventiva do veículo como um prontuário: múltiplos carros por conta, registro de quilometragem com histórico, manutenções com catálogo inicial de itens (óleo, filtros, freios, pneus, correias etc.) ou itens personalizados, status de cada item (Em dia, Atenção, Atrasado, Sem informações), linha do tempo, controle de gastos por categoria, alertas e relatório imprimível.

O conceito de **AutoCiclo Score** (0–100) representa o nível de organização das manutenções cadastradas — não é um diagnóstico mecânico.

## Principais funcionalidades

- **Autenticação**: cadastro, login, logout, recuperação de senha, confirmação de e-mail e sessão persistente.
- **Minha Garagem**: múltiplos veículos, com adicionar, editar, arquivar e excluir; onboarding para o primeiro veículo.
- **Dashboard do veículo** com AutoCiclo Score.
- **Quilometragem**: atualização com histórico e confirmação em caso de correção para valor inferior.
- **Manutenções**: registro com múltiplos serviços, catálogo inicial e itens personalizados, com status.
- **Histórico**: linha do tempo do veículo com busca e filtros.
- **Gastos**: controle de despesas por categoria, com resumo de mês, ano e últimos 12 meses.
- **Alertas** internos de manutenções e vencimentos.
- **Arquivos**: anexo opcional de nota fiscal, recibo, foto ou orçamento em storage privado.
- **Relatório do veículo** (imprimível).
- **Painel administrativo** (admins) com visão geral, usuários, veículos e atividade.
- **Tema** claro, escuro e seguir o sistema; **mobile first** com navegação inferior no celular e sidebar no desktop.
- **PWA** instalável (manifest; os dados exigem conexão — sem modo offline).

## Tecnologias

- [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS
- [Supabase](https://supabase.com/): PostgreSQL, Auth e Storage
- Row Level Security (RLS) para isolamento de dados no banco
- PWA; testes unitários com Vitest

## Arquitetura / Estrutura

```text
autociclo/
├── src/
│   ├── app/                  # Rotas (App Router)
│   │   ├── (auth)/           # login, cadastro, recuperar/redefinir senha
│   │   ├── (app)/            # área autenticada (home, garagem, histórico, gastos, alertas, admin…)
│   │   ├── onboarding/       # cadastro do primeiro veículo
│   │   └── auth/             # rotas de callback/confirmação de e-mail
│   ├── components/           # UI, layout, veículo e admin
│   └── lib/                  # clientes Supabase, tipos e lógica de domínio
├── supabase/
│   └── migrations/           # schema, RLS e papéis (cliente/admin)
├── public/                   # manifest e ícones PWA
├── .env.example
└── package.json
```

## Como executar

Pré-requisitos: Node.js 18+ (recomendado 20+) e um projeto no Supabase.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev                  # http://localhost:3000
```

Variáveis de ambiente (`.env.local`):

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |

> A `service role key` **nunca** deve ser usada no frontend.

Banco: execute no SQL Editor do Supabase os scripts de `supabase/migrations/` em ordem numérica — `00001_init_schema.sql` (tabelas, RLS, storage e catálogo), `00002_roles.sql` (papéis de acesso) e `00003` a `00007` (suporte, hardening, exclusão de conta, histórico de intervalos e plano de manutenção).

Outros comandos:

```bash
npm run build        # build de produção
npm start            # servir o build
npm run typecheck    # verificação de tipos (tsc --noEmit)
npm test             # testes unitários (vitest)
```

## Segurança

- **Row Level Security (RLS)** habilitada em todas as tabelas de dados.
- Cada usuário acessa e altera **exclusivamente os próprios dados** (políticas baseadas em `auth.uid()`); contas administrativas possuem acesso de **leitura** para suporte, com placas parcialmente ocultas.
- O storage é **privado**; cada usuário só acessa os próprios arquivos.
- Nenhuma chave de serviço (`service role key`) é exposta no frontend.
- Entradas são validadas e as rotas da aplicação exigem sessão autenticada.

## Perfis de acesso

| Perfil  | Acesso |
| ------- | ------ |
| Cliente | Uso pessoal: seus veículos, manutenções, quilometragem, gastos e histórico. Não acessa recursos administrativos. |
| Admin   | Painel administrativo (`/admin`) com visão geral da plataforma, usuários, veículos e atividade; também usa o AutoCiclo como usuário comum. |

Os papéis ficam na tabela `user_roles` (vinculada ao `auth.users`) e são protegidos por RLS: um usuário comum **não** consegue promover a própria conta a admin.

## Status

MVP funcional em produção em https://autociclo.vercel.app, com deploy automático a cada push na `main`; banco, autenticação e storage no Supabase.

## Limitações conhecidas

- Planos gratuitos (Vercel/Supabase): primeiro acesso mais lento e limites do plano.
- PWA sem modo offline: os dados exigem conexão.
- Projeto de portfólio: os dados podem ser removidos a qualquer momento.

## Avisos específicos

Alertas e recomendações de manutenção são sugestões calculadas pelo aplicativo a partir das informações registradas pelo usuário e **não substituem a avaliação de um profissional mecânico**. Confirme sempre os intervalos e os procedimentos no manual do veículo.

## Autor

Enzo Almeida
