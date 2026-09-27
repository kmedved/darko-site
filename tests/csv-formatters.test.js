import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDollarsMillions, formatSignedMetric, formatMinutes, formatMillions } from '../src/lib/utils/csvPresets.js';


test('formatSignedMetric treats non-finite values as em dash', () => {
    assert.equal(formatSignedMetric(undefined), '—');
    assert.equal(formatSignedMetric('NaN'), '—');
    assert.equal(formatSignedMetric(null), '—');
});

test('formatMinutes preserves zero and guards non-finite', () => {
    // tr_minutes arrives in minutes: Jokic's 31.6619 is 31.7, not 0.5.
    assert.equal(formatMinutes(31.6619), '31.7');
    assert.equal(formatMinutes(0), '0.0');
    assert.equal(formatMinutes(undefined), '—');
    assert.equal(formatMinutes('foo'), '—');
});

test('formatMillions puts the minus sign before the dollar sign', () => {
    assert.equal(formatMillions(-1.9e6), '-$1.9M');
    assert.equal(formatMillions(24.7e6), '$24.7M');
    assert.equal(formatMillions(-40000), '$0.0M');
    assert.equal(formatMillions(undefined), '—');
});

test('chart axes use the same sign-first money format', () => {
    assert.equal(formatDollarsMillions(-20e6, 0), '-$20M');
    assert.equal(formatDollarsMillions(-400000, 0), '$0M');
    assert.equal(formatDollarsMillions(12.34e6, 1), '$12.3M');
});
