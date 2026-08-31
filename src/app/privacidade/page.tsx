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
        Última atualização: {new Date().toLocaleDateString('pt-BR')}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          A <strong>AutoCiclo</strong> respeita sua privacidade. Esta Política descreve como
          coletamos, usamos, armazenamos e protegemos os dados fornecidos ao usar nosso
          serviço de prontuário digital de veículos.
        </p>

        <h2 className="text-lg font-bold text-foreground">1. Dados coletados</h2>
        <ul className="list-disc pl-5">
          <li><strong>Dados de cadastro:</strong> nome, e-mail e senha.</li>
          <li><strong>Dados do veículo:</strong> marca, modelo, ano, quilometragem, placa (opcional), fotos e documentos.</li>
          <li><strong>Registros:</strong> manutenções, gastos, abastecimentos e histórico.</li>
          <li><strong>Dados técnicos:</strong> logs de acesso e dispositivo para segurança e melhoria do serviço.</li>
        </ul>

        <h2 className="text-lg font-bold text-foreground">2. Finalidade</h2>
        <p>
          Usamos seus dados exclusivamente para fornecer o prontuário digital do seu carro,
          calcular previsões de manutenção, enviar alertas e permitir que você exporte seus
          dados quando solicitar.
        </p>

        <h2 className="text-lg font-bold text-foreground">3. Compartilhamento</h2>
        <p>
          Não compartilhamos seus dados com terceiros para publicidade. O acesso a
          informações sensíveis (documentos, dados financeiros) é restrito ao próprio
          titular da conta. No futuro, se houver compartilhamento de veículos, o proprietário
          controlará exatamente o que será compartilhado.
        </p>

        <h2 className="text-lg font-bold text-foreground">4. Retenção e segurança</h2>
        <p>
          Seus dados são armazenados com criptografia e controles de acesso rigorosos.
          Você pode solicitar a exclusão de sua conta e de todos os seus dados a qualquer
          momento, exceto quando necessário para fins legais ou fiscais.
        </p>

        <h2 className="text-lg font-bold text-foreground">5. Seus direitos</h2>
        <p>
          Conforme a LGPD, você pode: acessar, corrigir, portar ou excluir seus dados;
          revogar consentimentos; e solicitar a interrupção do tratamento de dados pessoais.
          Para exercer qualquer direito, entre em contato através do e-mail indicado no perfil
          da sua conta.
        </p>

        <h2 className="text-lg font-bold text-foreground">6. Cookies</h2>
        <p>
          Nosso site utiliza cookies essenciais para autenticação, preferências de tema e
          funcionamento do PWA. Você pode gerenciar cookies nas configurações do seu navegador.
        </p>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        Ao usar o AutoCiclo, você concorda com os termos desta Política de Privacidade.
      </p>
    </div>
  );
}
