/**
 * Compare's two-player table, a stat to a row. For the ratings, shooting and fair salary, where
 * more is better, the leading side is marked with the gap in the stat's own units; volume,
 * minutes and age are shown without a verdict. Leads are read from the values as displayed, so
 * two figures that print the same are a tie.
 */

import { formatFixed, formatMillions, formatPercent, formatSignedMetric, printedNumber } from './csvPresets.js';
import { formatAsOfDate } from './timeMachine.js';

// Formats print with a plain minus and a tenth's precision, which printedNumber reads back.

export const HEAD_TO_HEAD_ROWS = Object.freeze([
	{ key: 'dpm', label: 'DPM', format: 'signed', better: true },
	{ key: 'o_dpm', label: 'Offense', format: 'signed', better: true },
	{ key: 'd_dpm', label: 'Defense', format: 'signed', better: true },
	{ key: 'box_dpm', label: 'Box DPM', format: 'signed', better: true },
	{ key: 'on_off_dpm', label: 'On/off DPM', format: 'signed', better: true },
	{ key: 'x_fg_pct', label: 'FG%', format: 'percent', better: true },
	{ key: 'x_fg3_pct', label: '3P%', format: 'percent', better: true },
	{ key: 'x_ft_pct', label: 'FT%', format: 'percent', better: true },
	{ key: 'sal_market_fixed', label: 'Fair salary', format: 'money', better: true },
	{ key: 'x_pts_100', label: 'Points per 100', format: 'fixed' },
	{ key: 'x_ast_100', label: 'Assists per 100', format: 'fixed' },
	{ key: 'x_minutes', label: 'Projected MPG', format: 'fixed' },
	{ key: 'age', label: 'Age', format: 'age' },
	// Games played since 1996-97, as profiles count them (comparePage.js from player_seasons).
	{ key: 'games_regular', label: 'Regular-season games', format: 'count' },
	{ key: 'games_playoffs', label: 'Playoff games', format: 'count' }
]);

function number(value) {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** A value as the table prints it. */
export function displayValue(value, format) {
	if (value === null) return '—';
	if (format === 'signed') return formatSignedMetric(value);
	if (format === 'percent') return formatPercent(value);
	if (format === 'money') return formatMillions(value);
	if (format === 'age') return String(Math.floor(value));
	if (format === 'count') return Math.round(value).toLocaleString('en-US');
	return formatFixed(value, 1);
}

/** The gap between two printed values, in the stat's own units: percentage points (pp), millions. */
function gap(difference, format) {
	if (format === 'percent') return `${difference.toFixed(1)} pp`;
	if (format === 'money') return `$${difference.toFixed(1)}M`;
	return difference.toFixed(1);
}

/** The rows for two players, leaving out a stat neither has. `lead` is 0 (left), 1 (right) or null. */
export function headToHeadRows(left, right) {
	return HEAD_TO_HEAD_ROWS.map((row) => {
		const shownLeft = displayValue(number(left?.[row.key]), row.format);
		const shownRight = displayValue(number(right?.[row.key]), row.format);
		const a = printedNumber(shownLeft);
		const b = printedNumber(shownRight);
		const lead = row.better && a !== null && b !== null && a !== b ? (a > b ? 0 : 1) : null;
		return {
			...row,
			left: shownLeft,
			right: shownRight,
			lead,
			edge: lead === null ? null : gap(Math.abs(a - b), row.format)
		};
	}).filter((row) => row.left !== '—' || row.right !== '—');
}

const DAY_MS = 86_400_000;

/**
 * For a player whose latest ratings are more than a year old (a retired player), the date they
 * stand at, since Compare shows each player's latest available ratings; null for anyone current.
 */
export function snapshotNote(player, now = new Date()) {
	const date = typeof player?.date === 'string' ? player.date.slice(0, 10) : '';
	const time = Date.parse(`${date}T00:00:00Z`);
	if (!Number.isFinite(time) || now.getTime() - time < 365 * DAY_MS) return null;
	return `Ratings as of ${formatAsOfDate(date, { short: true })}`;
}
