import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { installLocalOnlyNetwork } from '../../scripts/lib/local-only-network.mjs';

// Nenhuma rede real: fetch, net e dns sao falsos. Prova que a contencao dos scripts e2e funciona
// mesmo se assertLocalSupabase for removido ou falhar.
function setup() {
  const fetchSpy = vi.fn(async () => new Response('ok'));
  const connect = vi.fn();
  const lookup = vi.fn();
  const target = { fetch: fetchSpy } as { fetch: typeof fetch };
  const net = { Socket: { prototype: { connect } } };
  const dns = { lookup };
  (installLocalOnlyNetwork as (o: unknown) => void)({ target, net, dns });
  return { target, fetchSpy, net, dns, connect, lookup };
}

describe('contencao de rede dos scripts e2e (independente da checagem de URL)', () => {
  it.each([
    'https://projeto-de-producao.supabase.co/auth/v1/signup',
    'https://autociclo.vercel.app/',
    'http://127.0.0.1@evil.example/',
    'http://user:pw@127.0.0.1:54321/',
    'lixo',
  ])('fetch para %s nao chega ao transporte', async (u) => {
    const s = setup();
    await expect(s.target.fetch(u)).rejects.toThrow(/Rede bloqueada/);
    expect(s.fetchSpy).not.toHaveBeenCalled();
  });
  it('repassa loopback e host.docker.internal', async () => {
    const s = setup();
    await s.target.fetch('http://127.0.0.1:54321/rest/v1/');
    await s.target.fetch('http://host.docker.internal:54321/');
    expect(s.fetchSpy).toHaveBeenCalledTimes(2);
  });
  it('bloqueia socket e DNS nao locais; permite locais e IPC', () => {
    const s = setup();
    expect(() => s.net.Socket.prototype.connect({ host: 'projeto.supabase.co', port: 443 })).toThrow(/Socket bloqueado/);
    expect(() => s.dns.lookup('projeto.supabase.co')).toThrow(/DNS bloqueado/);
    expect(s.connect).not.toHaveBeenCalled();
    s.net.Socket.prototype.connect({ host: '127.0.0.1', port: 1 });
    s.net.Socket.prototype.connect({ path: '/var/run/docker.sock' });
    expect(s.connect).toHaveBeenCalledTimes(2);
  });
  it.each(['scripts/supabase-rls-e2e.mjs', 'scripts/supabase-smoke.mjs'])('%s importa a contencao antes de qualquer outro import', (p) => {
    const imports = readFileSync(p, 'utf8').split('\n').filter((l) => l.startsWith('import '));
    expect(imports[0]).toContain('enforce-local-network.mjs');
  });
});
