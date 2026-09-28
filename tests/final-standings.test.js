import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    finalSeed,
    finalStandingsRows,
    isSeasonComplete,
    RESULTS,
    resultCounts,
    seasonResult
} from '../src/lib/utils/finalStandings.js';

// Rows as the finished 2025-26 simulation published them: every "odd" 0 or 100.
function team(name, seed, { playoffs = 0, conf = 0, finals = 0, remain = '0-0' } = {}) {
    const row = { team_name: name, Remain: remain, Playoffs: playoffs, 'Win Conf': conf, 'Win Finals': finals };
    for (let index = 1; index <= 10; index += 1) row[`seed_${index}`] = index === seed ? 100 : 0;
    return row;
}

const EAST = [
    team('Detroit Pistons', 1, { playoffs: 100 }),
    team('New York Knicks', 3, { playoffs: 100, conf: 100, finals: 100 }),
    team('Philadelphia 76ers', 7, { playoffs: 100 }),
    team('Orlando Magic', 8, { playoffs: 100 }),
    team('Charlotte Hornets', 9),
    team('Miami Heat', 10),
    team('Milwaukee Bucks', null)
];

test('a simulation with no games left is a finished season', () => {
    assert.equal(isSeasonComplete(EAST), true);
    assert.equal(isSeasonComplete([...EAST, team('Boston Celtics', 2, { remain: '3-2' })]), false);
    assert.equal(isSeasonComplete([]), false);
});

test("each team's seed and how its season ended", () => {
    const results = Object.fromEntries(finalStandingsRows(EAST).map((row) => [row.team_name, [row.seed, row.result]]));
    assert.deepEqual(results, {
        'Detroit Pistons': [1, RESULTS.playoffs],
        'New York Knicks': [3, RESULTS.champion],
        'Philadelphia 76ers': [7, RESULTS.playoffs],
        'Orlando Magic': [8, RESULTS.playoffs],
        'Charlotte Hornets': [9, RESULTS.playIn],
        'Miami Heat': [10, RESULTS.playIn],
        'Milwaukee Bucks': [null, RESULTS.lottery]
    });
    // The West's champion lost the Finals.
    assert.equal(seasonResult(team('San Antonio Spurs', 2, { playoffs: 100, conf: 100 })), RESULTS.finals);
    // A 7th or 8th seed that lost the play-in is out in the play-in, not the lottery.
    assert.equal(seasonResult(team('Phoenix Suns', 8)), RESULTS.playIn);
    assert.equal(finalSeed(team('Utah Jazz', null)), null);
    assert.deepEqual(resultCounts(EAST), { playoffs: 4, throughPlayIn: 2, playIn: 2, lottery: 1 });
});

test('the standings and team pages show a finished season as final standings', async () => {
    const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const page = await read('src/routes/standings/+page.svelte');
    assert.match(page, /isSeasonComplete\(\[\.\.\.\(data\.eastStandings \|\| \[\]\), \.\.\.\(data\.westStandings \|\| \[\]\)\]\)/);
    assert.match(page, /title=\{seasonLabel \? `\$\{seasonLabel\} Final Standings` : 'Final Standings'\}/);
    assert.match(page, /if \(seasonComplete\) return \[\.\.\.finalStandingsColumns\];/);
    assert.match(page, /\{#if !seasonComplete\}\s*<div class="view-toggle"/);
    // Labeled by the latest season with a game played, not forecast rows for the next one.
    const load = await read('src/routes/standings/+page.server.js');
    assert.match(load, /getLatestPlayedSeason\(\)\.catch\(\(\) => null\)/);
    const server = await read('src/lib/server/supabase.js');
    assert.match(server, /export async function getLatestPlayedSeason\(\)[\s\S]*?\.eq\('future_game', 0\)/);

    const teamPage = await read('src/lib/components/TeamDetailView.svelte');
    assert.match(teamPage, /const simFinished = \$derived\(sim \? isSeasonComplete\(\[sim\]\) : false\);/);
    assert.match(teamPage, /\{#if sim && teamWinDist\.length > 0 && !simFinished\}/);
});
