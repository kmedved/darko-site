import test from 'node:test';
import assert from 'node:assert/strict';

import { LINEUPS_PAGE_CACHE, getLineupsPagePayload, loadLineupsPageData } from '../src/lib/server/lineupsPage.js';

const SIZE_COUNTS = {
    2: { pi: 1, npi: 0 },
    3: { pi: 0, npi: 1 },
    4: { pi: 1, npi: 1 },
    5: { pi: 1, npi: 1 }
};

test('lineups page load applies cache headers and returns default 5-man pi variant', async () => {
    let cacheOptions = null;

    const lineupsByVariant = {
        pi: [{ lineup_label: 'A' }],
        npi: [{ lineup_label: 'B' }]
    };

    const result = await loadLineupsPageData({
        setHeaders: () => {},
        setCacheHeaders: (_setHeaders, options) => {
            cacheOptions = options;
        },
        loadLineupRatings: async ({ lineupSize }) => (lineupSize === 5 ? lineupsByVariant : null),
        loadLineupSizeCounts: async () => SIZE_COUNTS
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
        }),
        loadLineupSizeCounts: async () => ({ 2: { pi: 1 }, 3: { pi: 1 }, 4: { pi: 1 } })
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

test('lineups page payload loads rows for the selected size only, with its cutoff', async () => {
    const receivedOpts = [];
    let countCalls = 0;

    const result = await getLineupsPagePayload({
        loadLineupRatings: async (opts) => {
            receivedOpts.push(opts);
            return { pi: [], npi: [] };
        },
        loadLineupSizeCounts: async () => {
            countCalls += 1;
            return SIZE_COUNTS;
        },
        lineupSize: 2
    });

    assert.deepEqual(receivedOpts, [{ lineupSize: 2, minPoss: 500 }]);
    assert.equal(countCalls, 1);
    assert.equal(result.lineupSize, 2);
    assert.equal(result.minPoss, 500);
});

test('lineups page summaries count the selected size from its rows and the rest from counts', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async () => ({
            pi: [{ lineup_label: '3A' }, { lineup_label: '3B' }],
            npi: [{ lineup_label: '3C' }]
        }),
        loadLineupSizeCounts: async () => ({
            2: { pi: 40, npi: 41 },
            3: { pi: 99, npi: 99 },
            4: { pi: 20, npi: 21 },
            5: { pi: 7, npi: 8 }
        }),
        lineupSize: 3
    });

    assert.deepEqual(
        result.lineupSizeSummaries.map(({ lineupSize, piCount, npiCount }) => [lineupSize, piCount, npiCount]),
        [[2, 40, 41], [3, 2, 1], [4, 20, 21], [5, 7, 8]]
    );
});

test('lineups page summaries fall back to zero counts when no count loader is given', async () => {
    const result = await getLineupsPagePayload({
        loadLineupRatings: async () => ({ pi: [{ lineup_label: 'A' }], npi: [] })
    });

    assert.deepEqual(
        result.lineupSizeSummaries.map(({ lineupSize, piCount, npiCount }) => [lineupSize, piCount, npiCount]),
        [[2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 1, 0]]
    );
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
