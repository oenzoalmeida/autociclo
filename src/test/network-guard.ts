// Setup global dos testes unitarios: nenhuma requisicao de rede real a hosts que nao sejam locais.
// Falha rapido e alto se um teste (ou configuracao errada) tentar alcancar producao.
import { isAllowedTestHost } from './allowed-host';

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!isAllowedTestHost(input as string | URL | Request)) {
    throw new Error('Rede bloqueada nos testes: somente localhost. Use mock/interceptacao.');
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;
