import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLeaderboardCsvRows } from '../src/lib/utils/leaderboardCsv.js';


test('buildLeaderboardCsvRows assigns ranks in sorted display order', () => {
    const sortedPlayers = [
        { player_name: 'Alice', dpm: 5 },
        { player_name: 'Bob', dpm: 9 },
        { player_name: 'Carlos', dpm: 1 }
    ];

    const rows = buildLeaderboardCsvRows(sortedPlayers);

    assert.equal(rows.length, 3);
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[1].player_name, 'Bob');
    assert.equal(rows[1].rank, 2);
    assert.equal(rows[2].rank, 3);
});
