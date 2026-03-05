import test from 'node:test';
import assert from 'node:assert/strict';

import { isHttpError } from '@sveltejs/kit';

import { loadPlayerPageData } from '../src/lib/server/playerPage.js';

test('player page load rejects invalid nbaId values with 400', async () => {
    await assert.rejects(
        () =>
            loadPlayerPageData({
                nbaIdParam: 'abc',
                loadFullHistory: async () => ({ rows: [] })
            }),
        (err) => isHttpError(err, 400)
    );
});

test('player page load returns 404 when no history rows exist', async () => {
    await assert.rejects(
        () =>
            loadPlayerPageData({
                nbaIdParam: '9',
                loadFullHistory: async () => ({
                    rows: [],
                    truncated: false,
                    maxRows: 5000
                })
            }),
        (err) => isHttpError(err, 404)
    );
});

test('player page load returns playerInfo, historyRows, and historyMeta', async () => {
    let cacheOptions = null;
    const historyRows = [
        { nba_id: 7, player_name: 'Test Player', date: '2025-01-01' },
        { nba_id: 7, player_name: 'Test Player', date: '2025-01-02' }
    ];

    const result = await loadPlayerPageData({
        nbaIdParam: '7',
        setHeaders: () => {},
        setCacheHeaders: (_setHeaders, options) => {
            cacheOptions = options;
        },
        loadFullHistory: async () => ({
            rows: historyRows,
            truncated: true,
            maxRows: 5000
        })
    });

    assert.deepEqual(cacheOptions, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });
    assert.equal(result.nbaId, 7);
    assert.deepEqual(result.historyRows, historyRows);
    assert.deepEqual(result.playerInfo, historyRows[1]);
    assert.deepEqual(result.historyMeta, {
        truncated: true,
        maxRows: 5000
    });
});
