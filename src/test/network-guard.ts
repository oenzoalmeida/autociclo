// Setup global dos testes unitarios: default-deny para rede nao local, em duas camadas (fetch e socket/DNS).
import dns from 'node:dns';
import net from 'node:net';
import { guardFetch, guardSocketLayer } from './guards';

globalThis.fetch = guardFetch(globalThis.fetch) as typeof fetch;
guardSocketLayer(net as never, dns as never);
