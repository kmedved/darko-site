import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ACTIVE_PLAYERS_CACHE_KEY,
    createActivePlayersAccessor
} from '../src/lib/server/activePlayersCache.js';

const SUPABASE_FILE = 'src/lib/server/supabase.js';
const PLAYERS_SELECT_STAR = /from\('players'\)\s*\.select\('\*'\)/g;
const RATING_COLUMNS_INCLUDE_ACTUAL_SALARY = /const RATING_COLUMNS = \[[\s\S]*'actual_salary'[\s\S]*\]\.join\(', '\);/;


test('supabase players table queries should not use select(*)', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const matches = contents.match(PLAYERS_SELECT_STAR);

    assert.equal(matches, null, 'players queries should project explicit columns');
});

test('supabase rating column projection includes actual_salary', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');

    assert.match(contents, RATING_COLUMNS_INCLUDE_ACTUAL_SALARY);
});

test('trajectory projections omit unused heavyweight fields', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const trajectoryStart = contents.indexOf('const TRAJECTORY_RATING_COLUMNS');
    const trajectoryEnd = contents.indexOf("].join(', ');", trajectoryStart);
    const wowyStart = contents.indexOf('const WOWY_RATING_COLUMNS');
    const wowyEnd = contents.indexOf("].join(', ');", wowyStart);
    const trajectoryBlock = contents.slice(trajectoryStart, trajectoryEnd);
    const wowyBlock = contents.slice(wowyStart, wowyEnd);

    for (const required of ['dpm', 'o_dpm', 'd_dpm', 'career_game_num', 'sal_market_fixed']) {
        assert.match(trajectoryBlock, new RegExp(`'${required}'`));
    }
    for (const unused of ['projected_years_remaining', 'actual_salary', "'s15'"]) {
        assert.doesNotMatch(trajectoryBlock, new RegExp(unused));
    }
    assert.doesNotMatch(wowyBlock, /'game_id'|'exposure'/);
});

test('player profile history projects chart fields instead of full production rows', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), SUPABASE_FILE), 'utf8');
    const start = contents.indexOf('const PLAYER_PROFILE_RATING_COLUMNS');
    const end = contents.indexOf("].join(', ');", start);
    const block = contents.slice(start, end);

    for (const required of ['dpm', 'box_odpm', 'tr_fg3_pct', 'sal_market_fixed']) {
        assert.match(block, new RegExp(`'${required}'`));
    }
    for (const unused of ['poss', 'rapm_exposure', 'projected_years_remaining', 'actual_salary', 's12']) {
        assert.doesNotMatch(block, new RegExp(`'${unused}'`));
    }
    assert.match(contents, /getFullPlayerProfileHistory/);
    assert.match(contents, /cachePrefix: 'fullPlayerProfileHistory'/);
    assert.match(contents, /mergePlayerDim: false/);
    assert.match(contents, /getPlayerHistory\(nbaId, 1\)/);
});

test('active players are selected from latest current-season active-roster projections', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const start = contents.indexOf('async function loadAllActivePlayers()');
    const end = contents.indexOf('const getCachedActivePlayers = createActivePlayersAccessor', start);
    const rowStart = contents.indexOf('async function getLatestCurrentSeasonRatingRows(season)');
    const rowEnd = contents.indexOf('/**\n * Get all active players', rowStart);
    assert.ok(start >= 0 && end > start, 'loadAllActivePlayers block should be discoverable');
    assert.ok(rowStart >= 0 && rowEnd > rowStart, 'current-season rating row helper should be discoverable');
    const activePlayersBlock = contents.slice(start, end);
    const ratingRowsBlock = contents.slice(rowStart, rowEnd);

    assert.match(contents, /createActivePlayersAccessor\(\{/);
    assert.match(contents, /maxAgeMs: CACHE_MS\.activePlayers/);
    assert.match(contents, /async function getLatestActiveSeason\(\)/);
    assert.match(contents, /\.order\('season', \{ ascending: false \}\)/);
    assert.match(activePlayersBlock, /getLatestActiveSeason\(\)/);
    assert.match(activePlayersBlock, /getLatestCurrentSeasonRatingRows\(latestSeason\)/);
    assert.match(activePlayersBlock, /getCurrentSeasonPlayerDimsByIds\(latestSeason, ids\)/);
    const dimsStart = contents.indexOf('async function getCurrentSeasonPlayerDimsByIds');
    const dimsEnd = contents.indexOf('async function getLatestCurrentSeasonRatingRows', dimsStart);
    const dimsBlock = contents.slice(dimsStart, dimsEnd);
    assert.match(dimsBlock, /\.eq\('season', season\)/);
    assert.doesNotMatch(dimsBlock, /chunkArray|\.in\('nba_id'/);
    assert.match(ratingRowsBlock, /\.rpc\('get_active_player_ratings'/);
    assert.match(ratingRowsBlock, /p_season: season/);
    assert.doesNotMatch(ratingRowsBlock, /while \(true\)|\.range\(/);
    assert.match(activePlayersBlock, /playersMap\.get\(row\.nba_id\)\?\.current_team/);
    assert.match(activePlayersBlock, /nbaTeamId\(currentTeam\)/);
    assert.match(contents, /\.rpc\('get_latest_player_teams'/);
    assert.doesNotMatch(contents, /TEAM_FALLBACK_CHUNK_SIZE|TEAM_FALLBACK_ROWS_PER_PLAYER/);
    assert.doesNotMatch(ratingRowsBlock, /\.gt\('poss', 0\)/);
    assert.doesNotMatch(ratingRowsBlock, /playedIds|Number\.parseFloat\(row\?\.poss\)/);
    assert.doesNotMatch(activePlayersBlock, /getCurrentSeasonPlayerDims\(latestSeason\)|currentSeasonPlayers/);
    assert.doesNotMatch(activePlayersBlock, /weekAgo|gte\('date'/);
});

test('historical leaderboard snapshots use dedicated cached RPCs', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const seasonsStart = contents.indexOf('export async function getLeaderboardSeasons()');
    const snapshotStart = contents.indexOf('export async function getSeasonStartPlayers(season)');
    const historyStart = contents.indexOf('/**\n * Get a single player\'s history', snapshotStart);

    assert.ok(seasonsStart >= 0, 'historical season helper should be discoverable');
    assert.ok(snapshotStart >= 0 && historyStart > snapshotStart, 'snapshot helper should be discoverable');

    const seasonsBlock = contents.slice(seasonsStart, snapshotStart);
    const snapshotBlock = contents.slice(snapshotStart, historyStart);
    assert.match(seasonsBlock, /CACHE_MS\.leaderboardSeasons/);
    assert.match(seasonsBlock, /\.rpc\('get_leaderboard_seasons'\)/);
    assert.match(snapshotBlock, /CACHE_MS\.seasonStartPlayers/);
    assert.match(snapshotBlock, /\.rpc\('get_season_start_player_ratings'/);
    assert.match(snapshotBlock, /getPlayersMapByIds\(rows\.map/);
    assert.match(snapshotBlock, /mergeWithPlayerDim/);
    assert.match(snapshotBlock, /sortByDpmDesc/);
});

test('concurrent team-filtered active players share one all-player load', async () => {
    const players = [
        { nba_id: 1, team_name: 'Boston Celtics' },
        { nba_id: 2, team_name: 'Denver Nuggets' },
        { nba_id: 3, team_name: 'Boston Celtics' }
    ];
    const inFlightByKey = new Map();
    const cacheKeys = [];
    let loadCalls = 0;
    let releaseLoad;
    const loadGate = new Promise((resolve) => {
        releaseLoad = resolve;
    });

    const getActivePlayers = createActivePlayersAccessor({
        maxAgeMs: 60_000,
        loadAllActivePlayers: async () => {
            loadCalls += 1;
            await loadGate;
            return players;
        },
        runCached: (key, _maxAgeMs, loader) => {
            cacheKeys.push(key);
            if (!inFlightByKey.has(key)) {
                inFlightByKey.set(key, loader().finally(() => inFlightByKey.delete(key)));
            }
            return inFlightByKey.get(key);
        }
    });

    const requests = Promise.all([
        getActivePlayers({ teamName: 'Boston Celtics' }),
        getActivePlayers({ teamName: 'Denver Nuggets' }),
        getActivePlayers({ teamName: 'Boston Celtics' })
    ]);

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(loadCalls, 1);
    assert.deepEqual(cacheKeys, [
        ACTIVE_PLAYERS_CACHE_KEY,
        ACTIVE_PLAYERS_CACHE_KEY,
        ACTIVE_PLAYERS_CACHE_KEY
    ]);

    releaseLoad();
    const [bostonA, denver, bostonB] = await requests;
    assert.deepEqual(bostonA.map((row) => row.nba_id), [1, 3]);
    assert.deepEqual(denver.map((row) => row.nba_id), [2]);
    assert.deepEqual(bostonB.map((row) => row.nba_id), [1, 3]);
});
