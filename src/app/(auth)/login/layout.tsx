import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta AutoCiclo e mantenha o seu carro em dia, sempre.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
