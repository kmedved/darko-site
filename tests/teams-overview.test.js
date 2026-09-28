import test from 'node:test';
import assert from 'node:assert/strict';

import { teamsOverview, winFit } from '../src/lib/utils/teamsOverview.js';

function sim(name, current, { playoffs = 0, conf = 0, finals = 0, seed = null, remain = '0-0' } = {}) {
    const row = { team_name: name, Current: current, SRS: 1.5, Remain: remain, Playoffs: playoffs, 'Win Conf': conf, 'Win Finals': finals };
    for (let index = 1; index <= 10; index += 1) row[`seed_${index}`] = index === seed ? 100 : 0;
    return row;
}

test('the power order ranks teams by DARKO rating with their record and finish', () => {
    const ratings = [
        { abbr: 'NYK', rating: 9.2, offense: 6.4, defense: 2.8 },
        { abbr: 'OKC', rating: 10.9, offense: 5.1, defense: 5.8 },
        { abbr: 'WAS', rating: -8.1, offense: -4.2, defense: -3.9 }
    ];
    const sims = [
        sim('New York Knicks', '53-29', { playoffs: 100, conf: 100, finals: 100, seed: 3 }),
        sim('Oklahoma City Thunder', '64-18', { playoffs: 100, seed: 1 }),
        sim('Washington Wizards', '17-65')
    ];
    const overview = teamsOverview(ratings, sims);
    assert.equal(overview.complete, true);
    assert.deepEqual(
        overview.rows.map((row) => [row.rank, row.abbr, row.record, row.finish]),
        [
            [1, 'OKC', '64-18', 'Playoffs'],
            [2, 'NYK', '53-29', 'Champion'],
            [3, 'WAS', '17-65', 'Lottery']
        ]
    );
    // In season: playoff odds instead of a finish.
    const live = teamsOverview(ratings, [sim('New York Knicks', '20-10', { playoffs: 91, remain: '33-19' })]);
    assert.equal(live.complete, false);
    assert.deepEqual([live.rows[1].finish, live.rows[1].playoffOdds], [null, 91]);
});

test('the fit with win percentage waits until every team has 20 games', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ rating: index - 15, wins: 20 + index, losses: 62 - index }));
    const fit = winFit(rows);
    assert.ok(fit.r > 0.99 && fit.teams === 30);
    assert.equal(winFit(rows.map((row, index) => (index === 0 ? { ...row, wins: 5, losses: 4 } : row))), null);
});
