import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = [
    '20260529_001_lock_public_read_tables.sql',
    '20260616_001_lock_public_fact_tables.sql',
    '20260710_001_add_wowy_ratings.sql',
    '20260710_002_add_active_player_snapshot_rpc.sql',
    '20260710_003_add_latest_player_teams_rpc.sql',
    '20260710_004_add_latest_team_index.sql',
    '20260710_005_add_historical_leaderboard_snapshot_rpcs.sql'
]
    .map((filename) =>
        readFileSync(join(__dirname, '..', 'supabase', 'migrations', filename), 'utf8')
    )
    .join('\n');

const publicReadTables = [
    'players',
    'season_sim',
    'win_distribution',
    'player_ratings',
    'lineup_ratings',
    'wowy_ratings',
    'wowy_publication'
];

test('RLS migration enables row level security for advisor-flagged public tables', () => {
    for (const table of publicReadTables) {
        assert.match(
            migration,
            new RegExp(`alter table if exists public\\.${table}\\s+enable row level security;`)
        );
    }
});

test('RLS migration preserves anon/authenticated read access only', () => {
    for (const table of publicReadTables) {
        assert.match(
            migration,
            new RegExp(`create policy [a-z_]+\\s+on public\\.${table}\\s+for select\\s+to anon, authenticated\\s+using \\(true\\);`)
        );
    }

    assert.match(
        migration,
        /revoke all\s+on table public\.players, public\.season_sim, public\.win_distribution\s+from public, anon, authenticated;/
    );
    assert.match(
        migration,
        /revoke all\s+on table public\.player_ratings, public\.lineup_ratings\s+from public, anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.players, public\.season_sim, public\.win_distribution\s+to anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.player_ratings, public\.lineup_ratings\s+to anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.wowy_ratings, public\.wowy_publication\s+to anon, authenticated;/
    );
    for (const role of ['anon', 'authenticated']) {
        assert.doesNotMatch(
            migration,
            new RegExp(`for\\s+(insert|update|delete|all)\\s+to\\s+[^;]*\\b${role}\\b`, 'i')
        );
    }
});

test('active-player snapshot RPC is invoker-safe and read-only for public roles', () => {
    assert.match(migration, /function public\.get_active_player_ratings\(p_season integer\)/);
    assert.match(migration, /security invoker/);
    assert.match(
        migration,
        /grant execute on function public\.get_active_player_ratings\(integer\)\s+to anon, authenticated, service_role;/
    );
});

test('latest-team RPC is invoker-safe and read-only for public roles', () => {
    assert.match(migration, /function public\.get_latest_player_teams\(/);
    assert.match(
        migration,
        /grant execute on function public\.get_latest_player_teams\(bigint\[\], date\)\s+to anon, authenticated, service_role;/
    );
});

test('historical leaderboard RPCs are invoker-safe and use opening rosters', () => {
    assert.match(migration, /function public\.get_leaderboard_seasons\(\)/);
    assert.match(migration, /function public\.get_season_start_player_ratings\(p_season integer\)/);
    assert.match(migration, /with team_openers as/);
    assert.match(migration, /min\(pr\.date\) as opening_date/);
    assert.match(migration, /security invoker/);
    assert.match(
        migration,
        /grant execute on function public\.get_leaderboard_seasons\(\)\s+to anon, authenticated, service_role;/
    );
    assert.match(
        migration,
        /grant execute on function public\.get_season_start_player_ratings\(integer\)\s+to anon, authenticated, service_role;/
    );
});
