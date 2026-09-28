/**
 * Comps & futures. nba_darko's push_website.py publishes `player_comps`: for every current
 * player, the 25 closest player-seasons since 1996-97 at the same age, each comp's DPM then
 * and its season-end DPM in each of the next five seasons (10+ games). The page lists the
 * closest ten and draws the range all 25 took, weighted by similarity. A website
 * presentation, not a DARKO model output.
 */

import { seasonOfRow } from './seismograph.js';

export const FUTURE_SEASONS = 5;
export const LISTED_COMPS = 10;
export const FAN_PERCENTILES = Object.freeze([0.1, 0.25, 0.5, 0.75, 0.9]);
// With fewer comps than this still playing, a season ahead gets no range.
export const MIN_FAN_COMPS = 4;

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** The value at probability `p` on a line through (xs, ys), held flat past either end. */
function interpolate(p, xs, ys) {
	if (p <= xs[0]) return ys[0];
	if (p >= xs[xs.length - 1]) return ys[ys.length - 1];
	let index = 1;
	while (xs[index] < p) index += 1;
	const t = (p - xs[index - 1]) / (xs[index] - xs[index - 1]);
	return ys[index - 1] + t * (ys[index] - ys[index - 1]);
}

/**
 * Weighted percentiles: sorted values, each placed at the midpoint of its share of the total
 * weight, read off by linear interpolation (numpy.interp over the same points).
 */
export function weightedPercentiles(values, weights, probabilities = FAN_PERCENTILES) {
	const order = values.map((_, index) => index).sort((a, b) => values[a] - values[b]);
	const sortedValues = order.map((index) => values[index]);
	const sortedWeights = order.map((index) => weights[index]);
	const total = sortedWeights.reduce((sum, weight) => sum + weight, 0);
	let running = 0;
	const positions = sortedWeights.map((weight) => {
		running += weight;
		return (running - weight / 2) / total;
	});
	return probabilities.map((p) => interpolate(p, positions, sortedValues));
}

/**
 * One entry per season ahead: the comps' weighted 10th, 25th, 50th, 75th and 90th percentile
 * DPM (null when fewer than MIN_FAN_COMPS played that season), the weighted share still in the
 * league and how many comps had a rating.
 */
export function compsFan(comps) {
	const rows = comps ?? [];
	const total = rows.reduce((sum, comp) => sum + (toNumber(comp.weight) ?? 0), 0);
	return Array.from({ length: FUTURE_SEASONS }, (_, index) => {
		const year = index + 1;
		const played = rows
			.map((comp) => ({ value: toNumber(comp[`dpm_next_${year}`]), weight: toNumber(comp.weight) ?? 0 }))
			.filter((entry) => entry.value !== null);
		const share = total > 0 ? played.reduce((sum, entry) => sum + entry.weight, 0) / total : 0;
		const percentiles =
			played.length >= MIN_FAN_COMPS
				? weightedPercentiles(
						played.map((entry) => entry.value),
						played.map((entry) => entry.weight)
					)
				: [null, null, null, null, null];
		const [p10, p25, p50, p75, p90] = percentiles;
		return { year, p10, p25, p50, p75, p90, share, count: played.length };
	});
}

/** A comp's path: its DPM then (0 seasons ahead) and each later season, null where it did not play. */
export function compPath(comp) {
	return [
		{ year: 0, dpm: toNumber(comp?.comp_dpm) },
		...Array.from({ length: FUTURE_SEASONS }, (_, index) => ({
			year: index + 1,
			dpm: toNumber(comp?.[`dpm_next_${index + 1}`])
		}))
	];
}

/**
 * A player's season-end DPM by season from their rating history: each season's last real game
 * day (no offseason or next-game rows), with the age on it.
 */
export function seasonEndLine(historyRows) {
	const bySeason = new Map();
	for (const row of historyRows ?? []) {
		if (!(toNumber(row?.tm_id) > 0) || toNumber(row?.future_game) === 1) continue;
		const season = seasonOfRow(row);
		const dpm = toNumber(row.dpm);
		const age = toNumber(row.age);
		const date = typeof row.date === 'string' ? row.date.slice(0, 10) : null;
		if (season === null || dpm === null || age === null || !date) continue;
		const previous = bySeason.get(season);
		if (!previous || date >= previous.date) bySeason.set(season, { season, date, age, dpm });
	}
	return [...bySeason.values()].sort((a, b) => a.season - b.season);
}

/** The comps ordered by rank, with numbers as numbers; empty when there are none. */
export function normalizeComps(rows) {
	return (rows ?? [])
		.map((row) => ({
			...row,
			rank: toNumber(row.rank),
			age: toNumber(row.age),
			dpm: toNumber(row.dpm),
			season: toNumber(row.season),
			comp_id: toNumber(row.comp_id),
			comp_season: toNumber(row.comp_season),
			comp_age: toNumber(row.comp_age),
			comp_dpm: toNumber(row.comp_dpm),
			similarity: toNumber(row.similarity) ?? 0,
			weight: toNumber(row.weight) ?? 1
		}))
		.filter((row) => row.rank !== null && row.comp_id !== null)
		.sort((a, b) => a.rank - b.rank);
}
