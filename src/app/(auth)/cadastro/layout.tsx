import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Criar conta',
  description:
    'Crie sua conta gratuita no AutoCiclo e organize manutenções, gastos, documentos e o histórico do seu veículo em um só lugar.',
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
