// Teste de isolamento entre usuários com Auth e JWT REAIS, contra a stack local
// descartável do Supabase (Docker do runner; job `supabase` do CI).
// Usa só usuários fictícios criados na stack local; nada de produção, nenhum e-mail real.
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  execSync('supabase status -o env', { encoding: 'utf8' })
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);
const API = env.API_URL;
const ANON = env.ANON_KEY;
const SERVICE = env.SERVICE_ROLE_KEY || env.SECRET_KEY;
if (!API || !ANON || !SERVICE) throw new Error('supabase status sem API_URL/ANON_KEY/SERVICE_ROLE_KEY');

const call = async (method, path, { token = ANON, key = ANON, body, prefer = 'return=representation' } = {}) => {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, json };
};
const rest = (method, table, token, body, qs = '') => call(method, `/rest/v1/${table}${qs}`, { token, body });
const admin = (method, path, body) => call(method, path, { token: SERVICE, key: SERVICE, body });

const stamp = Date.now();
const mkUser = async (tag) => {
  const email = `rls-${tag}-${stamp}@example.test`;
  const password = `Tmp-${stamp}-${tag}-Xx9!`;
  const c = await admin('POST', '/auth/v1/admin/users', { email, password, email_confirm: true });
  if (c.status >= 300) throw new Error(`criar usuário ${tag}: ${c.status}`);
  const s = await call('POST', '/auth/v1/token?grant_type=password', { body: { email, password } });
  if (s.status !== 200 || !s.json?.access_token) throw new Error(`login ${tag}: ${s.status}`);
  return { id: c.json.id, token: s.json.access_token };
};

let failed = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? 'ok' : 'FALHOU'} ${label}${ok ? '' : ' :: ' + detail}`); if (!ok) failed++; };
// Negado = erro 401/403 (RLS) ou 2xx sem nenhuma linha afetada.
const denied = (res) => res.status === 401 || res.status === 403 || (res.status < 300 && Array.isArray(res.json) && res.json.length === 0);
const allowed = (res) => res.status >= 200 && res.status < 300 && (!Array.isArray(res.json) || res.json.length > 0);

const A = await mkUser('a');
const B = await mkUser('b');
const NIL = '00000000-0000-4000-8000-000000000000';

// Controle: A cria o próprio veículo e registros.
const v = await rest('POST', 'vehicles', A.token, { user_id: A.id, brand: 'Teste', model: 'A', year_model: 2020 });
check('A cria o próprio veículo', allowed(v), JSON.stringify(v));
const VA = v.json?.[0]?.id;
if (!VA) throw new Error('sem veículo de A');
check('A registra a própria quilometragem', allowed(await rest('POST', 'mileage_records', A.token, { vehicle_id: VA, user_id: A.id, mileage: 100, previous_mileage: 0 })));
check('A registra o próprio gasto', allowed(await rest('POST', 'expenses', A.token, { vehicle_id: VA, user_id: A.id, category: 'Teste', description: 'x', amount: 1, expense_date: '2026-01-01' })));
check('A cria manutenção no próprio veículo', allowed(await rest('POST', 'maintenance_records', A.token, { vehicle_id: VA, user_id: A.id, service_date: '2026-01-01', mileage: 100 })));

// Isolamento de leitura.
check('B não vê veículos de A', denied(await rest('GET', 'vehicles', B.token, undefined, `?id=eq.${VA}`)));
check('anon não vê veículos', denied(await rest('GET', 'vehicles', ANON, undefined, `?id=eq.${VA}`)));
check('B não vê gastos de A', denied(await rest('GET', 'expenses', B.token, undefined, `?vehicle_id=eq.${VA}`)));

// Escrita cruzada: B tenta injetar registros no veículo de A.
const injections = [
  ['mileage_records', { vehicle_id: VA, user_id: B.id, mileage: 1, previous_mileage: 0 }],
  ['mileage_records', { vehicle_id: VA, user_id: A.id, mileage: 1, previous_mileage: 0 }],
  ['expenses', { vehicle_id: VA, user_id: B.id, category: 'X', description: 'x', amount: 1, expense_date: '2026-01-01' }],
  ['maintenance_records', { vehicle_id: VA, user_id: B.id, service_date: '2026-01-01', mileage: 1 }],
];
for (const [t, row] of injections) check(`B não injeta em ${t} no veículo de A (user_id ${row.user_id === B.id ? 'B' : 'A'})`, denied(await rest('POST', t, B.token, row)));

// Oráculo de existência: veículo existente de outro dono e veículo inexistente devem responder igual.
const oracleReal = await rest('POST', 'expenses', B.token, { vehicle_id: VA, user_id: B.id, category: 'X', description: 'x', amount: 1, expense_date: '2026-01-01' });
const oracleNone = await rest('POST', 'expenses', B.token, { vehicle_id: NIL, user_id: B.id, category: 'X', description: 'x', amount: 1, expense_date: '2026-01-01' });
check('resposta igual para veículo alheio e inexistente (sem oráculo)', oracleReal.status === oracleNone.status && oracleReal.json?.code === oracleNone.json?.code, `${oracleReal.status}/${oracleReal.json?.code} vs ${oracleNone.status}/${oracleNone.json?.code}`);

// Alterar/apagar o veículo de A.
check('B não altera veículo de A', denied(await rest('PATCH', 'vehicles', B.token, { nickname: 'invadido' }, `?id=eq.${VA}`)));
check('B não apaga veículo de A', denied(await rest('DELETE', 'vehicles', B.token, undefined, `?id=eq.${VA}`)));

// Chamado de suporte: usuário não abre como Resolvido nem define nota de admin.
const ticket = (extra) => ({ user_id: B.id, name: 'B', email: 'b@example.test', category: 'duvida', subject: 's', message: 'm', ...extra });
check('B abre chamado normal', allowed(await rest('POST', 'support_tickets', B.token, ticket({}))));
check('B não abre chamado como Resolvido', denied(await rest('POST', 'support_tickets', B.token, ticket({ status: 'Resolvido' }))));
check('B não define admin_note', denied(await rest('POST', 'support_tickets', B.token, ticket({ admin_note: 'ok' }))));

// Auditoria final com a chave de serviço (stack local): nada de B dentro do veículo de A.
for (const t of ['mileage_records', 'expenses', 'maintenance_records']) {
  const r = await admin('GET', `/rest/v1/${t}?vehicle_id=eq.${VA}&user_id=eq.${B.id}&select=id`);
  check(`nenhuma linha de B em ${t} no veículo de A`, r.status === 200 && Array.isArray(r.json) && r.json.length === 0, JSON.stringify(r));
}
const va = await admin('GET', `/rest/v1/vehicles?id=eq.${VA}&select=nickname`);
check('veículo de A intacto', va.json?.[0] && va.json[0].nickname !== 'invadido');

// Limpeza (stack é descartável, mas não deixa rastro).
await admin('DELETE', `/auth/v1/admin/users/${A.id}`);
await admin('DELETE', `/auth/v1/admin/users/${B.id}`);

if (failed) { console.log(`${failed} verificação(ões) falharam`); process.exit(1); }
console.log('Isolamento com Auth/JWT reais: todas as verificações passaram.');
