import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
    ACTIVE_PLAYERS_CACHE_TTL_MS,
    __resetApiCachesForTests,
    apiActivePlayers
} from '../src/lib/api.js';

test('apiActivePlayers returns cached data within TTL', async (t) => {
    const originalFetch = globalThis.fetch;
    const originalNow = Date.now;

    t.after(() => {
        globalThis.fetch = originalFetch;
        Date.now = originalNow;
        __resetApiCachesForTests();
    });

    let fetchCalls = 0;
    Date.now = () => 1_000;
    globalThis.fetch = async () => {
        fetchCalls += 1;
        return {
            ok: true,
            json: async () => [{ nba_id: 7, fetchCalls }]
        };
    };

    const first = await apiActivePlayers();
    Date.now = () => 1_000 + ACTIVE_PLAYERS_CACHE_TTL_MS - 1;
    const second = await apiActivePlayers();

    assert.equal(fetchCalls, 1);
    assert.deepEqual(first, second);
});

test('apiActivePlayers refetches after TTL expiry', async (t) => {
    const originalFetch = globalThis.fetch;
    const originalNow = Date.now;

    t.after(() => {
        globalThis.fetch = originalFetch;
        Date.now = originalNow;
        __resetApiCachesForTests();
    });

    let fetchCalls = 0;
    Date.now = () => 2_000;
    globalThis.fetch = async () => {
        fetchCalls += 1;
        return {
            ok: true,
            json: async () => [{ nba_id: 11, fetchCalls }]
        };
    };

    const first = await apiActivePlayers({ team: 'Boston Celtics' });
    Date.now = () => 2_000 + ACTIVE_PLAYERS_CACHE_TTL_MS + 1;
    const second = await apiActivePlayers({ team: 'Boston Celtics' });

    assert.equal(fetchCalls, 2);
    assert.notDeepEqual(first, second);
});

test('apiActivePlayers evicts failed requests from the cache', async (t) => {
    const originalFetch = globalThis.fetch;

    t.after(() => {
        globalThis.fetch = originalFetch;
        __resetApiCachesForTests();
    });

    let fetchCalls = 0;
    globalThis.fetch = async () => {
        fetchCalls += 1;
        if (fetchCalls === 1) {
            throw new Error('temporary failure');
        }

        return {
            ok: true,
            json: async () => [{ nba_id: 15 }]
        };
    };

    await assert.rejects(() => apiActivePlayers(), /temporary failure/);
    const data = await apiActivePlayers();

    assert.equal(fetchCalls, 2);
    assert.deepEqual(data, [{ nba_id: 15 }]);
});

test('apiActivePlayers keeps lightweight views in separate client caches', async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
        __resetApiCachesForTests();
    });

    const paths = [];
    globalThis.fetch = async (path) => {
        paths.push(String(path));
        return { ok: true, json: async () => [] };
    };

    await apiActivePlayers({ view: 'search' });
    await apiActivePlayers({ view: 'percentiles' });
    await apiActivePlayers({ view: 'search' });

    assert.deepEqual(paths, [
        '/api/active-players?view=search',
        '/api/active-players?view=percentiles'
    ]);
});

test('/api/active-players keeps Vercel duration headroom for cold cache loads', async () => {
    const routePath = path.resolve(process.cwd(), 'src/routes/api/active-players/+server.js');
    const contents = await fs.readFile(routePath, 'utf8');

    assert.match(contents, /@type \{import\('@sveltejs\/adapter-vercel'\)\.Config\}/);
    assert.match(contents, /regions:\s*\['pdx1'\]/);
    assert.match(contents, /maxDuration:\s*60/);
    assert.match(contents, /getActivePlayers\(team \? \{ teamName: team \} : \{\}\)/);
    assert.doesNotMatch(contents, /throw error\(500/);
    assert.doesNotMatch(contents, /catch\s*\(/);
});
