import test from 'node:test';
import assert from 'node:assert/strict';

import { LINEUPS_PAGE_CACHE, getLineupsPagePayload, loadLineupsPageData } from '../src/lib/server/lineupsPage.js';

test('lineups page load applies cache headers and returns default 5-man pi variant', async () => {
    let cacheOptions = null;

    const lineupsByVariant = {
        pi: [{ lineup_label: 'A' }],
        npi: [{ lineup_label: 'B' }]
    };
    const sizeFixtures = {
        2: { pi: [{ lineup_label: '2A' }], npi: [] },
        3: { pi: [], npi: [{ lineup_label: '3B' }] },
        4: { pi: [{ lineup_label: '4A' }], npi: [{ lineup_label: '4B' }] },
        5: lineupsByVariant
    };

    const result = await loadLineupsPageData({
        setHeaders: () => {},
        setCacheHeaders: (_setHeaders, options) => {
            cacheOptions = options;
        },
        loadLineupRatings: async ({ lineupSize }) => sizeFixtures[lineupSize]
    });

    assert.deepEqual(cacheOptions, LINEUPS_PAGE_CACHE);
    assert.deepEqual(result, {
        lineupsByVariant,
        lineupSizeSummaries: [
            { lineupSize: 2, label: '2-Man', minPoss: 500, piCount: 1, npiCount: 0 },
            { lineupSize: 3, label: '3-Man', minPoss: 500, piCount: 0, npiCount: 1 },
            { lineupSize: 4, label: '4-Man', minPoss: 200, piCount: 1, npiCount: 1 },
            { lineupSize: 5, label: '5-Man', minPoss: 100, piCount: 1, npiCount: 1 }
        ],
        defaultVariant: 'pi',
        lineupSize: 5,
        minPoss: 100
    });
});

test('lineups page payload always returns pi and npi buckets', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async () => ({
            pi: [{ lineup_label: 'A' }]
        })
    });

    assert.deepEqual(result, {
        lineupsByVariant: {
            pi: [{ lineup_label: 'A' }],
            npi: []
        },
        lineupSizeSummaries: [
            { lineupSize: 2, label: '2-Man', minPoss: 500, piCount: 1, npiCount: 0 },
            { lineupSize: 3, label: '3-Man', minPoss: 500, piCount: 1, npiCount: 0 },
            { lineupSize: 4, label: '4-Man', minPoss: 200, piCount: 1, npiCount: 0 },
            { lineupSize: 5, label: '5-Man', minPoss: 100, piCount: 1, npiCount: 0 }
        ],
        defaultVariant: 'pi',
        lineupSize: 5,
        minPoss: 100
    });
});

test('lineups page payload threads lineupSize and uses correct minPoss', async () => {
    const receivedOpts = [];

    const result = await getLineupsPagePayload({
        loadLineupRatings: async (opts) => {
            receivedOpts.push(opts);
            return { pi: [], npi: [] };
        },
        lineupSize: 2
    });

    assert.deepEqual(receivedOpts, [
        { lineupSize: 2, minPoss: 500 },
        { lineupSize: 3, minPoss: 500 },
        { lineupSize: 4, minPoss: 200 },
        { lineupSize: 5, minPoss: 100 }
    ]);
    assert.equal(result.lineupSize, 2);
    assert.equal(result.minPoss, 500);
});

test('lineups page payload uses 200 minPoss for 4-man lineups', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async () => ({ pi: [], npi: [] }),
        lineupSize: 4
    });

    assert.equal(result.minPoss, 200);
});

test('lineups page payload falls back to the default size for invalid direct calls', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async ({ lineupSize }) => ({
            pi: [{ lineup_label: `${lineupSize}A` }],
            npi: []
        }),
        lineupSize: 99
    });

    assert.equal(result.lineupSize, 5);
    assert.equal(result.minPoss, 100);
    assert.deepEqual(result.lineupsByVariant, {
        pi: [{ lineup_label: '5A' }],
        npi: []
    });
});

test('lineups page payload normalizes string lineup sizes', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async ({ lineupSize }) => ({
            pi: [{ lineup_label: `${lineupSize}A` }],
            npi: []
        }),
        lineupSize: '4'
    });

    assert.equal(result.lineupSize, 4);
    assert.equal(result.minPoss, 200);
    assert.deepEqual(result.lineupsByVariant, {
        pi: [{ lineup_label: '4A' }],
        npi: []
    });
});
