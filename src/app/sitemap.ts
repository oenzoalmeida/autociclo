import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://autociclo.vercel.app';
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privacidade`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/termos`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
