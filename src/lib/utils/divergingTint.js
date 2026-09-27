/**
 * Table numbers stay in neutral ink; only the column a table is about gets colour. That column's
 * cells carry a diverging background tint: green above zero, red below, fading to none at zero,
 * and scaled against the column's 95th-percentile magnitude so one outlier does not wash out the
 * rest. The printed sign still carries the direction, so the tint is never the only cue.
 *
 * Pair the returned style with the `tint-cell` class (app.css), which paints --cell-tint over
 * whatever background the cell already has (stripes, sticky columns, hover). The Shiny view
 * ignores it and keeps its own heat colours.
 */

/** Mix at most this share of the status colour into a cell. */
export const MAX_TINT_PERCENT = 30;

/** The magnitude that earns a full-strength tint: the 95th percentile of |value| by default. */
export function tintLimit(values, quantile = 0.95) {
	const magnitudes = [];
	for (const value of values || []) {
		const n = Number.parseFloat(value);
		if (Number.isFinite(n)) magnitudes.push(Math.abs(n));
	}
	if (magnitudes.length === 0) return 0;
	magnitudes.sort((a, b) => a - b);
	const index = Math.min(magnitudes.length - 1, Math.max(0, Math.round(quantile * (magnitudes.length - 1))));
	return magnitudes[index];
}

/**
 * The inline style for one tinted cell, or '' when the value is missing, zero or the limit is
 * unusable. `center` moves the neutral point off zero (e.g. 50 for a percentage).
 */
export function divergingTint(value, limit, center = 0) {
	const n = Number.parseFloat(value);
	if (!Number.isFinite(n) || !(limit > 0)) return '';
	const distance = n - center;
	const strength = Math.round(Math.min(Math.abs(distance) / limit, 1) * MAX_TINT_PERCENT);
	if (strength === 0) return '';
	const tone = distance > 0 ? '--positive' : '--negative';
	return `--cell-tint: color-mix(in srgb, var(${tone}) ${strength}%, transparent);`;
}
