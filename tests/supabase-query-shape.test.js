import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

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

test('active players are selected by current-season playing time rather than roster flags', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const start = contents.indexOf('export async function getActivePlayers(options = {})');
    const end = contents.indexOf('/**\n * Get a single player', start);
    const rowStart = contents.indexOf('async function getLatestCurrentSeasonRatingRows(season)');
    const rowEnd = contents.indexOf('/**\n * Get all active players', rowStart);
    assert.ok(start >= 0 && end > start, 'getActivePlayers block should be discoverable');
    assert.ok(rowStart >= 0 && rowEnd > rowStart, 'current-season rating row helper should be discoverable');
    const activePlayersBlock = contents.slice(start, end);
    const ratingRowsBlock = contents.slice(rowStart, rowEnd);

    assert.match(contents, /async function getLatestActiveSeason\(\)/);
    assert.match(contents, /\.order\('season', \{ ascending: false \}\)/);
    assert.match(activePlayersBlock, /getLatestActiveSeason\(\)/);
    assert.match(activePlayersBlock, /getLatestCurrentSeasonRatingRows\(latestSeason\)/);
    assert.match(activePlayersBlock, /getCurrentSeasonPlayerDimsByIds\(latestSeason, ids\)/);
    assert.match(ratingRowsBlock, /\.gt\('poss', 0\)/);
    assert.match(ratingRowsBlock, /const playedIds = new Set\(\);/);
    assert.match(ratingRowsBlock, /Number\.parseFloat\(row\?\.poss\)/);
    assert.match(ratingRowsBlock, /Number\.isFinite\(poss\) && poss > 0/);
    assert.match(ratingRowsBlock, /playedIds\.add\(id\)/);
    assert.match(ratingRowsBlock, /Array\.from\(playedIds/);
    assert.doesNotMatch(activePlayersBlock, /getCurrentSeasonPlayerDims\(latestSeason\)|currentSeasonPlayers/);
    assert.doesNotMatch(activePlayersBlock, /weekAgo|gte\('date'|eq\('active_roster', 1\)/);
});
