import test from 'node:test';
import assert from 'node:assert/strict';

import {
    filterExcludedPlayers,
    filterPlayerSearchResults,
    normalizePlayerId
} from '../src/lib/utils/playerSearch.js';

const samplePlayers = [
    { nba_id: 15, player_name: 'Nikola Jokic' },
    { nba_id: 30, player_name: 'Stephen Curry' },
    { nba_id: 34, player_name: 'Giannis Antetokounmpo' }
];

test('normalizePlayerId parses valid ids and rejects invalid ones', () => {
    assert.equal(normalizePlayerId('42'), 42);
    assert.equal(normalizePlayerId(11), 11);
    assert.equal(normalizePlayerId('oops'), null);
});

test('filterExcludedPlayers removes excluded ids and limits the result set', () => {
    const manyPlayers = Array.from({ length: 10 }, (_, index) => ({
        nba_id: index + 1,
        player_name: `Player ${index + 1}`
    }));

    const result = filterExcludedPlayers(manyPlayers, [2, '4']);

    assert.equal(result.length, 8);
    assert.deepEqual(
        result.map((player) => player.nba_id),
        [1, 3, 5, 6, 7, 8, 9, 10]
    );
});

test('filterPlayerSearchResults applies substring matching and exclude filtering', () => {
    const result = filterPlayerSearchResults(samplePlayers, 'cur', [30]);
    assert.equal(result.length, 0);

    const narrowed = filterPlayerSearchResults(samplePlayers, 'nik', []);
    assert.equal(narrowed.length, 1);
    assert.equal(narrowed[0].player_name, 'Nikola Jokic');
});

test('filterPlayerSearchResults returns empty for queries shorter than the minimum length', () => {
    const result = filterPlayerSearchResults(samplePlayers, 'n', []);
    assert.deepEqual(result, []);
});
