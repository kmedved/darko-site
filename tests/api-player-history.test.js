import test from 'node:test';
import assert from 'node:assert/strict';

import {
    __resetApiCachesForTests,
    apiPlayerHistory,
    apiWowyPlayerHistory,
    apiWowyPublication
} from '../src/lib/api.js';

test.afterEach(() => __resetApiCachesForTests());

test('apiPlayerHistory full mode returns rows array by default when API returns metadata object', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    let requestedPath = '';
    globalThis.fetch = async (path) => {
        requestedPath = String(path);
        return {
            ok: true,
            json: async () => ({
                rows: [{ nba_id: 7, date: '2025-01-01' }],
                truncated: true,
                maxRows: 5000
            })
        };
    };

    const rows = await apiPlayerHistory(7, { full: true });

    assert.equal(requestedPath, '/api/player/7/history?full=1');
    assert.deepEqual(rows, [{ nba_id: 7, date: '2025-01-01' }]);
});

test('apiPlayerHistory full mode can return metadata when includeMetadata is enabled', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const payload = {
        rows: [{ nba_id: 9, date: '2025-01-01' }, { nba_id: 9, date: '2025-01-02' }],
        truncated: false,
        maxRows: 5000
    };

    globalThis.fetch = async () => ({
        ok: true,
        json: async () => payload
    });

    const metadata = await apiPlayerHistory(9, { full: true, includeMetadata: true });

    assert.deepEqual(metadata, payload);
});

test('apiPlayerHistory requests the narrow trajectory projection explicitly', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    let requestedPath = '';
    globalThis.fetch = async (path) => {
        requestedPath = String(path);
        return {
            ok: true,
            json: async () => ({ rows: [], truncated: false, maxRows: 5000 })
        };
    };

    await apiPlayerHistory(2544, { full: true, view: 'trajectory' });
    assert.equal(requestedPath, '/api/player/2544/history?full=1&view=trajectory');
});

test('apiWowyPlayerHistory returns the complete server-assembled career array', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    let requestedPath = '';
    globalThis.fetch = async (path) => {
        requestedPath = String(path);
        return {
            ok: true,
            json: async () => ({
                rows: [
                    { nba_id: 2544, career_game_num: 1 },
                    { nba_id: 2544, career_game_num: 1923 }
                ],
                truncated: false,
                maxRows: 3000
            })
        };
    };

    const rows = await apiWowyPlayerHistory(2544);
    assert.equal(requestedPath, '/api/player/2544/wowy-history');
    assert.equal(rows.length, 2);
    assert.equal(rows[1].career_game_num, 1923);
});

test('player histories share successful in-flight and recent requests', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    let requests = 0;
    globalThis.fetch = async () => {
        requests += 1;
        return {
            ok: true,
            json: async () => ({ rows: [{ nba_id: 2544 }], truncated: false, maxRows: 5000 })
        };
    };

    const [first, second] = await Promise.all([
        apiPlayerHistory(2544, { full: true, view: 'trajectory' }),
        apiPlayerHistory(2544, { full: true, view: 'trajectory' })
    ]);
    const third = await apiPlayerHistory(2544, { full: true, view: 'trajectory' });

    assert.equal(requests, 1);
    assert.deepEqual(first, second);
    assert.deepEqual(second, third);
});

test('player history cache evicts old careers instead of growing without bound', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    let requests = 0;
    globalThis.fetch = async () => {
        requests += 1;
        return { ok: true, json: async () => [] };
    };

    for (let nbaId = 1; nbaId <= 25; nbaId += 1) {
        await apiPlayerHistory(nbaId);
    }
    await apiPlayerHistory(1);

    assert.equal(requests, 26);
});

test('apiWowyPublication reads the public freshness record', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ season_through: 2026, data_through: '2026-06-13' })
    });

    assert.deepEqual(await apiWowyPublication(), {
        season_through: 2026,
        data_through: '2026-06-13'
    });
});
