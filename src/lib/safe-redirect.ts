// Destino pós-login seguro: só caminhos internos do próprio site.
// Rejeita URL absoluta, "//host", "\\host", "@host", esquemas e caracteres de controle,
// que transformariam `${origin}${next}` em redirecionamento para outro domínio.
export function safeInternalPath(next: string | null | undefined, fallback = '/home'): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const parsed = new URL(next, 'https://autociclo.invalid');
    if (parsed.origin !== 'https://autociclo.invalid') return fallback;
  } catch {
    return fallback;
  }
  return next;
}
