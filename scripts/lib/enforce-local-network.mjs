// Importar PRIMEIRO nos scripts e2e: instala a contencao de rede (efeito colateral intencional).
import dns from 'node:dns';
import net from 'node:net';
import { installLocalOnlyNetwork } from './local-only-network.mjs';

installLocalOnlyNetwork({ net, dns });
