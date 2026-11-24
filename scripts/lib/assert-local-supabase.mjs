// Trava de seguranca: os testes que criam usuarios ou escrevem dados so rodam contra a stack local descartavel.
// Qualquer outro host (inclusive *.supabase.co) e recusado, mesmo que alguem aponte a configuracao para la por engano.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal', 'kong']);

export function assertLocalSupabase(url) {
  let u;
  try {
    u = new URL(String(url));
  } catch {
    throw new Error('URL do Supabase invalida: teste recusado por seguranca');
  }
  if (u.username || u.password || !['http:', 'https:'].includes(u.protocol) || !LOCAL_HOSTS.has(u.hostname)) {
    throw new Error(`Recusado: ${u.hostname || 'host desconhecido'} nao e a stack local descartavel. Testes de escrita nunca rodam contra producao.`);
  }
  return u;
}
