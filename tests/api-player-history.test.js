import test from 'node:test';
import assert from 'node:assert/strict';

import { apiPlayerHistory } from '../src/lib/api.js';


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
