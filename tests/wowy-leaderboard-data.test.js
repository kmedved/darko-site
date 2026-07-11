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
    assert.match(normalizer, /snapshotContext === 'opening-game' \|\| snapshotContext === 'season-average'/);
    assert.match(normalizer, /team_codes:/);
    assert.match(normalizer, /team_names:/);
    assert.match(normalizer, /season_games:/);
    assert.match(normalizer, /first_date:/);
    assert.match(normalizer, /last_date:/);
    assert.match(normalizer, /tm_id: isHistoricalSeasonSummary \? null : resolveTeamId/);
    assert.match(normalizer, /position: isHistoricalSeasonSummary \? null : normalizePosition/);
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
