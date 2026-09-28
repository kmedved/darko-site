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

test('the lineups page says when its ratings were computed, once the column is published', async () => {
    const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const contents = await read(SUPABASE_FILE);
    const start = contents.indexOf('export async function getLineupsComputedOn');
    const lookup = contents.slice(start, contents.indexOf('\n}\n', start));
    assert.match(lookup, /from\('lineup_ratings'\)\.select\('computed_on'\)\.limit\(1\)/);
    // Before the pipeline publishes the column, the page shows no date instead of failing.
    assert.match(lookup, /if \(error\.code === UNDEFINED_COLUMN\) return null;/);
    assert.match(await read('src/routes/lineups/+page.server.js'), /getLineupsComputedOn\(\)/);
    assert.match(
        await read('src/routes/lineups/+page.svelte'),
        /\{#if data\.computedOn\}Lineup ratings last computed \{formatAsOfDate\(data\.computedOn\)\}\.\{\/if\}/
    );
});

test('Rate a Player pairs come from the active leaderboard, not every player ever', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), SUPABASE_FILE), 'utf8');
    const start = contents.indexOf('export async function getRandomPair');
    const pair = contents.slice(start, contents.indexOf('\n}\n', start));
    // The players table holds every player since the 1940s; the RPC drew from all of them.
    assert.match(pair, /await getActivePlayers\(\)/);
    assert.doesNotMatch(pair, /rpc\('get_random_pair'\)/);
    // Two different players, with the card's fields and their Elo.
    assert.match(pair, /if \(second >= first\) second \+= 1;/);
    assert.match(pair, /from\('players'\)\.select\(RATE_PLAYER_COLUMNS\)/);
    assert.match(pair, /from\('elo_ratings'\)/);
});

test('player pages get draft year and pick without adding them to the players index', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), SUPABASE_FILE), 'utf8');

    // The shared players columns also feed the index that search downloads.
    const shared = contents.match(/const PLAYERS_DIM_COLUMNS = \[([\s\S]*?)\]\.join/);
    assert.ok(shared && !/draft/.test(shared[1]));

    const profile = contents.slice(contents.indexOf('export async function getFullPlayerProfileHistory'));
    assert.match(contents, /const PLAYER_DRAFT_COLUMNS = 'nba_id, draft_year, draft_slot';/);
    assert.match(profile, /getPlayersMapByIds\(\[nbaId\], PLAYER_DRAFT_COLUMNS\)/);
    assert.match(profile, /draft_year: draft\?\.draft_year \?\? null,\s*draft_slot: draft\?\.draft_slot \?\? null/);
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

    for (const required of ['dpm', 'box_odpm', 'tr_fg3_pct', 'sal_market_fixed', 'season', 'seconds_played', 'future_game', 'opp_id']) {
        assert.match(block, new RegExp(`'${required}'`));
    }
    for (const unused of ['poss', 'rapm_exposure', 'projected_years_remaining', 'actual_salary', 's12']) {
        assert.doesNotMatch(block, new RegExp(`'${unused}'`));
    }
    assert.match(contents, /getFullPlayerProfileHistory/);
    assert.match(contents, /cachePrefix: 'fullPlayerProfileHistory'/);
    assert.match(contents, /mergePlayerDim: false/);
    assert.match(contents, /getPlayerHistory\(nbaId, 1\)/);
    // Until the nightly publish adds opp_id, profiles retry without it instead of failing.
    assert.match(contents, /const UNDEFINED_COLUMN = '42703';/);
    assert.match(contents, /if \(error\?\.code !== UNDEFINED_COLUMN\) throw error;/);
    assert.match(contents, /columns: PLAYER_PROFILE_COLUMNS_WITHOUT_OPPONENT/);
});

test('player name search decorates only matched IDs', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), SUPABASE_FILE), 'utf8');
    const start = contents.indexOf('export async function searchAllPlayers(searchTerm)');
    const end = contents.indexOf('/**\n * Get a player\'s complete career history', start);
    const block = contents.slice(start, end);

    assert.ok(start >= 0 && end > start, 'player search helper should be discoverable');
    assert.match(block, /\.limit\(15\)/);
    assert.match(block, /\.rpc\(\s*'get_latest_player_search_ratings'/);
    assert.match(block, /p_ids: validPlayers\.map/);
    assert.doesNotMatch(block, /getActivePlayers\(/);
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
