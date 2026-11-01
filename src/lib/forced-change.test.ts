import { describe, expect, it } from 'vitest';
import { forcedChangeRedirect, FORCED_CHANGE_PATH } from './forced-change';

describe('forcedChangeRedirect', () => {
  it('não redireciona visitante deslogado', () => {
    expect(forcedChangeRedirect({ loggedIn: false, mustChange: true, pathname: '/home' })).toBeNull();
  });

  it('leva qualquer rota para a troca obrigatória enquanto a flag estiver ativa', () => {
    for (const p of ['/home', '/admin', '/garagem', '/perfil', '/login']) {
      expect(forcedChangeRedirect({ loggedIn: true, mustChange: true, pathname: p })).toBe(FORCED_CHANGE_PATH);
    }
  });

  it('deixa a própria tela de troca acessível com a flag ativa', () => {
    expect(forcedChangeRedirect({ loggedIn: true, mustChange: true, pathname: FORCED_CHANGE_PATH })).toBeNull();
  });

  it('tira da tela de troca quem já resolveu a pendência', () => {
    expect(forcedChangeRedirect({ loggedIn: true, mustChange: false, pathname: FORCED_CHANGE_PATH })).toBe('/home');
  });

  it('não interfere nas rotas de quem não tem pendência', () => {
    for (const p of ['/home', '/admin', '/garagem']) {
      expect(forcedChangeRedirect({ loggedIn: true, mustChange: false, pathname: p })).toBeNull();
    }
  });
});
