import { isAllowedTestHost } from './allowed-host';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Envolve um fetch: so repassa ao transporte interno se o destino for local.
export function guardFetch(inner: FetchFn): FetchFn {
  return async (input, init) => {
    if (!isAllowedTestHost(input as string | URL | Request)) {
      throw new Error('Rede bloqueada nos testes: somente localhost. Use mock/interceptacao.');
    }
    return inner(input, init);
  };
}

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// Camada abaixo do fetch (http/undici/net): bloqueia conexao e resolucao DNS para host nao local.
export function guardSocketLayer(
  net: { Socket: { prototype: { connect: (...a: unknown[]) => unknown } } },
  dns: { lookup: (...a: unknown[]) => unknown },
): void {
  const realConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (this: unknown, ...args: unknown[]) {
    const o = args[0] as { host?: string; path?: string } | number | string | undefined;
    const host = typeof o === 'object' && o !== null ? o.host : typeof args[1] === 'string' ? (args[1] as string) : undefined;
    const isIpc = typeof o === 'object' && o !== null && typeof o.path === 'string';
    if (!isIpc && !(host === undefined ? true : LOCAL.has(host))) {
      throw new Error(`Socket bloqueado nos testes: ${host}`);
    }
    return realConnect.apply(this, args);
  };
  const realLookup = dns.lookup;
  dns.lookup = (...args: unknown[]) => {
    const host = args[0];
    if (typeof host === 'string' && !LOCAL.has(host)) {
      throw new Error(`DNS bloqueado nos testes: ${host}`);
    }
    return realLookup(...args);
  };
}
