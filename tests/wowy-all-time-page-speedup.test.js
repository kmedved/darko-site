import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The 20260927 rewrite of the all-time WOWY page must return exactly what the 20260814 version
// returned. Output parity was checked against a replica of the published tables; these tests pin
// the pieces that make it hold: the same validation, filters, sort keys, row columns and JSON.
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrations = join(__dirname, '..', 'supabase', 'migrations');
const previousMigration = readFileSync(join(migrations, '20260814_001_publish_unified_wowy_from_1957.sql'), 'utf8');
const speedupMigration = readFileSync(join(migrations, '20260927_001_speed_up_wowy_all_time_page.sql'), 'utf8');

function baseFunction(sql) {
    const start = sql.indexOf('create or replace function public.get_wowy_all_time_player_seasons_page_base(');
    assert.ok(start >= 0, 'the base page function is defined');
    const bodyStart = sql.indexOf('as $function$', start) + 'as $function$'.length;
    return sql.slice(start, sql.indexOf('$function$;', bodyStart) + '$function$;'.length);
}

function between(text, startMarker, endMarker) {
    const start = text.indexOf(startMarker);
    assert.ok(start >= 0, `missing: ${startMarker}`);
    const end = text.indexOf(endMarker, start + startMarker.length);
    assert.ok(end >= 0, `missing: ${endMarker}`);
    return text.slice(start, end);
}

function count(text, fragment) {
    return text.split(fragment).length - 1;
}

const before = baseFunction(previousMigration);
const after = baseFunction(speedupMigration);

test('all-time WOWY rewrite keeps the signature, validation and activation gate verbatim', () => {
    assert.equal(
        between(after, 'create or replace function', '\n    return (\n'),
        between(before, 'create or replace function', '\n    return (\n')
    );
    assert.match(after, /security invoker\nset search_path = ''/);
    assert.match(after, /not public\.is_wowy_season_average_activated\(\)/);
});

test('all-time WOWY rewrite filters with the same predicate', () => {
    const predicate = (sql) => between(sql, '            where (\n                    p_min_possessions is null', '\n        ),');
    assert.equal(predicate(after), predicate(before));
    assert.equal(count(after, "or season_possessions >= p_min_possessions"), 1);
});

test('all-time WOWY rewrite sorts pages in the same order', () => {
    const ordered = before.slice(before.indexOf('        ordered_rows as ('));
    const sortKeys = between(ordered, "case when normalized_sort_column = 'player_name'", 'leaderboard_rank asc');
    assert.equal(count(sortKeys, 'case when normalized_sort_column'), 20);
    // The rank is row_number() over (wowy_rapm desc, season desc, nba_id), so those columns are the
    // same final tie-breaker. The page query and its numbering use the identical order.
    const newOrder = `${sortKeys}wowy_rapm desc,\n                        season desc,\n                        nba_id asc\n`;
    assert.equal(count(after, newOrder), 2);
    assert.equal(count(before, "row_number() over (\n                    order by\n                        averages.wowy_rapm desc,\n                        averages.season desc,\n                        averages.nba_id\n                ) as leaderboard_rank"), 1);
    assert.match(after, /limit p_limit\n\s+offset p_offset/);
});

test('all-time WOWY rewrite builds returned rows from the same column expressions', () => {
    for (const alias of ['averages', 'adjusted']) {
        const table = alias === 'averages' ? 'wowy_season_player_averages' : 'wowy_season_adjusted_ratings';
        const original = between(
            before,
            `            select\n                row_number() over (\n                    order by\n                        ${alias}.wowy_rapm desc,`,
            `            from public.${table} as ${alias}`
        );
        const expected = original
            .replace(
                `row_number() over (\n                    order by\n                        ${alias}.wowy_rapm desc,\n                        ${alias}.season desc,\n                        ${alias}.nba_id\n                ) as leaderboard_rank,`,
                'ranks.leaderboard_rank,'
            )
            .replace('public.normalize_wowy_filter_position(players.position) as filter_position', 'player_positions.filter_position')
            .replace(/snapshot_context\n$/, 'snapshot_context,\n                page_keys.page_sort_rank\n');
        assert.notEqual(expected, original);
        assert.equal(count(after, `${expected}            from page_keys\n            join public.${table} as ${alias}`), 1, alias);
    }
});

test('all-time WOWY rewrite assembles the same JSON response', () => {
    const response = (sql) => between(sql, '        select jsonb_build_object(', 'end;\n$function$;');
    assert.equal(response(after), response(before));
});

test('all-time WOWY rewrite normalizes each listed position once and keeps filter rows narrow', () => {
    assert.equal(count(before, 'public.normalize_wowy_filter_position(players.position)'), 2);
    assert.equal(count(after, 'public.normalize_wowy_filter_position(players.position)'), 0);
    assert.equal(count(after, 'public.normalize_wowy_filter_position(listed.position)'), 1);
    assert.match(after, /select distinct players\.position\n\s+from public\.players as players/);
    const narrow = between(after, '        filtered_rows as materialized (', '            from candidate_rows');
    assert.doesNotMatch(narrow, /team_codes|team_names|first_date|method_version/);
});

test('all-time WOWY rewrite keeps the base function private', () => {
    const grants = speedupMigration.slice(speedupMigration.indexOf('$function$;'));
    assert.match(grants, /revoke all on function public\.get_wowy_all_time_player_seasons_page_base\([^)]*\) from public, anon, authenticated;/);
    assert.match(grants, /grant execute on function public\.get_wowy_all_time_player_seasons_page_base\([^)]*\) to service_role;/);
    assert.doesNotMatch(grants, /to anon/);
    assert.doesNotMatch(speedupMigration, /create or replace function public\.get_wowy_all_time_player_seasons_page\(/);
});
