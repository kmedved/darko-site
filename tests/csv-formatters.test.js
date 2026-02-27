import test from 'node:test';
import assert from 'node:assert/strict';

import { formatSignedMetric, formatMinutes } from '../src/lib/utils/csvPresets.js';


test('formatSignedMetric treats non-finite values as em dash', () => {
    assert.equal(formatSignedMetric(undefined), '—');
    assert.equal(formatSignedMetric('NaN'), '—');
    assert.equal(formatSignedMetric(null), '—');
});

test('formatMinutes preserves zero and guards non-finite', () => {
    assert.equal(formatMinutes(0), '0.0');
    assert.equal(formatMinutes(undefined), '—');
    assert.equal(formatMinutes('foo'), '—');
});
