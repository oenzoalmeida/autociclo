import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { assertLocalSupabase } from '../../scripts/lib/assert-local-supabase.mjs';
import { isAllowedTestHost } from './allowed-host';

afterEach(() => vi.unstubAllEnvs());

describe('trava de rede dos testes unitarios', () => {
  it('bloqueia fetch para host de producao, mesmo com a configuracao apontando para ele', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projeto-de-producao.invalid');
    await expect(fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/vehicles`)).rejects.toThrow(/Rede bloqueada/);
  });

  // Hosts que parecem producao so passam pela funcao pura; nunca por fetch real.
  it.each([
    'https://autociclo.vercel.app/',
    'https://projeto.supabase.co/auth/v1/signup',
    'http://127.0.0.1@evil.example/',
    'http://evil.example:54321/',
    'not a url',
  ])('recusa %s', (u) => {
    expect(isAllowedTestHost(u)).toBe(false);
  });

  it.each(['https://alvo.invalid/', 'http://127.0.0.1@alvo.invalid/'])('fetch para %s e bloqueado pela trava', async (u) => {
    await expect(fetch(u)).rejects.toThrow(/Rede bloqueada/);
  });

  it('a trava esta ligada na configuracao do vitest (setupFiles)', () => {
    const cfg = readFileSync('vitest.config.ts', 'utf8');
    expect(cfg).toMatch(/setupFiles:\s*\[[^\]]*network-guard/);
  });

  it('permite localhost', () => {
    expect(isAllowedTestHost('http://127.0.0.1:54321/rest/v1/')).toBe(true);
    expect(isAllowedTestHost('http://localhost:54321/')).toBe(true);
  });
});

describe('guarda dos testes e2e com escrita (assertLocalSupabase)', () => {
  it('aceita so stack local', () => {
    expect(() => assertLocalSupabase('http://127.0.0.1:54321')).not.toThrow();
    expect(() => assertLocalSupabase('http://host.docker.internal:54321')).not.toThrow();
  });
  it.each([
    'https://projeto-de-producao.supabase.co',
    'https://autociclo.vercel.app',
    'http://127.0.0.1@projeto.supabase.co',
    'http://evil.example',
    'ftp://127.0.0.1',
    '',
    'lixo',
  ])('recusa %s', (u) => {
    expect(() => assertLocalSupabase(u)).toThrow();
  });
});
