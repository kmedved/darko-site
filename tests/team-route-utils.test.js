import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeTeamParam, normalizeTeamSlug } from '../src/lib/utils/teamRouteUtils.js';


test('decodeTeamParam decodes percent-encoded slugs', () => {
    assert.equal(decodeTeamParam('Boston%20Celtics'), 'Boston Celtics');
    assert.equal(decodeTeamParam('L.A.%20Lakers'), 'L.A. Lakers');
});

test('normalizeTeamSlug replaces underscores after decode', () => {
    assert.equal(normalizeTeamSlug('Boston_Celtics'), 'Boston Celtics');
    assert.equal(normalizeTeamSlug('Boston%20Celtics'), 'Boston Celtics');
    assert.equal(normalizeTeamSlug('Boston_Celtics_2025'), 'Boston Celtics 2025');
});
