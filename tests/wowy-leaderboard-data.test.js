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

test('active WOWY helper exposes the compact leaderboard contract', () => {
    const start = supabaseHelper.indexOf('export async function getActiveWowyPlayers()');
    const end = supabaseHelper.indexOf('/**\n * Get every season', start);
    assert.ok(start >= 0 && end > start, 'WOWY leaderboard helper should be discoverable');

    const helper = supabaseHelper.slice(start, end);
    assert.match(helper, /CACHE_MS\.activeWowyPlayers/);
    assert.match(helper, /\.rpc\('get_active_wowy_player_ratings'\)/);
    for (const field of [
        'nba_id',
        'player_name',
        'team_name',
        'tm_id',
        'position',
        'wowy_rapm',
        'wowy_orapm',
        'wowy_drapm',
        'exposure',
        'date',
        'career_game_num'
    ]) {
        assert.match(helper, new RegExp(`${field}:`));
    }
    assert.match(helper, /sortByWowyRapmDesc\(rows\)/);
});
