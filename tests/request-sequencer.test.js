import test from 'node:test';
import assert from 'node:assert/strict';

import { createRequestSequencer } from '../src/lib/utils/requestSequencer.js';


test('request sequencer accepts only the latest request as current', () => {
    const sequencer = createRequestSequencer();

    const first = sequencer.next();
    const second = sequencer.next();
    const third = sequencer.next();

    assert.equal(first, 1);
    assert.equal(second, 2);
    assert.equal(third, 3);
    assert.equal(sequencer.isCurrent(first), false);
    assert.equal(sequencer.isCurrent(second), false);
    assert.equal(sequencer.isCurrent(third), true);
    assert.equal(sequencer.value, 3);
});
