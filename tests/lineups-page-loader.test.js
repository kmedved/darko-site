import test from 'node:test';
import assert from 'node:assert/strict';

import { LINEUPS_PAGE_CACHE, getLineupsPagePayload, loadLineupsPageData } from '../src/lib/server/lineupsPage.js';

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
        loadLineupRatings: async () => lineupsByVariant
    });

    assert.deepEqual(cacheOptions, LINEUPS_PAGE_CACHE);
    assert.deepEqual(result, {
        lineupsByVariant,
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
        defaultVariant: 'pi',
        lineupSize: 5,
        minPoss: 100
    });
});

test('lineups page payload threads lineupSize and uses correct minPoss', async () => {
    let receivedOpts = null;

    const result = await getLineupsPagePayload({
        loadLineupRatings: async (opts) => {
            receivedOpts = opts;
            return { pi: [], npi: [] };
        },
        lineupSize: 2
    });

    assert.equal(receivedOpts.lineupSize, 2);
    assert.equal(receivedOpts.minPoss, 500);
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
