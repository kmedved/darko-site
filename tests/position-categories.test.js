import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getPositionCategory,
    getPositionPaletteIndex
} from '../src/lib/utils/positionCategories.js';

test('position categories normalize common source aliases', () => {
    assert.equal(getPositionCategory('PG'), 'G');
    assert.equal(getPositionCategory('Forward-Guard'), 'G-F');
    assert.equal(getPositionCategory('C-F'), 'F-C');
    assert.equal(getPositionCategory('4.5'), 'C');
});

test('unknown positions retain a neutral palette fallback', () => {
    assert.equal(getPositionCategory('Unknown'), null);
    assert.equal(getPositionPaletteIndex('Unknown'), null);
    assert.equal(getPositionPaletteIndex(null), null);
});
