import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Testes unitários do proxy (ex-middleware) de autenticação/sessão.
 *
 * O cliente Supabase é totalmente mockado via vi.mock('@supabase/ssr'),
 * então nenhum Supabase real é necessário — seguindo o padrão do ci.yml.
 */

const getUserMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

import { proxy, updateSession } from './proxy';

const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-key',
};

function request(path: string) {
  return new NextRequest(new URL(`http://localhost${path}`), { env } as never);
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null } });
});

describe('proxy / updateSession — rotas protegidas', () => {
  it('redireciona usuário não autenticado para /login preservando o destino', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await proxy(request('/home'));

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/home');
  });

  it('protege subrotas profundas da área autenticada (/garagem/xyz)', async () => {
    const res = await updateSession(request('/garagem/xyz'));

    expect(res.headers.get('location')).toContain('/login?next=%2Fgaragem%2Fxyz');
  });

  it('permite usuário autenticado em rota protegida e marca como noindex', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const res = await updateSession(request('/home'));

    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('logout: após signOut (sessão inválida), rota protegida volta a redirecionar para /login', async () => {
    // Simula o pós-logout do app-shell: signOut limpa os cookies e a
    // verificação de sessão do proxy passa a não encontrar usuário.
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    const autenticado = await updateSession(request('/perfil'));
    expect(autenticado.headers.get('location')).toBeNull();

    getUserMock.mockResolvedValue({ data: { user: null } });
    const posLogout = await updateSession(request('/perfil'));
    expect(posLogout.headers.get('location')).toContain('/login');
  });
});

describe('proxy / updateSession — rotas públicas', () => {
  it.each(['/', '/login', '/cadastro', '/recuperar-senha', '/termos', '/privacidade'])(
    'não redireciona usuário anônimo em %s',
    async (path) => {
      const res = await updateSession(request(path));
      expect(res.headers.get('location')).toBeNull();
    }
  );

  it('não redireciona paths de assets (contêm ponto ou _next)', async () => {
    const res = await updateSession(request('/_next/static/chunk.abc123.js'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy / updateSession — usuário autenticado em rotas de auth', () => {
  it.each(['/login', '/cadastro', '/recuperar-senha'])(
    'redireciona usuário autenticado de %s para /home',
    async (path) => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });

      const res = await updateSession(request(path));

      const location = new URL(res.headers.get('location')!);
      expect(location.pathname).toBe('/home');
    }
  );
});

describe('proxy / updateSession — export e matcher', () => {
  it('proxy() delega para updateSession()', async () => {
    const viaProxy = await proxy(request('/historico'));
    const viaUpdate = await updateSession(request('/historico'));
    expect(viaProxy.headers.get('location')).toBe(viaUpdate.headers.get('location'));
  });
});
