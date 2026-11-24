// Segunda camada, INDEPENDENTE de assertLocalSupabase: mesmo que a checagem de URL seja removida ou
// falhe, cada requisicao (fetch) e cada conexao/DNS dos scripts e2e e reavaliada contra loopback.
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal', 'kong']);

function hostOf(input) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  const u = new URL(raw);
  if (u.username || u.password) throw new Error('userinfo na URL');
  return u.hostname;
}

export function installLocalOnlyNetwork({ target = globalThis, net, dns } = {}) {
  const realFetch = target.fetch;
  target.fetch = async (input, init) => {
    let host;
    try { host = hostOf(input); } catch { throw new Error('Rede bloqueada (e2e): URL invalida ou com userinfo'); }
    if (!LOCAL.has(host)) throw new Error(`Rede bloqueada (e2e): ${host} nao e local`);
    return realFetch(input, init);
  };
  if (net) {
    const realConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function (...args) {
      const o = args[0];
      const ipc = typeof o === 'object' && o !== null && typeof o.path === 'string';
      const host = typeof o === 'object' && o !== null ? o.host : typeof args[1] === 'string' ? args[1] : undefined;
      if (!ipc && host !== undefined && !LOCAL.has(host)) throw new Error(`Socket bloqueado (e2e): ${host}`);
      return realConnect.apply(this, args);
    };
  }
  if (dns) {
    const realLookup = dns.lookup;
    dns.lookup = (...args) => {
      if (typeof args[0] === 'string' && !LOCAL.has(args[0])) throw new Error(`DNS bloqueado (e2e): ${args[0]}`);
      return realLookup(...args);
    };
  }
}
