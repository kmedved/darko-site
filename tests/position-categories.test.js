import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getPositionCategory,
    getPositionGroup,
    getPositionPaletteIndex,
    POSITION_GROUP_LABELS
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

test('peer groups: swing positions join the larger side, so no group is a handful of players', () => {
    assert.equal(getPositionGroup('G'), 'guard');
    assert.equal(getPositionGroup('G-F'), 'wing');
    assert.equal(getPositionGroup('F-G'), 'wing');
    assert.equal(getPositionGroup('F'), 'wing');
    assert.equal(getPositionGroup('F-C'), 'big');
    assert.equal(getPositionGroup('C-F'), 'big');
    assert.equal(getPositionGroup('C'), 'big');
    assert.equal(getPositionGroup(''), null);
    assert.equal(POSITION_GROUP_LABELS.big, 'Bigs');
});
