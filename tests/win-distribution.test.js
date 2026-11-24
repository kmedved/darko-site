import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
    formatWinRange,
    leagueWinDistributions,
    meanWins,
    winPoints,
    winQuantile,
    winRange
} from '../src/lib/utils/winDistribution.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

// The table lists only totals a simulation reached: a gap from 30 to 35, like the Spurs' rows.
const sparse = [
    { wins: 35, prob: 0.1 },
    { wins: 30, prob: 0.1 },
    { wins: 36, prob: 0.2 },
    { wins: 40, prob: 0.4 },
    { wins: 44, prob: 0.2 },
    { wins: 50, prob: 0 }
];

test('win totals stay numbers, sorted, and empty totals drop out', () => {
    const points = winPoints(sparse);
    assert.deepEqual(points.map((point) => point.wins), [30, 35, 36, 40, 44]);
    assert.deepEqual(winPoints([[41, 0.5], [40, 0.5]]).map((point) => point.wins), [40, 41]);
});

test('quantiles read the cumulative share across gaps in the totals', () => {
    const points = winPoints(sparse);
    assert.equal(winQuantile(points, 0.1), 30);
    assert.equal(winQuantile(points, 0.2), 35);
    assert.equal(winQuantile(points, 0.5), 40);
    assert.equal(winQuantile(points, 0.9), 44);
    assert.deepEqual(winRange(points), { low: 30, high: 44 });
    assert.ok(Math.abs(meanWins(points) - (30 * 0.1 + 35 * 0.1 + 36 * 0.2 + 40 * 0.4 + 44 * 0.2)) < 1e-9);
});

test('rounded shares are read against their own total', () => {
    // Shares rounded to 4 places add up to a little under 1.
    const points = winPoints([
        { wins: 50, prob: 0.4999 },
        { wins: 51, prob: 0.4999 }
    ]);
    assert.equal(winQuantile(points, 0.5), 50);
    assert.equal(winQuantile(points, 0.9), 51);
});

test('a late-season distribution that collapses prints one total', () => {
    const points = winPoints([
        { wins: 58, prob: 0.04 },
        { wins: 59, prob: 0.92 },
        { wins: 60, prob: 0.04 }
    ]);
    assert.deepEqual(winRange(points), { low: 59, high: 59 });
    assert.equal(formatWinRange(winRange(points)), '59');
    assert.equal(formatWinRange({ low: 47, high: 61 }), '47–61');
    assert.equal(formatWinRange(null), '—');
});

test('the league set is all or nothing', () => {
    const rows = [
        { team_name: 'A', wins: 40, prob: 0.5 },
        { team_name: 'A', wins: 41, prob: 0.5 },
        { team_name: 'B', wins: 30, prob: 1 }
    ];
    assert.deepEqual(leagueWinDistributions(rows, ['A', 'B']), {
        A: [[40, 0.5], [41, 0.5]],
        B: [[30, 1]]
    });
    // A team missing, or one cut short by a row cap, hides the chart rather than drawing it wrong.
    assert.equal(leagueWinDistributions(rows, ['A', 'B', 'C']), null);
    assert.equal(leagueWinDistributions(rows.slice(0, 2).concat({ team_name: 'B', wins: 30, prob: 0.6 }), ['A', 'B']), null);
    assert.equal(leagueWinDistributions([], ['A']), null);
});

test('the league read pages past the row cap on a stable order', async () => {
    const server = await read('src/lib/server/supabase.js');
    assert.match(server, /export async function getLeagueWinDistribution\(\)/);
    assert.match(server, /\.select\('team_name, wins, prob', count \? \{ count: 'exact' \} : undefined\)/);
    assert.match(server, /\.order\('team_name', \{ ascending: true \}\)\s*\.order\('wins', \{ ascending: true \}\)\s*\.range\(/);

    const load = await read('src/routes/standings/+page.server.js');
    assert.match(load, /getLeagueWinDistribution\(\)\.catch\(\(\) => null\)/);
    assert.match(load, /winDistributions: winRows \? leagueWinDistributions\(winRows, teamNames\) : null/);
});
