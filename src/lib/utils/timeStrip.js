/**
 * The Time Machine strip's timeline, after the 2026 redesign's (reference/redesign-2026/src/
 * 03-floor.js): every past season shares the left three quarters and the latest season gets
 * the rest, so it can be scrubbed a day at a time. Past seasons snap to their weekly frames;
 * the latest season snaps to the day. Dates are YYYY-MM-DD strings; null means today.
 */

import * as d3 from 'd3';
import { addDays } from './timeMachine.js';

// The latest season's stretch starts this many days before its first game.
export const LEAD_IN_DAYS = 30;

const utc = (date) => new Date(`${date}T00:00:00Z`);

/**
 * Where the strip breaks: the left share of its width. The prototype's full-width strip kept
 * 74%; the site's shares its row with the date and buttons, so a narrower strip gives the latest
 * season more of itself.
 */
export function splitShare(width) {
	if (width < 560) return 0.55;
	if (width < 1000) return 0.66;
	return 0.74;
}

/** The latest season's calendar row, and the day its stretch of the strip starts. */
export function latestSeason(calendar) {
	let latest = null;
	for (const row of calendar ?? []) if (!latest || row.season > latest.season) latest = row;
	return latest ? { row: latest, start: latest.first_game, breakAt: addDays(latest.first_game, -LEAD_IN_DAYS) } : null;
}

/** The strip's x scale: [start, breakAt, end] across [pad, split, width - pad]. */
export function stripScale({ width, start, breakAt, end, pad = 8 }) {
	const right = Math.max(pad + 2, width - pad);
	if (!breakAt || breakAt <= start || breakAt >= end) {
		return d3.scaleUtc().domain([utc(start), utc(end)]).range([pad, right]);
	}
	const split = Math.min(Math.max(Math.round(width * splitShare(width)), pad + 1), right - 1);
	return d3.scaleUtc().domain([utc(start), utc(breakAt), utc(end)]).range([pad, split, right]);
}

/**
 * The date a point on the strip picks. In the latest season, that day (today past its last
 * game); before it, the nearest weekly frame, counting the latest season's first game as one.
 */
export function snapDate(date, { seasonStart, lastGame, pastFrames, historyStart }) {
	if (seasonStart && date >= seasonStart) return date > lastGame ? null : date;
	if (!pastFrames.length) return date < historyStart ? historyStart : date;
	let index = -1;
	for (let i = 0; i < pastFrames.length && pastFrames[i] <= date; i += 1) index = i;
	if (index < 0) return pastFrames[0];
	const previous = pastFrames[index];
	const next = pastFrames[index + 1] ?? seasonStart;
	if (next && Date.parse(next) - Date.parse(date) < Date.parse(date) - Date.parse(previous)) return next;
	return previous;
}

/**
 * One arrow-key step from `current` (null is today): a day in the latest season, a week
 * before it. Returns the new date, or null for today.
 */
export function stepDate(current, delta, { seasonStart, lastGame, pastFrames }) {
	if (current === null) return delta < 0 ? lastGame : null;
	if (seasonStart && current >= seasonStart) {
		const day = addDays(current, delta);
		if (day > lastGame) return null;
		if (day < seasonStart) return pastFrames.at(-1) ?? seasonStart;
		return day;
	}
	let index = -1;
	for (let i = 0; i < pastFrames.length && pastFrames[i] <= current; i += 1) index = i;
	const target = index + delta;
	if (target < 0) return pastFrames[0] ?? current;
	if (target >= pastFrames.length) return seasonStart ?? null;
	return pastFrames[target];
}

/**
 * Month ticks across the latest season's stretch, named where there is room: every month, else
 * every other or every third, and none too close to the season's label at the break.
 */
export function monthTicks(x, { from, to, split, minGap = 22, labelClear = 52 }) {
	const months = d3.utcMonth.range(d3.utcMonth.ceil(utc(from)), utc(to));
	const gap = months.length > 1 ? x(months[1]) - x(months[0]) : Infinity;
	const every = [1, 2, 3].find((step) => gap * step >= minGap) ?? 0;
	const edge = x.range().at(-1);
	let named = 0;
	return months.map((month) => {
		const at = x(month);
		const clear = every > 0 && at > split + labelClear && at + minGap <= edge;
		const label = clear && named++ % every === 0 ? d3.utcFormat('%b')(month) : null;
		return { key: month.toISOString().slice(0, 7), x: at, label };
	});
}
