import test from 'node:test';
import assert from 'node:assert/strict';

import { assertWithinRateLimit, getRateLimitWindow } from '../src/lib/server/eloSecurity.js';

test('getRateLimitWindow maps a timestamp into the correct ten-minute bucket', () => {
    const windowStart = getRateLimitWindow('2026-03-05T12:37:59.000Z', 10);

    assert.equal(windowStart.toISOString(), '2026-03-05T12:30:00.000Z');
});

test('assertWithinRateLimit throws a 429-style error when the limit is exceeded', () => {
    assert.throws(
        () =>
            assertWithinRateLimit({
                count: 31,
                limit: 30,
                label: 'votes'
            }),
        (err) => err?.status === 429
    );
});
