# AutoCiclo

**Seu carro em dia, sempre.**

O prontuário digital do seu carro. O AutoCiclo centraliza manutenções, revisões, quilometragem, gastos, documentos e todo o histórico do veículo em um só lugar.

---

## Sobre

O AutoCiclo é uma aplicação web responsiva/PWA para proprietários de veículos acompanharem a manutenção preventiva, revisões, quilometragem, gastos e o histórico do carro. O conceito central é funcionar como o **prontuário digital do veículo**: cada cuidado, serviço e custo vira um registro organizado e consultável, para que o dono não dependa apenas da memória.

---

## Principais funcionalidades

- **Landing page** pública com apresentação do produto.
- **Autenticação**: cadastro, login, logout, recuperação de senha, confirmação de e-mail e sessão persistente.
- **Onboarding** para cadastro do primeiro veículo.
- **Minha Garagem**: múltiplos veículos, com adicionar, editar, arquivar e excluir.
- **Dashboard do veículo** com o **AutoCiclo Score** (0–100, que representa o nível de organização das manutenções cadastradas — não é um diagnóstico mecânico).
- **Quilometragem**: atualização com histórico e confirmação em caso de correção para valor inferior.
- **Manutenções**: catálogo inicial de itens (óleo, filtros, freios, pneus, correias, etc.), item personalizado, registro de manutenção com múltiplos serviços e status (Em dia, Atenção, Atrasado, Sem informações).
- **Histórico**: linha do tempo do veículo com busca e filtros.
- **Gastos**: controle de despesas por categoria, com resumo de mês, ano e últimos 12 meses.
- **Alertas** internos de manutenções e vencimentos.
- **Arquivos**: anexo opcional de nota fiscal, recibo, foto ou orçamento em storage privado.
- **Relatório do veículo** (imprimível).
- **Painel administrativo** para administradores, com visão geral, usuários, veículos e atividade.
- **Perfis de acesso**: cliente e admin.
- **Tema** claro, escuro e seguir o sistema; **mobile first** com navegação inferior no celular e sidebar no desktop.
- **PWA** instalável (manifest; os dados exigem conexão — sem modo offline).

---

## Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- [Supabase](https://supabase.com/) — banco, autenticação e storage
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security (RLS)
- PWA

---

## Estrutura do projeto

```
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

---

## Rodando localmente

### Pré-requisitos

- Node.js 18+ (recomendado 20+)
- Uma conta/projeto no Supabase

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> A `service role key` **nunca** deve ser usada no frontend.

### 3. Preparar o banco

Execute, no SQL Editor do Supabase, os scripts da pasta `supabase/migrations/` (na ordem):

1. `00001_init_schema.sql` — tabelas, RLS, storage e catálogo de manutenções.
2. `00002_roles.sql` — papéis de acesso (`cliente`/`admin`).
3. `00003` a `00007` — suporte, hardening de segurança, exclusão de conta, histórico de intervalos e plano de manutenção (executar na ordem numérica).

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

---

## Build

```bash
npm run build   # build de produção
npm start       # servir o build
```

Também estão disponíveis:

```bash
npm run typecheck   # verificação de tipos (tsc --noEmit)
npm test            # testes unitários (vitest)
```

---

## Deploy (Vercel)

O projeto está publicado na Vercel em:

**https://autociclo.vercel.app**

O repositório está conectado à Vercel, com **auto-deploy a cada push na branch `main`**. O banco, a autenticação e o storage são fornecidos pelo **Supabase**.

---

## Segurança

- **Row Level Security (RLS)** habilitada em todas as tabelas de dados.
- Cada usuário acessa e altera **exclusivamente os próprios dados** (políticas baseadas em `auth.uid()`); contas administrativas possuem acesso de **leitura** para suporte, com placas parcialmente ocultas.
- O storage é **privado**; cada usuário só acessa os próprios arquivos.
- Nenhuma chave de serviço (`service role key`) é exposta no frontend.
- Entradas são validadas e as rotas da aplicação exigem sessão autenticada.

---

## Perfis de acesso

| Perfil  | Acesso                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------- |
| Cliente | Usa o AutoCiclo para uso pessoal: seus veículos, manutenções, quilometragem, gastos e histórico. Não acessa recursos administrativos. |
| Admin   | Acessa o painel administrativo (`/admin`) com visão geral da plataforma, usuários, veículos e atividade. Também pode usar o AutoCiclo como usuário comum. |

Os papéis são armazenados na tabela `user_roles` (vinculada ao `auth.users`) e protegidos por RLS: um usuário comum **não** consegue promover a própria conta a admin.

---

## Status atual

MVP funcional em produção, com autenticação, garagem, quilometragem, manutenções, histórico, gastos, alertas, arquivos, relatório, painel administrativo e PWA. O banco, a autenticação e o storage usam Supabase, e o frontend está hospedado na Vercel.

---

## Avisos específicos

Alertas e recomendações de manutenção são sugestões calculadas pelo aplicativo a partir das informações registradas pelo usuário e **não substituem a avaliação de um profissional mecânico**. Confirme sempre os intervalos e os procedimentos no manual do veículo.

## Limitações conhecidas

- A demonstração roda em planos gratuitos (Vercel/Supabase): o primeiro acesso pode ser mais lento e os limites do plano se aplicam.
- É um projeto de portfólio: os dados podem ser removidos a qualquer momento.
- O painel administrativo é de uso interno do autor; cadastros pela página pública são criados como Cliente.

## Autor

Enzo Almeida
