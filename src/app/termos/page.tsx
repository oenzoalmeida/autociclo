import { LogoHorizontal } from '@/components/brand/logo';

export const metadata = {
  title: 'Termos de Uso — AutoCiclo',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-16">
      <LogoHorizontal />
      <h1 className="mt-4 text-3xl font-extrabold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 12 de setembro de 2026 · versão 1.0
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Ao usar o <strong>AutoCiclo</strong>, você concorda com estes Termos de
          Uso. Leia com atenção.
        </p>

        <h2 className="text-lg font-bold text-foreground">1. Aceitação e finalidade</h2>
        <p>
          O AutoCiclo é uma plataforma de gestão e acompanhamento da vida útil de
          veículos, disponibilizada como projeto de demonstração. O uso é pessoal e de
          inteira responsabilidade do usuário.
        </p>

        <h2 className="text-lg font-bold text-foreground">2. Conta e segurança</h2>
        <p>
          O cadastro solicita nome, e-mail e senha. Você é responsável por manter a
          confidencialidade de sua senha e por todas as ações realizadas sob sua conta. É
          proibido compartilhar credenciais ou usar a plataforma para finalidades não
          autorizadas.
        </p>

        <h2 className="text-lg font-bold text-foreground">3. Dados do usuário</h2>
        <p>
          Você é responsável pela veracidade das informações fornecidas sobre seus
          veículos e registros. O conteúdo que você cadastra (veículos, manutenções,
          abastecimentos, documentos) permanece de sua titularidade, concedendo à
          plataforma apenas a permissão necessária para armazenamento e exibição a você.
          O AutoCiclo pode remover conteúdo que viole estes termos ou as leis aplicáveis.
        </p>

        <h2 className="text-lg font-bold text-foreground">4. Score, alertas e estimativas</h2>
        <p>
          O AutoCiclo Score e os alertas de manutenção são <strong>estimativas</strong>{' '}
          calculadas a partir dos registros inseridos por você e de intervalos de
          referência geral — não representam diagnóstico mecânico, laudo técnico,
          garantia ou recomendação de oficina, e <strong>não substituem as recomendações
          do fabricante ou de um profissional qualificado</strong>. Decisões de
          manutenção e reparo são de responsabilidade do proprietário.
        </p>

        <h2 className="text-lg font-bold text-foreground">5. Uso permitido e proibições</h2>
        <p>
          É proibido utilizar a plataforma para práticas ilícitas, tentar acessar contas
          de terceiros, sobrecarregar a infraestrutura ou automatizar requisições de
          forma abusiva.
        </p>

        <h2 className="text-lg font-bold text-foreground">6. Disponibilidade e encerramento</h2>
        <p>
          A plataforma é hospedada em serviços de nuvem de terceiros e pode ficar
          temporariamente indisponível. Você pode encerrar o uso a qualquer momento; a
          exclusão definitiva da conta e dos dados está disponível na página Perfil.
        </p>

        <h2 className="text-lg font-bold text-foreground">7. Limitação de responsabilidade</h2>
        <p>
          O serviço é fornecido &quot;no estado em que se encontra&quot;. O autor não
          responde por perdas de dados, danos ao veículo, lucros cessantes ou danos
          indiretos decorrentes do uso.
        </p>

        <h2 className="text-lg font-bold text-foreground">8. Cobrança</h2>
        <p>O AutoCiclo é gratuito e não realiza qualquer cobrança.</p>

        <h2 className="text-lg font-bold text-foreground">9. Propriedade intelectual</h2>
        <p>
          O código, o nome, o logotipo e a identidade visual da plataforma pertencem ao
          seu autor. É proibido reproduzir, distribuir ou comercializar o sistema, seu
          código ou suas marcas fora das condições da licença do repositório. Marcas de
          veículos citadas pertencem aos seus respectivos titulares.
        </p>

        <h2 className="text-lg font-bold text-foreground">10. Legislação e mudanças nos termos</h2>
        <p>
          Aplicam-se as leis brasileiras. Podemos alterar estes termos a qualquer
          momento; a data de revisão no topo indica a versão vigente e a continuidade do
          uso implica concordância. Dúvidas: <strong>enzoalmeida.dev@outlook.com</strong>.
        </p>
      </section>
    </div>
  );
}
