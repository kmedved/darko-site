#!/usr/bin/env node
// Replay every migration in supabase/migrations/ on a fresh embedded Postgres (PGlite,
// Postgres 17.5) and check the functions this repository owns and the tables the nba_darko
// publisher replaces. Reads the migration files from the working tree; touches no database
// but the in-memory one it creates.
//
//   npm run migrations:replay
//
// Checks, in order (exit code 1 if any fails):
//   1. Every migration applies, in filename order. The manual activation operation
//      (supabase/operations/20260710_activate_wowy_season_player_averages.sql) is attempted
//      after 20260711_001, whose filter helper this copy's RPC needs (production ran an
//      earlier copy on 2026-07-10, before that migration); on empty tables, and without its
//      marker table, its data guard refuses, which is reported, not failed.
//   2. Right after 20260929_001, each function it defines exists with that file's language
//      and body.
//   3. After the full replay, each of those functions is present or absent according to the
//      last later migration that re-creates or drops it, and every function a later
//      migration drops is gone.
//   4. Nothing depends on a table nba_darko's publisher replaces with a plain DROP TABLE
//      (REPLACED_TABLES), for each of them the replay contains: pg_depend lists no normal
//      ('n') dependent of the table, of its row type or of its row type's array type, and a
//      plain DROP TABLE of it succeeds (rolled back). A view, foreign key, rule, policy,
//      row-type function or BEGIN ATOMIC function on one fails this check, naming it.
//   5. EXECUTE on every function 20260929_001 defines that still exists: anon, authenticated
//      and service_role yes, PUBLIC no.
//   6. Idempotence: re-applying 20260929_001 on its own succeeds and leaves all of its
//      functions with the same EXECUTE rule (a function a later migration dropped must not
//      come back executable by PUBLIC); re-applying the later migrations that re-create,
//      drop, alter, grant or revoke on those functions restores, for every function
//      20260929_001 defines or a later migration drops, the post-replay catalog entry in
//      each of CATALOG_FIELDS: signature, arguments with defaults, return type, language,
//      body, settings (proconfig, e.g. search_path), security definer, volatility, strict,
//      parallel safety, leakproof, ACL and owner.
//   7. get_wowy_leaderboard_seasons() lists opening-snapshot seasons before activation and
//      season-average seasons once the operation's marker row exists, including as anon.
//
// PGLITE_PKG overrides the module (for example an alias of a newer PGlite on Postgres 18).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { PGlite } = await import(process.env.PGLITE_PKG ?? '@electric-sql/pglite');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8') }));
const OPERATION = readFileSync(
    join(ROOT, 'supabase', 'operations', '20260710_activate_wowy_season_player_averages.sql'),
    'utf8'
);
const OPERATION_AFTER = '20260711_001_add_wowy_leaderboard_bio_filters.sql';
const REASSERT = '20260929_001_reassert_function_ownership.sql';
const R = REASSERT.slice(0, 12);
const sqlOf = (name) => MIGRATIONS.find((m) => m.name === name).sql;

// What Supabase or the nba_darko publisher provides and no migration creates. Columns are
// only those the migrations reference. Each stub is needed: leaving any one out makes an
// early migration fail with "relation ... does not exist".
const ROLES = ['anon', 'authenticated', 'service_role'].map((r) => `create role ${r} nologin;`);
const TABLE_STUBS = [
    `create table public.players (
        nba_id bigint, player_name text, height double precision, weight double precision,
        dob text, draft_year double precision, draft_slot double precision, position text,
        country text, current_team text, active_roster smallint, season real,
        rookie_season double precision);`,
    `create table public.elo_ratings (
        nba_id bigint primary key, elo_rating double precision, total_comparisons integer,
        wins integer, losses integer, updated_at timestamptz);`,
    `create table public.elo_votes (
        winner_id bigint, loser_id bigint, winner_elo_before numeric, loser_elo_before numeric,
        winner_elo_after numeric, loser_elo_after numeric, elo_delta numeric);`,
    'create table public.season_sim ();',
    'create table public.win_distribution ();',
    `create table public.player_ratings (
        nba_id bigint, date date, season real, active_roster smallint, team_name text,
        tm_id integer, position text, dpm double precision, o_dpm double precision,
        d_dpm double precision);`,
    'create table public.lineup_ratings ();'
];

// The tables nba_darko's publisher (pipeline_scripts/publish/website.py) replaces on every
// publish with a plain DROP TABLE, without CASCADE (player_ratings on a full rebuild). An
// object that depends on one makes that drop fail and every publish roll back.
const REPLACED_TABLES = [
    'player_ratings',
    'lineup_ratings',
    'season_calendar',
    'rating_frames',
    'player_comps',
    'player_seasons',
    'game_updates',
    'rating_moves'
];
// The A.1 pre-flight query of nba_darko's function-ownership plan, extended to the row
// type's array type: a function taking public.player_ratings[] blocks the drop too.
const DEPENDENTS_SQL = `
    select distinct c.relname, pg_describe_object(d.classid, d.objid, d.objsubid) as dependent
    from pg_class c
    join pg_type t on t.oid = c.reltype
    join pg_depend d on d.deptype = 'n'
     and ((d.refclassid = 'pg_class'::regclass and d.refobjid = c.oid)
       or (d.refclassid = 'pg_type'::regclass and d.refobjid in (c.reltype, t.typarray)))
    where c.relnamespace = 'public'::regnamespace and c.relname = any($1)
    order by 1, 2`;

// Every field the idempotence check compares for each tracked function:
// [column alias, catalog expression, label].
const CATALOG_FIELDS = [
    ['signature', 'p.oid::regprocedure::text', 'signature'],
    ['arguments', 'pg_get_function_arguments(p.oid)', 'arguments with defaults'],
    ['result', 'pg_get_function_result(p.oid)', 'return type'],
    ['lanname', 'l.lanname', 'language'],
    ['prosrc', 'p.prosrc', 'body'],
    ['proconfig', 'p.proconfig::text', 'settings (proconfig, e.g. search_path)'],
    ['prosecdef', 'p.prosecdef', 'security definer'],
    ['provolatile', 'p.provolatile', 'volatility'],
    ['proisstrict', 'p.proisstrict', 'strict'],
    ['proparallel', 'p.proparallel', 'parallel safety'],
    ['proleakproof', 'p.proleakproof', 'leakproof'],
    ['acl', 'p.proacl::text', 'ACL'],
    ['owner', 'pg_get_userbyid(p.proowner)', 'owner']
];

// ---------------------------------------------------------------------------------------
// What 20260929_001 defines, and what later migrations do to those names.
if (!MIGRATIONS.some((m) => m.name === REASSERT)) {
    console.error(`${REASSERT} not found in ${MIGRATIONS_DIR}`);
    process.exit(1);
}
const REASSERTED = [
    ...sqlOf(REASSERT).matchAll(
        /create or replace function public\.(\w+)\([\s\S]*?\)\s*returns[\s\S]*?language (\w+)[\s\S]*?as \$function\$([\s\S]*?)\$function\$;/g
    )
].map(([, fn, lang, body]) => ({ fn, lang, body }));
const LATER = MIGRATIONS.filter((m) => m.name > REASSERT);
const LATER_DROPS = LATER.flatMap((m) =>
    [...m.sql.matchAll(/drop function if exists (public\.(\w+)\([^)]*\))/gi)].map(
        ([, signature, fn]) => ({ signature, fn })
    )
);
// Last later event for each name: 'create' or 'drop'.
const lastLaterEvent = new Map();
for (const m of LATER) {
    for (const [, kind, fn] of m.sql.matchAll(
        /(create or replace function|drop function if exists) public\.(\w+)\(/gi
    )) {
        lastLaterEvent.set(fn, kind.toLowerCase().startsWith('drop') ? 'drop' : 'create');
    }
}
// Later migrations that re-create, drop, alter, grant or revoke on a reasserted function.
const LATER_TOUCHING = LATER.filter((m) =>
    [
        ...m.sql.matchAll(
            /(?:create or replace function|drop function if exists|alter function|on function) public\.(\w+)\(/gi
        )
    ].some(([, fn]) => REASSERTED.some((d) => d.fn === fn))
);
const TRACKED = [...new Set([...REASSERTED.map((d) => d.fn), ...LATER_DROPS.map((d) => d.fn)])];

// ---------------------------------------------------------------------------------------
let failures = 0;
const check = (ok, label) => {
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
    if (!ok) failures++;
};
const fmtErr = (e) =>
    [e.message, e.detail && `DETAIL: ${e.detail}`, e.where && `WHERE: ${e.where}`]
        .filter(Boolean)
        .join(' | ');
const rows = async (db, sql, params) => (await db.query(sql, params)).rows;

async function execOrRollback(db, sql) {
    try {
        await db.exec(sql);
        return null;
    } catch (e) {
        try {
            await db.exec('rollback;');
        } catch {}
        return e;
    }
}

async function functionRows(db) {
    return rows(
        db,
        `select p.proname, ${CATALOG_FIELDS.map(([alias, expr]) => `${expr} as ${alias}`).join(', ')}
         from pg_proc p join pg_language l on l.oid = p.prolang
         where p.pronamespace = 'public'::regnamespace and p.proname = any($1)
         order by p.proname, signature`,
        [TRACKED]
    );
}

// Each difference between two functionRows() snapshots, as "signature: label a -> b".
function catalogDifferences(before, after) {
    const bySignature = (list) => new Map(list.map((r) => [r.signature, r]));
    const a = bySignature(before);
    const b = bySignature(after);
    const out = [];
    for (const sig of new Set([...a.keys(), ...b.keys()])) {
        if (!a.has(sig) || !b.has(sig)) {
            out.push(`${sig}: ${a.has(sig) ? 'gone' : 'appeared'}`);
            continue;
        }
        for (const [alias, , label] of CATALOG_FIELDS) {
            const [x, y] = [a.get(sig)[alias], b.get(sig)[alias]];
            if (JSON.stringify(x) !== JSON.stringify(y)) {
                out.push(`${sig}: ${label} ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
            }
        }
    }
    return out;
}

async function checkReplacedTableDependents(db) {
    const present = (
        await rows(
            db,
            `select relname from pg_class
             where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')
               and relname = any($1) order by 1`,
            [REPLACED_TABLES]
        )
    ).map((r) => r.relname);
    const dependents = await rows(db, DEPENDENTS_SQL, [present]);
    for (const table of present) {
        const mine = dependents.filter((d) => d.relname === table).map((d) => d.dependent);
        // The publisher's own statement, inside a transaction that is rolled back.
        const dropErr = await execOrRollback(db, `begin; drop table public.${table}; rollback;`);
        const problems = [
            mine.length && `depended on by ${mine.join('; ')}`,
            dropErr && `plain DROP TABLE fails: ${fmtErr(dropErr)}`
        ].filter(Boolean);
        check(
            problems.length === 0,
            problems.length
                ? `${table}: ${problems.join(' | ')}`
                : `${table}: no dependents in pg_depend; a plain DROP TABLE succeeds (rolled back)`
        );
    }
    const absent = REPLACED_TABLES.filter((t) => !present.includes(t));
    if (absent.length) console.log(`  (not in the replay, so not checked: ${absent.join(', ')})`);
}

async function checkDefinitions(db) {
    const current = await functionRows(db);
    for (const d of REASSERTED) {
        const r = current.find((x) => x.proname === d.fn);
        check(
            r && r.lanname === d.lang && r.prosrc === d.body,
            r
                ? `${r.signature} language=${r.lanname} (file: ${d.lang}), body matches ${R}: ${r.prosrc === d.body}`
                : `${d.fn}: missing`
        );
    }
}

async function checkGrants(db) {
    const current = await functionRows(db);
    for (const d of REASSERTED) {
        const r = current.find((x) => x.proname === d.fn);
        if (!r) {
            console.log(`  (absent) ${d.fn}`);
            continue;
        }
        const [p] = await rows(
            db,
            `select has_function_privilege('anon', $1::regprocedure, 'execute') as anon,
                    has_function_privilege('authenticated', $1::regprocedure, 'execute') as authenticated,
                    has_function_privilege('service_role', $1::regprocedure, 'execute') as service_role,
                    has_function_privilege('public', $1::regprocedure, 'execute') as public`,
            [r.signature]
        );
        check(
            p.anon && p.authenticated && p.service_role && !p.public,
            `${r.signature}: anon=${p.anon} authenticated=${p.authenticated} service_role=${p.service_role} public=${p.public}`
        );
    }
}

const seasons = async (db) =>
    JSON.stringify((await rows(db, 'select public.get_wowy_leaderboard_seasons() as s'))[0].s);

// ---------------------------------------------------------------------------------------
const db = new PGlite();
await db.waitReady;
const [{ v }] = await rows(db, 'select version() as v');
console.log(`${v.split(',')[0]}; ${MIGRATIONS.length} migrations from ${MIGRATIONS_DIR}`);
for (const sql of [...ROLES, ...TABLE_STUBS]) await db.exec(sql);

console.log('\n1. Replay in filename order');
for (const m of MIGRATIONS) {
    const e = await execOrRollback(db, m.sql);
    if (e) {
        check(false, `${m.name}: ${fmtErr(e)}`);
        console.log(`\n${failures} check(s) FAILED`);
        process.exit(1);
    }
    console.log(`  ok  ${m.name}`);
    if (m.name === OPERATION_AFTER) {
        const opErr = await execOrRollback(db, OPERATION);
        console.log(
            `  operation 20260710_activate_wowy_season_player_averages.sql: ${opErr ? `refused on empty data (${opErr.message.slice(0, 60)}...), continuing without it` : 'applied'}`
        );
    }
    if (m.name === REASSERT) {
        console.log(`\n2. Right after ${R}: the ${REASSERTED.length} functions it defines`);
        await checkDefinitions(db);
        console.log('');
    }
}
check(true, `all ${MIGRATIONS.length} migrations applied in order`);

console.log('\n3. After the full replay');
const afterReplay = await functionRows(db);
for (const d of REASSERTED) {
    const r = afterReplay.find((x) => x.proname === d.fn);
    const last = lastLaterEvent.get(d.fn);
    if (last === 'drop') {
        check(!r, `${d.fn}: dropped by a later migration, absent: ${!r}`);
    } else if (last === 'create') {
        check(!!r, `${d.fn}: redefined by a later migration, present: ${!!r}`);
    } else {
        check(
            r && r.lanname === d.lang && r.prosrc === d.body,
            `${d.fn}: present with ${R}'s ${d.lang} definition`
        );
    }
}
for (const { signature, fn } of LATER_DROPS) {
    if (lastLaterEvent.get(fn) !== 'drop') continue;
    const [{ gone }] = await rows(db, 'select to_regprocedure($1) is null as gone', [signature]);
    check(gone, `${signature} no longer exists`);
}
const present = REASSERTED.filter((d) => afterReplay.some((x) => x.proname === d.fn));
console.log(`  ${present.length} of the ${REASSERTED.length} reasserted functions exist`);

console.log('\n4. Nothing depends on a table the publisher replaces with a plain DROP TABLE');
await checkReplacedTableDependents(db);

console.log('\n5. EXECUTE after the full replay (anon, authenticated, service_role yes; PUBLIC no)');
await checkGrants(db);

console.log('\n6. Idempotence');
let e = await execOrRollback(db, sqlOf(REASSERT));
check(!e, `${R} applied again on its own${e ? `: ${fmtErr(e)}` : ''}`);
await checkDefinitions(db);
await checkGrants(db);
for (const m of LATER_TOUCHING) {
    e = await execOrRollback(db, m.sql);
    check(!e, `${m.name} applied again${e ? `: ${fmtErr(e)}` : ''}`);
}
const differences = catalogDifferences(afterReplay, await functionRows(db));
check(
    differences.length === 0,
    `after re-applying ${[R, ...LATER_TOUCHING.map((m) => m.name.slice(0, 12))].join(' + ')}, the functions 20260929_001 defines or later migrations drop are the same ${afterReplay.length} as after the replay, identical in: ${CATALOG_FIELDS.map(([, , label]) => label).join(', ')}`
);
for (const d of differences) console.log(`    differs: ${d}`);

console.log('\n7. Activation-aware get_wowy_leaderboard_seasons()');
await db.exec(`
    insert into public.wowy_season_opening_snapshots
        (season, nba_id, team_code, team_name, opening_date, game_id, wowy_rapm, wowy_orapm,
         wowy_drapm, exposure, career_game_num, player_name)
    values (1985, 101, 'BOS', 'Boston', '1984-10-26', 'syn-1985-101', 5, 3, 2, 100, 400, 'Synthetic A'),
           (1990, 102, 'LAL', 'Los Angeles', '1989-11-03', 'syn-1990-102', 4, 2.5, 1.5, 90, 800, 'Synthetic B');
    insert into public.wowy_season_player_averages
        (season, nba_id, team_code, team_name, team_codes, team_names, first_date, last_date,
         season_games, wowy_rapm, wowy_orapm, wowy_drapm, exposure, player_name)
    values (1980, 101, 'BOS', 'Boston', '{BOS}', '{Boston}', '1979-10-12', '1980-03-30', 1, 1, 0.5, 0.5, 50, 'Synthetic A'),
           (2001, 102, 'LAL', 'Los Angeles', '{LAL}', '{Los Angeles}', '2000-10-31', '2000-10-31', 1, 2, 1, 1, 60, 'Synthetic B');
    -- The operation's marker row is computed from wowy_ratings.
    insert into public.wowy_ratings
        (nba_id, game_id, date, season, career_game_num, age, wowy_rapm, wowy_orapm, wowy_drapm,
         exposure, causal_wowy_rapm, causal_wowy_orapm, causal_wowy_drapm, player_name)
    values (101, 'syn-g-1980', '1979-10-12', 1980, 1, 23, 1, 0.5, 0.5, 50, 1, 0.5, 0.5, 'Synthetic A'),
           (102, 'syn-g-2001', '2000-10-31', 2001, 1, 22, 2, 1, 1, 60, 2, 1, 1, 'Synthetic B');`);
const OPENING = '[1990,1985]';
const AVERAGES = '[2001,1980]';

const [{ absent }] = await rows(
    db,
    "select to_regclass('public.wowy_season_average_activation') is null as absent"
);
let s = await seasons(db);
check(absent && s === OPENING, `no activation table -> ${s} (expected opening snapshots ${OPENING})`);

// The operation's own table DDL and marker insert, taken verbatim from the operations file.
const ddl = OPERATION.match(
    /create table if not exists public\.wowy_season_average_activation[\s\S]*?revoke all on table public\.wowy_season_average_activation\s+from public, anon, authenticated;/
)[0];
const marker = OPERATION.match(
    /insert into public\.wowy_season_average_activation[\s\S]*?excluded\.average_row_count;/
)[0];
await db.exec(ddl);
s = await seasons(db);
check(s === OPENING, `empty activation table -> ${s} (expected ${OPENING})`);

await db.exec(marker);
s = await seasons(db);
check(s === AVERAGES, `marker row present -> ${s} (expected season averages ${AVERAGES})`);

await db.exec('set role anon;');
s = await seasons(db);
let direct;
try {
    await db.query('select * from public.wowy_season_average_activation');
    direct = 'readable';
} catch (err) {
    direct = err.message;
}
await db.exec('reset role;');
check(
    s === AVERAGES && direct !== 'readable',
    `as anon -> ${s}; reading the marker table directly as anon: ${direct}`
);

await db.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exitCode = failures ? 1 : 0;
