import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_SAVED_DATES, mergeSavedEdits, savedEditsByKey } from '../src/lib/utils/labStorage.js';

const brunson = { NYK: [{ id: 1628973, minutes: 34 }] };
const carmelo = { NYK: [{ id: 2546, minutes: 29 }] };

test("a look at another date keeps today's scenario", () => {
    let stored = { sides: {}, auto: true, editsByKey: mergeSavedEdits(null, 'current', brunson) };
    stored = { ...stored, editsByKey: mergeSavedEdits(stored, '2016-03-01', carmelo) };
    assert.deepEqual(savedEditsByKey(stored), { current: brunson, '2016-03-01': carmelo });
    // A date reset to no edits drops out.
    assert.deepEqual(mergeSavedEdits(stored, '2016-03-01', {}), { current: brunson });
});

test('saves from before per-date scenarios still load', () => {
    assert.deepEqual(savedEditsByKey({ key: 'current', sides: {}, auto: true, edits: brunson }), { current: brunson });
    assert.deepEqual(savedEditsByKey(null), {});
});

test("today's scenario always stays; only the most recent dates are kept", () => {
    let editsByKey = { current: brunson };
    for (let day = 1; day <= MAX_SAVED_DATES + 2; day += 1) {
        editsByKey = mergeSavedEdits({ editsByKey }, `2016-03-0${day}`, carmelo);
    }
    assert.equal(Object.keys(editsByKey).length, MAX_SAVED_DATES + 1);
    assert.ok('current' in editsByKey && !('2016-03-01' in editsByKey) && '2016-03-07' in editsByKey);
});
