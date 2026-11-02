// Smoke test contra a stack local descartável do Supabase (job `supabase` do CI).
// Falha se a stack não subiu, se as migrações não aplicaram ou se o PostgREST
// não está servindo o schema público.
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  execSync('supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.replace(/"/g, '').split('=')),
);
const { API_URL, ANON_KEY } = env;
if (!API_URL || !ANON_KEY) throw new Error('supabase status não retornou API_URL/ANON_KEY');

const get = async (path) => {
  const r = await fetch(`${API_URL}${path}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  return r.status;
};

const checks = [
  ['/rest/v1/profiles?select=id&limit=1', 'tabela profiles (migração 00001)'],
  ['/rest/v1/vehicles?select=id&limit=1', 'tabela vehicles (migração 00001)'],
  ['/rest/v1/vehicle_maintenance_items?select=id&limit=1', 'tabela vehicle_maintenance_items (migração 00007)'],
];
let failed = 0;
for (const [path, label] of checks) {
  const status = await get(path);
  const ok = status === 200; // RLS pode filtrar as linhas: 200 com [] já prova schema aplicado
  console.log(`${ok ? 'ok' : 'FALHOU'} ${status} ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('Supabase local: migrações aplicadas e PostgREST servindo o schema.');
