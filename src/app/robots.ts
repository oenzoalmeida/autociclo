import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/auth/',
          '/home/',
          '/garagem/',
          '/admin/',
          '/quick/',
          '/onboarding/',
          '/perfil/',
          '/suporte/',
          '/alertas/',
          '/gastos/',
          '/historico/',
          '/manutencoes/',
        ],
      },
    ],
    sitemap: 'https://autociclo.vercel.app/sitemap.xml',
  };
}
