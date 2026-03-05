import test from 'node:test';
import assert from 'node:assert/strict';

import { loadComparePageData, parseCompareIds } from '../src/lib/server/comparePage.js';

test('parseCompareIds dedupes, filters invalid ids, and caps at four players', () => {
    assert.deepEqual(parseCompareIds('7,3,7,foo,-1,9,11,13'), [7, 3, 9, 11]);
});

test('compare page load preserves first-seen order in preloaded players', async () => {
    const result = await loadComparePageData({
        rawIds: '7,3,9',
        loadFullHistory: async (nbaId) => ({
            rows: [{ nba_id: nbaId, player_name: `Player ${nbaId}` }]
        }),
        buildComparePlayer: ({ currentRow, rows, color }) => ({
            ...currentRow,
            rows,
            color
        }),
        getComparePlayerColors: () => ['c1', 'c2', 'c3', 'c4']
    });

    assert.deepEqual(
        result.preloadedPlayers.map((player) => player.nba_id),
        [7, 3, 9]
    );
    assert.equal(result.notice, null);
});

test('compare page load keeps successful players and returns a notice for failures', async () => {
    const result = await loadComparePageData({
        rawIds: '7,3,9',
        loadFullHistory: async (nbaId) => {
            if (nbaId === 3) {
                throw new Error('missing');
            }

            if (nbaId === 9) {
                return { rows: [] };
            }

            return {
                rows: [{ nba_id: nbaId, player_name: `Player ${nbaId}` }]
            };
        },
        buildComparePlayer: ({ currentRow, rows, color }) => ({
            ...currentRow,
            rows,
            color
        }),
        getComparePlayerColors: () => ['c1', 'c2', 'c3', 'c4']
    });

    assert.deepEqual(
        result.preloadedPlayers.map((player) => player.nba_id),
        [7]
    );
    assert.match(result.notice, /3, 9/);
});
