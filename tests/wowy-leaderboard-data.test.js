import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('historical WOWY rows preserve opening-game team context without current-team fallbacks', () => {
    const normalizerStart = supabaseHelper.indexOf('function normalizeWowyLeaderboardRows(data)');
    const normalizerEnd = supabaseHelper.indexOf('function mergePlayerWithActiveSnapshot', normalizerStart);
    assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart, 'WOWY row normalizer should be discoverable');

    const normalizer = supabaseHelper.slice(normalizerStart, normalizerEnd);
    assert.match(normalizer, /snapshotContext/);
    assert.match(normalizer, /snapshot_context: snapshotContext/);
    assert.match(normalizer, /teamCode/);
    assert.match(normalizer, /team_code: teamCode/);
    assert.match(normalizer, /snapshotContext === 'opening-game'/);
    assert.match(normalizer, /tm_id: isOpeningGameSnapshot \? null : resolveTeamId/);
    assert.match(normalizer, /position: isOpeningGameSnapshot \? null : normalizePosition/);
});

test('all-era historical WOWY snapshots preserve opening-game team context', () => {
    assert.match(allEraSeasonMigration, /create table if not exists public\.wowy_season_opening_snapshots/);
    assert.match(allEraSeasonMigration, /primary key \(season, nba_id\)/);
    assert.match(allEraSeasonMigration, /unique \(nba_id, game_id\)/);
    assert.match(allEraSeasonMigration, /season >= 1980/);
    assert.match(allEraSeasonMigration, /team_code text not null/);
    assert.match(allEraSeasonMigration, /team_name text not null/);
    assert.match(allEraSeasonMigration, /opening_date date not null/);
    assert.match(allEraSeasonMigration, /enable row level security/);
    assert.match(allEraSeasonMigration, /wowy_season_opening_snapshots_public_read/);
    assert.match(allEraSeasonMigration, /function public\.get_wowy_leaderboard_seasons\(\)/);
    assert.match(allEraSeasonMigration, /function public\.get_wowy_season_player_ratings\(p_season integer\)/);
    assert.match(allEraSeasonMigration, /security invoker/);
    assert.match(allEraSeasonMigration, /from public\.wowy_season_opening_snapshots as snapshots/);
    assert.match(allEraSeasonMigration, /snapshots\.team_code/);
    assert.match(allEraSeasonMigration, /snapshots\.opening_date as date/);
    assert.match(allEraSeasonMigration, /null::integer as tm_id/);
    assert.match(allEraSeasonMigration, /null::text as position/);
    assert.match(allEraSeasonMigration, /'opening-game'::text as snapshot_context/);
    assert.match(allEraSeasonMigration, /left join public\.players as players/);

    const functionStart = allEraSeasonMigration.indexOf(
        'create or replace function public.get_wowy_season_player_ratings(p_season integer)'
    );
    const functionEnd = allEraSeasonMigration.indexOf(
        'revoke all on function public.get_wowy_leaderboard_seasons()',
        functionStart
    );
    assert.ok(functionStart >= 0 && functionEnd > functionStart, 'seasonal WOWY RPC should be discoverable');
    const seasonalRpc = allEraSeasonMigration.slice(functionStart, functionEnd);
    assert.doesNotMatch(seasonalRpc, /public\.player_ratings/);
    assert.doesNotMatch(seasonalRpc, /public\.wowy_ratings/);
    assert.match(
        allEraSeasonMigration,
        /grant execute on function public\.get_wowy_leaderboard_seasons\(\)\s+to anon, authenticated, service_role;/
    );
    assert.match(
        allEraSeasonMigration,
        /grant execute on function public\.get_wowy_season_player_ratings\(integer\)\s+to anon, authenticated, service_role;/
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
