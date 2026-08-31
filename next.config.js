/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Teste de auto-deploy via push na branch main
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'supabase.co' },
    ],
  },
};

module.exports = nextConfig;
