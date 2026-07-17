import test from 'node:test';
import assert from 'node:assert/strict';

import { getProbabilityBands } from '../src/lib/utils/longevityProbabilityBands.js';

test('probability bands interpolate the 75% and 25% crossings', () => {
	assert.deepEqual(
		getProbabilityBands([
			{ horizon: 1, value: 100 },
			{ horizon: 2, value: 50 },
			{ horizon: 3, value: 0 }
		]),
		[
			{ start: 1, end: 1.5, zone: 'high' },
			{ start: 1.5, end: 2.5, zone: 'middle' },
			{ start: 2.5, end: 12, zone: 'low' }
		]
	);
});

test('a single high-probability horizon still produces a positive-width high band', () => {
	const [high, middle] = getProbabilityBands([
		{ horizon: 1, value: 80 },
		{ horizon: 2, value: 70 },
		{ horizon: 12, value: 30 }
	]);

	assert.deepEqual(high, { start: 1, end: 1.5, zone: 'high' });
	assert.equal(middle.start, high.end);
});

test('outer probability zones extend to the plot boundaries', () => {
	assert.deepEqual(
		getProbabilityBands([
			{ horizon: 1, value: 90 },
			{ horizon: 12, value: 80 }
		]),
		[{ start: 1, end: 12, zone: 'high' }]
	);

	assert.deepEqual(
		getProbabilityBands([
			{ horizon: 1, value: 20 },
			{ horizon: 12, value: 5 }
		]),
		[{ start: 1, end: 12, zone: 'low' }]
	);
});

test('missing probability data falls back to the middle zone', () => {
	assert.deepEqual(getProbabilityBands([]), [
		{ start: 1, end: 12, zone: 'middle' }
	]);
});
