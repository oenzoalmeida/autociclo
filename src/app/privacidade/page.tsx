import { LogoHorizontal } from '@/components/brand/logo';

export const metadata = {
  title: 'Política de Privacidade — AutoCiclo',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-16">
      <LogoHorizontal />
      <h1 className="mt-4 text-3xl font-extrabold">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 12 de setembro de 2026 · versão 1.0
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          A <strong>AutoCiclo</strong> respeita sua privacidade. Esta Política descreve como
          coletamos, usamos, armazenamos e protegemos os dados fornecidos ao usar nosso
          serviço de prontuário digital de veículos, em conformidade com a Lei Geral de
          Proteção de Dados — LGPD (Lei nº 13.709/2018).
        </p>

        <h2 className="text-lg font-bold text-foreground">1. Dados tratados</h2>
        <ul className="list-disc pl-5">
          <li><strong>Dados de cadastro (fornecidos por você):</strong> nome, e-mail e senha.</li>
          <li><strong>Dados do veículo (fornecidos por você):</strong> marca, modelo, versão, ano, quilometragem, combustível, cor, apelido, placa (opcional), foto e documentos com vencimento.</li>
          <li><strong>Registros gerados pelo uso:</strong> manutenções, despesas, abastecimentos, registros de quilometragem, alertas e preferências.</li>
          <li><strong>Suporte (opcional):</strong> nome, e-mail e mensagem enviados em tickets de suporte.</li>
          <li><strong>Dados técnicos:</strong> registros de atividade e de sessão para segurança e melhoria do serviço.</li>
        </ul>
        <p>
          Não coletamos dados sensíveis nos termos do art. 5º, II, da LGPD, nem dados de
          pagamento.
        </p>

        <h2 className="text-lg font-bold text-foreground">2. Finalidade e base legal</h2>
        <p>
          Os dados são usados exclusivamente para fornecer o prontuário digital do seu
          veículo, calcular estimativas de manutenção, gerar alertas internos e permitir a
          exportação dos seus dados. A base legal é a <strong>execução de contrato</strong>
          {' '}(art. 7º, V, LGPD — criação e manutenção da conta). Nome, e-mail e senha são
          obrigatórios para a conta; os demais dados são opcionais e fornecidos por sua
          escolha.
        </p>

        <h2 className="text-lg font-bold text-foreground">3. Compartilhamento e acesso</h2>
        <p>
          Seus dados <strong>não são vendidos nem compartilhados para publicidade</strong>.
          Contas administrativas da plataforma possuem acesso <strong>de leitura</strong> aos
          registros para fins de suporte e moderação; as placas são exibidas parcialmente
          ocultas nesses painéis. O acesso é controlado por políticas de segurança a nível de
          linha (Row Level Security) no banco de dados: cada usuário só pode criar e alterar
          os próprios dados. No futuro, se houver compartilhamento de veículos entre
          usuários, o proprietário controlará exatamente o que será compartilhado.
        </p>

        <h2 className="text-lg font-bold text-foreground">4. Provedores e transferência internacional</h2>
        <p>
          A plataforma opera sobre dois provedores de infraestrutura: <strong>Supabase</strong>
          {' '}(autenticação, banco de dados PostgreSQL e armazenamento de arquivos) e
          <strong> Vercel</strong> (hospedagem da aplicação). Em razão desses provedores, seus
          dados podem ser armazenados ou processados <strong>fora do Brasil</strong>, sujeitos
          à transferência internacional prevista no art. 33 da LGPD. [REGIÃO DE ARMAZENAMENTO
          PENDENTE DE DEFINIÇÃO]
        </p>

        <h2 className="text-lg font-bold text-foreground">5. Retenção e exclusão</h2>
        <p>
          Seus dados são mantidos enquanto sua conta existir. A <strong>exclusão da
          conta</strong> está disponível na página Perfil e apaga de forma definitiva o
          cadastro, os veículos, os registros e os arquivos enviados. Registros de
          quilometragem são imutáveis por design (correções geram novos registros) e são
          apagados junto com a conta. [PRAZO DE RETENÇÃO COMPLEMENTAR PENDENTE DE DEFINIÇÃO]
        </p>

        <h2 className="text-lg font-bold text-foreground">6. Segurança</h2>
        <p>
          Os dados trafegam criptografados (HTTPS) e são armazenados com criptografia e
          controles de acesso gerenciados pelo Supabase. Arquivos enviados ficam em bucket
          privado, acessível somente ao proprietário. Nenhuma credencial administrativa ou
          chave secreta é armazenada no navegador do usuário.
        </p>

        <h2 className="text-lg font-bold text-foreground">7. Seus direitos</h2>
        <p>
          Conforme a LGPD, você pode: acessar, corrigir, portar (exportação em Markdown na
          página Perfil) e excluir seus dados, além de solicitar informações sobre o
          tratamento. Acesso, correção, portabilidade e exclusão estão disponíveis na própria
          interface. Demais solicitações: <strong>enzoalmeida.dev@outlook.com</strong>.
        </p>

        <h2 className="text-lg font-bold text-foreground">8. Menores de idade</h2>
        <p>[PENDENTE DE DEFINIÇÃO]</p>

        <h2 className="text-lg font-bold text-foreground">9. Cookies</h2>
        <p>
          Utilizamos apenas cookies estritamente necessários para autenticação, preferências
          de tema e funcionamento do PWA. Não usamos cookies de analytics, publicidade ou
          rastreamento.
        </p>

        <h2 className="text-lg font-bold text-foreground">10. Alterações desta política</h2>
        <p>
          Esta política pode ser atualizada; a data de revisão no topo indica a versão
          vigente. Mudanças relevantes serão destacadas na aplicação.
        </p>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        Ao usar o AutoCiclo, você concorda com os termos desta Política de Privacidade e
        dos nossos <a className="underline" href="/termos">Termos de Uso</a>.
      </p>
    </div>
  );
}
