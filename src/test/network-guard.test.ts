import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { assertLocalSupabase } from '../../scripts/lib/assert-local-supabase.mjs';
import { isAllowedTestHost } from './allowed-host';
import { guardFetch, guardSocketLayer } from './guards';

// IMPORTANTE: nenhum teste aqui faz rede real. O transporte e sempre um dublê (spy/fake),
// entao os testes continuam seguros mesmo se a guarda ou o setupFiles forem removidos.
const PROD_LIKE = [
  'https://autociclo.vercel.app/',
  'https://projeto-de-producao.supabase.co/rest/v1/vehicles',
  'https://projeto.supabase.co/auth/v1/signup',
  'http://127.0.0.1@evil.example/',
  'http://evil.example:54321/',
  'not a url',
];

describe('guardFetch (camada fetch) com transporte falso', () => {
  it.each(PROD_LIKE)('nao repassa %s ao transporte', async (u) => {
    const inner = vi.fn(async () => new Response('ok'));
    await expect(guardFetch(inner)(u)).rejects.toThrow(/Rede bloqueada/);
    expect(inner).not.toHaveBeenCalled();
  });
  it('repassa localhost', async () => {
    const inner = vi.fn(async () => new Response('ok'));
    await guardFetch(inner)('http://127.0.0.1:54321/rest/v1/');
    expect(inner).toHaveBeenCalledOnce();
  });
  it('funciona mesmo com URL de producao vinda da configuracao', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projeto-de-producao.supabase.co');
    const inner = vi.fn(async () => new Response('ok'));
    await expect(guardFetch(inner)(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/x`)).rejects.toThrow();
    expect(inner).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

describe('guardSocketLayer (camada net/DNS: http, undici) com net/dns falsos', () => {
  function fakes() {
    const connect = vi.fn();
    const lookup = vi.fn();
    const net = { Socket: { prototype: { connect } } };
    const dns = { lookup };
    guardSocketLayer(net, dns);
    return { net, dns, connect, lookup };
  }
  it('bloqueia conexao e DNS para host de producao sem chamar o original', () => {
    const f = fakes();
    expect(() => f.net.Socket.prototype.connect({ host: 'projeto.supabase.co', port: 443 })).toThrow(/Socket bloqueado/);
    expect(() => f.net.Socket.prototype.connect(443, 'autociclo.vercel.app')).toThrow(/Socket bloqueado/);
    expect(() => f.dns.lookup('autociclo.vercel.app')).toThrow(/DNS bloqueado/);
    expect(f.connect).not.toHaveBeenCalled();
    expect(f.lookup).not.toHaveBeenCalled();
  });
  it('permite loopback', () => {
    const f = fakes();
    f.net.Socket.prototype.connect({ host: '127.0.0.1', port: 54321 });
    f.dns.lookup('localhost');
    expect(f.connect).toHaveBeenCalledOnce();
    expect(f.lookup).toHaveBeenCalledOnce();
  });
});

describe('funcao de host permitido', () => {
  it.each(PROD_LIKE)('recusa %s', (u) => expect(isAllowedTestHost(u)).toBe(false));
  it('aceita localhost', () => {
    expect(isAllowedTestHost('http://127.0.0.1:54321/')).toBe(true);
    expect(isAllowedTestHost('http://localhost:54321/')).toBe(true);
  });
});

describe('guarda dos scripts e2e (assertLocalSupabase)', () => {
  it('aceita so stack local', () => {
    expect(() => assertLocalSupabase('http://127.0.0.1:54321')).not.toThrow();
    expect(() => assertLocalSupabase('http://host.docker.internal:54321')).not.toThrow();
  });
  it.each(['https://projeto-de-producao.supabase.co', 'https://autociclo.vercel.app', 'http://127.0.0.1@projeto.supabase.co', 'http://evil.example', 'ftp://127.0.0.1', '', 'lixo'])(
    'recusa %s',
    (u) => expect(() => assertLocalSupabase(u)).toThrow(),
  );
});

describe('registro da trava', () => {
  it('setupFiles registra network-guard no vitest', () => {
    expect(readFileSync('vitest.config.ts', 'utf8')).toMatch(/setupFiles:\s*\[[^\]]*network-guard/);
  });
});
