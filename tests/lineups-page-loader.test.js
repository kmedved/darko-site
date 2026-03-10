import test from 'node:test';
import assert from 'node:assert/strict';

import { LINEUPS_PAGE_CACHE, getLineupsPagePayload, loadLineupsPageData } from '../src/lib/server/lineupsPage.js';

test('lineups page load applies cache headers and returns default pi variant', async () => {
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
        defaultVariant: 'pi'
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
        defaultVariant: 'pi'
    });
});
