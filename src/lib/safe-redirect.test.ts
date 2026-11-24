import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-redirect';

describe('safeInternalPath', () => {
  it('mantém caminhos internos, com query e hash', () => {
    expect(safeInternalPath('/home')).toBe('/home');
    expect(safeInternalPath('/garagem/123?x=1#topo')).toBe('/garagem/123?x=1#topo');
  });

  it('usa o padrão quando ausente ou vazio', () => {
    expect(safeInternalPath(null)).toBe('/home');
    expect(safeInternalPath(undefined)).toBe('/home');
    expect(safeInternalPath('')).toBe('/home');
    expect(safeInternalPath(null, '/admin')).toBe('/admin');
  });

  it.each([
    '@evil.example',
    '@evil.example/home',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'https://evil.example',
    'http://evil.example/home',
    'javascript:alert(1)',
    'home',
    '/ok\nLocation: https://evil.example',
    '/\tevil',
  ])('rejeita destino externo ou malformado: %s', (value) => {
    expect(safeInternalPath(value)).toBe('/home');
  });

  it('rejeita destino longo demais', () => {
    expect(safeInternalPath('/' + 'a'.repeat(600))).toBe('/home');
  });

  it('o resultado nunca muda a origem quando concatenado ao site', () => {
    const origin = 'https://autociclo.vercel.app';
    for (const value of ['@evil.example', '//evil.example', '/home', '/a/b?next=//x', '/%0d%0a']) {
      expect(new URL(`${origin}${safeInternalPath(value)}`).origin).toBe(origin);
    }
  });
});
