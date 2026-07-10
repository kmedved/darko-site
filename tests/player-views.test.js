import test from 'node:test';
import assert from 'node:assert/strict';

import { projectPlayers } from '../src/lib/server/playerViews.js';


const player = {
    nba_id: 2544,
    player_name: 'LeBron James',
    team_name: 'Los Angeles Lakers',
    position: 'F',
    dpm: 4.2,
    o_dpm: 3.1,
    projected_years_remaining: 1.5
};

test('search player view retains display fields and drops modeling fields', () => {
    assert.deepEqual(projectPlayers([player], 'search'), [{
        nba_id: 2544,
        player_name: 'LeBron James',
        team_name: 'Los Angeles Lakers',
        position: 'F',
        dpm: 4.2
    }]);
});

test('unknown player view preserves the original response contract', () => {
    assert.equal(projectPlayers([player], null)[0], player);
});
