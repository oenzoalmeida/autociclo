#!/usr/bin/env python3
"""Verificação da export_user_data_snapshot em Postgres real (ferramenta dev).

Sobe um Postgres descartável (pgserver), aplica as migrações do repositório
com stubs mínimos dos schemas auth/storage do Supabase e prova:

1. Consistência de snapshot: o escritor commita o registro pai PRIMEIRO e o
   item filho DEPOIS (transações separadas). Nessa ordem, qualquer leitura de
   snapshot único que contenha o filho contém necessariamente o pai (o pai
   commitou antes); logo "filho sem pai" é um estado impossível em qualquer
   snapshot coerente — e é exatamente a violação que READ COMMITTED permite
   entre comandos distintos (cada comando tem seu snapshot). A função real em
   UM comando SQL retornou 0 violações; a variante de controle com VÁRIOS
   comandos exibiu a violação. O teste cobre inserções concorrentes no par
   maintenance_records/maintenance_record_items; não mede outros tipos de
   concorrência (updates/deletes) nem outras tabelas.
2. Isolamento: dono A vê só os dados de A; outro dono B idem; um admin NÃO
   recebe dados de terceiros (filtro explícito user_id = auth.uid(), mesmo
   com papel admin); papel anon não executa a função.
3. Permissões da migração 00009 (revoke public/anon, grant authenticated).

Uso: python3 scripts/verify_export_snapshot.py   (requer pip install pgserver psycopg[binary])
"""

import json
import pathlib
import threading
import time
import uuid

import pgserver
import psycopg

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / 'supabase' / 'migrations').glob('0*.sql')) + [
    ROOT / 'supabase' / 'migrations' / '20261015185040_harden_function_permissions.sql'
]
# 00009 (export) é aplicada DEPOIS dos grants genéricos, para que seus
# revoke/grant fiquem por último, como ocorrerá no banco real.
MIGRATIONS = [m for m in MIGRATIONS if m.name != '00009_export_user_data_snapshot.sql']
EXPORT_MIGRATION = ROOT / 'supabase' / 'migrations' / '00009_export_user_data_snapshot.sql'

USER_A = uuid.uuid4()
USER_B = uuid.uuid4()
ADMIN = uuid.uuid4()


def main():
    print('Subindo Postgres descartável (pgserver)...')
    srv = pgserver.get_server('/tmp/autociclo-pgverify')
    uri = srv.get_uri()
    conn = psycopg.connect(uri, autocommit=True)
    cur = conn.cursor()

    cur.execute("""
        create role anon nologin;
        create role authenticated nologin;
        create schema auth;
        create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
        create or replace function auth.uid() returns uuid language sql stable as $f$
          select (nullif(nullif(current_setting('request.jwt.claims', true), ''), '')::jsonb ->> 'sub')::uuid $f$;
        create or replace function auth.role() returns text language sql stable as $f$
          select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $f$;
        create schema storage;
        create table storage.buckets(id text primary key, name text, public boolean default false);
        create table storage.objects(id uuid primary key default gen_random_uuid(),
                                     name text, owner uuid, bucket_id text);
    """)

    for path in MIGRATIONS:
        # Extensões uuid-ossp/pgcrypto não existem no Postgres embutido do
        # pgserver; as migrações só as usam na função demo (não executada) e os
        # defaults usam gen_random_uuid() nativo.
        sql = '\n'.join(l for l in path.read_text(encoding='utf-8').split('\n')
                         if not l.lower().startswith('create extension'))
        cur.execute(sql)
        print(f'  migração {path.name} aplicada')

    cur.execute("""
        grant usage on schema public, auth, storage to authenticated, anon;
        grant select, insert, update, delete on all tables in schema public to authenticated;
        grant select on all tables in schema public to anon;
        grant execute on all functions in schema public to authenticated, anon;
    """)
    cur.execute(EXPORT_MIGRATION.read_text(encoding='utf-8'))
    print('  migração 00009 (export) aplicada por último')

    # ------------------------- massa de dados --------------------------------
    for uid, email in [(USER_A, 'a@test.dev'), (USER_B, 'b@test.dev'), (ADMIN, 'adm@test.dev')]:
        cur.execute('insert into auth.users(id, email) values (%s, %s)', (uid, email))
    cur.execute("update public.user_roles set role = 'admin' where user_id = %s", (ADMIN,))

    def seed(uid, tag):
        vid = uuid.uuid4()
        cur.execute(
            'insert into public.vehicles(id, user_id, brand, model, year_model) values (%s, %s, %s, %s, 2020)',
            (vid, uid, tag, 'Modelo', ))
        iid = uuid.uuid4()
        cur.execute(
            'insert into public.vehicle_maintenance_items(id, vehicle_id, user_id, name, category) values (%s, %s, %s, %s, %s)',
            (iid, vid, uid, f'Item {tag}', 'geral'))
        rid = uuid.uuid4()
        cur.execute(
            'insert into public.maintenance_records(id, vehicle_id, user_id, service_date, mileage) values (%s, %s, %s, current_date, 1000)',
            (rid, vid, uid))
        cur.execute(
            'insert into public.maintenance_record_items(record_id, maintenance_item_id) values (%s, %s)',
            (rid, iid))
        return vid, rid

    seed(USER_A, 'A')
    seed(USER_B, 'B')
    seed(ADMIN, 'ADM')

    def export_as(uid, role='authenticated'):
        with psycopg.connect(uri) as c:
            c.execute('set local role ' + ('authenticated' if role == 'authenticated' else 'anon'))
            c.execute("select set_config('request.jwt.claims', %s, true)",
                      (json.dumps({'sub': str(uid), 'role': role}),))
            return c.execute('select public.export_user_data_snapshot()').fetchone()[0]

    # ------------------------- teste 2: isolamento ---------------------------
    out_a = export_as(USER_A)
    ids_a = {v['user_id'] for v in out_a['vehicles']}
    assert ids_a == {str(USER_A)}, f'A vê dados além dos próprios: {ids_a}'
    rec_ids_a = {r['id'] for r in out_a['maintenance_records']}
    assert all(i['record_id'] in rec_ids_a for i in out_a['maintenance_record_items'])
    out_b = export_as(USER_B)
    assert {v['user_id'] for v in out_b['vehicles']} == {str(USER_B)}
    out_adm = export_as(ADMIN)
    assert {v['user_id'] for v in out_adm['vehicles']} == {str(ADMIN)}, \
        f"admin exportou dados de terceiros: {out_adm['vehicles']}"
    rec_ids_adm = {r['id'] for r in out_adm['maintenance_records']}
    assert all(i['record_id'] in rec_ids_adm for i in out_adm['maintenance_record_items']), \
        'admin exportou itens de registros de terceiros'
    print('ok isolamento: dono A, dono B e admin veem apenas os próprios dados')

    # ------------------------- teste 3: permissões ---------------------------
    try:
        export_as(USER_A, role='anon')
        raise AssertionError('anon conseguiu executar a função')
    except psycopg.errors.InsufficientPrivilege:
        print('ok permissões: execute negado ao papel anon')
    perms = cur.execute("""
        select has_function_privilege('anon', 'public.export_user_data_snapshot()', 'execute') as anon_ok,
               has_function_privilege('authenticated', 'public.export_user_data_snapshot()', 'execute') as auth_ok,
               has_function_privilege('public', 'public.export_user_data_snapshot()', 'execute') as public_ok
    """).fetchone()
    assert perms == (False, True, False), f'permissões inesperadas: {perms}'
    print('ok permissões da migração: anon/public sem execute, authenticated com execute')

    # volatilidade declarada da função (informativo)
    vol = cur.execute("select provolatile from pg_proc where proname = 'export_user_data_snapshot'").fetchone()[0]
    print(f'info: provolatile={vol} (v=volatile; a consistência vem do comando único, não da volatilidade)')

    # ------------------ teste 1: consistência sob concorrência ----------------
    # Controle: mesma leitura em VÁRIOS comandos (um snapshot por comando).
    cur.execute("""
        create or replace function public.export_multi_statement()
        returns jsonb language plpgsql security invoker set search_path = '' as $f$
        declare
          uid uuid := auth.uid();
          recs jsonb; items jsonb;
        begin
          select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
            into recs from (select * from public.maintenance_records where user_id = uid) t;
          select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at, t.id), '[]'::jsonb)
            into items from (select mri.* from public.maintenance_record_items mri
                             join public.maintenance_records mr on mr.id = mri.record_id
                             where mr.user_id = uid) t;
          return jsonb_build_object('maintenance_records', recs, 'maintenance_record_items', items);
        end; $f$;
        grant execute on function public.export_multi_statement() to authenticated;
    """)
    vid, _ = seed(USER_A, 'CARGA')
    item_id = uuid.uuid4()
    cur.execute(
        'insert into public.vehicle_maintenance_items(id, vehicle_id, user_id, name, category) values (%s, %s, %s, %s, %s)',
        (item_id, vid, USER_A, 'Item carga', 'geral'))

    stop = threading.Event()

    def writer():
        with psycopg.connect(uri, autocommit=True) as c:
            while not stop.is_set():
                rid = uuid.uuid4()
                c.execute(
                    'insert into public.maintenance_records(id, vehicle_id, user_id, service_date, mileage) values (%s, %s, %s, current_date, 1000)',
                    (rid, vid, USER_A))
                # commit do pai ANTES do filho: leitura multi-comando pode ver
                # o filho num snapshot novo sem o pai no snapshot velho.
                c.execute(
                    'insert into public.maintenance_record_items(record_id, maintenance_item_id) values (%s, %s)',
                    (rid, item_id))
                time.sleep(0.001)

    def orphans(payload):
        rec_ids = {r['id'] for r in payload['maintenance_records']}
        return sum(1 for i in payload['maintenance_record_items'] if i['record_id'] not in rec_ids)

    t = threading.Thread(target=writer)
    t.start()
    # Invariante verificado: todo item retornado tem o registro pai no mesmo
    # resultado. Com o escritor commitando pai->filho, esse é o único estado
    # impossível num snapshot único — logo 0 violações é a prova, e as
    # violações do controle provam que a janela multi-comando existe.
    snap_viol = multi_viol = 0
    rounds = 200
    with psycopg.connect(uri) as c:
        for _ in range(rounds):
            with c.transaction():
                c.execute('set local role authenticated')
                c.execute("select set_config('request.jwt.claims', %s, true)",
                          (json.dumps({'sub': str(USER_A), 'role': 'authenticated'}),))
                snap = c.execute('select public.export_user_data_snapshot()').fetchone()[0]
                multi = c.execute('select public.export_multi_statement()').fetchone()[0]
            snap_viol += orphans(snap)
            multi_viol += orphans(multi)
    stop.set()
    t.join()
    print(f'consistência: {rounds} rodadas sob escrita concorrente -> '
          f'snapshot (comando único): {snap_viol} violações; controle (multi-comando): {multi_viol} violações')
    assert snap_viol == 0, 'snapshot retornou itens órfãos: consistência FALHOU'
    assert multi_viol > 0, 'controle multi-comando não exibiu violação; prova inconclusiva (aumente as rodadas)'
    print('\nTODOS OS TESTES PASSARAM')


if __name__ == '__main__':
    main()
