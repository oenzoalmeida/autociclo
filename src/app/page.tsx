import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const features = [
  {
    icon: '🔧',
    title: 'Manutenções',
    desc: 'Controle preventivo de óleo, filtros, freios, pneus, correias e muito mais.',
  },
  {
    icon: '🔁',
    title: 'Revisões',
    desc: 'Acompanhe quando é hora da próxima revisão, sem depender apenas da memória.',
  },
  {
    icon: '📏',
    title: 'Quilometragem',
    desc: 'Atualize o km com um toque e mantenha as previsões sempre em dia.',
  },
  {
    icon: '💰',
    title: 'Gastos',
    desc: 'Saiba quanto você já investiu no seu carro em manutenção, pneus e mais.',
  },
  {
    icon: '📄',
    title: 'Documentos',
    desc: 'Notas, recibos, seguro e vencimentos guardados em um lugar seguro.',
  },
  {
    icon: '🔔',
    title: 'Alertas',
    desc: 'Receba avisos antes de algo sair do prazo — e saiba o que precisa de atenção.',
  },
  {
    icon: '📜',
    title: 'Histórico',
    desc: 'Toda a vida do veículo em uma linha do tempo organizada e fácil de entender.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[hsl(var(--background))] dark:text-slate-100">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-brand-100/70 blur-3xl dark:bg-brand-900/20" />
        </div>
        <div className="container-page flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            O prontuário digital do seu carro
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Seu carro em dia,{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              sempre.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Manutenções, revisões, gastos, documentos e todo o histórico do seu veículo em um só
            lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="btn-primary"
            >
              Cadastrar meu carro
            </Link>
            <a
              href="#conhecer"
              className="btn-secondary"
            >
              Conhecer o AutoCiclo
            </a>
          </div>
          <div className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-4 text-center">
            {[
              { v: '100%', l: 'Seus dados, só seus' },
              { v: '1 lugar', l: 'Tudo sobre o carro' },
              { v: '0', l: 'Conhecimento exigido' },
            ].map((s) => (
              <div key={s.l} className="card p-4">
                <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cuide antes que vire problema */}
      <section id="conhecer" className="border-t border-border bg-white py-20 dark:bg-[hsl(var(--card))]">
        <div className="container-page grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Cuide antes que vire problema
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              O AutoCiclo acompanha revisões e manutenções para ajudar você a não depender apenas da
              memória. Sabe aquele prazo que a gente acha que lembra? Aqui ele nunca fica para
              trás.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-xl">
            <p className="text-2xl font-bold">
              &ldquo;Trocar o óleo cedo demais não faz mal. Esquecer de trocar, faz.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Tudo sobre seu carro em um lugar */}
      <section className="py-20">
        <div className="container-page">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            Tudo sobre seu carro em um lugar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Do óleo ao seguro, do primeiro km ao último gasto: a vida do seu veículo centralizada e
            organizada.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-6 transition-shadow hover:shadow-card-hover">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seu carro cria uma história */}
      <section className="border-t border-border bg-white py-20 dark:bg-[hsl(var(--card))]">
        <div className="container-page grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="card p-6">
              <TimelineExample />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Seu carro cria uma história
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              O AutoCiclo é o prontuário digital do veículo. Cada manutenção, revisão e gasto vira
              um capítulo de uma linha do tempo que mostra, na hora, o que foi feito e o que ainda
              falta.
            </p>
          </div>
        </div>
      </section>

      {/* Simples para quem não entende de mecânica */}
      <section className="py-20">
        <div className="container-page text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Simples até para quem não entende de mecânica
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Nada de jargão complicado. A plataforma traduz informações técnicas para uma linguagem
            simples e mostra, na prática, por que cada cuidado importa.
          </p>
          <div className="mt-8">
            <Link href="/cadastro" className="btn-primary btn-lg">
              Começar gratuitamente
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={28} />
          <p className="text-sm text-muted-foreground">
            Seu carro em dia, sempre. © {new Date().getFullYear()} AutoCiclo
          </p>
          <div className="flex gap-4 text-sm">
            <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="text-muted-foreground hover:text-foreground">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TimelineExample() {
  const items = [
    { date: '30 AGO 2026', title: 'Troca de óleo + filtros', km: '38.450 km', meta: 'Auto Center Silva · R$ 420,00' },
    { date: '20 JUN 2026', title: 'Alinhamento e balanceamento', km: '35.720 km', meta: 'R$ 180,00' },
    { date: '03 MAR 2026', title: 'Troca das pastilhas dianteiras', km: '31.850 km', meta: 'R$ 490,00' },
  ];
  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-brand-100 pl-6 dark:border-brand-900">
      {items.map((it) => (
        <li key={it.title} className="relative">
          <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" />
          <div className="text-xs font-semibold text-brand-600 dark:text-brand-400">{it.date}</div>
          <div className="font-semibold">{it.title}</div>
          <div className="text-xs text-muted-foreground">
            {it.km} · {it.meta}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur dark:bg-[hsl(var(--background))]/90">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <a href="#conhecer" className="btn-ghost">
            Conhecer
          </a>
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary">
            Cadastrar meu carro
          </Link>
        </nav>
        <Link href="/login" className="btn-secondary sm:hidden">
          Entrar
        </Link>
      </div>
    </header>
  );
}
