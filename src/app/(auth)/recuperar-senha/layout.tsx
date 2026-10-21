import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recuperar senha',
  description: 'Receba um link para redefinir a senha da sua conta AutoCiclo.',
  robots: { index: false, follow: true },
};

export default function RecuperarSenhaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
