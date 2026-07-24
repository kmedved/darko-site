import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260710_007_add_active_wowy_leaderboard_rpc.sql'
    ),
    'utf8'
);
const allEraSeasonMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260710_010_add_wowy_season_opening_snapshots.sql'
    ),
    'utf8'
);
const seasonAverageMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260710_011_add_wowy_season_player_averages.sql'
    ),
    'utf8'
);
const allTimeSeasonMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260710_012_add_wowy_all_time_season_leaderboard.sql'
    ),
    'utf8'
);
const bioFilterMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260711_001_add_wowy_leaderboard_bio_filters.sql'
    ),
    'utf8'
);
const seasonAdjustedMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260717_001_add_wowy_season_adjusted_ratings.sql'
    ),
    'utf8'
);
const paginatedAllTimeMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260717_002_paginate_wowy_all_time_leaderboards.sql'
    ),
    'utf8'
);
const seasonBoxContextMigration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260717_003_add_wowy_season_box_context.sql'
    ),
    'utf8'
);
const unified1977Migration = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20260723_001_extend_wowy_publication_to_1978.sql'
    ),
    'utf8'
);
const seasonAverageActivationOperation = readFileSync(
    join(
        __dirname,
        '..',
        'supabase',
        'operations',
        '20260710_activate_wowy_season_player_averages.sql'
    ),
    'utf8'
);
const obsoleteSeasonAverageActivationMigration = join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260710_012_activate_wowy_season_player_averages.sql'
);
const supabaseHelper = readFileSync(
    join(__dirname, '..', 'src', 'lib', 'server', 'supabase.js'),
    'utf8'
);

test('active WOWY leaderboard RPC keeps current roster identity and latest observations', () => {
    assert.match(migration, /function public\.get_active_wowy_player_ratings\(\)/);
    assert.match(migration, /security invoker/);
    assert.match(migration, /where pr\.active_roster = 1/);
    assert.match(migration, /left join public\.players as players/);
    assert.match(migration, /coalesce\(active\.team_name, players\.current_team\) as team_name/);
    assert.match(migration, /coalesce\(active\.position, players\.position\) as position/);
    assert.match(migration, /cross join lateral/);
    assert.match(migration, /where wr\.nba_id = active\.nba_id/);
    assert.match(migration, /order by wr\.date desc/);
    assert.match(
        migration,
        /grant execute on function public\.get_active_wowy_player_ratings\(\)\s+to anon, authenticated, service_role;/
    );
});

test('active WOWY helper exposes the compact leaderboard contract and current-team fallback', () => {
    const normalizerStart = supabaseHelper.indexOf('function normalizeWowyLeaderboardRows(data)');
    const normalizerEnd = supabaseHelper.indexOf('function mergePlayerWithActiveSnapshot', normalizerStart);
    const start = supabaseHelper.indexOf('export async function getActiveWowyPlayers()');
    const end = supabaseHelper.indexOf('export async function getWowyLeaderboardSeasons()', start);
    assert.ok(start >= 0 && end > start, 'WOWY leaderboard helper should be discoverable');
    assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart, 'WOWY row normalizer should be discoverable');

    const helper = supabaseHelper.slice(start, end);
    const normalizer = supabaseHelper.slice(normalizerStart, normalizerEnd);
    assert.match(helper, /CACHE_MS\.activeWowyPlayers/);
    assert.match(helper, /\.rpc\('get_active_wowy_player_ratings'\)/);
    for (const field of [
        'nba_id',
        'player_name',
        'team_name',
        'team_code',
        'tm_id',
        'position',
        'filter_position',
        'height_inches',
        'snapshot_context',
        'wowy_rapm',
        'wowy_orapm',
        'wowy_drapm',
        'exposure',
        'date',
        'career_game_num'
    ]) {
        assert.match(normalizer, new RegExp(`${field}:`));
    }
    assert.match(helper, /const missingTeamIds = rows/);
    assert.match(helper, /!currentTeam/);
    assert.match(helper, /nbaTeamId\(currentTeam\)/);
    assert.match(helper, /getLatestTeamMapByIds\(missingTeamIds\)/);
    assert.match(helper, /mergeWithActiveWowyTeamFallback\(row, teamMap\.get\(row\.nba_id\)\)/);
    assert.match(helper, /sortByWowyRapmDesc\(enriched\)/);
});

test('active WOWY team fallback replaces an unmapped placeholder team name', () => {
    const start = supabaseHelper.indexOf('function mergeWithActiveWowyTeamFallback');
    const end = supabaseHelper.indexOf('function normalizeWowyLeaderboardRows', start);
    assert.ok(start >= 0 && end > start, 'active WOWY team fallback should be discoverable');

    const fallback = supabaseHelper.slice(start, end);
    assert.match(fallback, /!hasResolvableTeam/);
    assert.match(fallback, /team_name: teamFallback\.team_name/);
    assert.match(fallback, /tm_id: teamFallback\.tm_id/);
});

test('historical WOWY rows preserve season context without current-team fallbacks', () => {
    const normalizerStart = supabaseHelper.indexOf('function normalizeWowyLeaderboardRows(data)');
    const normalizerEnd = supabaseHelper.indexOf('function mergePlayerWithActiveSnapshot', normalizerStart);
    assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart, 'WOWY row normalizer should be discoverable');

    const normalizer = supabaseHelper.slice(normalizerStart, normalizerEnd);
    assert.match(normalizer, /snapshotContext/);
    assert.match(normalizer, /snapshot_context: snapshotContext/);
    assert.match(normalizer, /teamCode/);
    assert.match(normalizer, /team_code: teamCode/);
    assert.match(normalizer, /snapshotContext === 'opening-game'/);
    assert.match(normalizer, /snapshotContext === 'season-average'/);
    assert.match(normalizer, /snapshotContext === 'season-adjusted'/);
    assert.match(normalizer, /team_codes:/);
    assert.match(normalizer, /team_names:/);
    assert.match(normalizer, /season:/);
    assert.match(normalizer, /leaderboard_rank:/);
    assert.match(normalizer, /season_games:/);
    assert.match(normalizer, /first_date:/);
    assert.match(normalizer, /last_date:/);
    assert.match(normalizer, /playoff_games:/);
    assert.match(normalizer, /playoff_possessions:/);
    assert.match(normalizer, /season_possessions:/);
    assert.match(normalizer, /method_version:/);
    assert.match(normalizer, /application_model:/);
    assert.match(normalizer, /season >= 1978/);
    assert.match(normalizer, /tm_id: isHistoricalSeasonSummary \? null : resolveTeamId/);
    assert.match(normalizer, /position: isHistoricalSeasonSummary \? null : normalizePosition/);
});

test('unified publication migration accepts 1978 while preserving incumbent rollback', () => {
    for (const constraint of [
        'wowy_season_opening_snapshots_season_check',
        'wowy_season_player_averages_season_check',
        'wowy_season_adjusted_ratings_season_check',
        'wowy_season_box_context_season_check'
    ]) {
        assert.match(
            unified1977Migration,
            new RegExp(`drop constraint if exists ${constraint}`)
        );
    }
    assert.equal(
        (unified1977Migration.match(/check \(season >= 1978\)/g) || []).length,
        4
    );
    assert.match(
        unified1977Migration,
        /check \(season_from >= 1978 and season_through >= season_from\)/
    );
    assert.match(
        unified1977Migration,
        /check \(source_min_season >= 1978\)/
    );
    assert.match(
        unified1977Migration,
        /to_regclass\('public\.wowy_season_average_activation'\) is not null/
    );
    assert.match(unified1977Migration, /accepts both the incumbent 1980/);
});

test('WOWY leaderboard bio filters use canonical position groups without changing historical identity', () => {
    assert.match(
        bioFilterMigration,
        /function public\.normalize_wowy_filter_position\(p_position text\)/
    );
    assert.match(bioFilterMigration, /language sql/);
    assert.match(bioFilterMigration, /immutable/);
    assert.match(bioFilterMigration, /security invoker/);
    assert.match(bioFilterMigration, /'G-F',\s*'F-G'/);
    assert.match(bioFilterMigration, /'F-C',\s*'C-F'/);
    assert.match(bioFilterMigration, /when normalized\.position::numeric <= 2 then 'G'/);
    assert.match(bioFilterMigration, /when normalized\.position::numeric < 5 then 'F-C'/);
    assert.match(
        bioFilterMigration,
        /grant execute on function public\.normalize_wowy_filter_position\(text\)\s+to anon, authenticated, service_role;/
    );

    const activeStart = bioFilterMigration.indexOf(
        'create or replace function public.get_active_wowy_player_ratings()'
    );
    const seasonStart = bioFilterMigration.indexOf(
        'create or replace function public.get_wowy_season_player_ratings(p_season integer)'
    );
    const allTimeStart = bioFilterMigration.indexOf(
        'create or replace function public.get_wowy_all_time_player_seasons()'
    );
    assert.ok(activeStart >= 0 && seasonStart > activeStart && allTimeStart > seasonStart);

    const activeRpc = bioFilterMigration.slice(activeStart, seasonStart);
    const seasonRpc = bioFilterMigration.slice(seasonStart, allTimeStart);
    const allTimeRpc = bioFilterMigration.slice(allTimeStart);
    assert.match(activeRpc, /coalesce\(active\.position, players\.position\) as position/);
    assert.match(
        activeRpc,
        /normalize_wowy_filter_position\(\s*coalesce\(active\.position, players\.position\)/s
    );
    assert.match(activeRpc, /players\.height between 60 and 96/);

    assert.match(seasonRpc, /language plpgsql/);
    assert.match(seasonRpc, /if public\.is_wowy_season_average_activated\(\) then/);
    assert.match(seasonRpc, /null::text as position/);
    assert.match(seasonRpc, /from public\.wowy_season_player_averages as averages/);
    assert.match(seasonRpc, /from public\.wowy_season_opening_snapshots as snapshots/);
    assert.equal(
        (seasonRpc.match(/normalize_wowy_filter_position\(players\.position\) as filter_position/g) || []).length,
        2,
        'both historical publication branches need the explicit filter position'
    );
    assert.equal(
        (seasonRpc.match(/players\.height between 60 and 96/g) || []).length,
        2,
        'both historical publication branches need the same plausible height rule'
    );

    assert.match(allTimeRpc, /null::text as position/);
    assert.match(allTimeRpc, /normalize_wowy_filter_position\(players\.position\) as filter_position/);
    assert.match(allTimeRpc, /players\.height between 60 and 96/);
    assert.match(allTimeRpc, /limit 100/);

    const normalizerStart = supabaseHelper.indexOf('function normalizeWowyLeaderboardRows(data)');
    const normalizerEnd = supabaseHelper.indexOf('function mergePlayerWithActiveSnapshot', normalizerStart);
    const normalizer = supabaseHelper.slice(normalizerStart, normalizerEnd);
    assert.match(normalizer, /filter_position: normalizeWowyFilterPosition/);
    assert.match(normalizer, /height_inches: normalizeHeightInches/);
    assert.match(normalizer, /isHistoricalSeasonSummary \? null : row\.position/);
});

test('all-time WOWY leaderboard uses the fixed top 100 unweighted player-season averages', () => {
    assert.match(
        allTimeSeasonMigration,
        /function public\.is_wowy_season_average_activated\(\)/
    );
    assert.match(allTimeSeasonMigration, /returns boolean/);
    assert.match(allTimeSeasonMigration, /language plpgsql/);
    assert.match(allTimeSeasonMigration, /security definer/);
    assert.match(allTimeSeasonMigration, /to_regclass\('public\.wowy_season_average_activation'\)/);
    assert.match(allTimeSeasonMigration, /execute \$query\$/);
    assert.match(
        allTimeSeasonMigration,
        /from public\.wowy_season_average_activation as activation/
    );
    assert.match(
        allTimeSeasonMigration,
        /revoke all on function public\.is_wowy_season_average_activated\(\) from public;/
    );
    assert.match(
        allTimeSeasonMigration,
        /grant execute on function public\.is_wowy_season_average_activated\(\)\s+to anon, authenticated, service_role;/
    );
    assert.match(
        allTimeSeasonMigration,
        /function public\.get_wowy_all_time_player_seasons\(\)/
    );
    assert.match(allTimeSeasonMigration, /returns jsonb/);
    assert.match(allTimeSeasonMigration, /language plpgsql/);
    assert.match(allTimeSeasonMigration, /security invoker/);
    assert.match(allTimeSeasonMigration, /set search_path = ''/);
    assert.match(allTimeSeasonMigration, /from public\.wowy_season_player_averages as averages/);
    assert.match(allTimeSeasonMigration, /left join public\.players as players/);
    assert.match(allTimeSeasonMigration, /row_number\(\) over/);
    assert.match(allTimeSeasonMigration, /averages\.wowy_rapm desc/);
    assert.match(allTimeSeasonMigration, /averages\.season desc/);
    assert.match(allTimeSeasonMigration, /averages\.nba_id/);
    assert.match(allTimeSeasonMigration, /as leaderboard_rank/);
    assert.match(allTimeSeasonMigration, /limit 100/);
    assert.match(allTimeSeasonMigration, /averages\.team_codes/);
    assert.match(allTimeSeasonMigration, /averages\.team_names/);
    assert.match(allTimeSeasonMigration, /averages\.first_date/);
    assert.match(allTimeSeasonMigration, /averages\.last_date/);
    assert.match(allTimeSeasonMigration, /averages\.season_games/);
    assert.match(allTimeSeasonMigration, /'season-average'::text as snapshot_context/);
    assert.match(allTimeSeasonMigration, /null::integer as tm_id/);
    assert.match(allTimeSeasonMigration, /null::text as position/);
    assert.match(allTimeSeasonMigration, /null::integer as career_game_num/);
    assert.doesNotMatch(allTimeSeasonMigration, /public\.wowy_ratings/);
    assert.doesNotMatch(allTimeSeasonMigration, /public\.player_ratings/);
    assert.doesNotMatch(allTimeSeasonMigration, /public\.wowy_season_opening_snapshots/);
    assert.doesNotMatch(allTimeSeasonMigration, /get_wowy_leaderboard_seasons/);
    assert.doesNotMatch(allTimeSeasonMigration, /get_wowy_season_player_ratings/);
    assert.match(
        allTimeSeasonMigration,
        /revoke all on function public\.get_wowy_all_time_player_seasons\(\) from public;/
    );
    assert.match(
        allTimeSeasonMigration,
        /grant execute on function public\.get_wowy_all_time_player_seasons\(\)\s+to anon, authenticated, service_role;/
    );

    const allTimeFunctionStart = allTimeSeasonMigration.indexOf(
        'create or replace function public.get_wowy_all_time_player_seasons()'
    );
    const allTimeFunctionEnd = allTimeSeasonMigration.indexOf(
        'revoke all on function public.get_wowy_all_time_player_seasons()',
        allTimeFunctionStart
    );
    assert.ok(
        allTimeFunctionStart >= 0 && allTimeFunctionEnd > allTimeFunctionStart,
        'all-time WOWY RPC should be discoverable'
    );
    const allTimeFunction = allTimeSeasonMigration.slice(allTimeFunctionStart, allTimeFunctionEnd);
    const gate = 'if not public.is_wowy_season_average_activated() then';
    assert.match(allTimeFunction, /security invoker/);
    assert.match(allTimeFunction, /return '\[\]'::jsonb/);
    assert.ok(
        allTimeFunction.indexOf(gate) <
            allTimeFunction.indexOf('from public.wowy_season_player_averages as averages'),
        'the certification gate must run before the all-time RPC reads season averages'
    );
});

test('opening-game WOWY publication artifact preserves historical team context', () => {
    assert.match(allEraSeasonMigration, /create table if not exists public\.wowy_season_opening_snapshots/);
    assert.match(allEraSeasonMigration, /primary key \(season, nba_id\)/);
    assert.match(allEraSeasonMigration, /unique \(nba_id, game_id\)/);
    assert.match(allEraSeasonMigration, /season >= 1980/);
    assert.match(allEraSeasonMigration, /team_code text not null/);
    assert.match(allEraSeasonMigration, /team_name text not null/);
    assert.match(allEraSeasonMigration, /opening_date date not null/);
    assert.match(allEraSeasonMigration, /enable row level security/);
    assert.match(allEraSeasonMigration, /wowy_season_opening_snapshots_public_read/);
    assert.match(allEraSeasonMigration, /'opening-game'::text as snapshot_context/);
});

test('all-era historical WOWY rows are sourced from unweighted season averages', () => {
    assert.match(seasonAverageMigration, /create table if not exists public\.wowy_season_player_averages/);
    assert.match(seasonAverageMigration, /arithmetic mean/);
    assert.match(seasonAverageMigration, /primary key \(season, nba_id\)/);
    assert.match(seasonAverageMigration, /season >= 1980/);
    assert.match(seasonAverageMigration, /nba_id > 0/);
    assert.match(seasonAverageMigration, /team_code text not null/);
    assert.match(seasonAverageMigration, /team_name text not null/);
    assert.match(seasonAverageMigration, /team_codes text\[\] not null/);
    assert.match(seasonAverageMigration, /team_names text\[\] not null/);
    assert.match(seasonAverageMigration, /team_code = array_to_string\(team_codes, '\/'\)/);
    assert.match(seasonAverageMigration, /team_name = array_to_string\(team_names, ' \/ '\)/);
    assert.match(seasonAverageMigration, /array_ndims\(team_codes\) = 1/);
    assert.match(seasonAverageMigration, /array_ndims\(team_names\) = 1/);
    assert.match(seasonAverageMigration, /cardinality\(team_codes\) = cardinality\(team_names\)/);
    assert.match(seasonAverageMigration, /first_date date not null/);
    assert.match(seasonAverageMigration, /last_date date not null/);
    assert.match(seasonAverageMigration, /first_date <= last_date/);
    assert.match(seasonAverageMigration, /season_games integer not null/);
    assert.match(seasonAverageMigration, /season_games > 0/);
    assert.match(seasonAverageMigration, /wowy_rapm double precision not null/);
    assert.match(seasonAverageMigration, /wowy_orapm double precision not null/);
    assert.match(seasonAverageMigration, /wowy_drapm double precision not null/);
    assert.match(seasonAverageMigration, /exposure double precision not null/);
    assert.match(seasonAverageMigration, /enable row level security/);
    assert.match(seasonAverageMigration, /wowy_season_player_averages_public_read/);
    assert.match(
        seasonAverageMigration,
        /revoke all on table public\.wowy_season_player_averages\s+from public, anon, authenticated;/
    );
    assert.match(
        seasonAverageMigration,
        /grant select on table public\.wowy_season_player_averages\s+to anon, authenticated;/
    );
    assert.match(seasonAverageMigration, /deliberately only the provisioning phase/);
    assert.doesNotMatch(seasonAverageMigration, /create or replace function public\.get_wowy_leaderboard_seasons\(\)/);
    assert.doesNotMatch(seasonAverageMigration, /wowy_season_average_activation/);
    assert.doesNotMatch(seasonAverageMigration, /do \$guard\$/);

    assert.equal(
        existsSync(obsoleteSeasonAverageActivationMigration),
        false,
        'data-dependent activation must not be replayed as a normal migration'
    );
    assert.match(seasonAverageActivationOperation, /MANUAL PRODUCTION OPERATION/);
    assert.match(seasonAverageActivationOperation, /begin;/);
    assert.match(seasonAverageActivationOperation, /commit;/);
    assert.match(seasonAverageActivationOperation, /do \$guard\$/);
    assert.match(seasonAverageActivationOperation, /source_min_season <> 1980/);
    assert.match(seasonAverageActivationOperation, /coalesce\(sum\(averages\.season_games\), 0\)/);
    assert.match(seasonAverageActivationOperation, /source_groups as/);
    assert.match(seasonAverageActivationOperation, /full outer join public\.wowy_season_player_averages as averages/);
    assert.match(seasonAverageActivationOperation, /avg\(wowy\.wowy_rapm\)::double precision/);
    assert.match(seasonAverageActivationOperation, /avg\(wowy\.wowy_orapm\)::double precision/);
    assert.match(seasonAverageActivationOperation, /avg\(wowy\.wowy_drapm\)::double precision/);
    assert.match(seasonAverageActivationOperation, /avg\(wowy\.exposure\)::double precision/);
    assert.match(seasonAverageActivationOperation, /missing_group_count/);
    assert.match(seasonAverageActivationOperation, /extra_group_count/);
    assert.match(seasonAverageActivationOperation, /mismatched_group_count/);
    assert.match(seasonAverageActivationOperation, /source_season_games <> average_season_games/);
    assert.match(seasonAverageActivationOperation, /source_first_date is distinct from average_first_date/);
    assert.match(seasonAverageActivationOperation, /source_last_date is distinct from average_last_date/);
    assert.match(
        seasonAverageActivationOperation,
        /abs\(source_wowy_rapm - average_wowy_rapm\) > metric_tolerance/
    );
    assert.match(
        seasonAverageActivationOperation,
        /abs\(source_wowy_orapm - average_wowy_orapm\) > metric_tolerance/
    );
    assert.match(
        seasonAverageActivationOperation,
        /abs\(source_wowy_drapm - average_wowy_drapm\) > metric_tolerance/
    );
    assert.match(seasonAverageActivationOperation, /abs\(source_exposure - average_exposure\) > metric_tolerance/);
    assert.match(seasonAverageActivationOperation, /Cannot activate mismatched WOWY season averages/);
    assert.match(seasonAverageActivationOperation, /create table if not exists public\.wowy_season_average_activation/);
    assert.match(seasonAverageActivationOperation, /wowy_season_average_activation_singleton_check check \(id = 1\)/);
    assert.match(seasonAverageActivationOperation, /insert into public\.wowy_season_average_activation/);
    assert.match(seasonAverageActivationOperation, /function public\.get_wowy_leaderboard_seasons\(\)/);
    assert.match(seasonAverageActivationOperation, /function public\.get_wowy_season_player_ratings\(p_season integer\)/);
    assert.match(seasonAverageActivationOperation, /security invoker/);
    assert.match(seasonAverageActivationOperation, /from public\.wowy_season_player_averages as averages/);
    assert.match(seasonAverageActivationOperation, /averages\.team_codes/);
    assert.match(seasonAverageActivationOperation, /averages\.team_names/);
    assert.match(seasonAverageActivationOperation, /averages\.first_date/);
    assert.match(seasonAverageActivationOperation, /averages\.last_date/);
    assert.match(seasonAverageActivationOperation, /averages\.season_games/);
    assert.match(seasonAverageActivationOperation, /averages\.last_date as date/);
    assert.match(seasonAverageActivationOperation, /null::integer as tm_id/);
    assert.match(seasonAverageActivationOperation, /null::text as position/);
    assert.match(
        seasonAverageActivationOperation,
        /normalize_wowy_filter_position\(players\.position\) as filter_position/
    );
    assert.match(seasonAverageActivationOperation, /players\.height between 60 and 96/);
    assert.match(seasonAverageActivationOperation, /null::integer as career_game_num/);
    assert.match(seasonAverageActivationOperation, /'season-average'::text as snapshot_context/);
    assert.match(seasonAverageActivationOperation, /left join public\.players as players/);

    const functionStart = seasonAverageActivationOperation.indexOf(
        'create or replace function public.get_wowy_season_player_ratings(p_season integer)'
    );
    const functionEnd = seasonAverageActivationOperation.indexOf(
        'revoke all on function public.get_wowy_leaderboard_seasons()',
        functionStart
    );
    assert.ok(functionStart >= 0 && functionEnd > functionStart, 'season-average WOWY RPC should be discoverable');
    const seasonalRpc = seasonAverageActivationOperation.slice(functionStart, functionEnd);
    assert.doesNotMatch(seasonalRpc, /public\.player_ratings/);
    assert.doesNotMatch(seasonalRpc, /public\.wowy_ratings/);
    assert.doesNotMatch(seasonalRpc, /public\.wowy_season_opening_snapshots/);
    assert.match(
        seasonAverageActivationOperation,
        /grant execute on function public\.get_wowy_leaderboard_seasons\(\)\s+to anon, authenticated, service_role;/
    );
    assert.match(
        seasonAverageActivationOperation,
        /grant execute on function public\.get_wowy_season_player_ratings\(integer\)\s+to anon, authenticated, service_role;/
    );
    assert.ok(
        seasonAverageActivationOperation.indexOf('insert into public.wowy_season_average_activation') >
            seasonAverageActivationOperation.indexOf(
                'grant execute on function public.get_wowy_season_player_ratings(integer)'
            ),
        'the durable activation marker must be written only after the public RPC grants succeed'
    );
    assert.ok(
        seasonAverageActivationOperation.indexOf('begin;') <
            seasonAverageActivationOperation.indexOf('do $guard$') &&
            seasonAverageActivationOperation.lastIndexOf('commit;') >
                seasonAverageActivationOperation.indexOf('notify pgrst'),
        'the manual operation must make the complete cutover atomic itself'
    );
});

test('historical WOWY helpers cache season options and selected-season snapshots', () => {
    const seasonsStart = supabaseHelper.indexOf('export async function getWowyLeaderboardSeasons()');
    const playersStart = supabaseHelper.indexOf('export async function getWowySeasonPlayers(season)');
    const playersEnd = supabaseHelper.indexOf('/**\n * Get every season', playersStart);
    assert.ok(seasonsStart >= 0 && playersStart > seasonsStart, 'WOWY season helpers should be discoverable');
    assert.ok(playersEnd > playersStart, 'WOWY season helper boundary should be discoverable');

    const seasonsHelper = supabaseHelper.slice(seasonsStart, playersStart);
    const playersHelper = supabaseHelper.slice(playersStart, playersEnd);
    assert.match(seasonsHelper, /CACHE_MS\.wowyLeaderboardSeasons/);
    assert.match(seasonsHelper, /\.rpc\('get_wowy_leaderboard_seasons'\)/);
    assert.match(playersHelper, /CACHE_MS\.wowySeasonPlayers/);
    assert.match(playersHelper, /\.rpc\('get_wowy_season_player_ratings'/);
    assert.match(playersHelper, /p_season: seasonEndYear/);
    assert.match(playersHelper, /normalizeWowyLeaderboardRows\(data\)/);
    assert.match(playersHelper, /sortByWowyRapmDesc/);
});

test('all-time WOWY helper requests bounded filtered pages and preserves database order', () => {
    const start = supabaseHelper.indexOf('const WOWY_ALL_TIME_SORT_COLUMNS');
    const end = supabaseHelper.indexOf('export async function getWowyLeaderboardSeasons()', start);
    assert.ok(start >= 0 && end > start, 'all-time WOWY helper should be discoverable');

    const helper = supabaseHelper.slice(start, end);
    assert.match(helper, /WOWY_ALL_TIME_PAGE_SIZE/);
    assert.match(helper, /'wowyAllTimePlayers'/);
    assert.match(helper, /CACHE_MS\[cachePrefix\]/);
    assert.match(helper, /get_wowy_all_time_player_seasons_page/);
    assert.match(helper, /p_limit: normalized\.limit/);
    assert.match(helper, /p_offset: normalized\.offset/);
    assert.match(helper, /p_min_possessions: normalized\.minPossessions/);
    assert.match(helper, /p_max_possessions: normalized\.maxPossessions/);
    assert.match(helper, /p_sort_column: normalized\.sortColumn/);
    assert.match(helper, /normalizeWowyLeaderboardRows\(payload\.rows\)/);
    assert.match(helper, /totalCount:/);
    assert.match(helper, /hasMore:/);
    assert.match(helper, /if \(ratingMode === 'average' && !page\.activated\)/);
    assert.match(helper, /cacheStore\.delete\(key\)/);
    assert.doesNotMatch(helper, /sortByWowyRapmDesc/);
});

test('all-time WOWY page RPC filters before a hard 100-row page boundary', () => {
    assert.match(
        paginatedAllTimeMigration,
        /function public\.get_wowy_all_time_player_seasons_page\(/
    );
    assert.match(paginatedAllTimeMigration, /p_limit integer default 100/);
    assert.match(paginatedAllTimeMigration, /p_offset integer default 0/);
    assert.match(paginatedAllTimeMigration, /p_min_possessions double precision default null/);
    assert.match(paginatedAllTimeMigration, /p_max_possessions double precision default null/);
    assert.match(paginatedAllTimeMigration, /p_limit < 1 or p_limit > 100/);
    assert.match(paginatedAllTimeMigration, /security invoker/);
    assert.match(paginatedAllTimeMigration, /set search_path = ''/);
    assert.match(paginatedAllTimeMigration, /where normalized_rating_mode = 'average'/);
    assert.match(paginatedAllTimeMigration, /where normalized_rating_mode = 'adjusted'/);
    assert.match(
        paginatedAllTimeMigration,
        /left join public\.wowy_season_adjusted_ratings as season_counts/
    );
    assert.match(paginatedAllTimeMigration, /season_counts\.possessions as season_possessions/);
    assert.match(paginatedAllTimeMigration, /or season_possessions >= p_min_possessions/);
    assert.match(paginatedAllTimeMigration, /or season_possessions <= p_max_possessions/);
    assert.match(paginatedAllTimeMigration, /normalized_sort_column = 'season_games'/);
    assert.match(paginatedAllTimeMigration, /normalized_sort_column = 'last_date'/);
    assert.ok(
        paginatedAllTimeMigration.indexOf('filtered_rows as (') <
            paginatedAllTimeMigration.indexOf('page_rows as ('),
        'the complete result set must be filtered before the page is sliced'
    );
    assert.match(paginatedAllTimeMigration, /page_sort_rank > p_offset/);
    assert.match(paginatedAllTimeMigration, /page_sort_rank <= p_offset \+ p_limit/);
    assert.match(paginatedAllTimeMigration, /'total_count'/);
    assert.match(paginatedAllTimeMigration, /'has_more'/);
    assert.match(
        paginatedAllTimeMigration,
        /grant execute on function public\.get_wowy_all_time_player_seasons_page/
    );
});

test('all-time WOWY rows add read-only season minutes and BPM after paging', () => {
    assert.match(
        seasonBoxContextMigration,
        /create table if not exists public\.wowy_season_box_context/
    );
    assert.match(
        seasonBoxContextMigration,
        /primary key \(season, nba_id\)/
    );
    assert.match(
        seasonBoxContextMigration,
        /alter table public\.wowy_season_box_context enable row level security/
    );
    assert.match(
        seasonBoxContextMigration,
        /rename to get_wowy_all_time_player_seasons_page_base/
    );
    assert.match(
        seasonBoxContextMigration,
        /jsonb_array_elements\(payload -> 'rows'\)/
    );
    assert.match(
        seasonBoxContextMigration,
        /security definer/
    );
    assert.match(
        seasonBoxContextMigration,
        /'minutes', box_context\.minutes/
    );
    assert.match(
        seasonBoxContextMigration,
        /'bpm', box_context\.bpm/
    );
    assert.match(
        seasonBoxContextMigration,
        /grant select on table public\.wowy_season_box_context/
    );
});

test('Season-Adjusted WOWY migration keeps the research product separate and public-read-only', () => {
    assert.match(
        seasonAdjustedMigration,
        /create table if not exists public\.wowy_season_adjusted_ratings/
    );
    assert.match(seasonAdjustedMigration, /primary key \(season, nba_id\)/);
    assert.match(seasonAdjustedMigration, /season_games integer not null/);
    assert.match(seasonAdjustedMigration, /playoff_games integer not null/);
    assert.match(seasonAdjustedMigration, /possessions double precision not null/);
    assert.match(seasonAdjustedMigration, /wowy_rapm double precision not null/);
    assert.match(seasonAdjustedMigration, /wowy_orapm double precision not null/);
    assert.match(seasonAdjustedMigration, /wowy_drapm double precision not null/);
    assert.match(seasonAdjustedMigration, /abs\(\(wowy_orapm \+ wowy_drapm\) - wowy_rapm\)/);
    assert.match(
        seasonAdjustedMigration,
        /create table if not exists public\.wowy_season_adjusted_publication/
    );
    assert.match(seasonAdjustedMigration, /source_sha256 text not null/);
    assert.match(seasonAdjustedMigration, /output_sha256 text not null/);
    assert.match(seasonAdjustedMigration, /enable row level security/);
    assert.match(seasonAdjustedMigration, /wowy_season_adjusted_ratings_public_read/);
    assert.match(
        seasonAdjustedMigration,
        /grant select on table\s+public\.wowy_season_adjusted_ratings,\s+public\.wowy_season_adjusted_publication\s+to anon, authenticated;/
    );
});

test('Season-Adjusted WOWY RPCs expose all rows and rank the separate product', () => {
    assert.match(
        seasonAdjustedMigration,
        /function public\.get_wowy_adjusted_season_player_ratings\(\s*p_season integer/
    );
    assert.match(
        seasonAdjustedMigration,
        /function public\.get_wowy_adjusted_all_time_player_seasons\(\)/
    );
    assert.match(seasonAdjustedMigration, /from public\.wowy_season_adjusted_ratings as adjusted/);
    assert.match(seasonAdjustedMigration, /adjusted\.possessions as exposure/);
    assert.match(seasonAdjustedMigration, /adjusted\.playoff_games/);
    assert.match(seasonAdjustedMigration, /'season-adjusted'::text as snapshot_context/);
    assert.match(seasonAdjustedMigration, /limit 100/);
    assert.equal(
        (seasonAdjustedMigration.match(/left join public\.players as players/g) ?? []).length,
        2,
        'both adjusted leaderboard RPCs must join player metadata'
    );
    assert.doesNotMatch(seasonAdjustedMigration, /where adjusted\.possessions/);
    assert.doesNotMatch(seasonAdjustedMigration, /where adjusted\.season_games/);

    for (const functionName of [
        'get_wowy_adjusted_season_player_ratings',
        'get_wowy_adjusted_all_time_player_seasons'
    ]) {
        assert.match(
            seasonAdjustedMigration,
            new RegExp(`grant execute on function\\s+public\\.${functionName}`)
        );
    }
});

test('Season-Adjusted WOWY helpers use separate caches and the shared paged RPC', () => {
    const allTimeStart = supabaseHelper.indexOf(
        'async function getWowyAllTimePageForMode'
    );
    const allTimeEnd = supabaseHelper.indexOf(
        'export async function getWowyLeaderboardSeasons()',
        allTimeStart
    );
    const seasonStart = supabaseHelper.indexOf(
        'export async function getWowyAdjustedSeasonPlayers(season)'
    );
    const seasonEnd = supabaseHelper.indexOf('/**\n * Get every season', seasonStart);
    assert.ok(allTimeStart >= 0 && allTimeEnd > allTimeStart);
    assert.ok(seasonStart >= 0 && seasonEnd > seasonStart);

    const allTimeHelper = supabaseHelper.slice(allTimeStart, allTimeEnd);
    const seasonHelper = supabaseHelper.slice(seasonStart, seasonEnd);
    assert.match(allTimeHelper, /'wowyAdjustedAllTimePlayers'/);
    assert.match(allTimeHelper, /CACHE_MS\[cachePrefix\]/);
    assert.match(allTimeHelper, /get_wowy_all_time_player_seasons_page/);
    assert.match(allTimeHelper, /getWowyAdjustedAllTimePage/);
    assert.match(allTimeHelper, /normalizeWowyLeaderboardRows\(payload\.rows\)/);
    assert.match(seasonHelper, /CACHE_MS\.wowyAdjustedSeasonPlayers/);
    assert.match(seasonHelper, /get_wowy_adjusted_season_player_ratings/);
    assert.match(seasonHelper, /\.from\('wowy_season_box_context'\)/);
    assert.match(seasonHelper, /\.select\('nba_id, minutes, bpm'\)/);
    assert.match(seasonHelper, /rowsWithContext/);
    assert.match(seasonHelper, /p_season: seasonEndYear/);
    assert.match(seasonHelper, /sortByWowyRapmDesc/);
});
