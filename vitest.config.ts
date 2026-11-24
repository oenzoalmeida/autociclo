import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Bloqueia rede real a hosts nao locais em todos os testes unitarios.
    setupFiles: ['./src/test/network-guard.ts'],
  },
});
