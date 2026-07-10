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
    assert.match(ratingRowsBlock, /\.eq\('active_roster', 1\)/);
    assert.match(ratingRowsBlock, /\.order\('date', \{ ascending: false \}\)/);
    assert.match(ratingRowsBlock, /latestById\.set\(id, row\)/);
    assert.match(ratingRowsBlock, /Array\.from\(latestById\.values\(\)\)/);
    assert.doesNotMatch(ratingRowsBlock, /\.gt\('poss', 0\)/);
    assert.doesNotMatch(ratingRowsBlock, /playedIds|Number\.parseFloat\(row\?\.poss\)/);
    assert.doesNotMatch(activePlayersBlock, /getCurrentSeasonPlayerDims\(latestSeason\)|currentSeasonPlayers/);
    assert.doesNotMatch(activePlayersBlock, /weekAgo|gte\('date'/);
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
