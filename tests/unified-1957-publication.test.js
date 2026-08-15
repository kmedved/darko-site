import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { isWowyPlayerId } from '../src/lib/utils/wowyPlayerId.js';

const MIGRATION = 'supabase/migrations/20260814_001_publish_unified_wowy_from_1957.sql';
const SERVER = 'src/lib/server/supabase.js';
const LOADER = 'src/routes/wowy/+page.server.js';
const LEADERBOARD = 'src/routes/wowy/+page.svelte';
const TRAJECTORIES = 'src/routes/trajectories/+page.svelte';
const WOWY_HISTORY_ROUTE = 'src/routes/api/player/[id]/wowy-history/+server.js';

test('WOWY accepts official positive and synthetic negative IDs but never zero', () => {
    assert.equal(isWowyPlayerId(2544), true);
    assert.equal(isWowyPlayerId(-311), true);
    assert.equal(isWowyPlayerId('-311'), true);
    assert.equal(isWowyPlayerId(0), false);
    assert.equal(isWowyPlayerId('not-an-id'), false);
});

test('Unified 1957 migration separates Daily coverage from Season-Adjusted coverage', async () => {
    const migration = await readFile(MIGRATION, 'utf8');

    assert.match(migration, /alter column age drop not null/);
    assert.match(migration, /wowy_ratings_season_check check \(season >= 1957\)/);
    assert.match(migration, /wowy_season_player_averages_season_check check \(season >= 1957\)/);
    assert.match(migration, /wowy_season_opening_snapshots_season_check check \(season >= 1957\)/);
    assert.match(migration, /wowy_season_player_averages_nba_id_check check \(nba_id <> 0\)/);
    assert.doesNotMatch(migration, /alter table public\.wowy_season_adjusted_ratings/);
    assert.doesNotMatch(migration, /alter table public\.wowy_season_box_context/);

    for (const table of [
        'wowy_ratings',
        'wowy_season_player_averages',
        'wowy_season_opening_snapshots'
    ]) {
        assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*add column if not exists player_name text`));
        assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*add column if not exists league text`));
        assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*add column if not exists cross_league_level_identified boolean`));
    }

    assert.match(migration, /season_from integer not null default 1978/);
    assert.match(migration, /season_adjusted_from integer not null default 1978/);
    assert.match(migration, /aba_cross_league_identified_from integer not null default 1972/);
    assert.match(migration, /season_from >= 1957/);
    assert.match(migration, /season_adjusted_from >= 1978/);
});

test('historical RPCs search, sort, and return publication-owned identities', async () => {
    const migration = await readFile(MIGRATION, 'utf8');

    assert.match(
        migration,
        /coalesce\(averages\.player_name, players\.player_name\) as player_name/
    );
    assert.match(
        migration,
        /coalesce\(snapshots\.player_name, players\.player_name\) as player_name/
    );
    assert.match(migration, /averages\.cross_league_level_identified/);
    assert.match(migration, /snapshots\.cross_league_level_identified/);
    assert.match(migration, /league,\s*filter_position/);
    assert.match(migration, /season < 1972[\s\S]*league ~ '\(\^\|\/\)ABA\(\/\|\$\)'[\s\S]*cross_league_level_identified/);
});

test('site keeps synthetic IDs inside WOWY-only paths', async () => {
    const [server, route, trajectories] = await Promise.all([
        readFile(SERVER, 'utf8'),
        readFile(WOWY_HISTORY_ROUTE, 'utf8'),
        readFile(TRAJECTORIES, 'utf8')
    ]);

    assert.match(server, /if \(!Number\.isInteger\(nbaId\) \|\| nbaId === 0\) return null/);
    assert.match(server, /season >= 1957/);
    assert.match(server, /'player_name',[\s\S]*'league',[\s\S]*'cross_league_level_identified'/);
    assert.match(route, /isWowyPlayerId\(nbaId\)/);
    assert.match(trajectories, /kind === 'wowy'[\s\S]*isWowyPlayerId\(nbaId\)/);
    assert.match(trajectories, /Number\.isInteger\(nbaId\) && nbaId > 0/);
});

test('site disables unavailable early Season-Adjusted views and publishes the linkage disclosure', async () => {
    const [loader, leaderboard] = await Promise.all([
        readFile(LOADER, 'utf8'),
        readFile(LEADERBOARD, 'utf8')
    ]);

    assert.match(loader, /publication\?\.season_adjusted_from/);
    assert.match(loader, /selectedSeason >= seasonAdjustedFrom/);
    assert.match(leaderboard, /disabled=\{!adjustedAvailable\}/);
    assert.match(leaderboard, /Daily and season-average WOWY begin in 1956-57/);
    assert.match(leaderboard, /ABA-to-NBA level is explicitly unidentified from 1967-68 through 1970-71/);
    assert.match(leaderboard, /identified from 1971-72 through 1975-76/);
});
