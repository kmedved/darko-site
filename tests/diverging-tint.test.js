import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TINT_PERCENT, divergingTint, tintLimit } from '../src/lib/utils/divergingTint.js';

test('tint limit is the 95th-percentile magnitude, ignoring missing values', () => {
	const values = Array.from({ length: 101 }, (_, index) => index - 50); // -50..50
	assert.equal(tintLimit(values), 48);
	assert.equal(tintLimit([null, undefined, 'x', '3', -4]), 4);
	assert.equal(tintLimit([]), 0);
});

test('tint is green above zero, red below, none at zero, and capped', () => {
	assert.equal(divergingTint(0, 5), '');
	assert.equal(divergingTint(null, 5), '');
	assert.equal(divergingTint(2, 0), '');
	assert.equal(
		divergingTint(5, 5),
		`--cell-tint: color-mix(in srgb, var(--positive) ${MAX_TINT_PERCENT}%, transparent);`
	);
	assert.equal(
		divergingTint(-50, 5),
		`--cell-tint: color-mix(in srgb, var(--negative) ${MAX_TINT_PERCENT}%, transparent);`
	);
	assert.equal(divergingTint(2.5, 5), '--cell-tint: color-mix(in srgb, var(--positive) 15%, transparent);');
	assert.equal(divergingTint(0.01, 5), '', 'a tint that rounds to nothing is left off');
});

test('tint can centre on a value other than zero', () => {
	assert.equal(divergingTint(50, 25, 50), '');
	assert.equal(divergingTint(75, 25, 50), `--cell-tint: color-mix(in srgb, var(--positive) ${MAX_TINT_PERCENT}%, transparent);`);
});
