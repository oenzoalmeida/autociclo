import { LogoHorizontal } from '@/components/brand/logo';

export const metadata = {
  title: 'Termos de Uso — AutoCiclo',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-16">
      <LogoHorizontal />
      <h1 className="mt-4 text-3xl font-extrabold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Ao usar o <strong>AutoCiclo</strong>, você concorda com estes Termos de
          Uso. Leia com atenção.
        </p>

        <h2 className="text-lg font-bold text-foreground">1. Aceitação</h2>
        <p>
          O AutoCiclo é uma plataforma de gestão e acompanhamento da vida útil de
          veículos. O uso é de inteira responsabilidade do usuário.
        </p>

        <h2 className="text-lg font-bold text-foreground">2. Conta e segurança</h2>
        <p>
          Você é responsável por manter a confidencialidade de sua senha e por
          todas as ações realizadas sob sua conta. É proibido compartilhar
          credenciais ou usar a plataforma para finalidades não autorizadas.
        </p>

        <h2 className="text-lg font-bold text-foreground">3. Dados</h2>
        <p>
          Você é responsável pela veracidade das informações fornecidas sobre seus
          veículos e registros. O AutoCiclo pode remover conteúdo que viole estes
          termos ou as leis aplicáveis.
        </p>

        <h2 className="text-lg font-bold text-foreground">4. Limitação de responsabilidade</h2>
        <p>
          O AutoCiclo é uma ferramenta de acompanhamento e não constitui
          diagnóstico mecânico, laudo técnico, garantia ou recomendação de
          oficina. As previsões de manutenção são estimativas baseadas nos
          registros inseridos pelo usuário e não substituem as recomendações do
          fabricante ou de um profissional qualificado.
        </p>

        <h2 className="text-lg font-bold text-foreground">5. Propriedade intelectual</h2>
        <p>
          Todo o conteúdo da plataforma é de propriedade da AutoCiclo ou de seus
          licenciadores. É proibido reproduzir, distribuir ou comercializar o
          sistema, seu código ou suas marcas sem autorização prévia.
        </p>

        <h2 className="text-lg font-bold text-foreground">6. Mudanças nos termos</h2>
        <p>
          Podemos alterar estes termos a qualquer momento. A continuidade do uso
          implica concordância com a versão vigente.
        </p>
      </section>
    </div>
  );
}
